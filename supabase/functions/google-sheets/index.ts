import type { SupabaseClient } from "npm:@supabase/supabase-js@2.105.1";
import {
  dateSerial,
  getServiceAccount,
  getSpreadsheetInfo,
  GoogleApiError,
} from "../_shared/google.ts";
import { jsonResponse, readString, servePost } from "../_shared/http.ts";
import { authenticate, createAdminClient, logDatabaseError } from "../_shared/supabase.ts";
import {
  createWeekTab,
  indexWeekTabs,
  mondayOf,
  type SheetEntry,
  type SlotTemplate,
  syncWeek,
} from "./week-tab.ts";

// Actions:
//   status  (admin JWT)   -> { serviceAccountEmail, link }
//   link    (admin JWT)   -> checks the service account can open the sheet, saves the link
//   unlink  (admin JWT)   -> removes the link; the spreadsheet is left as is
//   sync    (cron secret) -> writes new bookings into / clears cancelled ones from
//                            every flagged school's weekly tabs

const RETRY_DELAY_MINUTES = 10;

type SheetLink = {
  school_id: string;
  spreadsheet_id: string;
  linked_at: string;
};

type SheetRow = {
  reservation_id: string;
  reservation_date: string;
  slot_start: string;
  student_name: string | null;
  exam_name: string;
  exam_type: string;
};

type RecordedEntry = {
  reservation_id: string;
  reservation_date: string;
  slot_start: string;
  entry_text: string;
};

const publicLinkColumns = "spreadsheet_id, spreadsheet_title, linked_at, last_synced_at, last_error";

/** The cell text: "First Last, Subject, Final". */
function entryText(row: SheetRow) {
  const type = row.exam_type === "final" ? "Final" : "Midterm";
  return `${row.student_name?.trim() || "Unknown student"}, ${row.exam_name.trim()}, ${type}`;
}

/** Accepts a full Google Sheets URL or a bare spreadsheet id. */
function parseSpreadsheetId(input: string) {
  const fromUrl = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (fromUrl) return fromUrl[1];
  return /^[a-zA-Z0-9_-]{20,}$/.test(input) ? input : null;
}

function describeError(error: unknown, serviceAccountEmail: string) {
  if (error instanceof GoogleApiError) {
    if (error.status === 403) {
      return `JustSchedule cannot open this spreadsheet. Share it with ${serviceAccountEmail} as an Editor.`;
    }
    if (error.status === 404) {
      return "This spreadsheet does not exist. Check the link.";
    }
    return `Google Sheets returned an error: ${error.message}`;
  }
  return error instanceof Error ? error.message : "Could not reach Google Sheets.";
}

/** Seats per active main room (plus its active overflow room), in start-time order. */
async function loadSlotTemplates(admin: SupabaseClient, schoolId: string) {
  const { data, error } = await admin
    .from("ExamSlots")
    .select("id, starts_at, capacity, slot_kind, primary_slot_id")
    .eq("school_id", schoolId)
    .eq("is_active", true);
  if (error) throw error;

  const slots = data ?? [];
  return slots
    .filter((slot) => slot.slot_kind === "primary")
    .sort((a, b) => String(a.starts_at).localeCompare(String(b.starts_at)))
    .map((slot): SlotTemplate => ({
      start: String(slot.starts_at).slice(0, 5),
      seats:
        slot.capacity +
        slots
          .filter((other) => other.primary_slot_id === slot.id)
          .reduce((sum, other) => sum + other.capacity, 0),
    }));
}

type WeekWork = { removals: SheetEntry[]; additions: SheetEntry[] };

/**
 * Compares what the sheet should hold with what we already wrote, then applies
 * the difference week by week. Returns problems that need an admin's attention.
 */
