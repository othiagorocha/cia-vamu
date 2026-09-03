"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

const MARQUEE_THRESHOLD_PX = 3;
const AUTO_SCROLL_EDGE_PX = 48;
const AUTO_SCROLL_SPEED_PX = 18;

type Point = { x: number; y: number };

export type MarqueeRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const isTypingTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
};

const shouldIgnoreMarqueePointer = (target: EventTarget | null) => {
  if (!(target instanceof Element)) {
    return true;
  }
  return Boolean(
    target.closest(
      "[data-no-marquee], [data-slot='dialog-content'], [data-slot='dialog-overlay'], [data-slot='alert-dialog-content'], [data-slot='alert-dialog-overlay'], [data-slot='dropdown-menu-content'], [role='dialog'], button, a, input, textarea, select, label",
    ),
  );
};

const hasModifier = (event: { ctrlKey: boolean; metaKey: boolean }) => event.ctrlKey || event.metaKey;

const isAdditive = (event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) => event.shiftKey || hasModifier(event);

const toDocPoint = (client: Point): Point => ({
  x: client.x + window.scrollX,
  y: client.y + window.scrollY,
});

const toClientRect = (docRect: MarqueeRect): MarqueeRect => ({
  left: docRect.left - window.scrollX,
  top: docRect.top - window.scrollY,
  width: docRect.width,
  height: docRect.height,
});

