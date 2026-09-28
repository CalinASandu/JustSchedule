import { useEffect, useState, type FormEvent } from "react";
import { Check, Copy, ExternalLink, Loader2, Sheet, Unlink } from "lucide-react";
import { callGoogleSheetsFunction, type SchoolSheetLink } from "./api";
import { ErrorBanner } from "./shared";

type SettingsGoogleSheetPanelProps = {
  schoolId: string;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

const inputStyle = {
  background: "var(--surface-panel)",
  border: "1.5px solid var(--border-default)",
  color: "var(--text-primary)",
};

const secondaryButtonClass =
  "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors duration-150 hover:bg-[var(--surface-subtle)] disabled:cursor-not-allowed";

export function SettingsGoogleSheetPanel({ schoolId }: SettingsGoogleSheetPanelProps) {
  const [loading, setLoading] = useState(true);
  const [serviceAccountEmail, setServiceAccountEmail] = useState("");
  const [link, setLink] = useState<SchoolSheetLink | null>(null);
  const [sheetUrl, setSheetUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [state, setState] = useState<{ error: string | null; pending: boolean }>({
    error: null,
    pending: false,
  });

  useEffect(() => {
    let cancelled = false;

    callGoogleSheetsFunction({ action: "status", schoolId }).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result.error !== null) {
        setState({ error: result.error, pending: false });
        return;
      }
      setServiceAccountEmail(result.data.serviceAccountEmail ?? "");
      setLink(result.data.link ?? null);
    });

    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  async function copyEmail() {
    await navigator.clipboard.writeText(serviceAccountEmail);
    setCopied(true);
  }

  async function linkSheet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sheetUrl.trim()) return;

    setState({ error: null, pending: true });
    const result = await callGoogleSheetsFunction({
      action: "link",
      schoolId,
      sheetUrl: sheetUrl.trim(),
    });

    if (result.error !== null) {
      setState({ error: result.error, pending: false });
      return;
    }

    setLink(result.data.link ?? null);
    setSheetUrl("");
    setState({ error: null, pending: false });
  }

  async function unlinkSheet() {
    setState({ error: null, pending: true });
    const result = await callGoogleSheetsFunction({ action: "unlink", schoolId });

    if (result.error !== null) {
      setState({ error: result.error, pending: false });
      return;
    }

    setLink(null);
    setState({ error: null, pending: false });
  }

  return (
    <div
      className="rounded-[10px] border p-4"
      style={{ background: "var(--surface-panel)", borderColor: "var(--border-default)" }}
    >
      <div className="mb-4 flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ background: "var(--success-subtle)" }}
        >
          <Sheet size={16} color="var(--success)" strokeWidth={1.8} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Google Sheet
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>
            New reservations are written into your planning spreadsheet, one tab per week,
            within about a minute. Cancelled reservations are removed from it. Reservations made
            before linking are not copied.
          </p>
        </div>
      </div>

      {state.error && <ErrorBanner message={state.error} />}

      {loading ? (
        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
          <Loader2 size={15} className="animate-spin" />
          Loading…
        </div>
      ) : link ? (
        <div
          className="rounded-[10px] border p-3"
          style={{ background: "var(--surface-subtle)", borderColor: "var(--border-default)" }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <a
                href={`https://docs.google.com/spreadsheets/d/${link.spreadsheet_id}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex max-w-full items-center gap-1.5 text-sm font-semibold hover:underline"
                style={{ color: "var(--accent-color)" }}
              >
                <span className="truncate">{link.spreadsheet_title || "Linked spreadsheet"}</span>
                <ExternalLink size={14} className="shrink-0" />
              </a>
              <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                Linked {formatDateTime(link.linked_at)}
                {link.last_synced_at
                  ? ` · Last update ${formatDateTime(link.last_synced_at)}`
                  : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={unlinkSheet}
              disabled={state.pending}
              className={secondaryButtonClass}
              style={{ border: "1px solid var(--border-default)", color: "var(--text-secondary)" }}
            >
              {state.pending ? <Loader2 size={15} className="animate-spin" /> : <Unlink size={15} />}
              Unlink
            </button>
          </div>
          {link.last_error && (
            <p
              className="mt-3 text-[0.8125rem]"
              style={{
                color: "var(--danger)",
                background: "var(--danger-subtle)",
                border: "1px solid var(--danger-border)",
                borderRadius: 8,
                padding: "0.5rem 0.75rem",
              }}
            >
              Last update failed: {link.last_error} It will retry automatically.
            </p>
          )}
        </div>
      ) : (
        <ol className="flex flex-col gap-4 text-sm" style={{ color: "var(--text-body)" }}>
          <li>
            <p className="mb-2">
              <span className="font-semibold">1.</span> In Google Sheets, click{" "}
              <span className="font-semibold">Share</span> and add this address as an{" "}
              <span className="font-semibold">Editor</span>:
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <code
                className="min-w-0 flex-1 truncate rounded-[10px] px-3 py-2 text-[0.8125rem]"
                style={{ background: "var(--surface-subtle)", color: "var(--text-primary)" }}
              >
                {serviceAccountEmail || "Unavailable"}
              </code>
              <button
                type="button"
                onClick={copyEmail}
                disabled={!serviceAccountEmail}
                className={secondaryButtonClass}
                style={{ border: "1px solid var(--border-default)", color: "var(--text-secondary)" }}
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </li>
          <li>
            <label htmlFor="google-sheet-url" className="mb-2 block">
              <span className="font-semibold">2.</span> Paste the spreadsheet link:
            </label>
            <form onSubmit={linkSheet} className="flex flex-col gap-2 sm:flex-row">
              <input
                id="google-sheet-url"
                type="url"
                inputMode="url"
                autoComplete="off"
                value={sheetUrl}
                onChange={(event) => setSheetUrl(event.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/…"
                className="h-[2.625rem] min-w-0 flex-1 rounded-[10px] px-3 text-[0.9375rem] outline-none transition-[border-color,box-shadow]"
                style={inputStyle}
              />
              <button
                type="submit"
                disabled={state.pending || !sheetUrl.trim()}
                className="inline-flex h-[2.625rem] items-center justify-center gap-2 rounded-[10px] px-4 text-[0.9375rem] font-semibold transition-colors duration-150 disabled:cursor-not-allowed"
                style={{
                  color: "var(--text-on-accent)",
                  background:
                    state.pending || !sheetUrl.trim()
                      ? "var(--accent-disabled)"
                      : "var(--accent-color)",
                }}
              >
                {state.pending && <Loader2 size={16} className="animate-spin" />}
                Link sheet
              </button>
            </form>
          </li>
        </ol>
      )}
    </div>
  );
}
