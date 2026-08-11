"use client";

/**
 * External store tracking which release a user has already seen.
 *
 * The source of truth lives outside React, in localStorage, so it is read
 * through `useSyncExternalStore` for the same reason the theme is
 * (`lib/theme-store.ts`): the server snapshot and the first client render stay
 * in agreement without a setState-in-effect hydration dance.
 *
 * Storage is per-device and per-browser: the same person sees a release once
 * on their laptop and once on their phone, and clearing site data resets it.
 * That tradeoff was chosen deliberately over a `Profiles` column to keep this
 * feature free of database and RLS changes. Every localStorage access for
 * release notes lives here, so moving to a server-backed marker later is a
 * single-file change.
 */

import { RELEASES, getLatestVersion, type Release } from "./release-notes";

/** Versioned key, so a future format change cannot be misread as a valid marker. */
export const RELEASE_SEEN_KEY = "js-release-seen:v1";

/**
 * Snapshots are plain strings so repeated reads stay referentially stable,
 * which `useSyncExternalStore` requires. Real markers are prefixed to keep
 * them from ever colliding with a sentinel.
 */
const PENDING = "pending";
const UNAVAILABLE = "unavailable";
const NONE = "none";
const DISMISSED = "dismissed";
const VERSION_PREFIX = "v:";

const listeners = new Set<() => void>();

/**
 * Set once the dialog has been dismissed in this tab. It covers the case where
 * the write below throws: without it, a blocked storage write would let the
 * dialog reappear on the next navigation within the same session.
 */
let dismissedThisSession = false;

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function getSnapshot(): string {
  if (dismissedThisSession) return DISMISSED;

  try {
    const stored = window.localStorage.getItem(RELEASE_SEEN_KEY);
    return stored === null ? NONE : `${VERSION_PREFIX}${stored}`;
  } catch {
    // Private browsing, disabled storage, or a blocked third-party context.
    return UNAVAILABLE;
  }
}

export function getServerSnapshot(): string {
  return PENDING;
}

export function markLatestReleaseSeen(): void {
  const latest = getLatestVersion();
  if (!latest) return;

  dismissedThisSession = true;

  // The newest version, not the oldest unseen one, so catching up on several
  // releases at once stays a single interaction.
  try {
    window.localStorage.setItem(RELEASE_SEEN_KEY, latest);
  } catch {
    // Nothing to recover: the dialog still closes for the rest of the session.
  }

  emit();
}

/**
 * Releases to show for a snapshot, newest first.
 *
 * Before hydration nothing is known, and when storage is blocked the dialog
 * would reappear on every navigation with no way to dismiss it for good. Both
 * cases show nothing.
 *
 * A user with no marker gets only the latest release rather than the whole
 * history, so a new account sees one short welcome instead of a changelog for
 * features they never missed. An unrecognised marker (hand-edited, or from a
 * rolled-back deploy) is treated the same as no marker.
 */
export function getUnseenReleases(snapshot: string): Release[] {
  if (snapshot === PENDING || snapshot === UNAVAILABLE || snapshot === DISMISSED) return [];
  if (RELEASES.length === 0) return [];
  if (snapshot === NONE) return [RELEASES[0]];

  const seen = snapshot.slice(VERSION_PREFIX.length);
  const seenIndex = RELEASES.findIndex((release) => release.version === seen);
  if (seenIndex === -1) return [RELEASES[0]];

  return RELEASES.slice(0, seenIndex);
}
