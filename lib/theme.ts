/**
 * Theme preference is stored in a cookie, not in `Profiles`.
 *
 * The theme must be resolved before first paint, and cookies arrive with
 * every request - including on pre-auth surfaces (landing, /login,
 * /invite/[token]) where no readable Profiles row exists. A database
 * column would require an authenticated round-trip on the render path.
 *
 * The cookie is deliberately not httpOnly: the pre-paint script in the
 * root layout reads it from `document.cookie`, which keeps every route's
 * current static/dynamic rendering behaviour intact.
 */

export const THEME_COOKIE = "js-theme";
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export const THEMES = ["light", "dark", "system"] as const;

export type Theme = (typeof THEMES)[number];

/** Theme actually applied to the document, after `system` is resolved. */
export type ResolvedTheme = "light" | "dark";

export const DEFAULT_THEME: Theme = "system";

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

export function parseTheme(value: string | undefined | null): Theme {
  return isTheme(value) ? value : DEFAULT_THEME;
}

/**
 * The script injected into the document before paint. Kept as a single
 * expression string so it can be inlined verbatim; it must not throw in
 * private-browsing modes where cookie access can be restricted.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|;\\s*)${THEME_COOKIE}=([^;]*)/);var t=m?decodeURIComponent(m[1]):"${DEFAULT_THEME}";if(t!=="light"&&t!=="dark"&&t!=="system"){t="${DEFAULT_THEME}"}var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var e=document.documentElement;e.classList.toggle("dark",d);e.style.colorScheme=d?"dark":"light"}catch(_){}})();`;
