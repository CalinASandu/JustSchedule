"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type NotificationBellItem = {
  id: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

type NotificationBellProps = {
  notifications: NotificationBellItem[];
};

function formatNoticeTime(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function NotificationBell({ notifications }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(() =>
    notifications.filter((notification) => !notification.readAt),
  );
  const unreadCount = useMemo(() => items.length, [items]);

  async function markRead(ids: string[]) {
    if (ids.length === 0) return;

    setItems((current) => current.filter((notification) => !ids.includes(notification.id)));

    const supabase = createClient();
    const { error } = await supabase.rpc("mark_user_notifications_read", {
      target_notification_ids: ids,
    });

    if (error) {
      console.error("Mark notifications read failed", error);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative flex h-8 w-8 items-center justify-center rounded-xl transition-colors duration-150 hover:bg-slate-50"
        style={{ border: "1px solid #E4E8EF", color: "#6B7280" }}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell size={15} strokeWidth={1.9} />
        {unreadCount > 0 && (
          <span
            className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white"
            style={{ background: "#2563EB" }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-40 mt-2 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-[12px] bg-white"
          style={{
            border: "1px solid #E4E8EF",
            boxShadow: "0 14px 40px rgba(15,23,42,0.14)",
          }}
        >
          <div className="flex items-center justify-between gap-3 border-b border-[#E4E8EF] px-4 py-3">
            <div>
              <p className="text-sm font-semibold" style={{ color: "#111827" }}>
                Notifications
              </p>
              <p className="text-xs" style={{ color: "#9CA3AF" }}>
                Loaded when this page opened
              </p>
            </div>
            <button
              type="button"
              onClick={() => markRead(items.map((item) => item.id))}
              disabled={unreadCount === 0}
              className="inline-flex h-8 items-center gap-1.5 rounded-[10px] px-2.5 text-xs font-semibold transition-colors duration-150 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ border: "1px solid #E4E8EF", color: "#6B7280" }}
            >
              <CheckCheck size={13} />
              Seen
            </button>
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-5">
                <p className="text-sm font-medium" style={{ color: "#111827" }}>
                  No notices
                </p>
                <p className="mt-1 text-sm" style={{ color: "#6B7280" }}>
                  Exam request updates will appear here.
                </p>
              </div>
            ) : (
              items.map((notification) => {
                const content = (
                  <div className="flex gap-3 px-4 py-3 transition-colors duration-150 hover:bg-slate-50">
                    <span
                      className="mt-1 h-2 w-2 shrink-0 rounded-full"
                      style={{ background: "#2563EB" }}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold" style={{ color: "#111827" }}>
                        {notification.title}
                      </span>
                      <span className="mt-1 block text-sm" style={{ color: "#6B7280", lineHeight: 1.45 }}>
                        {notification.body}
                      </span>
                      <span className="mt-1.5 block text-xs" style={{ color: "#9CA3AF" }}>
                        {formatNoticeTime(notification.createdAt)}
                      </span>
                    </span>
                  </div>
                );

                return notification.href ? (
                  <Link
                    key={notification.id}
                    href={notification.href}
                    onClick={() => {
                      void markRead([notification.id]);
                      setOpen(false);
                    }}
                    className="block border-b border-[#F3F4F6] last:border-b-0"
                  >
                    {content}
                  </Link>
                ) : (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => markRead([notification.id])}
                    className="block w-full border-b border-[#F3F4F6] text-left last:border-b-0"
                  >
                    {content}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
