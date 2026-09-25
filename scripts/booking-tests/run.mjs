#!/usr/bin/env node
/**
 * Integration tests for the booking Edge Functions and RPCs.
 *
 * Runs against the LIVE Supabase project with three dedicated test accounts
 * (student, professor, admin) inside the real school, then cleans up. Every
 * result is saved so a later run can be diffed against a baseline:
 *
 *   node scripts/booking-tests/run.mjs --run --label baseline
 *   node scripts/booking-tests/run.mjs --run --label after --compare baseline
 *   node scripts/booking-tests/run.mjs --run --label canary --suffix -canary --compare baseline
 *
 * See README.md in this folder before running.
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..");
const resultsDir = join(here, "results");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { run: false, label: "run", compare: null, suffix: "" };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--run") args.run = true;
    else if (arg === "--label") args.label = argv[++i];
    else if (arg === "--compare") args.compare = argv[++i];
    else if (arg === "--suffix") args.suffix = argv[++i];
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const env = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

const args = parseArgs(process.argv.slice(2));
const env = {
  ...loadEnvFile(join(repoRoot, ".env.local")),
  ...loadEnvFile(join(repoRoot, ".env.test.local")),
  ...process.env,
};

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLISHABLE_KEY = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const SCHOOL_TIMEZONE = "Europe/Bucharest";

const TEST_ACCOUNTS = {
  student: { email: "justschedule.test.student@example.com", name: "Test Student (automated)" },
  professor: { email: "justschedule.test.professor@example.com", name: "Test Professor (automated)" },
  admin: { email: "justschedule.test.admin@example.com", name: "Test Admin (automated)" },
};

if (!args.run) {
  console.log(
    "This script writes to the LIVE database (test accounts, test bookings, cleanup).\n" +
      "Read scripts/booking-tests/README.md, then re-run with --run.",
  );
  process.exit(0);
}

if (!SUPABASE_URL || !PUBLISHABLE_KEY || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, or " +
      "SUPABASE_SERVICE_ROLE_KEY (.env.local / .env.test.local).",
  );
  process.exit(1);
}

const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------------------------------------------------------------------------
// Result recording
// ---------------------------------------------------------------------------

const results = [];

function record(name, outcome) {
  results.push({ name, ...outcome });
  const mark = outcome.skipped ? "SKIP" : outcome.ok === false || outcome.status >= 400 ? "ERR " : "OK  ";
  const detail = outcome.skipped ?? outcome.code ?? outcome.message ?? outcome.error ?? "";
  console.log(`${mark} ${name}${outcome.status ? ` [${outcome.status}]` : ""} ${detail}`);
}

/** Keeps only what should be stable between runs: status, code, message, and response keys. */
function summarizeFunction(response) {
  const body = response.json;
  return {
    status: response.status,
    code: body?.code ?? null,
    error: body?.error ?? null,
    keys: body && typeof body === "object" ? Object.keys(body).sort() : [],
  };
}

function summarizeRpc(response, pick = []) {
  const row = Array.isArray(response.data) ? response.data[0] : response.data;
  const picked = Object.fromEntries(pick.map((key) => [key, row?.[key] ?? null]));
  return {
    ok: !response.error,
    code: response.error?.code ?? null,
    message: response.error?.message ?? null,
    ...picked,
  };
}

// ---------------------------------------------------------------------------
// Calling the API as a test user
// ---------------------------------------------------------------------------

async function callFunction(slug, session, body, { method = "POST", rawBody } = {}) {
  const headers = { apikey: PUBLISHABLE_KEY, "Content-Type": "application/json" };
  if (session) headers.Authorization = `Bearer ${session.access_token}`;

  const response = await fetch(`${SUPABASE_URL}/functions/v1/${slug}${args.suffix}`, {
    method,
    headers,
    body: method === "POST" ? (rawBody ?? JSON.stringify(body ?? {})) : undefined,
  });

  let json = null;
  try {
    json = await response.json();
  } catch {
    // Non-JSON bodies (e.g. gateway errors) are summarized by status only.
  }
  return { status: response.status, json };
}

