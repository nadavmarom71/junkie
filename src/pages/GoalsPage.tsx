import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useGoals, type Goal } from '@/hooks/useGoals';
import { useCFOStrategy, useRefreshStrategy } from '@/hooks/useCFOStrategy';
import { formatCurrency } from '@/lib/formatters';
import api from '@/lib/api';
import type { CFOStrategy, CFOPriority } from '@/types';
import { ChevronDown, ChevronUp, RefreshCw, AlertTriangle, TrendingUp, Zap, Scale, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

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

// ── SVG Ring ──────────────────────────────────────────────────────────────────
function Ring({ pct, color, size = 56 }: { pct: number; color: string; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const fill = Math.min(pct, 100) / 100 * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={6} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={6}
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Goal card ─────────────────────────────────────────────────────────────────
function GoalCard({ goal, avgMonthlySavings }: { goal: Goal; avgMonthlySavings: number }) {
  const isLongTerm = goal.type === 'long_term';
  const [override, setOverride] = useState(0);

  if (avgMonthlySavings > 0 && override === 0) {
    // init once without effect
  }

  const remaining = (goal.target || 0) - (goal.current || 0);
  const savingsRate = override > 0 ? override : avgMonthlySavings;
  const sliderMonths = savingsRate > 0 && remaining > 0 ? Math.ceil(remaining / savingsRate) : null;
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
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{goal.icon}</span>
          <span className="font-semibold text-sm">{goal.label}</span>
        </div>
        {goal.status && <StatusBadge status={goal.status} />}
      </div>

      <div>
        <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--t2)' }}>
          <span>{formatCurrency(goal.current || 0)}</span>
          <span>{Math.round(goal.pct || 0)}%</span>
          <span>{formatCurrency(goal.target || 0)}</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
        </div>
      </div>

      {goal.trajectory_date && (
        <p className="text-xs" style={{ color: 'var(--t2)' }}>
          📅 בקצב הנוכחי תגיע ב-{new Date(goal.trajectory_date).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}
        </p>
      )}

      {isLongTerm && avgMonthlySavings > 0 && (
        <div className="space-y-1 pt-1">
          <div className="flex justify-between text-xs" style={{ color: 'var(--t2)' }}>
            <span>חיסכון חודשי: {formatCurrency(override || avgMonthlySavings)}</span>
            {sliderDate && (
              <span>יעד: <strong style={{ color: 'var(--fg)' }}>{sliderDate}</strong></span>
            )}
          </div>
          <input
            type="range" dir="rtl"
            min={1} max={Math.max((override || avgMonthlySavings) * 3, 10000)} step={500}
            value={override || avgMonthlySavings}
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
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between text-sm font-semibold">
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

// ── Smart Budget Tab ───────────────────────────────────────────────────────────

type Velocity = 'aggressive' | 'balanced' | 'relaxed';

interface BudgetLine {
  category: string;
  budget_limit: number;
  actual_avg: number;
  reasoning: string;
}

interface BudgetData {
  velocity: Velocity;
  lines: BudgetLine[];
  generated_at: string;
}

const VELOCITY_OPTIONS: { id: Velocity; label: string; sub: string; icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; color: string }[] = [
  { id: 'aggressive', label: 'אגרסיבי',  sub: 'מקסימום חיסכון, מינימום פינוק', icon: Zap,   color: '#ef4444' },
  { id: 'balanced',   label: 'מאוזן',    sub: 'חיים נורמליים + חיסכון ריאלי',  icon: Scale, color: '#3b82f6' },
  { id: 'relaxed',    label: 'נינוח',     sub: 'שינוי קטן, לחץ נמוך',           icon: Leaf,  color: '#22c55e' },
];

function SmartBudgetTab() {
  const [velocity, setVelocity] = useState<Velocity>('balanced');

  const { data: existing, isLoading: loadingExisting } = useQuery<BudgetData | null>({
    queryKey: ['budget_limits'],
    queryFn: () => api.get('/goals/budget'),
  });

  const qc = useQueryClient();
  const generate = useMutation<BudgetData, Error, Velocity>({
    mutationFn: (v) => api.post('/goals/budget/generate', { velocity: v }),
    onSuccess: (data) => {
      qc.setQueryData(['budget_limits'], data);
      toast.success('תקציב חכם נוצר בהצלחה');
    },
    onError: () => toast.error('שגיאה ביצירת תקציב'),
  });

  const budget = generate.data || existing;
  const isGenerating = generate.isPending;

  return (
    <div className="space-y-5">
      {/* Velocity selector */}
      <div className="space-y-2">
        <p className="text-xs font-semibold" style={{ color: 'var(--t2)' }}>קצב יעד</p>
        <div className="grid grid-cols-3 gap-2">
          {VELOCITY_OPTIONS.map(({ id, label, sub, icon: Icon, color }) => (
            <button
              key={id}
              onClick={() => setVelocity(id)}
              className="flex flex-col items-center gap-1.5 py-3 rounded-2xl text-center transition-all"
              style={{
                background: velocity === id ? `${color}18` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${velocity === id ? color : 'rgba(255,255,255,0.07)'}`,
              }}
            >
              <Icon size={18} style={{ color: velocity === id ? color : 'var(--t2)' }} />
              <span className="text-xs font-bold" style={{ color: velocity === id ? color : 'var(--fg)' }}>{label}</span>
              <span className="text-[10px] leading-tight px-1" style={{ color: 'var(--t2)' }}>{sub}</span>
            </button>
          ))}
        </div>
      </div>

      <Button
        className="w-full gap-2"
        onClick={() => generate.mutate(velocity)}
        disabled={isGenerating}
      >
        <RefreshCw size={14} className={isGenerating ? 'animate-spin' : ''} />
        {isGenerating ? 'מחשב תקציב חכם...' : 'צור תקציב חכם'}
      </Button>

      {/* Budget lines */}
      {loadingExisting && !budget && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />)}
        </div>
      )}

      {budget && budget.lines && budget.lines.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold" style={{ color: 'var(--t2)' }}>
              תקציב לפי קטגוריה · {VELOCITY_OPTIONS.find(v => v.id === budget.velocity)?.label}
            </p>
            <p className="text-xs" style={{ color: 'var(--t2)' }}>
              {new Date(budget.generated_at).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}
            </p>
          </div>

          {budget.lines.map((line) => {
            const pct = line.budget_limit > 0 ? Math.round((line.actual_avg / line.budget_limit) * 100) : 0;
            const isOver = pct > 100;
            const ringColor = isOver ? '#ef4444' : pct > 80 ? '#f59e0b' : '#22c55e';

            return (
              <div
                key={line.category}
                style={{
                  background: 'rgba(255,255,255,0.025)',
                  border: `1px solid ${isOver ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.07)'}`,
                  borderRadius: 14,
                }}
                className="p-4 flex items-center gap-4"
              >
                {/* Ring */}
                <div className="relative flex-shrink-0">
                  <Ring pct={pct} color={ringColor} size={56} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[11px] font-bold" style={{ color: ringColor }}>{Math.min(pct, 999)}%</span>
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{line.category}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs" style={{ color: 'var(--t2)' }}>
                      ממוצע: {formatCurrency(line.actual_avg)}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--t2)' }}>·</span>
                    <span className="text-xs font-medium" style={{ color: isOver ? '#ef4444' : '#22c55e' }}>
                      יעד: {formatCurrency(line.budget_limit)}
                    </span>
                  </div>
                  <p className="text-[11px] mt-1 leading-tight" style={{ color: 'var(--t2)' }}>{line.reasoning}</p>
                </div>

                {isOver && (
                  <div className="flex-shrink-0">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                      חריגה
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!budget && !loadingExisting && (
        <div
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14 }}
          className="py-8 text-center"
        >
          <p className="text-sm" style={{ color: 'var(--t2)' }}>
            בחר קצב יעד ולחץ "צור תקציב חכם"
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function GoalsPage() {
  const [activeTab, setActiveTab] = useState<'goals' | 'budget'>('goals');
  const { data: goalsData, isLoading: goalsLoading } = useGoals();
  const { data: strategyData, isLoading: strategyLoading } = useCFOStrategy();
  const refresh = useRefreshStrategy();

  const goals = goalsData?.goals || [];
  const summary = goalsData?.summary;
  const strategy: CFOStrategy | null = strategyData?.data || null;
  const avgSavings = summary?.netSavings || 0;

  const tabStyle = (active: boolean) => ({
    flex: 1,
    padding: '8px 0',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: active ? 700 : 500,
    background: active ? 'rgba(37,99,235,0.2)' : 'transparent',
    color: active ? '#60a5fa' : 'var(--t2)',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s',
  } as React.CSSProperties);

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
          <h1 className="text-xl font-bold">יעדים ותקציב</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--t2)' }}>תוכנית אסטרטגית + תקציב חכם</p>
        </div>
        {activeTab === 'goals' && (
          <Button size="sm" variant="outline" onClick={() => refresh.mutateAsync()} disabled={refresh.isPending} className="gap-1.5 text-xs">
            <RefreshCw size={13} className={refresh.isPending ? 'animate-spin' : ''} />
            רענן
          </Button>
        )}
      </div>

      {/* Tab bar */}
      <div
        className="flex gap-1 p-1 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <button style={tabStyle(activeTab === 'goals')} onClick={() => setActiveTab('goals')}>🎯 יעדים</button>
        <button style={tabStyle(activeTab === 'budget')} onClick={() => setActiveTab('budget')}>💡 תקציב חכם</button>
      </div>

      {/* ── Goals Tab ── */}
      {activeTab === 'goals' && (
        <>
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

          {strategy?.priorities && strategy.priorities.length > 0 && (
            <StrategyPanel priorities={strategy.priorities} />
          )}

          {!strategyLoading && !strategy && (
            <div
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14 }}
              className="p-6 text-center space-y-3"
            >
              <p className="text-sm" style={{ color: 'var(--t2)' }}>
                עדיין לא נוצרה אסטרטגיה — לחץ "רענן" כדי להפעיל את ה-CFO
              </p>
              <Button size="sm" onClick={() => refresh.mutateAsync()} disabled={refresh.isPending}>
                <RefreshCw size={13} className={`me-1.5 ${refresh.isPending ? 'animate-spin' : ''}`} />
                צור אסטרטגיה עכשיו
              </Button>
            </div>
          )}
        </>
      )}

      {/* ── Smart Budget Tab ── */}
      {activeTab === 'budget' && <SmartBudgetTab />}
    </div>
  );
}
