import { useEffect, useRef, useState, type ReactNode, type PointerEvent } from 'react';

/**
 * BottomSheet — animation/mechanism only.
 *
 * Provides the polished bottom-sheet interaction (scrim fade, slide-up enter,
 * slide-down exit, grab-handle drag-to-dismiss, scrim/Esc close, body scroll
 * lock) WITHOUT imposing any visual styling on the content. The caller passes
 * its own fully-styled sheet box as `children`, so colors/spacing/markup stay
 * exactly as before — this only adds the motion.
 *
 * Mobile only by design (wrapper is `lg:hidden`), matching the existing sheets.
 */
interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** px the user must drag down before release dismisses the sheet */
  dismissThreshold?: number;
}

export default function BottomSheet({ open, onClose, children, dismissThreshold = 110 }: BottomSheetProps) {
  const [visible, setVisible] = useState(false); // present in the DOM (kept during exit anim)
  const [shown, setShown] = useState(false);     // animated into view
  const [dragY, setDragY] = useState(0);         // live drag offset (px, downward)
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Mount + enter / exit lifecycle
  useEffect(() => {
    if (open) {
      clearTimeout(closeTimer.current);
      setVisible(true);
      setShown(false); // start from the closed position (translateY 100%)
      // Double rAF: guarantee the browser paints the closed state for one
      // frame before flipping to open, so the slide-up actually animates
      // (a single rAF can be coalesced into the same paint → looks like a jump).
      let r2 = 0;
      const r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => setShown(true)); });
      return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); };
    }
    // closing: play exit, then unmount
    setShown(false);
    closeTimer.current = setTimeout(() => { setVisible(false); setDragY(0); }, 230);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Lock background scroll while open
  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [visible]);

  // Esc to close
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, onClose]);

  if (!visible) return null;

  // Drag starts only from the top (grab-handle) region so inner taps still work
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientY - rect.top > 56) return;
    draggingRef.current = true;
    startYRef.current = e.clientY;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    setDragY(Math.max(0, e.clientY - startYRef.current));
  };
  const onPointerUp = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (dragY > dismissThreshold) {
      // Dismiss: keep dragY so the sheet slides down from where the finger left
      // off (transform falls back to translateY(100%) once `shown` is false).
      setShown(false);
      onClose();
    } else {
      setDragY(0); // snap back up
    }
  };

  const dragging = draggingRef.current;
  const transform = dragging
    ? `translateY(${dragY}px)`
    : shown ? 'translateY(0)' : 'translateY(100%)';
  const scrimOpacity = !shown ? 0 : dragging ? Math.max(0, 1 - dragY / 400) : 1;

  return (
    <div className="fixed inset-0 z-[60] lg:hidden">
      {/* Scrim */}
      <div
        onClick={onClose}
        className="absolute inset-0"
        style={{
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          opacity: scrimOpacity,
          transition: dragging ? 'none' : 'opacity 0.22s ease',
        }}
      />
      {/* Sheet wrapper — owns positioning, slide + drag transform */}
      <div
        className="absolute left-0 right-0 bottom-0"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          transform,
          transition: dragging ? 'none' : 'transform 0.22s cubic-bezier(.32,.72,0,1)',
          touchAction: 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}
