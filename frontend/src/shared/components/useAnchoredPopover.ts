import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";

const GAP = 6;
const MARGIN = 8;

// A panel that opens under (or above, when there is no room) its anchor: dropdown lists, calendars.
// It uses the browser's popover top layer, so it shows above modal dialogs and is never clipped
// by a scrolling container. Closes on Escape and on a click outside.
export function useAnchoredPopover(open: boolean, onClose: () => void, preferredHeight = 320, minWidth = 240) {
  const anchorRef = useRef<HTMLElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [style, setStyle] = useState<CSSProperties>({});

  const place = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - GAP - MARGIN;
    const above = rect.top - GAP - MARGIN;
    const openUp = below < Math.min(preferredHeight, 240) && above > below;
    const maxHeight = Math.max(160, Math.min(preferredHeight, openUp ? above : below));
    const width = Math.min(Math.max(rect.width, minWidth), window.innerWidth - MARGIN * 2);
    const left = Math.min(Math.max(MARGIN, rect.left), window.innerWidth - width - MARGIN);

    setStyle({
      position: "fixed",
      inset: "auto",
      margin: 0,
      left,
      width,
      maxHeight,
      ...(openUp ? { bottom: window.innerHeight - rect.top + GAP } : { top: rect.bottom + GAP }),
    });
  }, [preferredHeight, minWidth]);

  useLayoutEffect(() => {
    const popover = popoverRef.current;
    if (!popover) return;
    if (open) {
      place();
      if (!popover.matches(":popover-open")) popover.showPopover();
    } else if (popover.matches(":popover-open")) {
      popover.hidePopover();
    }
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Only this panel closes, not the dialog around it.
      event.stopPropagation();
      event.preventDefault();
      onClose();
      anchorRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, onClose, place]);

  return { anchorRef, popoverRef, style };
}

// Shared look of every panel (list, calendar).
export const popoverPanelClass =
  "overflow-auto rounded-block border border-linha bg-superficie p-1 text-tinta shadow-window [&:not(:popover-open)]:hidden";
