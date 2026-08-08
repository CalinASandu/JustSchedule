"use client";

import type { ReactNode, RefObject } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type FloatingActionMenuProps = {
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  width: number;
  align?: "left" | "right";
  placement?: "bottom" | "left" | "right";
  menuRef?: RefObject<HTMLDivElement | null>;
  ignoreRefs?: RefObject<HTMLElement | null>[];
  onClose: () => void;
  children: ReactNode;
};

type MenuPosition = {
  left: number;
  top: number;
};

const VIEWPORT_MARGIN = 12;
const MENU_GAP = 6;

export function FloatingActionMenu({
  anchorRef,
  open,
  width,
  align = "right",
  placement = "bottom",
  menuRef: externalMenuRef,
  ignoreRefs = [],
  onClose,
  children,
}: FloatingActionMenuProps) {
  const internalMenuRef = useRef<HTMLDivElement>(null);
  const menuRef = externalMenuRef ?? internalMenuRef;
  const [position, setPosition] = useState<MenuPosition | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    function updatePosition() {
      const anchor = anchorRef.current;
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      const menuHeight = menuRef.current?.offsetHeight ?? 180;
      const maxLeft = window.innerWidth - width - VIEWPORT_MARGIN;
      const maxTop = window.innerHeight - menuHeight - VIEWPORT_MARGIN;

      if (placement === "left" || placement === "right") {
        const preferredLeft =
          placement === "left"
            ? rect.left - width - MENU_GAP
            : rect.right + MENU_GAP;
        const fallbackLeft =
          placement === "left"
            ? rect.right + MENU_GAP
            : rect.left - width - MENU_GAP;
        const left =
          preferredLeft >= VIEWPORT_MARGIN && preferredLeft <= maxLeft
            ? preferredLeft
            : fallbackLeft;

        setPosition({
          left: Math.max(VIEWPORT_MARGIN, Math.min(left, maxLeft)),
          top: Math.max(VIEWPORT_MARGIN, Math.min(rect.top, maxTop)),
        });
        return;
      }

      const preferredLeft = align === "right" ? rect.right - width : rect.left;
      const preferredTop = rect.bottom + MENU_GAP;
      const flippedTop = rect.top - menuHeight - MENU_GAP;
      const shouldFlip = preferredTop + menuHeight > window.innerHeight - VIEWPORT_MARGIN;

      setPosition({
        left: Math.max(VIEWPORT_MARGIN, Math.min(preferredLeft, maxLeft)),
        top: Math.max(VIEWPORT_MARGIN, Math.min(shouldFlip ? flippedTop : preferredTop, maxTop)),
      });
    }

    updatePosition();
    const frame = window.requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [align, anchorRef, menuRef, open, placement, width]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;

      if (
        anchorRef.current?.contains(target) ||
        menuRef.current?.contains(target) ||
        ignoreRefs.some((ref) => ref.current?.contains(target))
      ) {
        return;
      }

      onClose();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [anchorRef, ignoreRefs, menuRef, onClose, open]);

  if (typeof document === "undefined" || !open || !position) {
    return null;
  }

  return createPortal(
    <div
      ref={menuRef}
      className="anim-scale-in fixed rounded-[10px] py-1"
      style={{
        left: position.left,
        top: position.top,
        width,
        maxHeight: `calc(100vh - ${VIEWPORT_MARGIN * 2}px)`,
        overflowY: "auto",
        zIndex: 60,
        background: "var(--surface-panel)",
        border: "1px solid var(--border-default)",
        boxShadow: "var(--shadow-dialog)",
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