async function syncSchoolSheet(admin: SupabaseClient, link: SheetLink) {
  const [rowsResult, recordedResult] = await Promise.all([
    admin.rpc("get_school_sheet_rows", { target_school_id: link.school_id }),
    admin
      .from("SheetReservationEntries")
      .select("reservation_id, reservation_date, slot_start, entry_text")
      .eq("school_id", link.school_id)
      .eq("spreadsheet_id", link.spreadsheet_id),
  ]);
  if (rowsResult.error) throw rowsResult.error;
  if (recordedResult.error) throw recordedResult.error;

  const desired = new Map<string, SheetEntry>();
  for (const row of (rowsResult.data ?? []) as SheetRow[]) {
    desired.set(row.reservation_id, {
      reservationId: row.reservation_id,
      date: row.reservation_date,
      slotStart: row.slot_start,
      text: entryText(row),
    });
  }

  const weeks = new Map<string, WeekWork>();
  const weekOf = (date: string) => {
    const monday = mondayOf(date);
    if (!weeks.has(monday)) weeks.set(monday, { removals: [], additions: [] });
    return weeks.get(monday)!;
  };

  // A cancelled or changed booking: clear the old entry (and re-add below if changed).
  const unchanged = new Set<string>();
  for (const recorded of (recordedResult.data ?? []) as RecordedEntry[]) {
    const wanted = desired.get(recorded.reservation_id);
    if (
      wanted &&
      wanted.date === recorded.reservation_date &&
      wanted.slotStart === recorded.slot_start &&
      wanted.text === recorded.entry_text
    ) {
      unchanged.add(recorded.reservation_id);
      continue;
    }
    weekOf(recorded.reservation_date).removals.push({
      reservationId: recorded.reservation_id,
      date: recorded.reservation_date,
      slotStart: recorded.slot_start,
      text: recorded.entry_text,
    });
  }

  for (const entry of desired.values()) {
    if (!unchanged.has(entry.reservationId)) weekOf(entry.date).additions.push(entry);
  }

  if (weeks.size === 0) return [];

  const spreadsheet = await getSpreadsheetInfo(link.spreadsheet_id);
  const index = await indexWeekTabs(link.spreadsheet_id, spreadsheet.tabs);
  let slotTemplates: SlotTemplate[] | null = null;
  const problems: string[] = [];

  for (const [monday, work] of [...weeks.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    let tab = index.byMonday.get(dateSerial(monday)) ?? null;
    if (!tab && work.additions.length > 0) {
      slotTemplates ??= await loadSlotTemplates(admin, link.school_id);
      tab = await createWeekTab(link.spreadsheet_id, index, monday, slotTemplates);
    }

    // Tab gone (deleted by someone): nothing left to clear.
    const plan = tab
      ? await syncWeek(link.spreadsheet_id, tab, monday, work.removals, work.additions)
      : { removed: work.removals.map((entry) => entry.reservationId), added: [], problems: [] };
    problems.push(...plan.problems);

    if (plan.removed.length > 0) {
      const { error } = await admin
        .from("SheetReservationEntries")
        .delete()
        .in("reservation_id", plan.removed);
      if (error) throw error;
    }

    if (plan.added.length > 0) {
      const { error } = await admin.from("SheetReservationEntries").upsert(
        plan.added.map((entry) => ({
          reservation_id: entry.reservationId,
          school_id: link.school_id,
          spreadsheet_id: link.spreadsheet_id,
          reservation_date: entry.date,
          slot_start: entry.slotStart,
          entry_text: entry.text,
        })),
      );
      if (error) throw error;
    }
  }

  return problems;
}

/** Updates the link only if it is still the one we claimed (not unlinked or relinked meanwhile). */
async function updateClaimedLink(
  admin: SupabaseClient,
  link: SheetLink,
  values: Record<string, unknown>,
) {
  const { error } = await admin
    .from("SchoolSheetLinks")
    .update(values)
    .eq("school_id", link.school_id)
    .eq("spreadsheet_id", link.spreadsheet_id)
    .eq("linked_at", link.linked_at);
  if (error) logDatabaseError("Sheet link status update failed", error);
}

async function handleSync(authorization: string) {
  const admin = createAdminClient();
  if (admin instanceof Response) return admin;

  const secret = authorization.replace(/^Bearer\s+/i, "");
  const { data: isValid, error: secretError } = await admin.rpc("is_sheet_sync_secret", {
    candidate: secret,
  });
  if (secretError || isValid !== true) {
    return jsonResponse({ error: "Unauthorized." }, 401);
  }

  const { data: links, error } = await admin.rpc("claim_school_sheet_syncs");
  if (error) {
    logDatabaseError("Claim sheet syncs failed", error);
    return jsonResponse({ error: "Could not load sheet links." }, 500);
  }

  const serviceAccountEmail = getServiceAccount().client_email;
  let failed = 0;

  for (const link of (links ?? []) as SheetLink[]) {
    let problem: string | null;
    try {
      const problems = await syncSchoolSheet(admin, link);
      problem = problems.length > 0 ? problems.join(" ") : null;
    } catch (syncError) {
      console.error("Sheet sync failed", link.school_id, syncError);
      problem = describeError(syncError, serviceAccountEmail);
    }

    const now = new Date();
    if (problem) {
      failed += 1;
      await updateClaimedLink(admin, link, {
        needs_sync: true,
        retry_after: new Date(now.getTime() + RETRY_DELAY_MINUTES * 60_000).toISOString(),
        last_error: problem,
        last_error_at: now.toISOString(),
      });
    } else {
      await updateClaimedLink(admin, link, {
        last_synced_at: now.toISOString(),
        last_error: null,
        retry_after: null,
      });
    }
  }

  return jsonResponse({ synced: (links?.length ?? 0) - failed, failed });
}

async function handleAdminAction(action: string, body: Record<string, unknown>, authorization: string) {
  const schoolId = readString(body, "schoolId");
  if (!schoolId) {
    return jsonResponse({ error: "Missing schoolId." }, 400);
  }

  const auth = await authenticate(authorization);
  if (auth instanceof Response) return auth;

  const { data: isAdmin, error: adminError } = await auth.supabase.rpc(
    "can_manage_school_sheet",
    { target_school_id: schoolId },
  );
  if (adminError) {
    logDatabaseError("Sheet admin check failed", adminError);
    return jsonResponse({ error: "Could not verify your access. Try again in a moment." }, 500);
  }
  if (isAdmin !== true) {
    return jsonResponse({ error: "Only school admins can manage the Google Sheet." }, 403);
  }

  const admin = createAdminClient();
  if (admin instanceof Response) return admin;

  const serviceAccountEmail = getServiceAccount().client_email;

  if (action === "status") {
    const { data: link, error } = await admin
      .from("SchoolSheetLinks")
      .select(publicLinkColumns)
      .eq("school_id", schoolId)
      .maybeSingle();
    if (error) {
      logDatabaseError("Sheet link load failed", error);
      return jsonResponse({ error: "Could not load the Google Sheet link." }, 500);
    }
    return jsonResponse({ serviceAccountEmail, link });
  }

  // Linking or unlinking starts over: forget which entries we wrote before.
  const forgetEntries = async () => {
    const { error } = await admin.from("SheetReservationEntries").delete().eq("school_id", schoolId);
    if (error) logDatabaseError("Sheet entries reset failed", error);
    return error
      ? jsonResponse({ error: "Could not update the Google Sheet link. Try again." }, 500)
      : null;
  };

  if (action === "unlink") {
    const forgetFailed = await forgetEntries();
    if (forgetFailed) return forgetFailed;

    const { error } = await admin.from("SchoolSheetLinks").delete().eq("school_id", schoolId);
    if (error) {
      logDatabaseError("Sheet unlink failed", error);
      return jsonResponse({ error: "Could not unlink the Google Sheet. Try again." }, 500);
    }
    return jsonResponse({ serviceAccountEmail, link: null });
  }

  // action === "link"
  const spreadsheetId = parseSpreadsheetId(readString(body, "sheetUrl"));
  if (!spreadsheetId) {
    return jsonResponse({ error: "Paste the full link of a Google Sheets spreadsheet." }, 400);
  }

  // Check access before saving, so a sheet that is not shared fails right here.
  let spreadsheetTitle: string;
  try {
    spreadsheetTitle = (await getSpreadsheetInfo(spreadsheetId)).title;
  } catch (googleError) {
    console.error("Sheet link check failed", googleError);
    return jsonResponse({ error: describeError(googleError, serviceAccountEmail) }, 400);
  }

  const forgetFailed = await forgetEntries();
  if (forgetFailed) return forgetFailed;

  const { data: saved, error } = await admin
    .from("SchoolSheetLinks")
    .upsert({
      school_id: schoolId,
      spreadsheet_id: spreadsheetId,
      spreadsheet_title: spreadsheetTitle,
      linked_by: auth.user.id,
      linked_at: new Date().toISOString(),
      needs_sync: false,
      retry_after: null,
      last_synced_at: null,
      last_error: null,
      last_error_at: null,
    })
    .select(publicLinkColumns)
    .single();

  if (error) {
    logDatabaseError("Sheet link save failed", error);
    return jsonResponse({ error: "Could not save the Google Sheet link. Try again." }, 500);
  }

  return jsonResponse({ serviceAccountEmail, link: saved });
}

servePost(async (body, authorization) => {
  const action = readString(body, "action");

  if (action === "sync") return await handleSync(authorization);
  if (action === "status" || action === "link" || action === "unlink") {
    return await handleAdminAction(action, body, authorization);
  }

  return jsonResponse({ error: "Unknown action." }, 400);
});
