import { Link } from 'react-router-dom';
import {
  Target, TrendingUp, Wallet, PiggyBank, Calendar, Shield,
  Landmark, GraduationCap, BarChart3, Settings, ArrowUpRight,
  ArrowDownRight, Minus,
} from 'lucide-react';
import { useGoals, type Goal } from '@/hooks/useGoals';
import { formatCurrency } from '@/lib/formatters';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  'trending-up': TrendingUp,
  'wallet': Wallet,
  'piggy-bank': PiggyBank,
  'calendar': Calendar,
  'shield': Shield,
  'landmark': Landmark,
  'graduation-cap': GraduationCap,
  'bar-chart': BarChart3,
};

function GoalSkeleton() {
  const box = { background: 'rgba(255,255,255,0.06)', borderRadius: 12 } as const;
  return (
    <div className="space-y-5">
      <div style={{ ...box, height: 32, width: 180 }} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => <div key={i} style={{ ...box, height: 90 }} />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} style={{ ...box, height: 160 }} />)}
      </div>
    </div>
  );
}

function GoalCard({ goal }: { goal: Goal }) {
  const Icon = ICON_MAP[goal.icon] || Target;
  const clampedPct = Math.min(goal.pct, 100);
  const isGood = goal.inverse ? goal.pct < 80 : goal.pct >= 80;
  const isWarning = goal.inverse ? goal.pct >= 80 && goal.pct < 100 : goal.pct >= 50 && goal.pct < 80;
  const statusColor = isGood ? '#22c55e' : isWarning ? '#eab308' : '#f43f5e';

  const remaining = goal.inverse
    ? Math.max(0, goal.target - goal.current)
    : Math.max(0, goal.target - goal.current);

  return (
    <div
      className="rounded-2xl p-4 relative overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Accent glow */}
      <div
        className="absolute top-0 left-0 w-full h-1 rounded-t-2xl"
        style={{ background: `linear-gradient(90deg, ${goal.color}60, transparent)` }}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: `${goal.color}15` }}
          >
            <Icon className="h-4 w-4" style={{ color: goal.color }} />
          </div>
          <span className="text-sm font-semibold text-white">{goal.label}</span>
        </div>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{
            background: `${statusColor}15`,
            color: statusColor,
          }}
        >
          {goal.pct}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2.5 rounded-full overflow-hidden mb-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${clampedPct}%`, background: goal.color, opacity: 0.85 }}
        />
      </div>

      {/* Numbers */}
      <div className="flex justify-between items-end text-xs">
        <div>
          <p style={{ color: 'var(--t3)' }}>נוכחי</p>
          <p className="text-white font-bold text-sm">{formatCurrency(goal.current)}</p>
        </div>
        <div className="text-center">
          {goal.projected != null && (
            <>
              <p style={{ color: 'var(--t3)' }}>צפי לסוף חודש</p>
              <p className="font-semibold text-sm" style={{ color: goal.color }}>
                {formatCurrency(goal.projected)}
              </p>
            </>
          )}
          {goal.subtitle && (
            <p className="text-[11px] mt-1" style={{ color: 'var(--t3)' }}>{goal.subtitle}</p>
          )}
        </div>
        <div className="text-left">
          <p style={{ color: 'var(--t3)' }}>יעד</p>
          <p className="text-white font-bold text-sm">{formatCurrency(goal.target)}</p>
        </div>
      </div>

      {/* Remaining */}
      {remaining > 0 && !goal.inverse && (
        <p className="text-[11px] mt-2 text-center" style={{ color: 'var(--t3)' }}>
          חסרים עוד {formatCurrency(remaining)}
        </p>
      )}
      {goal.inverse && goal.current < goal.target && (
        <p className="text-[11px] mt-2 text-center" style={{ color: '#22c55e' }}>
          נשארו {formatCurrency(remaining)} מהתקציב
        </p>
      )}
    </div>
  );
}

function SummaryKpi({ label, value, trend }: { label: string; value: string; trend?: 'up' | 'down' | 'neutral' }) {
  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus;
  const trendColor = trend === 'up' ? '#22c55e' : trend === 'down' ? '#f43f5e' : 'var(--t3)';
  return (
    <div
      className="rounded-xl p-3 text-center"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <p className="text-[11px] mb-1" style={{ color: 'var(--t3)' }}>{label}</p>
      <div className="flex items-center justify-center gap-1">
        <span className="text-lg font-bold text-white">{value}</span>
        {trend && <TrendIcon className="h-3.5 w-3.5" style={{ color: trendColor }} />}
      </div>
    </div>
  );
}

export default function GoalsPage() {
  const { data, isLoading } = useGoals();

  if (isLoading) return <GoalSkeleton />;

  const goals = data?.goals || [];
  const summary = data?.summary;

  const monthlyGoals = goals.filter(g => g.type === 'monthly');
  const annualGoals = goals.filter(g => g.type === 'annual');
  const longTermGoals = goals.filter(g => g.type === 'long_term');

  const hasNoGoals = goals.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-6 w-6 text-white/70" />
          <h1 className="text-2xl font-bold text-white">יעדים פיננסיים</h1>
        </div>
        <Link to="/settings">
          <button
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--t2)',
            }}
          >
            <Settings className="h-3.5 w-3.5" />
            ערוך יעדים
          </button>
        </Link>
      </div>

      {/* Empty state */}
      {hasNoGoals && (
        <div
          className="rounded-2xl p-8 text-center"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <Target className="h-12 w-12 mx-auto mb-3" style={{ color: 'var(--t3)' }} />
          <h2 className="text-lg font-bold text-white mb-2">עדיין לא הגדרת יעדים</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--t2)' }}>
            הגדר יעדי הכנסה, תקציב והשקעות בהגדרות כדי לעקוב אחר ההתקדמות שלך.
          </p>
          <Link to="/settings">
            <button
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
              style={{
                background: 'linear-gradient(135deg, #2563EB, #056dff)',
                boxShadow: '0 4px 16px rgba(37,99,235,0.4)',
              }}
            >
              הגדר יעדים
            </button>
          </Link>
        </div>
      )}

      {/* Summary KPIs */}
      {summary && !hasNoGoals && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryKpi
            label="הכנסה החודש"
            value={formatCurrency(summary.monthlyIncome)}
            trend={summary.monthlyIncome > 0 ? 'up' : 'neutral'}
          />
          <SummaryKpi
            label="הוצאות עסקיות"
            value={formatCurrency(summary.monthlyExpenses)}
            trend={summary.monthlyExpenses > 0 ? 'down' : 'neutral'}
          />
          <SummaryKpi
            label="הוצאות אישיות"
            value={formatCurrency(summary.personalExpenses)}
            trend={summary.personalExpenses > 0 ? 'down' : 'neutral'}
          />
          <SummaryKpi
            label="חיסכון נטו"
            value={formatCurrency(summary.netSavings)}
            trend={summary.netSavings > 0 ? 'up' : summary.netSavings < 0 ? 'down' : 'neutral'}
          />
        </div>
      )}

      {/* Monthly goals */}
      {monthlyGoals.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--t2)' }}>יעדים חודשיים</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {monthlyGoals.map(g => <GoalCard key={g.id} goal={g} />)}
          </div>
        </div>
      )}

      {/* Annual goals */}
      {annualGoals.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--t2)' }}>יעדים שנתיים</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {annualGoals.map(g => <GoalCard key={g.id} goal={g} />)}
          </div>
        </div>
      )}

      {/* Long-term goals */}
      {longTermGoals.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--t2)' }}>חסכונות והשקעות</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {longTermGoals.map(g => <GoalCard key={g.id} goal={g} />)}
          </div>
        </div>
      )}

      {/* YTD summary */}
      {summary && !hasNoGoals && (
        <div
          className="rounded-2xl p-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <h3 className="text-sm font-semibold text-white mb-3">סיכום שנתי (YTD)</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-[11px]" style={{ color: 'var(--t3)' }}>הכנסות מתחילת השנה</p>
              <p className="text-lg font-bold text-white">{formatCurrency(summary.ytdIncome)}</p>
            </div>
            <div>
              <p className="text-[11px]" style={{ color: 'var(--t3)' }}>הוצאות מתחילת השנה</p>
              <p className="text-lg font-bold text-white">{formatCurrency(summary.ytdExpenses)}</p>
            </div>
            <div>
              <p className="text-[11px]" style={{ color: 'var(--t3)' }}>ממוצע הוצאות אישיות/חודש</p>
              <p className="text-lg font-bold text-white">{formatCurrency(summary.avgPersonalMonthly)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