function userClient(session) {
  return createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function rpc(session, fn, params) {
  return userClient(session).rpc(fn, params);
}

// ---------------------------------------------------------------------------
// Test accounts and sessions (no Google involved)
// ---------------------------------------------------------------------------

async function findUserByEmail(email) {
  for (let page = 1; ; page += 1) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const match = data.users.find((user) => user.email === email);
    if (match || data.users.length < 1000) return match ?? null;
  }
}

async function ensureAccount({ email, name }) {
  let user = await findUserByEmail(email);
  if (!user) {
    const { data, error } = await service.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: name },
    });
    if (error) throw error;
    user = data.user;
  }

  const { error: profileError } = await service
    .from("Profiles")
    .upsert({ id: user.id, name }, { onConflict: "id" });
  if (profileError) throw profileError;

  return user;
}

/**
 * Mints a real user session through the admin API: a magic-link token that is
 * verified immediately, without sending any email. Falls back to a throwaway
 * password if the project rejects magic-link verification.
 */
async function signIn(user) {
  const anon = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: link, error: linkError } = await service.auth.admin.generateLink({
    type: "magiclink",
    email: user.email,
  });

  if (!linkError) {
    const { data, error } = await anon.auth.verifyOtp({
      token_hash: link.properties.hashed_token,
      type: "magiclink",
    });
    if (!error && data.session) return data.session;
    console.warn(`Magic-link sign-in failed for ${user.email}: ${error?.message}`);
  }

  const password = `${randomUUID()}Aa1!`;
  const { error: updateError } = await service.auth.admin.updateUserById(user.id, { password });
  if (updateError) throw updateError;

  const { data, error } = await anon.auth.signInWithPassword({ email: user.email, password });
  if (error) throw new Error(`Could not create a session for ${user.email}: ${error.message}`);
  return data.session;
}

// ---------------------------------------------------------------------------
// Test fixtures from the live school
// ---------------------------------------------------------------------------

