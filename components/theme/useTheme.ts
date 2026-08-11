"use client";

import { useSyncExternalStore } from "react";
import {
  getResolvedTheme,
  getServerResolvedTheme,
  getServerTheme,
  getStoredTheme,
  mountedStore,
  setStoredTheme,
  subscribe,
} from "@/lib/theme-store";
import type { ResolvedTheme, Theme } from "@/lib/theme";

type UseThemeResult = {
  /** The stored preference, which may be `system`. */
  theme: Theme;
  /** What is actually on screen right now. */
  resolvedTheme: ResolvedTheme;
  /** False until after hydration, so callers can avoid mismatched markup. */
  mounted: boolean;
  setTheme: (next: Theme) => void;
};

/**
 * No provider is required. The cookie and the `dark` class on <html> are
 * the source of truth, both set by THEME_INIT_SCRIPT before React runs,
 * so any component can subscribe to the module-level store directly.
 */
export function useTheme(): UseThemeResult {
  const theme = useSyncExternalStore(subscribe, getStoredTheme, getServerTheme);
  const resolvedTheme = useSyncExternalStore(
    subscribe,
    getResolvedTheme,
    getServerResolvedTheme,
  );
  const mounted = useSyncExternalStore(
    mountedStore.subscribe,
    mountedStore.getSnapshot,
    mountedStore.getServerSnapshot,
  );

  return { theme, resolvedTheme, mounted, setTheme: setStoredTheme };
}
