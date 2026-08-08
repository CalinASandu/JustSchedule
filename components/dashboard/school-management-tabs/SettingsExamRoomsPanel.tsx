import type React from "react";
import { useMemo, useRef, useState } from "react";
import { Ban, CheckCircle2, Loader2, MoreHorizontal, Pencil, Plus, X } from "lucide-react";
import {
  createExamSlot,
  createOverflowExamSlot,
  setExamSlotActive,
  updateExamSlot,
} from "./api";
import { formatSlotTime } from "./formatters";
import { ErrorBanner } from "./shared";
import { FloatingActionMenu } from "./FloatingActionMenu";
import type { ExamSlot } from "./types";

type SettingsExamRoomsPanelProps = {
  schoolId: string;
  initialExamSlots: ExamSlot[];
};

type SlotDialogState =
  | { mode: "create-primary" }
  | { mode: "create-overflow"; primarySlotId: string }
  | { mode: "edit"; slotId: string };

type SlotFormValues = {
  name: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
};

type PendingState = {
  error: string | null;
  pendingKey: string | null;
};

export function SettingsExamRoomsPanel({
  schoolId,
  initialExamSlots,
}: SettingsExamRoomsPanelProps) {
  const [slots, setSlots] = useState<ExamSlot[]>(() => sortSlots(initialExamSlots));
  const [dialogState, setDialogState] = useState<SlotDialogState | null>(null);
  const [slotState, setSlotState] = useState<PendingState>({ error: null, pendingKey: null });

  const { primarySlots, overflowByPrimaryId } = useMemo(() => groupSlots(slots), [slots]);
  const activePrimarySeats = primarySlots
    .filter((slot) => slot.isActive)
    .reduce((total, slot) => total + slot.capacity, 0);
  const overflowCount = slots.filter((slot) => slot.slotKind === "overflow").length;

  function mergeSlots(nextSlots: ExamSlot[]) {
    setSlots((current) => {
      const byId = new Map(current.map((slot) => [slot.id, slot]));
      nextSlots.forEach((slot) => byId.set(slot.id, slot));
      return sortSlots([...byId.values()]);
    });
  }

  async function toggleSlot(slot: ExamSlot) {
    setSlotState({ error: null, pendingKey: `toggle-${slot.id}` });
    const result = await setExamSlotActive({ slotId: slot.id, isActive: !slot.isActive });

    if (result.error) {
      setSlotState({ error: result.error, pendingKey: null });
      return;
    }

    mergeSlots(result.data ?? []);
    setSlotState({ error: null, pendingKey: null });
  }

  async function submitSlotForm(values: SlotFormValues) {
    if (!dialogState) return;

    setSlotState({ error: null, pendingKey: "dialog" });

    if (dialogState.mode === "create-primary") {
      const result = await createExamSlot({
        schoolId,
        name: values.name,
        startsAt: values.startsAt,
        endsAt: values.endsAt,
        capacity: values.capacity,
      });

      if (result.error) {
        setSlotState({ error: result.error, pendingKey: null });
        return;
      }

      if (result.data) mergeSlots([result.data]);
      setDialogState(null);
      setSlotState({ error: null, pendingKey: null });
      return;
    }

    if (dialogState.mode === "create-overflow") {
      const result = await createOverflowExamSlot({
        primarySlotId: dialogState.primarySlotId,
        capacity: values.capacity,
      });

      if (result.error) {
        setSlotState({ error: result.error, pendingKey: null });
        return;
      }

      if (result.data) mergeSlots([result.data]);
      setDialogState(null);
      setSlotState({ error: null, pendingKey: null });
      return;
    }

    const slot = slots.find((item) => item.id === dialogState.slotId);
    if (!slot) {
      setSlotState({ error: "This exam room is no longer available.", pendingKey: null });
      return;
    }

    const result = await updateExamSlot({
      slotId: slot.id,
      name: values.name,
      startsAt: values.startsAt,
      endsAt: values.endsAt,
      capacity: values.capacity,
    });

    if (result.error) {
      setSlotState({ error: result.error, pendingKey: null });
      return;
    }

    if (result.data) {
      mergeSlots([result.data]);
    }

    setDialogState(null);
    setSlotState({ error: null, pendingKey: null });
  }

  const dialogSlot =
    dialogState?.mode === "edit" ? slots.find((slot) => slot.id === dialogState.slotId) ?? null : null;
  const dialogPrimarySlot =
    dialogState?.mode === "create-overflow"
      ? slots.find((slot) => slot.id === dialogState.primarySlotId) ?? null
      : dialogSlot?.slotKind === "overflow"
        ? slots.find((slot) => slot.id === dialogSlot.primarySlotId) ?? null
        : null;

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Exam rooms
          </p>
          <p className="mt-1 max-w-[620px] text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Primary rooms define selectable exam times. Overflow rooms stay attached to a
            primary room and only receive students after the primary room is full.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setDialogState({ mode: "create-primary" })}
          className="inline-flex h-[2.625rem] items-center justify-center gap-2 rounded-[10px] px-4 text-[0.9375rem] font-semibold transition-colors duration-150"
          style={{
            color: "var(--text-on-accent)",
            background: "var(--accent-color)",
            boxShadow: "0 1px 3px rgba(37,99,235,0.25), 0 4px 12px rgba(37,99,235,0.12)",
          }}
        >
          <Plus size={16} />
          Add slot
        </button>
      </div>

      <p className="mb-4 text-sm" style={{ color: "var(--text-secondary)" }}>
        <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
          {primarySlots.length} slots
        </span>
        {" · "}
        {activePrimarySeats} open seats
        {" · "}
        {overflowCount} overflow rooms
      </p>

      {slotState.error && <ErrorBanner message={slotState.error} />}

      <div
        className="overflow-hidden rounded-[12px] border"
        style={{ background: "var(--surface-panel)", borderColor: "var(--border-default)" }}
      >
        {primarySlots.length > 0 ? (
          primarySlots.map((slot, index) => {
            const overflowSlot = overflowByPrimaryId.get(slot.id) ?? null;
            return (
              <div key={slot.id} className={index > 0 ? "border-t border-[var(--border-default)]" : ""}>
                <SlotRow
                  slot={slot}
                  pendingKey={slotState.pendingKey}
                  onAddOverflow={
                    overflowSlot ? undefined : () => setDialogState({ mode: "create-overflow", primarySlotId: slot.id })
                  }
                  onEdit={() => setDialogState({ mode: "edit", slotId: slot.id })}
                  onToggle={() => toggleSlot(slot)}
                />

                {overflowSlot && (
                  <div className="border-t border-[var(--border-subtle)]">
                    <SlotRow
                      slot={overflowSlot}
                      nested
                      pendingKey={slotState.pendingKey}
                      onEdit={() => setDialogState({ mode: "edit", slotId: overflowSlot.id })}
                      onToggle={() => toggleSlot(overflowSlot)}
                    />
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="p-5">
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              No exam rooms
            </p>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              Add a primary slot to make exam scheduling available.
            </p>
          </div>
        )}
      </div>

      {dialogState && (
        <SlotDialog
          state={dialogState}
          slot={dialogSlot}
          primarySlot={dialogPrimarySlot}
          pending={slotState.pendingKey === "dialog"}
          error={slotState.error}
          onClose={() => {
            if (slotState.pendingKey === "dialog") return;
            setDialogState(null);
            setSlotState({ error: null, pendingKey: null });
          }}
          onSubmit={submitSlotForm}
        />
      )}
    </div>
  );
}

function SlotRow({
  slot,
  nested = false,
  pendingKey,
  onAddOverflow,
  onEdit,
  onToggle,
}: {
  slot: ExamSlot;
  nested?: boolean;
  pendingKey: string | null;
  onAddOverflow?: () => void;
  onEdit: () => void;
  onToggle: () => void;
}) {
  const isPending = pendingKey === `toggle-${slot.id}`;

  return (
    <div
      className={`flex items-start justify-between gap-3 px-4 py-4 ${nested ? "pl-8 sm:pl-9" : ""}`}
    >
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          {nested && (
            <span className="text-sm" style={{ color: "var(--text-faint)" }} aria-hidden="true">
              ↳
            </span>
          )}
          <p className="truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {nested ? "Overflow room" : slot.name}
          </p>
          {!nested && (
            <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {formatSlotTime(slot.startsAt)}-{formatSlotTime(slot.endsAt)}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          {nested
            ? `${slot.capacity} seats, opens when the main room is full`
            : `${slot.capacity} seats${slot.isActive ? "" : ", disabled"}`}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <StatusBadge isActive={slot.isActive} />
        <SlotActionMenu
          disabled={Boolean(pendingKey)}
          isActive={slot.isActive}
          isPending={isPending}
          canAddOverflow={Boolean(onAddOverflow)}
          onAddOverflow={onAddOverflow}
          onEdit={onEdit}
          onToggle={onToggle}
        />
      </div>
    </div>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold"
      style={{ color: isActive ? "var(--accent-strong)" : "var(--text-secondary)" }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: isActive ? "var(--accent-color)" : "var(--text-faint)" }}
      />
      {isActive ? "Open" : "Closed"}
    </span>
  );
}

function SlotActionMenu({
  disabled,
  isActive,
  isPending,
  canAddOverflow,
  onAddOverflow,
  onEdit,
  onToggle,
}: {
  disabled: boolean;
  isActive: boolean;
  isPending: boolean;
  canAddOverflow: boolean;
  onAddOverflow?: () => void;
  onEdit: () => void;
  onToggle: () => void;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <div>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        disabled={disabled}
        className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] transition-colors duration-150 hover:bg-[var(--surface-subtle)] disabled:cursor-not-allowed disabled:opacity-60"
        style={{ border: "1px solid var(--border-default)", color: "var(--text-secondary)" }}
        aria-label="Exam room actions"
        aria-expanded={open}
      >
        {isPending ? <Loader2 size={15} className="animate-spin" /> : <MoreHorizontal size={15} />}
      </button>

      <FloatingActionMenu
        anchorRef={buttonRef}
        open={open}
        width={192}
        onClose={() => setOpen(false)}
      >
          <MenuButton
            icon={<Pencil size={14} />}
            label="Edit"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
          />
          {canAddOverflow && onAddOverflow && (
            <MenuButton
              icon={<Plus size={14} />}
              label="Add overflow"
              onClick={() => {
                setOpen(false);
                onAddOverflow();
              }}
            />
          )}
          <MenuButton
            icon={isActive ? <Ban size={14} /> : <CheckCircle2 size={14} />}
            label={isActive ? "Disable" : "Enable"}
            tone={isActive ? "danger" : "default"}
            onClick={() => {
              setOpen(false);
              onToggle();
            }}
          />
      </FloatingActionMenu>
    </div>
  );
}

function MenuButton({
  icon,
  label,
  tone = "default",
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  tone?: "default" | "danger";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-[var(--surface-subtle)]"
      style={{ color: tone === "danger" ? "var(--danger)" : "var(--text-body)" }}
    >
      {icon}
      {label}
    </button>
  );
}

function SlotDialog({
  state,
  slot,
  primarySlot,
  pending,
  error,
  onClose,
  onSubmit,
}: {
  state: SlotDialogState;
  slot: ExamSlot | null;
  primarySlot: ExamSlot | null;
  pending: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: SlotFormValues) => void;
}) {
  const isOverflowCreate = state.mode === "create-overflow";
  const isOverflowEdit = slot?.slotKind === "overflow";
  const initialValues = getInitialSlotValues(state, slot, primarySlot);
  const [name, setName] = useState(initialValues.name);
  const [startsAt, setStartsAt] = useState(initialValues.startsAt);
  const [endsAt, setEndsAt] = useState(initialValues.endsAt);
  const [capacity, setCapacity] = useState(String(initialValues.capacity));
  const title =
    state.mode === "create-primary"
      ? "Add exam room"
      : state.mode === "create-overflow"
        ? "Add overflow room"
        : "Edit exam room";
  const submitLabel = state.mode === "edit" ? "Save changes" : "Add room";
  const timeFieldsDisabled = pending || isOverflowCreate || isOverflowEdit;
  const capacityNumber = Number(capacity);
  const canSubmit =
    (isOverflowCreate || name.trim().length > 0) &&
    startsAt &&
    endsAt &&
    Number.isInteger(capacityNumber) &&
    capacityNumber > 0;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    onSubmit({
      name: name.trim(),
      startsAt,
      endsAt,
      capacity: capacityNumber,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
      style={{ background: "var(--overlay-scrim)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="slot-dialog-title"
    >
      <form
        onSubmit={submit}
        className="panel anim-scale-in w-full max-w-[520px] overflow-hidden"
        style={{ boxShadow: "var(--shadow-dialog)" }}
      >
        <div className="flex items-start justify-between gap-4 px-5 py-4 sm:px-6">
          <div>
            <h2
              id="slot-dialog-title"
              className="text-[0.9375rem] font-semibold"
              style={{ color: "var(--text-primary)", letterSpacing: "-0.01em" }}
            >
              {title}
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              {isOverflowCreate || isOverflowEdit
                ? "Overflow rooms inherit their main room time."
                : "Set the selectable exam time and room capacity."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors duration-150 hover:bg-[var(--surface-subtle)] disabled:cursor-not-allowed"
            style={{ border: "1px solid var(--border-default)", color: "var(--text-secondary)" }}
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        <div className="px-5 pb-5 sm:px-6">
          {error && <ErrorBanner message={error} />}

          <div className="grid gap-3">
            {!isOverflowCreate && (
              <Field label="Room name" htmlFor="slot-name">
                <input
                  id="slot-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={pending}
                  className="h-[2.625rem] w-full rounded-[10px] px-3 text-[0.9375rem] outline-none transition-[border-color,box-shadow] disabled:cursor-not-allowed"
                  style={{
                    background: "var(--surface-panel)",
                    border: "1.5px solid var(--border-default)",
                    color: "var(--text-primary)",
                  }}
                />
              </Field>
            )}

            {isOverflowCreate && primarySlot && (
              <div
                className="rounded-[10px] border px-3 py-2.5"
                style={{ borderColor: "var(--border-default)", background: "var(--surface-alt)" }}
              >
                <p className="text-[0.8125rem] font-medium" style={{ color: "var(--text-body)" }}>
                  Main room
                </p>
                <p className="mt-1 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {primarySlot.name} · {formatSlotTime(primarySlot.startsAt)}-{formatSlotTime(primarySlot.endsAt)}
                </p>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Starts" htmlFor="slot-starts">
                <input
                  id="slot-starts"
                  type="time"
                  value={startsAt}
                  onChange={(event) => setStartsAt(event.target.value)}
                  disabled={timeFieldsDisabled}
                  className="h-[2.625rem] w-full rounded-[10px] px-3 text-[0.9375rem] outline-none transition-[border-color,box-shadow] disabled:cursor-not-allowed disabled:bg-[var(--surface-subtle)]"
                  style={{
                    background: "var(--surface-panel)",
                    border: "1.5px solid var(--border-default)",
                    color: "var(--text-primary)",
                  }}
                />
              </Field>
              <Field label="Ends" htmlFor="slot-ends">
                <input
                  id="slot-ends"
                  type="time"
                  value={endsAt}
                  onChange={(event) => setEndsAt(event.target.value)}
                  disabled={timeFieldsDisabled}
                  className="h-[2.625rem] w-full rounded-[10px] px-3 text-[0.9375rem] outline-none transition-[border-color,box-shadow] disabled:cursor-not-allowed disabled:bg-[var(--surface-subtle)]"
                  style={{
                    background: "var(--surface-panel)",
                    border: "1.5px solid var(--border-default)",
                    color: "var(--text-primary)",
                  }}
                />
              </Field>
              <Field label="Seats" htmlFor="slot-capacity">
                <input
                  id="slot-capacity"
                  type="number"
                  min={1}
                  value={capacity}
                  onChange={(event) => setCapacity(event.target.value)}
                  disabled={pending}
                  className="h-[2.625rem] w-full rounded-[10px] px-3 text-[0.9375rem] outline-none transition-[border-color,box-shadow] disabled:cursor-not-allowed"
                  style={{
                    background: "var(--surface-panel)",
                    border: "1.5px solid var(--border-default)",
                    color: "var(--text-primary)",
                  }}
                />
              </Field>
            </div>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 border-t border-[var(--border-subtle)] pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="inline-flex h-[2.625rem] items-center justify-center rounded-[10px] px-4 text-[0.9375rem] font-semibold transition-colors duration-150 hover:bg-[var(--surface-subtle)] disabled:cursor-not-allowed"
              style={{ border: "1px solid var(--border-default)", color: "var(--text-secondary)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || !canSubmit}
              className="inline-flex h-[2.625rem] items-center justify-center gap-2 rounded-[10px] px-4 text-[0.9375rem] font-semibold transition-colors duration-150 disabled:cursor-not-allowed"
              style={{
                color: "var(--text-on-accent)",
                background: pending || !canSubmit ? "var(--accent-disabled)" : "var(--accent-color)",
                boxShadow:
                  pending || !canSubmit
                    ? "none"
                    : "0 1px 3px rgba(37,99,235,0.25), 0 4px 12px rgba(37,99,235,0.12)",
              }}
            >
              {pending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {submitLabel}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-[0.8125rem] font-medium"
        style={{ color: "var(--text-body)" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function getInitialSlotValues(
  state: SlotDialogState,
  slot: ExamSlot | null,
  primarySlot: ExamSlot | null,
): SlotFormValues {
  if (state.mode === "create-primary") {
    return {
      name: "",
      startsAt: "09:00",
      endsAt: "11:00",
      capacity: 6,
    };
  }

  if (state.mode === "create-overflow") {
    return {
      name: primarySlot ? `${primarySlot.name} (overflow)` : "",
      startsAt: primarySlot?.startsAt.slice(0, 5) ?? "09:00",
      endsAt: primarySlot?.endsAt.slice(0, 5) ?? "11:00",
      capacity: primarySlot?.capacity ?? 6,
    };
  }

  return {
    name: slot?.name ?? "",
    startsAt: slot?.startsAt.slice(0, 5) ?? primarySlot?.startsAt.slice(0, 5) ?? "09:00",
    endsAt: slot?.endsAt.slice(0, 5) ?? primarySlot?.endsAt.slice(0, 5) ?? "11:00",
    capacity: slot?.capacity ?? 6,
  };
}

function groupSlots(slots: ExamSlot[]) {
  const sorted = sortSlots(slots);
  const primarySlots = sorted.filter((slot) => slot.slotKind === "primary");
  const overflowByPrimaryId = new Map<string, ExamSlot>();

  sorted.forEach((slot) => {
    if (slot.slotKind === "overflow" && slot.primarySlotId) {
      overflowByPrimaryId.set(slot.primarySlotId, slot);
    }
  });

  return { primarySlots, overflowByPrimaryId };
}

function sortSlots(slots: ExamSlot[]) {
  return [...slots].sort((a, b) => {
    const timeCompare = a.startsAt.localeCompare(b.startsAt);
    if (timeCompare !== 0) return timeCompare;

    if (a.slotKind !== b.slotKind) {
      return a.slotKind === "primary" ? -1 : 1;
    }

    return a.name.localeCompare(b.name);
  });
}
