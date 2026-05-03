"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
const posthogUiHost = posthogHost.includes("eu.")
  ? "https://eu.posthog.com"
  : "https://us.posthog.com";

if (typeof window !== "undefined" && posthogKey && !posthog.__loaded) {
  posthog.init(posthogKey, {
    api_host: "/_jsd",
    ui_host: posthogUiHost,
    defaults: "2026-01-30",
    debug: process.env.NODE_ENV === "development",
    person_profiles: "identified_only",
    capture_pageview: false,
  });
}

if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  if (posthogKey) {
    (window as typeof window & { posthog?: typeof posthog }).posthog = posthog;
  } else {
    console.warn("PostHog is disabled because NEXT_PUBLIC_POSTHOG_KEY is missing.");
  }
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return <PHProvider client={posthog}>{children}</PHProvider>;
}
