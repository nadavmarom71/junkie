import { useEffect, useRef, useState } from 'react';

const STATUS_MESSAGES = [
  'מעיר את השרת...',
  'מתחבר למסד הנתונים...',
  'טוען את הנתונים שלך...',
  'מכין את הדאשבורד...',
];

interface Props {
  isLoading: boolean;
}

export default function SmartLoadingOverlay({ isLoading }: Props) {
  const [progress, setProgress] = useState(0);
  const [statusIdx, setStatusIdx] = useState(0);
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const statusTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Show overlay on mount or when loading starts
  useEffect(() => {
    if (isLoading) {
      setVisible(true);
      setExiting(false);
      setProgress(0);
      setStatusIdx(0);
      startRef.current = null;

      // Animate progress to 90% over ~25s (simulating cold start)
      const duration = 25000;
      const animate = (ts: number) => {
        if (!startRef.current) startRef.current = ts;
        const elapsed = ts - startRef.current;
        // Ease out: fast at start, slower approaching 90%
        const frac = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - frac, 2); // quadratic ease out
        setProgress(Math.min(90, eased * 90));
        rafRef.current = requestAnimationFrame(animate);
      };
      rafRef.current = requestAnimationFrame(animate);

      // Cycle status messages every 4 seconds
      statusTimerRef.current = setInterval(() => {
        setStatusIdx(prev => (prev + 1) % STATUS_MESSAGES.length);
      }, 4000);
    } else if (visible) {
      // Data loaded — snap to 100% then fade out
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (statusTimerRef.current) clearInterval(statusTimerRef.current);
      setProgress(100);
      setStatusIdx(STATUS_MESSAGES.length - 1);
      setTimeout(() => {
        setExiting(true);
        setTimeout(() => setVisible(false), 500);
      }, 300);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (statusTimerRef.current) clearInterval(statusTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-50"
      style={{
        background: 'var(--bg, #0a0a0f)',
        opacity: exiting ? 0 : 1,
        transition: 'opacity 0.5s ease',
        pointerEvents: exiting ? 'none' : 'auto',
      }}
    >
      {/* Logo / Brand */}
      <div className="mb-8 text-center">
        <div
          className="text-3xl font-black tracking-tight mb-1"
          style={{ background: 'linear-gradient(135deg,#2563EB,#056dff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
        >
          junkie
        </div>
        <div className="text-xs font-semibold" style={{ color: 'var(--t2, rgba(255,255,255,0.4))' }}>
          מערכת ניהול פיננסי
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="w-56 rounded-full overflow-hidden mb-4"
        style={{ height: 4, background: 'rgba(255,255,255,0.07)' }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg,#2563EB,#056dff)',
            transition: progress === 100 ? 'width 0.3s ease' : 'width 0.1s linear',
          }}
        />
      </div>

      {/* Status text */}
      <p
        className="text-sm font-medium"
        style={{ color: 'var(--t2, rgba(255,255,255,0.5))', minHeight: 20 }}
      >
        {STATUS_MESSAGES[statusIdx]}
      </p>

      {/* Slow hint — shown after 10s */}
      {progress > 45 && progress < 100 && (
        <p
          className="mt-6 text-xs text-center max-w-xs"
          style={{ color: 'rgba(255,255,255,0.2)' }}
        >
          השרת מתעורר מהשינה — זה לוקח רגע בפעם הראשונה
        </p>
      )}
    </div>
  );
}
