import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Link2, Loader2 } from "lucide-react";
import { createSchoolInvite } from "./api";
import { dateInputToEndOfDay, getDefaultExpiryDate, getTodayKey } from "./date-utils";
import { formatDate } from "./formatters";
import { EmptyState, ErrorBanner } from "./shared";
import type { SchoolInvite } from "./types";

type InvitesTabProps = {
  schoolId: string;
  invites: SchoolInvite[];
  inviteError: string | null;
  embedded?: boolean;
};

export function InvitesTab({
  schoolId,
  invites,
  inviteError,
  embedded = false,
}: InvitesTabProps) {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [expiresOn, setExpiresOn] = useState(getDefaultExpiryDate);
  const [generatedInvites, setGeneratedInvites] = useState<SchoolInvite[]>([]);
  const [inviteState, setInviteState] = useState<{ error: string | null; pending: boolean }>({
    error: null,
    pending: false,
  });
  const visibleInvites = useMemo(() => {
    const existingUrls = new Set(invites.map((invite) => invite.url));
    return [
      ...generatedInvites.filter((invite) => !existingUrls.has(invite.url)),
      ...invites,
    ];
  }, [generatedInvites, invites]);

  useEffect(() => {
    if (!copiedUrl) {
      return;
    }

    const timeout = window.setTimeout(() => setCopiedUrl(null), 1600);
    return () => window.clearTimeout(timeout);
  }, [copiedUrl]);

  async function copyInvite(url: string) {
    await navigator.clipboard.writeText(url);
    setCopiedUrl(url);
  }

  async function createInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInviteState({ error: null, pending: true });

    const expiresAt = dateInputToEndOfDay(expiresOn);
    const result = await createSchoolInvite({
      schoolId,
      expiresAt,
      siteUrl: window.location.origin,
    });

    if (result.error) {
      setInviteState({ error: result.error, pending: false });
      return;
    }

    const inviteUrl = result.data;
    if (!inviteUrl) {
      setInviteState({ error: "The invite function returned an invalid response.", pending: false });
      return;
    }

    setGeneratedInvites((current) => [
      {
        id: `generated-${crypto.randomUUID()}`,
        token: inviteUrl.split("/").pop() ?? "",
        createdAt: new Date().toISOString(),
        expiresAt,
        isActive: true,
        url: inviteUrl,
      },
      ...current,
    ]);
    setInviteState({ error: null, pending: false });
  }

  return (
    <div className={embedded ? "" : "p-5"}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "#111827" }}>
            Invite links
          </h2>
          <p className="mt-1 text-sm" style={{ color: "#6B7280" }}>
            Generate links like /invite/invitetoken.
          </p>
        </div>
        <form
          onSubmit={createInvite}
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
        >
          <div>
            <label
              htmlFor="invite-expires-on"
              className="mb-1.5 block text-[0.8125rem] font-medium"
              style={{ color: "#374151" }}
            >
              Expires on
            </label>
            <input
              id="invite-expires-on"
              type="date"
              required
              min={getTodayKey()}
              value={expiresOn}
              onChange={(event) => setExpiresOn(event.target.value)}
              className="h-[2.625rem] rounded-[10px] bg-white px-3 text-[0.9375rem] outline-none transition-[border-color,box-shadow]"
              style={{ border: "1.5px solid #E4E8EF", color: "#111827" }}
              onFocus={(event) => {
                event.currentTarget.style.borderColor = "#3B82F6";
                event.currentTarget.style.boxShadow =
                  "0 0 0 3px rgba(59,130,246,0.12)";
              }}
              onBlur={(event) => {
                event.currentTarget.style.borderColor = "#E4E8EF";
                event.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>
          <button
            type="submit"
            disabled={inviteState.pending}
            className="inline-flex h-[2.625rem] items-center justify-center gap-2 rounded-[10px] px-4 text-[0.9375rem] font-semibold text-white transition-colors duration-150 disabled:cursor-not-allowed"
            style={{
              background: inviteState.pending ? "#93C5FD" : "#2563EB",
              boxShadow: inviteState.pending
                ? "none"
                : "0 1px 3px rgba(37,99,235,0.25), 0 4px 12px rgba(37,99,235,0.12)",
            }}
          >
            {inviteState.pending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Link2 size={16} />
            )}
            Generate link
          </button>
        </form>
      </div>

      {(inviteState.error || inviteError) && (
        <ErrorBanner message={inviteState.error ?? inviteError ?? ""} />
      )}

      <div className="space-y-3">
        {visibleInvites.length === 0 ? (
          <EmptyState
            title="No invite links yet"
            description="Generate one when you are ready to invite students or professors."
          />
        ) : (
          visibleInvites.map((invite) => (
            <div
              key={invite.id}
              className="rounded-[10px] border border-[#E4E8EF] p-4"
              style={{ background: "#FFFFFF" }}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p
                    className="truncate text-sm font-semibold"
                    style={{ color: "#111827" }}
                  >
                    {invite.url}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: "#9CA3AF" }}>
                    Expires {formatDate(invite.expiresAt)}{" \u00b7 "}
                    {invite.isActive ? "Active" : "Inactive"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => copyInvite(invite.url)}
                  className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors duration-150 hover:bg-slate-50"
                  style={{ border: "1px solid #E4E8EF", color: "#6B7280" }}
                >
                  {copiedUrl === invite.url ? (
                    <Check size={15} />
                  ) : (
                    <Copy size={15} />
                  )}
                  {copiedUrl === invite.url ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
