import type { ReactNode } from 'react';
import { useCountUp } from '@/hooks/useCountUp';
import { cn } from '@/lib/utils';

interface SparkPoint { x: number; y: number; }

interface Props {
  title: string;
  value: string;
  rawValue?: number;
  prefix?: string;
  subValue?: string;
  icon: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
  variant?: 'success' | 'danger' | 'purple' | 'neutral' | 'warning';
  sparkPoints?: SparkPoint[];
  className?: string;
}

const VARIANTS = {
  success: { value: '#00C48C', icon: 'rgba(0,196,140,0.12)',   spark: 'rgba(0,196,140,0.7)' },
  danger:  { value: '#F43F5E', icon: 'rgba(244,63,94,0.10)',   spark: 'rgba(244,63,94,0.7)' },
  purple:  { value: '#6aa3ff', icon: 'rgba(106,163,255,0.10)', spark: 'rgba(106,163,255,0.7)' },
  neutral: { value: '#FFFFFF', icon: 'rgba(255,255,255,0.07)', spark: 'rgba(255,255,255,0.4)' },
  warning: { value: '#EAB308', icon: 'rgba(234,179,8,0.10)',   spark: 'rgba(234,179,8,0.7)'  },
};

const DEFAULT_POINTS: SparkPoint[] = [
  { x: 0, y: 14 }, { x: 23, y: 10 }, { x: 47, y: 16 }, { x: 70, y: 4 },
];

export default function KpiCard({
  title, value, rawValue, prefix = '', icon, trend, trendLabel,
  variant = 'neutral', sparkPoints, className,
}: Props) {
  const animated = useCountUp(rawValue ?? 0, 1200, rawValue !== undefined);
  const colors = VARIANTS[variant];
  const trendColor = trend === 'up' ? '#00C48C' : trend === 'down' ? '#F43F5E' : 'var(--t2)';
  const trendIcon  = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '—';
  const points = sparkPoints ?? DEFAULT_POINTS;
  const ptStr  = points.map(p => `${p.x},${p.y}`).join(' ');
  const last   = points[points.length - 1];

  const displayValue = rawValue !== undefined
    ? `${prefix}${animated.toLocaleString('he-IL')}`
    : value;

  return (
    <div className={cn('glass-card flex flex-col cursor-pointer p-4 hover:-translate-y-0.5 transition-transform', className)}>
      {/* Icon */}
      <div
        className="flex items-center justify-center w-9 h-9 rounded-lg mb-3 flex-shrink-0"
        style={{ background: colors.icon }}
      >
        {icon}
      </div>

      {/* Label */}
      <div className="text-[15px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--t2)' }}>
        {title}
      </div>

      {/* Value */}
      <div className="text-[32px] font-extrabold tracking-tight leading-none mb-2" style={{ color: colors.value }}>
        {displayValue}
      </div>

      {/* Trend */}
      {trendLabel && (
        <div className="text-[15px] font-bold flex items-center gap-0.5 mb-2" style={{ color: trendColor }}>
          {trendIcon} {trendLabel}
        </div>
      )}

      {/* Sparkline */}
      <div className="mt-auto">
        <svg viewBox="0 0 70 18" width="100%" height="18" preserveAspectRatio="none" overflow="visible">
          <polyline
            points={ptStr}
            fill="none"
            stroke={colors.spark}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx={last.x} cy={last.y} r="2" fill={colors.value} />
        </svg>
      </div>
    </div>
  );
}
