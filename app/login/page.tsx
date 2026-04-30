"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitCooldown, setSubmitCooldown] = useState(5);
  const router = useRouter();

  useEffect(() => {
    if (submitCooldown === 0) return;

    const timeout = window.setTimeout(() => {
      setSubmitCooldown((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [submitCooldown]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitCooldown > 0) return;

    const trimmed = name.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Not signed in. Please sign in with Google first.");
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("Profiles")
      .update({ name: trimmed })
      .eq("id", user.id);



      
    if (updateError) {
      setError("Failed to save your name. Please try again.");
      setLoading(false);
      return;
    }

    router.replace("/dashboard/schedule");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f7f8fa",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      }}
    >
      {/* Subtle grid background */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage:
            "linear-gradient(#e4e8ef 1px, transparent 1px), linear-gradient(90deg, #e4e8ef 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          opacity: 0.35,
          pointerEvents: "none",
        }}
      />

      <div
        className="anim-slide-up"
        style={{ width: "100%", maxWidth: 420, position: "relative" }}
      >
        {/* Logo row */}
        <div
          className="anim-fade-in"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "1.75rem",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="5" height="5" rx="1" fill="white" />
              <rect
                x="9"
                y="2"
                width="5"
                height="5"
                rx="1"
                fill="white"
                opacity="0.6"
              />
              <rect
                x="2"
                y="9"
                width="5"
                height="5"
                rx="1"
                fill="white"
                opacity="0.6"
              />
              <rect x="9" y="9" width="5" height="5" rx="1" fill="white" />
            </svg>
          </div>
          <span
            style={{
              fontSize: "0.95rem",
              fontWeight: 600,
              color: "#111827",
              letterSpacing: "-0.01em",
            }}
          >
            JustSchedule
          </span>
        </div>

        {/* Card */}
        <div
          className="panel anim-slide-up anim-d1"
          style={{ padding: "2rem" }}
        >
          {/* Header */}
          <div style={{ marginBottom: "1.75rem" }}>
            <h1
              style={{
                fontSize: "1.35rem",
                fontWeight: 700,
                color: "#111827",
                letterSpacing: "-0.025em",
                marginBottom: "0.4rem",
                lineHeight: 1.25,
              }}
            >
              What&apos;s your name?
            </h1>
            <p
              style={{
                fontSize: "0.875rem",
                color: "#6b7280",
                lineHeight: 1.5,
              }}
            >
              This is how you&apos;ll appear in bookings and seat assignments.
            </p>
            <p
              style={{
                fontSize: "1rem",
                color: "#6b7280",
                lineHeight: 1.5,
                fontWeight: "bold",
                paddingTop: "0.4rem",
              }}
            >
              Please input your real full name otherwise you will not be
              approved into the schools you may try to join.
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <div>
              <label
                htmlFor="name"
                style={{
                  display: "block",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  color: "#374151",
                  marginBottom: "0.4rem",
                }}
              >
                Full name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Ionescu"
                required
                style={{
                  width: "100%",
                  height: "2.625rem",
                  borderRadius: 10,
                  border: "1.5px solid #e4e8ef",
                  background: "#ffffff",
                  padding: "0 0.875rem",
                  fontSize: "0.9375rem",
                  color: "#111827",
                  outline: "none",
                  transition: "border-color 150ms, box-shadow 150ms",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "#3b82f6";
                  e.currentTarget.style.boxShadow =
                    "0 0 0 3px rgba(59,130,246,0.12)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "#e4e8ef";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            {error && (
              <p
                className="anim-fade-in"
                style={{
                  fontSize: "0.8125rem",
                  color: "#dc2626",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 8,
                  padding: "0.5rem 0.75rem",
                  margin: 0,
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || submitCooldown > 0 || !name.trim()}
              style={{
                height: "2.625rem",
                borderRadius: 10,
                background:
                  loading || submitCooldown > 0 || !name.trim()
                    ? "#93c5fd"
                    : "#2563eb",
                color: "#ffffff",
                fontWeight: 600,
                fontSize: "0.9375rem",
                border: "none",
                cursor:
                  loading || submitCooldown > 0 || !name.trim()
                    ? "not-allowed"
                    : "pointer",
                transition:
                  "background 150ms, transform 80ms, box-shadow 150ms",
                letterSpacing: "-0.01em",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                boxShadow:
                  loading || submitCooldown > 0 || !name.trim()
                    ? "none"
                    : "0 1px 3px rgba(37,99,235,0.25), 0 4px 12px rgba(37,99,235,0.12)",
              }}
              onMouseEnter={(e) => {
                if (!loading && submitCooldown === 0 && name.trim()) {
                  e.currentTarget.style.background = "#1d4ed8";
                  e.currentTarget.style.boxShadow =
                    "0 2px 6px rgba(37,99,235,0.3), 0 6px 18px rgba(37,99,235,0.18)";
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && submitCooldown === 0 && name.trim()) {
                  e.currentTarget.style.background = "#2563eb";
                  e.currentTarget.style.boxShadow =
                    "0 1px 3px rgba(37,99,235,0.25), 0 4px 12px rgba(37,99,235,0.12)";
                }
              }}
              onMouseDown={(e) => {
                if (!loading && submitCooldown === 0 && name.trim())
                  e.currentTarget.style.transform = "scale(0.985)";
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              {loading ? (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    style={{ animation: "swapSpin 0.7s linear infinite" }}
                  >
                    <path
                      d="M8 2a6 6 0 1 0 6 6"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  Saving…
                </>
              ) : submitCooldown > 0 ? (
                `Read first (${submitCooldown}s)`
              ) : (
                "Continue"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
