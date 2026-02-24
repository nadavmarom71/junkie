import { useEffect, useRef } from 'react';
import { formatCurrency } from '@/lib/formatters';

const C = 238.76; // circumference = 2π × r=38

export interface DonutSegment {
  label: string;
  amount: number;
  color: string;
}

interface Props {
  segments: DonutSegment[];
  total: number;
  title?: string;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export default function DonutChart({ segments, total, title = 'התפלגות הוצאות' }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Arc lengths proportional to each segment's share
  const arcs = segments.map(s => (s.amount / total) * C);

  // Stroke-dashoffset: start each segment where the previous ended.
  // 12 o'clock start = C/4. Each subsequent segment decrements by previous arc length.
  const offsets: number[] = [];
  let cursor = C / 4;
  for (const arc of arcs) {
    offsets.push(cursor);
    cursor -= arc;
  }

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    arcs.forEach((arc, i) => {
      const circle = svg.querySelector<SVGCircleElement>(`.ds-${i + 1}`);
      if (!circle) return;
      const el = circle;
      const delay = 300 + i * 100;
      const dur = 700;
      setTimeout(() => {
        const start = performance.now();
        function step(now: number) {
          const t = Math.min((now - start) / dur, 1);
          const current = arc * easeOutCubic(t);
          el.setAttribute('stroke-dasharray', `${current.toFixed(2)} ${(C - current).toFixed(2)}`);
          if (t < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      }, delay);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments, total]);

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-extrabold">{title}</span>
        <span className="text-[11px]" style={{ color: '#2563EB' }}>לפי קטגוריה</span>
      </div>
      <div className="flex items-center gap-4">
        {/* SVG Donut */}
        <div className="relative flex-shrink-0">
          <svg ref={svgRef} viewBox="0 0 100 100" width="108" height="108">
            {/* Track */}
            <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="9" />
            {/* Segments — start at 0 width, animated by JS above */}
            {segments.map((seg, i) => (
              <circle
                key={seg.label}
                className={`ds-${i + 1}`}
                cx="50" cy="50" r="38"
                fill="none"
                stroke={seg.color}
                strokeWidth="9"
                strokeLinecap="butt"
                strokeDasharray={`0 ${C}`}
                strokeDashoffset={offsets[i]}
              />
            ))}
          </svg>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[13px] font-extrabold leading-none">{formatCurrency(total)}</span>
            <span className="text-[8px] mt-0.5" style={{ color: 'var(--t2)' }}>סה"כ</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 min-w-0">
          {segments.map(seg => {
            const pct = Math.round((seg.amount / total) * 100);
            return (
              <div key={seg.label} className="flex items-center gap-2 py-[3px]">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: seg.color }} />
                <span className="text-[11px] flex-1 truncate" style={{ color: 'var(--t2)' }}>{seg.label}</span>
                <span className="text-[9px]" style={{ color: 'var(--t3)' }}>{formatCurrency(seg.amount)}</span>
                <span className="text-[12px] font-extrabold" style={{ color: seg.color }}>{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