function schoolDateKey(offsetDays) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: SCHOOL_TIMEZONE }).format(new Date());
  const date = new Date(`${today}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function isWeekend(dateKey) {
  const day = new Date(`${dateKey}T12:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

/** Latest weekday within the booking window, walking back from `startOffset`. */
function weekdayAtOrBefore(startOffset) {
  for (let offset = startOffset; offset > 0; offset -= 1) {
    const key = schoolDateKey(offset);
    if (!isWeekend(key)) return { key, offset };
  }
  throw new Error("No weekday found in the booking window.");
}

async function resolveSchool() {
  if (env.TEST_SCHOOL_ID) return env.TEST_SCHOOL_ID;

  const { data, error } = await service.from("Schools").select("id, name").is("deleted_at", null);
  if (error) throw error;
  if (data.length !== 1) {
    throw new Error(
      `Found ${data.length} active schools; set TEST_SCHOOL_ID in .env.test.local to pick one.`,
    );
  }
  return data[0].id;
}

async function loadFixtures(schoolId) {
  const primaryDate = weekdayAtOrBefore(14);
  const secondaryDate = weekdayAtOrBefore(primaryDate.offset - 1);
  let weekendDate = null;
  for (let offset = 1; offset <= 14 && !weekendDate; offset += 1) {
    if (isWeekend(schoolDateKey(offset))) weekendDate = schoolDateKey(offset);
  }

  const [{ data: subjects, error: subjectError }, { data: slots, error: slotError }] =
    await Promise.all([
      service.from("SchoolSubjects").select("name").eq("school_id", schoolId).is("deleted_at", null).order("name"),
      service
        .from("ExamSlots")
        .select("id, name, capacity, slot_kind, is_active")
        .eq("school_id", schoolId)
        .eq("is_active", true)
        .eq("slot_kind", "primary"),
    ]);
  if (subjectError) throw subjectError;
  if (slotError) throw slotError;
  if (subjects.length < 2) throw new Error("The school needs at least two active subjects.");

  const { data: booked, error: bookedError } = await service
    .from("Reservations")
    .select("slot_id, reservation_date")
    .eq("school_id", schoolId)
    .eq("status", "confirmed")
    .in("reservation_date", [primaryDate.key, secondaryDate.key]);
  if (bookedError) throw bookedError;

  // Only use slots with plenty of free seats on both test dates, so real
  // bookings made during the run cannot change the outcome.
  const freeSeats = (slot) =>
    Math.min(
      ...[primaryDate.key, secondaryDate.key].map(
        (date) =>
          slot.capacity -
          booked.filter((row) => row.slot_id === slot.id && row.reservation_date === date).length,
      ),
    );
  const usableSlots = slots.filter((slot) => freeSeats(slot) >= 3).sort((a, b) => freeSeats(b) - freeSeats(a));
  if (usableSlots.length === 0) throw new Error("No active primary slot has 3+ free seats on the test dates.");

  return {
    date: primaryDate.key,
    otherDate: secondaryDate.key,
    weekendDate,
    outsideWindowDate: schoolDateKey(30),
    subjectA: subjects[0].name,
    subjectB: subjects[1].name,
    slot: usableSlots[0],
    otherSlot: usableSlots[1] ?? null,
  };
}

// ---------------------------------------------------------------------------
// Membership setup and cleanup (service role, test accounts only)
// ---------------------------------------------------------------------------

async function setSelfBooking(schoolId, userId, canSelfBook) {
  const { error } = await service
    .from("SchoolMembers")
    .update({ can_self_book: canSelfBook })
    .eq("school_id", schoolId)
    .eq("user_id", userId);
  if (error) throw error;
}

async function cleanup(schoolId, users) {
  const userIds = Object.values(users).map((user) => user.id);
  const steps = [
    service
      .from("Reservations")
      .update({ status: "cancelled" })
      .eq("school_id", schoolId)
      .in("user_id", userIds)
      .eq("status", "confirmed"),
    service
      .from("ScheduleRequests")
      .update({ status: "cancelled" })
      .eq("school_id", schoolId)
      .in("student_user_id", userIds)
      .eq("status", "pending"),
    service.from("SchoolInvites").update({ is_active: false }).eq("school_id", schoolId).in("created_by", userIds),
    service.from("JoinRequests").delete().eq("school_id", schoolId).in("user_id", userIds),
    service.from("SchoolMembers").delete().eq("school_id", schoolId).in("user_id", userIds),
  ];

  for (const step of steps) {
    const { error } = await step;
    if (error) console.error("Cleanup step failed:", error.message);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

async function runTests(schoolId, users, sessions, fx) {
  const { student, professor, admin } = sessions;
  const reserveBody = (overrides = {}) => ({
    schoolId,
    slotId: fx.slot.id,
    reservationDate: fx.date,
    examName: fx.subjectA,
    examType: "midterm",
    ...overrides,
  });
  const fn = async (name, slug, session, body, options) =>
    record(name, summarizeFunction(await callFunction(slug, session, body, options)));

  // --- Request handling shared by every function -------------------------
  await fn("reserve: no auth header", "reserve-exam-slot", null, reserveBody());
  await fn("reserve: GET is rejected", "reserve-exam-slot", admin, null, { method: "GET" });
  await fn("reserve: malformed JSON", "reserve-exam-slot", admin, null, { rawBody: "{not json" });

  // --- Join requests (the student joins the school through this flow) ----
  const addJoinRequest = async () => {
    const { data, error } = await service
      .from("JoinRequests")
      .insert({ school_id: schoolId, user_id: users.student.id, status: "pending" })
      .select("id")
      .single();
    if (error) throw error;
    return data.id;
  };

  let requestId = await addJoinRequest();
  await fn("join review: professor is not admin", "review-school-join-requests", professor, {
    schoolId,
    decisions: [{ requestId, decision: "approved" }],
  });
  await fn("join review: unknown request id", "review-school-join-requests", admin, {
    schoolId,
    decisions: [{ requestId: randomUUID(), decision: "approved" }],
  });
  await fn("join review: invalid decision", "review-school-join-requests", admin, {
    schoolId,
    decisions: [{ requestId, decision: "maybe" }],
  });
  await fn("join review: reject", "review-school-join-requests", admin, {
    schoolId,
    decisions: [{ requestId, decision: "rejected" }],
  });

  requestId = await addJoinRequest();
  await fn("join review: approve", "review-school-join-requests", admin, {
    schoolId,
    decisions: [{ requestId, decision: "approved" }],
  });

  // Make sure the student is a member even if the approval above regressed.
  await service
    .from("SchoolMembers")
    .upsert(
      { school_id: schoolId, user_id: users.student.id, role: "student", can_self_book: true },
      { onConflict: "user_id,school_id" },
    );
  await setSelfBooking(schoolId, users.student.id, true);

  // --- Invites --------------------------------------------------------------
  const inviteBody = (overrides = {}) => ({
    schoolId,
    expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    siteUrl: "https://example.com",
    ...overrides,
  });
  await fn("invite: admin creates link", "create-school-invite", admin, inviteBody());
  await fn("invite: student is denied", "create-school-invite", student, inviteBody());
  await fn("invite: past expiry", "create-school-invite", admin, inviteBody({ expiresAt: "2020-01-01T00:00:00Z" }));
  await fn("invite: missing expiry", "create-school-invite", admin, inviteBody({ expiresAt: undefined }));
  await fn("invite: non-http siteUrl", "create-school-invite", admin, inviteBody({ siteUrl: "ftp://example.com" }));

  // --- reserve-exam-slot validation (nothing is written) ---------------------
  await fn("reserve: missing slotId", "reserve-exam-slot", student, reserveBody({ slotId: "" }));
  await fn("reserve: bad date format", "reserve-exam-slot", student, reserveBody({ reservationDate: "2026-1-1" }));
  await fn("reserve: bad exam type", "reserve-exam-slot", student, reserveBody({ examType: "quiz" }));
  await fn("reserve: unknown subject", "reserve-exam-slot", student, reserveBody({ examName: "Not A Subject 123" }));
  await fn("reserve: outside 14-day window", "reserve-exam-slot", student, reserveBody({ reservationDate: fx.outsideWindowDate }));
  if (fx.weekendDate) {
    await fn("reserve: weekend", "reserve-exam-slot", student, reserveBody({ reservationDate: fx.weekendDate }));
  }
  await fn("reserve: unknown slot", "reserve-exam-slot", student, reserveBody({ slotId: randomUUID() }));
  await fn("reserve: professor is not a student", "reserve-exam-slot", professor, reserveBody());

  await setSelfBooking(schoolId, users.student.id, false);
  await fn("reserve: self-booking disabled", "reserve-exam-slot", student, reserveBody());
  await setSelfBooking(schoolId, users.student.id, true);

  // --- reserve-exam-slot + cancel-reservation (writes) -------------------------
  const reserved = await callFunction("reserve-exam-slot", student, reserveBody());
  record("reserve: valid booking", summarizeFunction(reserved));
  const reservationId = reserved.json?.reservationId;

  await fn("reserve: same slot again", "reserve-exam-slot", student, reserveBody());
  if (fx.otherSlot) {
    await fn("reserve: same exam in another slot", "reserve-exam-slot", student, reserveBody({ slotId: fx.otherSlot.id }));
  } else {
    record("reserve: same exam in another slot", { skipped: "only one usable slot" });
  }

  if (reservationId) {
    await fn("cancel: student cancels own", "cancel-reservation", student, { reservationId });
    await fn("cancel: already cancelled", "cancel-reservation", student, { reservationId });
  }
  await fn("cancel: missing reservationId", "cancel-reservation", student, {});
  await fn("cancel: unknown reservation", "cancel-reservation", student, { reservationId: randomUUID() });

  // --- schedule-exam-for-student ---------------------------------------------
  const scheduleBody = (overrides = {}) => ({
    ...reserveBody({ examName: fx.subjectB }),
    studentUserId: users.student.id,
    ...overrides,
  });
  await fn("schedule: student cannot schedule", "schedule-exam-for-student", student, scheduleBody());
  await fn("schedule: target is not a student", "schedule-exam-for-student", professor, scheduleBody({ studentUserId: users.professor.id }));
  await fn("schedule: missing studentUserId", "schedule-exam-for-student", professor, scheduleBody({ studentUserId: "" }));

  const scheduled = await callFunction("schedule-exam-for-student", professor, scheduleBody());
  record("schedule: professor books student", summarizeFunction(scheduled));
  await fn("schedule: same slot again", "schedule-exam-for-student", professor, scheduleBody());

  // --- update_reservation RPC --------------------------------------------------
  const scheduledId = scheduled.json?.reservationId;
  if (scheduledId) {
    const updateParams = {
      target_reservation_id: scheduledId,
      target_slot_id: fx.slot.id,
      target_reservation_date: fx.otherDate,
      target_exam_name: fx.subjectB,
      target_exam_type: "final",
    };
    record("rpc update_reservation: student denied", summarizeRpc(await rpc(student, "update_reservation", updateParams)));
    record(
      "rpc update_reservation: professor moves date",
      summarizeRpc(await rpc(professor, "update_reservation", updateParams), ["booked_slot_kind", "routed_to_overflow"]),
    );
    record(
      "rpc update_reservation: weekend",
      summarizeRpc(await rpc(professor, "update_reservation", { ...updateParams, target_reservation_date: fx.weekendDate ?? fx.outsideWindowDate })),
    );
    await fn("cancel: professor cancels student booking", "cancel-reservation", professor, { reservationId: scheduledId });
  }

  // --- Schedule requests (student without self-booking) ------------------------
  await setSelfBooking(schoolId, users.student.id, false);
  const requestParams = {
    target_school_id: schoolId,
    target_teacher_user_id: users.professor.id,
    target_slot_id: fx.slot.id,
    target_reservation_date: fx.date,
    target_exam_name: fx.subjectA,
    target_exam_type: "final",
  };

  record(
    "rpc create_schedule_request: teacher is not a professor",
    summarizeRpc(await rpc(student, "create_schedule_request", { ...requestParams, target_teacher_user_id: users.admin.id })),
  );
  record(
    "rpc create_schedule_request: weekend",
    summarizeRpc(await rpc(student, "create_schedule_request", { ...requestParams, target_reservation_date: fx.weekendDate ?? fx.outsideWindowDate })),
  );

  const created = await rpc(student, "create_schedule_request", requestParams);
  record("rpc create_schedule_request: valid", summarizeRpc(created, ["status"]));
  record("rpc create_schedule_request: duplicate pending", summarizeRpc(await rpc(student, "create_schedule_request", requestParams)));

  const pendingId = created.data?.[0]?.request_id;
  if (pendingId) {
    record(
      "rpc mark_schedule_request_teacher_seen: student denied",
      summarizeRpc(await rpc(student, "mark_schedule_request_teacher_seen", { target_request_id: pendingId })),
    );
    record(
      "rpc mark_schedule_request_teacher_seen: professor",
      summarizeRpc(await rpc(professor, "mark_schedule_request_teacher_seen", { target_request_id: pendingId })),
    );
    record(
      "rpc review_schedule_request: invalid decision",
      summarizeRpc(await rpc(professor, "review_schedule_request", { target_request_id: pendingId, target_decision: "maybe" })),
    );

    const approved = await rpc(professor, "review_schedule_request", {
      target_request_id: pendingId,
      target_decision: "approved",
      target_reviewer_message: "Automated test approval",
    });
    record("rpc review_schedule_request: approve", summarizeRpc(approved, ["status", "booked_slot_kind"]));
    record(
      "rpc review_schedule_request: review again",
      summarizeRpc(await rpc(professor, "review_schedule_request", { target_request_id: pendingId, target_decision: "declined" }), ["status"]),
    );

    const approvedReservationId = approved.data?.[0]?.reservation_id;
    if (approvedReservationId) {
      await fn("cancel: professor cancels approved request booking", "cancel-reservation", professor, {
        reservationId: approvedReservationId,
      });
    }
  }

  const second = await rpc(student, "create_schedule_request", { ...requestParams, target_exam_name: fx.subjectB });
  const secondId = second.data?.[0]?.request_id;
  if (secondId) {
    record(
      "rpc review_schedule_request: decline",
      summarizeRpc(await rpc(professor, "review_schedule_request", { target_request_id: secondId, target_decision: "declined" }), ["status"]),
    );
  }
  record(
    "rpc review_schedule_request: unknown request",
    summarizeRpc(await rpc(admin, "review_schedule_request", { target_request_id: randomUUID(), target_decision: "approved" })),
  );

  await setSelfBooking(schoolId, users.student.id, true);
  record(
    "rpc create_schedule_request: self-booking students must reserve",
    summarizeRpc(await rpc(student, "create_schedule_request", requestParams)),
  );
}

// ---------------------------------------------------------------------------
// Baseline comparison
// ---------------------------------------------------------------------------

function compareWith(label) {
  const path = join(resultsDir, `${label}.json`);
  if (!existsSync(path)) {
    console.error(`\nNo baseline at ${path}`);
    return 1;
  }

  const baseline = new Map(JSON.parse(readFileSync(path, "utf8")).results.map((row) => [row.name, row]));
  let differences = 0;

  console.log(`\nComparison with "${label}":`);
  for (const row of results) {
    const before = baseline.get(row.name);
    if (!before) {
      console.log(`  NEW   ${row.name}`);
      continue;
    }
    if (JSON.stringify(before) !== JSON.stringify(row)) {
      differences += 1;
      console.log(`  DIFF  ${row.name}\n        before: ${JSON.stringify(before)}\n        after:  ${JSON.stringify(row)}`);
    }
  }
  for (const name of baseline.keys()) {
    if (!results.some((row) => row.name === name)) console.log(`  GONE  ${name}`);
  }

  console.log(differences === 0 ? "  No differences." : `  ${differences} difference(s).`);
  return differences === 0 ? 0 : 1;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const schoolId = await resolveSchool();
  const users = {};
  for (const [role, account] of Object.entries(TEST_ACCOUNTS)) {
    users[role] = await ensureAccount(account);
  }

  // Start from a clean slate in case a previous run was interrupted.
  await cleanup(schoolId, users);

  try {
    const { error: staffError } = await service.from("SchoolMembers").upsert(
      [
        { school_id: schoolId, user_id: users.professor.id, role: "professor" },
        { school_id: schoolId, user_id: users.admin.id, role: "admin" },
      ],
      { onConflict: "user_id,school_id" },
    );
    if (staffError) throw staffError;

    const sessions = {};
    for (const [role, user] of Object.entries(users)) {
      sessions[role] = await signIn(user);
    }

    const fixtures = await loadFixtures(schoolId);
    console.log(
      `School ${schoolId} | date ${fixtures.date} | slot "${fixtures.slot.name}" | subjects "${fixtures.subjectA}", "${fixtures.subjectB}"\n`,
    );

    await runTests(schoolId, users, sessions, fixtures);
  } finally {
    await cleanup(schoolId, users);
    console.log("\nCleanup done: test bookings cancelled, test memberships removed.");
  }

  mkdirSync(resultsDir, { recursive: true });
  const outPath = join(resultsDir, `${args.label}.json`);
  writeFileSync(outPath, JSON.stringify({ label: args.label, suffix: args.suffix, ranAt: new Date().toISOString(), results }, null, 2));
  console.log(`Saved ${results.length} results to ${outPath}`);

  process.exitCode = args.compare ? compareWith(args.compare) : 0;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
