import { jsonResponse } from "./http.ts";
import { type DatabaseError, logDatabaseError } from "./supabase.ts";

/**
 * Maps a database error to a public response. A rule matches when the error
 * code is in `codes` or the lowercased message contains any of `messages`.
 * Rules are checked in order, so put the most specific ones first.
 */
export type ErrorRule = {
  codes?: string[];
  messages?: string[];
  status: number;
  code: string;
  error: string;
};

export type ErrorFallback = {
  code: string;
  error: string;
};

function findRule(error: DatabaseError, rules: ErrorRule[]) {
  const message = (error.message ?? "").toLowerCase();

  return rules.find(
    (rule) =>
      (error.code !== undefined && rule.codes?.includes(error.code)) ||
      rule.messages?.some((fragment) => message.includes(fragment)),
  );
}

/** Logs the raw database error and returns the matching public error response. */
export function databaseErrorResponse(
  label: string,
  error: DatabaseError,
  rules: ErrorRule[],
  fallback: ErrorFallback,
) {
  logDatabaseError(label, error);

  const rule = findRule(error, rules);
  if (!rule) {
    return jsonResponse({ ...fallback }, 400);
  }

  return jsonResponse({ code: rule.code, error: rule.error }, rule.status);
}
