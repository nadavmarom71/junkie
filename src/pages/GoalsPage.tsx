import { useState, useEffect } from 'react';
import { useGoals, type Goal } from '@/hooks/useGoals';
import { useCFOStrategy, useRefreshStrategy } from '@/hooks/useCFOStrategy';
import { formatCurrency } from '@/lib/formatters';
import type { CFOStrategy, CFOPriority } from '@/types';
import { ChevronDown, ChevronUp, RefreshCw, AlertTriangle, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status?: string }) {
  const map: Record<string, { label: string; className: string }> = {
    on_track: { label: 'בנתיב', className: 'bg-green-500/20 text-green-400' },
    at_risk:  { label: 'בסיכון', className: 'bg-amber-500/20 text-amber-400' },
    behind:   { label: 'פיגור',  className: 'bg-red-500/20 text-red-400' },
  };
  const s = map[status || ''] || map['at_risk'];
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.className}`}>
      {s.label}
    </span>
  );
}

// ── Goal card ─────────────────────────────────────────────────────────────────
function GoalCard({ goal, avgMonthlySavings }: { goal: Goal; avgMonthlySavings: number }) {
  const isLongTerm = goal.type === 'long_term';
  const [override, setOverride] = useState(0);

  useEffect(() => {
    if (avgMonthlySavings > 0 && override === 0) setOverride(avgMonthlySavings);
  }, [avgMonthlySavings]);

  const remaining = (goal.target || 0) - (goal.current || 0);
  const sliderMonths = override > 0 && remaining > 0 ? Math.ceil(remaining / override) : null;
  const sliderDate = sliderMonths
    ? new Date(Date.now() + sliderMonths * 30 * 86400000).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })
    : null;

  const pct = Math.min(goal.pct || 0, 100);
  const barColor = goal.status === 'on_track' ? '#22c55e'
    : goal.status === 'at_risk' ? '#f59e0b'
    : goal.status === 'behind' ? '#ef4444'
    : goal.color || '#60a5fa';

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 14,
      }}
      className="p-4 space-y-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{goal.icon}</span>
          <span className="font-semibold text-sm">{goal.label}</span>
        </div>
        {goal.status && <StatusBadge status={goal.status} />}
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--t2)' }}>
          <span>{formatCurrency(goal.current || 0)}</span>
          <span>{Math.round(goal.pct || 0)}%</span>
          <span>{formatCurrency(goal.target || 0)}</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: barColor }}
          />
        </div>
      </div>

      {/* Static trajectory date (from backend) */}
      {goal.trajectory_date && (
        <p className="text-xs" style={{ color: 'var(--t2)' }}>
          📅 בקצב הנוכחי תגיע ב-{new Date(goal.trajectory_date).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}
        </p>
      )}

      {/* Interactive slider — long-term goals only */}
      {isLongTerm && avgMonthlySavings > 0 && (
        <div className="space-y-1 pt-1">
          <div className="flex justify-between text-xs" style={{ color: 'var(--t2)' }}>
            <span>חיסכון חודשי: {formatCurrency(override)}</span>
            {sliderDate && (
              <span>
                יעד: <strong style={{ color: 'var(--fg)' }}>{sliderDate}</strong>
              </span>
            )}
          </div>
          <input
            type="range"
            dir="rtl"
            min={1}
            max={Math.max(override * 3, 10000)}
            step={500}
            value={override}
            onChange={e => setOverride(Number(e.target.value))}
            className="w-full accent-blue-400"
          />
        </div>
      )}
    </div>
  );
}

// ── Strategy panel ────────────────────────────────────────────────────────────
function StrategyPanel({ priorities }: { priorities: CFOPriority[] }) {
  const [open, setOpen] = useState(false);
  const urgencyStyle: Record<string, string> = {
    high:   'bg-red-500/20 text-red-400',
    medium: 'bg-amber-500/20 text-amber-400',
    low:    'bg-slate-500/20 text-slate-400',
  };
  const urgencyLabel: Record<string, string> = { high: 'דחוף', medium: 'בינוני', low: 'נמוך' };

  return (
    <div
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14 }}
      className="p-4"
    >
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between text-sm font-semibold"
      >
        <span>🧠 סדר עדיפויות של ה-CFO</span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {open && (
        <div className="mt-3 space-y-4">
          {priorities.map((p, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${urgencyStyle[p.urgency] || urgencyStyle.medium}`}>
                  {urgencyLabel[p.urgency] || p.urgency}
                </span>
                <span className="text-sm font-medium">{p.goal}</span>
              </div>
              <p className="text-xs ps-1" style={{ color: 'var(--t2)' }}>{p.reasoning}</p>
              {p.actionable_steps?.length > 0 && (
                <ul className="text-xs space-y-0.5 ps-3" style={{ color: 'var(--t2)' }}>
                  {p.actionable_steps.map((s, j) => <li key={j}>• {s}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function GoalsPage() {
  const { data: goalsData, isLoading: goalsLoading } = useGoals();
  const { data: strategyData, isLoading: strategyLoading } = useCFOStrategy();
  const refresh = useRefreshStrategy();

  const goals = goalsData?.goals || [];
  const summary = goalsData?.summary;
  const strategy: CFOStrategy | null = strategyData?.data || null;
  const avgSavings = summary?.netSavings || 0;

  if (goalsLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">נדב והיעדים</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--t2)' }}>תוכנית אסטרטגית + מסלולים</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => refresh.mutateAsync()}
          disabled={refresh.isPending}
          className="gap-1.5 text-xs"
        >
          <RefreshCw size={13} className={refresh.isPending ? 'animate-spin' : ''} />
          רענן אסטרטגיה
        </Button>
      </div>

      {/* CFO strategic summary */}
      {strategy?.strategic_summary && (
        <div
          style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 12 }}
          className="p-4"
        >
          <div className="flex items-start gap-2">
            <TrendingUp size={16} className="mt-0.5 text-blue-400 shrink-0" />
            <p className="text-sm leading-relaxed">{strategy.strategic_summary}</p>
          </div>
        </div>
      )}

      {/* Income gap alert */}
      {strategy?.income_gap?.exists && (
        <div
          style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12 }}
          className="p-4 flex items-start gap-3"
        >
          <AlertTriangle size={16} className="mt-0.5 text-red-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-400">
              פער הכנסה — חסרים ₪{(strategy.income_gap.monthly_shortfall || 0).toLocaleString('he-IL')} בחודש
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--t2)' }}>
              {strategy.income_gap.specific_recommendation}
            </p>
          </div>
        </div>
      )}

      {/* KPI row */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'הכנסה חודשית',   value: formatCurrency(summary.monthlyIncome || 0) },
            { label: 'הוצאות עסקיות', value: formatCurrency(summary.monthlyExpenses || 0) },
            { label: 'הוצאות אישיות', value: formatCurrency(summary.personalExpenses || 0) },
            { label: 'חיסכון נטו',     value: formatCurrency(avgSavings) },
          ].map(kpi => (
            <div
              key={kpi.label}
              style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 }}
              className="p-3"
            >
              <p className="text-xs mb-1" style={{ color: 'var(--t2)' }}>{kpi.label}</p>
              <p className="text-base font-bold">{kpi.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Goal cards */}
      <div className="space-y-3">
        {goals.map(goal => (
          <GoalCard key={goal.id} goal={goal} avgMonthlySavings={avgSavings} />
        ))}
        {goals.length === 0 && (
          <p className="text-sm text-center py-8" style={{ color: 'var(--t2)' }}>
            הגדר יעדים בהגדרות כדי לראות אותם כאן
          </p>
        )}
      </div>

      {/* Strategy priorities (collapsible) */}
      {strategy?.priorities && strategy.priorities.length > 0 && (
        <StrategyPanel priorities={strategy.priorities} />
      )}

      {/* No strategy yet */}
      {!strategyLoading && !strategy && (
        <div
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14 }}
          className="p-6 text-center space-y-3"
        >
          <p className="text-sm" style={{ color: 'var(--t2)' }}>
            עדיין לא נוצרה אסטרטגיה — לחץ "רענן" או שלח{' '}
            <code className="text-xs bg-white/10 px-1.5 py-0.5 rounded">/onboard</code>{' '}
            בטלגרם
          </p>
          <Button
            size="sm"
            onClick={() => refresh.mutateAsync()}
            disabled={refresh.isPending}
          >
            <RefreshCw size={13} className={`me-1.5 ${refresh.isPending ? 'animate-spin' : ''}`} />
            צור אסטרטגיה עכשיו
          </Button>
        </div>
      )}
    </div>
  );
}