const normalizeRect = (start: Point, end: Point): MarqueeRect => {
  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  return {
    left,
    top,
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
};

const intersects = (a: DOMRect, b: MarqueeRect) =>
  a.left < b.left + b.width && a.right > b.left && a.top < b.top + b.height && a.bottom > b.top;

type DragState = {
  pointerId: number;
  startDoc: Point;
  lastClient: Point;
  buttons: number;
  additive: boolean;
  shiftKey: boolean;
  snapshot: Set<string>;
  fromPhotoId: string | null;
  pointerType: string;
  isMarquee: boolean;
  longPressTimer: number | null;
  moved: boolean;
  ignoreClick: boolean;
};

type UsePhotoSelectionArgs = {
  photoIds: string[];
  enabled: boolean;
  shortcutsEnabled: boolean;
  canWrite: boolean;
  onOpen: (photoId: string) => void;
  onRequestDelete: (photoIds: string[]) => void;
  onCopy: (photoIds: string[]) => void;
  onCut: (photoIds: string[]) => void;
  onMarqueeComplete: (point: { x: number; y: number; count: number }) => void;
};

export const usePhotoSelection = ({
  photoIds,
  enabled,
  shortcutsEnabled,
  canWrite,
  onOpen,
  onRequestDelete,
  onCopy,
  onCut,
  onMarqueeComplete,
}: UsePhotoSelectionArgs) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const anchorIdRef = useRef<string | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const autoScrollRef = useRef<number | null>(null);
  const selectedIdsRef = useRef(selectedIds);
  const photoIdsRef = useRef(photoIds);
  const onOpenRef = useRef(onOpen);
  const onRequestDeleteRef = useRef(onRequestDelete);
  const onCopyRef = useRef(onCopy);
  const onCutRef = useRef(onCut);
  const onMarqueeCompleteRef = useRef(onMarqueeComplete);

  selectedIdsRef.current = selectedIds;
  photoIdsRef.current = photoIds;
  onOpenRef.current = onOpen;
  onRequestDeleteRef.current = onRequestDelete;
  onCopyRef.current = onCopy;
  onCutRef.current = onCut;
  onMarqueeCompleteRef.current = onMarqueeComplete;

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    anchorIdRef.current = null;
  }, []);

  useEffect(() => {
    setSelectedIds((current) => {
      const next = new Set([...current].filter((id) => photoIds.includes(id)));
      return next.size === current.size ? current : next;
    });
  }, [photoIds]);

  const selectRange = useCallback((toId: string, additive: boolean) => {
    const ids = photoIdsRef.current;
    const anchor = anchorIdRef.current ?? toId;
    const from = ids.indexOf(anchor);
    const to = ids.indexOf(toId);
    if (from < 0 || to < 0) {
      setSelectedIds(new Set([toId]));
      anchorIdRef.current = toId;
      return;
    }

    const start = Math.min(from, to);
    const end = Math.max(from, to);
    const range = ids.slice(start, end + 1);
    setSelectedIds((current) => {
      if (!additive) {
        return new Set(range);
      }
      const next = new Set(current);
      range.forEach((id) => next.add(id));
      return next;
    });
  }, []);

  const togglePhoto = useCallback(
    (photoId: string, event?: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }) => {
      if (event?.shiftKey) {
        selectRange(photoId, true);
        return;
      }
      setSelectedIds((current) => {
        const next = new Set(current);
        if (next.has(photoId)) {
          next.delete(photoId);
        } else {
          next.add(photoId);
        }
        return next;
      });
      anchorIdRef.current = photoId;
    },
    [selectRange],
  );

  const collectIntersecting = useCallback((rect: MarqueeRect) => {
    const grid = gridRef.current;
    if (!grid) {
      return [] as string[];
    }

    const ids: string[] = [];
    grid.querySelectorAll<HTMLElement>("[data-photo-id]").forEach((node) => {
      const id = node.dataset.photoId;
      if (!id) {
        return;
      }
      if (intersects(node.getBoundingClientRect(), rect)) {
        ids.push(id);
      }
    });
    return ids;
  }, []);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollRef.current != null) {
      cancelAnimationFrame(autoScrollRef.current);
      autoScrollRef.current = null;
    }
  }, []);

  const applyMarquee = useCallback(
    (drag: DragState) => {
      const endDoc = toDocPoint(drag.lastClient);
      const clientRect = toClientRect(normalizeRect(drag.startDoc, endDoc));
      setMarquee(clientRect);
      const hit = collectIntersecting(clientRect);
      setSelectedIds(() => {
        if (!drag.additive) {
          return new Set(hit);
        }
        const next = new Set(drag.snapshot);
        hit.forEach((id) => next.add(id));
        return next;
      });
      if (hit.length > 0) {
        anchorIdRef.current = hit[hit.length - 1] ?? null;
      }
    },
    [collectIntersecting],
  );

  const endDrag = useCallback(() => {
    const drag = dragRef.current;
    if (!drag) {
      return;
    }
    stopAutoScroll();
    if (drag.longPressTimer != null) {
      window.clearTimeout(drag.longPressTimer);
    }
    const grid = gridRef.current;
    if (grid?.hasPointerCapture(drag.pointerId)) {
      grid.releasePointerCapture(drag.pointerId);
    }
    if (drag.isMarquee) {
      setMarquee(null);
    }
    dragRef.current = null;
  }, [stopAutoScroll]);

  useEffect(() => {
    const tickAutoScroll = () => {
      const drag = dragRef.current;
      if (!drag?.isMarquee) {
        autoScrollRef.current = null;
        return;
      }

      const y = drag.lastClient.y;
      let deltaY = 0;
      if (y < AUTO_SCROLL_EDGE_PX) {
        deltaY = -AUTO_SCROLL_SPEED_PX;
      } else if (y > window.innerHeight - AUTO_SCROLL_EDGE_PX) {
        deltaY = AUTO_SCROLL_SPEED_PX;
      }

      if (deltaY !== 0) {
        window.scrollBy(0, deltaY);
        applyMarquee(drag);
      }

      autoScrollRef.current = requestAnimationFrame(tickAutoScroll);
    };

    const ensureAutoScroll = () => {
      if (autoScrollRef.current == null) {
        autoScrollRef.current = requestAnimationFrame(tickAutoScroll);
      }
    };

    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) {
        return;
      }

      drag.lastClient = { x: event.clientX, y: event.clientY };
      drag.buttons = event.buttons;

      const endDoc = toDocPoint(drag.lastClient);
      const distance = Math.hypot(endDoc.x - drag.startDoc.x, endDoc.y - drag.startDoc.y);
      if (distance > 4) {
        drag.moved = true;
        if (drag.longPressTimer != null) {
          window.clearTimeout(drag.longPressTimer);
          drag.longPressTimer = null;
        }
      }

      if (drag.pointerType === "touch") {
        return;
      }

      if (!drag.isMarquee && distance >= MARQUEE_THRESHOLD_PX) {
        drag.isMarquee = true;
        drag.ignoreClick = true;
        const grid = gridRef.current;
        if (grid && drag.pointerType !== "touch") {
          grid.setPointerCapture(drag.pointerId);
        }
        ensureAutoScroll();
      }

      if (!drag.isMarquee) {
        return;
      }

      event.preventDefault();
      applyMarquee(drag);
    };

    const onScrollOrWheel = () => {
      const drag = dragRef.current;
      if (!drag?.isMarquee) {
        return;
      }
      applyMarquee(drag);
    };

    const onUp = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) {
        return;
      }

      drag.lastClient = { x: event.clientX, y: event.clientY };
      const { isMarquee, fromPhotoId, additive, shiftKey } = drag;

      if (isMarquee) {
        applyMarquee(drag);
        const endDoc = toDocPoint(drag.lastClient);
        const clientRect = toClientRect(normalizeRect(drag.startDoc, endDoc));
        const hit = collectIntersecting(clientRect);
        const next = additive ? new Set([...drag.snapshot, ...hit]) : new Set(hit);
        setSelectedIds(next);
        selectedIdsRef.current = next;
        const count = next.size;
        endDrag();
        if (count > 0) {
          onMarqueeCompleteRef.current({
            x: event.clientX,
            y: event.clientY,
            count,
          });
        }
        return;
      }

      endDrag();

      if (fromPhotoId) {
        if (shiftKey || event.shiftKey) {
          selectRange(fromPhotoId, true);
          return;
        }
        if (additive || hasModifier(event)) {
          togglePhoto(fromPhotoId);
          return;
        }
        onOpenRef.current(fromPhotoId);
        return;
      }

      if (!additive) {
        clearSelection();
      }
    };

    const onCancel = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) {
        return;
      }

      const stillPressed = event.buttons !== 0 || drag.buttons !== 0;
      if (stillPressed) {
        const grid = gridRef.current;
        if (grid?.hasPointerCapture(drag.pointerId)) {
          grid.releasePointerCapture(drag.pointerId);
        }
        return;
      }

      endDrag();
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("scroll", onScrollOrWheel, { capture: true, passive: true });
    window.addEventListener("wheel", onScrollOrWheel, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("scroll", onScrollOrWheel, { capture: true });
      window.removeEventListener("wheel", onScrollOrWheel);
      stopAutoScroll();
    };
  }, [applyMarquee, clearSelection, collectIntersecting, endDrag, selectRange, stopAutoScroll, togglePhoto]);

  const onGridPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!enabled || event.button !== 0) {
      return;
    }

    const target = event.target;
    if (shouldIgnoreMarqueePointer(target)) {
      return;
    }

    const photoNode = target instanceof Element ? target.closest("[data-photo-id]") : null;
    const photoId =
      photoNode instanceof HTMLElement ? (photoNode.dataset.photoId ?? null) : null;

    const lastClient = { x: event.clientX, y: event.clientY };

    dragRef.current = {
      pointerId: event.pointerId,
      startDoc: toDocPoint(lastClient),
      lastClient,
      buttons: event.buttons,
      additive: isAdditive(event),
      shiftKey: event.shiftKey,
      snapshot: new Set(selectedIdsRef.current),
      fromPhotoId: photoId,
      pointerType: event.pointerType,
      isMarquee: false,
      longPressTimer: null,
      moved: false,
      ignoreClick: false,
    };
  };

  useEffect(() => {
    if (!shortcutsEnabled) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
        event.preventDefault();
        setSelectedIds(new Set(photoIdsRef.current));
        return;
      }

      if (event.key === "Escape") {
        if (selectedIdsRef.current.size === 0) {
          return;
        }
        event.preventDefault();
        clearSelection();
        return;
      }

      if (event.key === "Enter") {
        const selected = selectedIdsRef.current;
        const anchor = anchorIdRef.current;
        const id = anchor && selected.has(anchor) ? anchor : [...selected][0];
        if (!id) {
          return;
        }
        event.preventDefault();
        onOpenRef.current(id);
        return;
      }

      if (!canWrite) {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
        if (selectedIdsRef.current.size === 0) {
          return;
        }
        event.preventDefault();
        onCopyRef.current([...selectedIdsRef.current]);
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "x") {
        if (selectedIdsRef.current.size === 0) {
          return;
        }
        event.preventDefault();
        onCutRef.current([...selectedIdsRef.current]);
        return;
      }

      if (event.key !== "Delete" && event.key !== "Backspace") {
        return;
      }
      if (selectedIdsRef.current.size === 0) {
        return;
      }
      event.preventDefault();
      onRequestDeleteRef.current([...selectedIdsRef.current]);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canWrite, clearSelection, shortcutsEnabled]);

  return {
    gridRef,
    selectedIds,
    marquee,
    clearSelection,
    togglePhoto,
    isSelected: (id: string) => selectedIds.has(id),
    onGridPointerDown,
  };
};
