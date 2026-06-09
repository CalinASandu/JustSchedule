export function getCompletedProfileName(
  profile: { name?: string | null } | null | undefined,
) {
  return typeof profile?.name === "string" ? profile.name.trim() : "";
}

export function getProfileNameSetupPath(nextPath: string) {
  return `/login?next=${encodeURIComponent(nextPath)}`;
}
