// Minimal Google service-account auth and Sheets v4 client (no extra deps).

// Name of the Supabase secret holding the service account's JSON key file.
const SERVICE_ACCOUNT_SECRET = "GOOGLE_SERVCE_ACCOUNT_KEY";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";

type ServiceAccount = {
  client_email: string;
  private_key: string;
};

/** Error from the Sheets API; `status` is the HTTP status (403 = not shared, 404 = not found). */
export class GoogleApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

let serviceAccount: ServiceAccount | null = null;
let cachedToken: { value: string; expiresAt: number } | null = null;

/** Parses the key file from the secret, accepting raw JSON or base64-encoded JSON. */
export function getServiceAccount(): ServiceAccount {
  if (serviceAccount) return serviceAccount;

  const raw = (Deno.env.get(SERVICE_ACCOUNT_SECRET) ?? "").trim();
  if (!raw) {
    throw new Error(`${SERVICE_ACCOUNT_SECRET} is not set.`);
  }

  const parsed = JSON.parse(raw.startsWith("{") ? raw : atob(raw));
  if (typeof parsed.client_email !== "string" || typeof parsed.private_key !== "string") {
    throw new Error(`${SERVICE_ACCOUNT_SECRET} is not a service account key file.`);
  }

  serviceAccount = { client_email: parsed.client_email, private_key: parsed.private_key };
  return serviceAccount;
}

function base64Url(input: string | ArrayBuffer) {
  const bytes =
    typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToDer(pem: string) {
  const body = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  return Uint8Array.from(atob(body), (char) => char.charCodeAt(0));
}

/** OAuth access token for the service account, cached until shortly before it expires. */
async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const account = getServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64Url(
    JSON.stringify({
      iss: account.client_email,
      scope: SHEETS_SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  )}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(account.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${base64Url(signature)}`,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || typeof payload.access_token !== "string") {
    throw new Error(`Google token request failed (${response.status}): ${payload.error ?? ""}`);
  }

  cachedToken = {
    value: payload.access_token,
    expiresAt: Date.now() + Number(payload.expires_in ?? 3600) * 1000,
  };
  return cachedToken.value;
}

// deno-lint-ignore no-explicit-any
type Json = any;

async function sheetsRequest(
  spreadsheetId: string,
  path: string,
  init: { method?: string; body?: Json } = {},
): Promise<Json> {
  const token = await getAccessToken();
  const response = await fetch(`${SHEETS_API}/${encodeURIComponent(spreadsheetId)}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new GoogleApiError(response.status, payload.error?.message ?? response.statusText);
  }
  return payload;
}

/** A1 reference for a tab; quotes are doubled so any tab title is safe. */
export function a1(sheetTitle: string, cells: string) {
  return `'${sheetTitle.replace(/'/g, "''")}'!${cells}`;
}

/** 0-based column index -> letters (0 -> A, 27 -> AB). */
export function columnLetter(index: number) {
  let letters = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    letters = String.fromCharCode(65 + ((n - 1) % 26)) + letters;
  }
  return letters;
}

export type TabProperties = { sheetId: number; title: string; index: number };
export type GridRange = {
  sheetId?: number;
  startRowIndex?: number;
  endRowIndex?: number;
  startColumnIndex?: number;
  endColumnIndex?: number;
};

export async function getSpreadsheetInfo(spreadsheetId: string) {
  const payload = await sheetsRequest(
    spreadsheetId,
    "?fields=properties.title,sheets.properties(sheetId,title,index)",
  );
  return {
    title: String(payload.properties?.title ?? ""),
    tabs: (payload.sheets ?? []).map((sheet: Json) => sheet.properties) as TabProperties[],
  };
}

/** Merged ranges and frozen row count of one tab. */
export async function getTabGrid(spreadsheetId: string, sheetTitle: string) {
  const payload = await sheetsRequest(
    spreadsheetId,
    `?ranges=${encodeURIComponent(a1(sheetTitle, "A1:B2"))}` +
      "&fields=sheets(merges,properties.gridProperties.frozenRowCount)",
  );
  const sheet = payload.sheets?.[0];
  return {
    merges: (sheet?.merges ?? []) as GridRange[],
    frozenRowCount: Number(sheet?.properties?.gridProperties?.frozenRowCount ?? 0),
  };
}

/**
 * Raw cell values (numbers stay numbers: dates are day serials, times are day
 * fractions) for several ranges in one call.
 */
export async function batchGetValues(spreadsheetId: string, ranges: string[]) {
  if (ranges.length === 0) return [] as unknown[][][];
  const query = ranges.map((range) => `ranges=${encodeURIComponent(range)}`).join("&");
  const payload = await sheetsRequest(
    spreadsheetId,
    `/values:batchGet?${query}&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER`,
  );
  return (payload.valueRanges ?? []).map((range: Json) => range.values ?? []) as unknown[][][];
}

/**
 * Writes cells. RAW input, so text like "=SUM(...)" is never run as a formula;
 * numbers keep the cell's existing number format (used for date serials).
 */
export async function batchUpdateValues(
  spreadsheetId: string,
  data: { range: string; values: unknown[][] }[],
) {
  if (data.length === 0) return;
  await sheetsRequest(spreadsheetId, "/values:batchUpdate", {
    method: "POST",
    body: { valueInputOption: "RAW", data },
  });
}

/** Structural changes (add/duplicate tabs, insert rows, formatting). */
export async function batchUpdate(spreadsheetId: string, requests: Json[]) {
  if (requests.length === 0) return [];
  const payload = await sheetsRequest(spreadsheetId, ":batchUpdate", {
    method: "POST",
    body: { requests },
  });
  return (payload.replies ?? []) as Json[];
}

/** Google Sheets date serial (days since 1899-12-30) for an ISO date. */
export function dateSerial(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000 + 25_569;
}
