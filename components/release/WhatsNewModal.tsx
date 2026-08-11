"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  getServerSnapshot,
  getSnapshot,
  getUnseenReleases,
  markLatestReleaseSeen,
  subscribe,
} from "@/lib/release-seen";
import { ReleaseNotesDialog } from "./ReleaseNotesDialog";

/**
 * Shows the release-notes dialog once per release, on the first authenticated
 * page a user lands on after an update.
 *
 * The server snapshot resolves to nothing, so this renders `null` until
 * hydration. The dialog arriving a beat after paint is intended: it is an
 * entrance, not a flash of corrected state.
 */
export default function WhatsNewModal() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const releases = useMemo(() => getUnseenReleases(snapshot), [snapshot]);

  if (releases.length === 0) return null;

  return <ReleaseNotesDialog releases={releases} onDismiss={markLatestReleaseSeen} />;
}
