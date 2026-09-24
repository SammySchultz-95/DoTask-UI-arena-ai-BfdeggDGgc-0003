'use client';

/**
 * Two-column layout with a draggable divider. The right column's width is
 * adjustable and persisted per page (localStorage key `split-<storageKey>`).
 * Below the `xl` breakpoint the columns stack vertically.
 */
import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

export function Split({
  children,
  storageKey,
  defaultRight = 380,
  minRight = 300,
  maxRight = 760,
}: {
  /** Exactly two children: the left column and the right column. */
  children: ReactNode;
  /** Unique per page — used for the persisted width. */
  storageKey: string;
  defaultRight?: number;
  minRight?: number;
  maxRight?: number;
}) {
  const childArray = Children.toArray(children).filter(Boolean);
  const left = childArray[0];
  const right = childArray[1];
  const [rightWidth, setRightWidth] = useState<number | null>(null);
  const dragState = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    try {
      const stored = Number(window.localStorage.getItem(`split-${storageKey}`));
      if (Number.isFinite(stored) && stored > 0) setRightWidth(stored);
    } catch {
      /* storage unavailable */
    }
  }, [storageKey]);

  const startDrag = useCallback(
    (event: React.PointerEvent) => {
      event.preventDefault();
      dragState.current = {
        startX: event.clientX,
        startWidth: rightWidth ?? defaultRight,
      };
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const onMove = (ev: PointerEvent) => {
        const state = dragState.current;
        if (!state) return;
        const next = Math.min(
          maxRight,
          Math.max(minRight, state.startWidth + (state.startX - ev.clientX)),
        );
        setRightWidth(next);
      };
      const onUp = (ev: PointerEvent) => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        const state = dragState.current;
        dragState.current = null;
        if (state) {
          const next = Math.min(
            maxRight,
            Math.max(minRight, state.startWidth + (state.startX - ev.clientX)),
          );
          setRightWidth(next);
          try {
            window.localStorage.setItem(`split-${storageKey}`, String(next));
          } catch {
            /* storage unavailable */
          }
        }
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [rightWidth, defaultRight, minRight, maxRight, storageKey],
  );

  return (
    <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
      <div className="min-w-0 flex-1">{left}</div>
      <div
        role="separator"
        aria-orientation="vertical"
        title="Drag to resize"
        onPointerDown={startDrag}
        className="group hidden w-2 shrink-0 cursor-col-resize self-stretch items-center justify-center xl:flex"
      >
        <div className="h-10 w-1 rounded-full bg-ink-500 transition-all group-hover:h-16 group-hover:bg-neon-500/70" />
      </div>
      <div
        className="w-full shrink-0 xl:w-auto"
        style={{ width: rightWidth ?? defaultRight }}
      >
        {right}
      </div>
    </div>
  );
}
