"use client";

/**
 * External store backing the theme.
 *
 * The source of truth lives outside React: the preference is a cookie and
 * the applied theme is the `dark` class on <html>, both of which are set
 * by THEME_INIT_SCRIPT before React ever runs. Reading them through
 * `useSyncExternalStore` keeps the server snapshot and the first client
 * render in agreement without a setState-in-effect hydration dance.
 */

import {
  DEFAULT_THEME,
  THEME_COOKIE,
  THEME_COOKIE_MAX_AGE,
  parseTheme,
  type ResolvedTheme,
  type Theme,
} from "@/lib/theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function prefersDark() {
  return window.matchMedia(DARK_QUERY).matches;
}

/** Recomputes the applied theme from the stored preference and the OS. */
function syncDocument() {
  const resolved: ResolvedTheme =
    getStoredTheme() === "dark" ||
    (getStoredTheme() === "system" && prefersDark())
      ? "dark"
      : "light";

  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

export function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);

  const media = window.matchMedia(DARK_QUERY);
  const handleMediaChange = () => {
    // Only matters while the preference is `system`, but syncing
    // unconditionally is cheap and keeps the DOM authoritative.
    syncDocument();
    onStoreChange();
  };

  media.addEventListener("change", handleMediaChange);

  return () => {
    listeners.delete(onStoreChange);
    media.removeEventListener("change", handleMediaChange);
  };
}

export function getStoredTheme(): Theme {
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${THEME_COOKIE}=([^;]*)`),
  );

  return parseTheme(match ? decodeURIComponent(match[1]) : null);
}

export function getServerTheme(): Theme {
  return DEFAULT_THEME;
}

export function getResolvedTheme(): ResolvedTheme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function getServerResolvedTheme(): ResolvedTheme {
  return "light";
}

export function setStoredTheme(next: Theme) {
  document.cookie = `${THEME_COOKIE}=${encodeURIComponent(next)}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax`;
  syncDocument();
  emit();
}

/* --- hydration flag ------------------------------------------------ */

const noopSubscribe = () => () => {};

export const mountedStore = {
  subscribe: noopSubscribe,
  getSnapshot: () => true,
  getServerSnapshot: () => false,
};
