import { useRef, useState } from "react";
import { Ban, MoreHorizontal, Pencil } from "lucide-react";
import { FloatingActionMenu } from "./FloatingActionMenu";

type ReservationActionMenuProps = {
  disabled?: boolean;
  onCancel: () => void;
  onUpdate: () => void;
};

export function ReservationActionMenu({
  disabled = false,
  onCancel,
  onUpdate,
}: ReservationActionMenuProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        disabled={disabled}
        className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] transition-colors duration-150 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        style={{ border: "1px solid #E4E8EF", color: "#6B7280" }}
        aria-label="Reservation actions"
        aria-expanded={open}
      >
        <MoreHorizontal size={15} />
      </button>

      <FloatingActionMenu
        anchorRef={buttonRef}
        open={open}
        width={176}
        onClose={() => setOpen(false)}
      >
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onUpdate();
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-slate-50"
            style={{ color: "#374151" }}
          >
            <Pencil size={14} />
            Update
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onCancel();
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-red-50"
            style={{ color: "#DC2626" }}
          >
            <Ban size={14} />
            Cancel reservation
          </button>
      </FloatingActionMenu>
    </div>
  );
}
