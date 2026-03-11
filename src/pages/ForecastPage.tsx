import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, ComposedChart, Line
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, CalendarDays, Banknote, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import { useRetainerForecast, useRevenueForecast, useCashFlowForecast } from '@/hooks/useForecast';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

const CHART_GRID = { strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.05)' };
const CHART_AXIS = { fontSize: 12, fill: 'rgba(255,255,255,0.4)' };
const TOOLTIP_STYLE = {
  background: 'rgba(10,12,20,0.95)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  backdropFilter: 'blur(12px)',
};

function TrendBadge({ direction, label }: { direction: 'growing' | 'declining' | 'stable'; label: string }) {
  const config = {
    growing: { icon: <TrendingUp size={12} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    declining: { icon: <TrendingDown size={12} />, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
    stable: { icon: <Minus size={12} />, color: 'text-white/50', bg: 'bg-white/5 border-white/10' },
  };
  const c = config[direction];
  return (
    <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border', c.bg, c.color)}>
      {c.icon} {label}
    </span>
  );
}

function StatBox({ label, value, sub, accent = 'white' }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs font-medium tracking-wide uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</span>
      <span className={cn('text-base sm:text-lg font-bold mt-0.5', accent === 'green' && 'text-emerald-400', accent === 'red' && 'text-red-400')}>{value}</span>
      {sub && <span className="text-[11px] sm:text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{sub}</span>}
    </div>
  );
}

function SectionCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-2xl p-4 sm:p-5', className)} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
      {children}
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start justify-between mb-4 sm:mb-5">
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
          {icon}
        </div>
        <div>
          <h2 className="text-sm sm:text-base font-bold">{title}</h2>
          {subtitle && <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

export default function ForecastPage() {
  const retainerForecast = useRetainerForecast();
  const revenueForecast = useRevenueForecast();
  const cashFlowForecast = useCashFlowForecast();

  const isLoading = retainerForecast.isLoading || revenueForecast.isLoading || cashFlowForecast.isLoading;

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div style={{ height: 32, width: 200, background: 'rgba(255,255,255,0.06)', borderRadius: 8 }} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  const revenue = revenueForecast.data;
  const retainers = retainerForecast.data;
  const cashFlow = cashFlowForecast.data;

  // Build combined chart data: history + forecast
  const historyData = (revenue?.history || []).map(h => ({
    month: h.month,
    actual_income: h.income,
    actual_expenses: h.expenses,
    type: 'history' as const,
  }));

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">תחזית פיננסית</h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
            ניתוח מגמות ותחזיות מבוססות על דפוסי פעילות אמיתיים
          </p>
        </div>
        {revenue?.basis && (
          <TrendBadge
            direction={revenue.basis.trend_direction}
            label={
              revenue.basis.trend_direction === 'growing' ? `גדילה ₪${Math.abs(revenue.basis.monthly_trend).toLocaleString('he-IL')}/חודש` :
              revenue.basis.trend_direction === 'declining' ? `ירידה ₪${Math.abs(revenue.basis.monthly_trend).toLocaleString('he-IL')}/חודש` :
              'יציב'
            }
          />
        )}
      </div>

      {/* Top Row — Revenue KPIs */}
      {revenue?.basis && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SectionCard>
            <StatBox label="ממוצע חודשי" value={formatCurrency(revenue.basis.avg_monthly)} sub="3 חודשים אחרונים" />
          </SectionCard>
          <SectionCard>
            <StatBox
              label="בסיס ריטיינרים"
              value={formatCurrency(revenue.basis.retainer_base)}
              sub={`${retainers?.summary?.retainer_count || 0} ריטיינרים פעילים`}
            />
          </SectionCard>
          <SectionCard>
            <StatBox
              label="מגמה חודשית"
              value={`${revenue.basis.monthly_trend >= 0 ? '+' : ''}${formatCurrency(revenue.basis.monthly_trend)}`}
              accent={revenue.basis.monthly_trend >= 0 ? 'green' : 'red'}
              sub="קצב שינוי"
            />
          </SectionCard>
          <SectionCard>
            <StatBox
              label="תנודתיות"
              value={formatCurrency(revenue.basis.volatility)}
              sub="סטיית תקן"
            />
          </SectionCard>
        </div>
      )}

      {/* Main Grid — Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Revenue Scenarios */}
        <SectionCard>
          <SectionHeader
            icon={<Activity size={16} className="text-blue-400" />}
            title="תחזית הכנסות — 3 תרחישים"
            subtitle={revenue?.basis ? `מבוסס על ממוצע ${formatCurrency(revenue.basis.avg_monthly)}` : undefined}
          />
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={revenue?.months || []} barGap={2} barCategoryGap="20%">
              <CartesianGrid {...CHART_GRID} />
              <XAxis dataKey="month" tick={CHART_AXIS} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}K`} tick={CHART_AXIS} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v: number | undefined) => formatCurrency(v ?? 0)}
                contentStyle={TOOLTIP_STYLE}
                labelStyle={{ color: 'rgba(255,255,255,0.6)', marginBottom: 4, fontSize: 12 }}
              />
              <Bar dataKey="pessimistic" fill="rgba(248,113,113,0.7)" name="שמרני" radius={[4, 4, 0, 0]} />
              <Bar dataKey="realistic" fill="rgba(96,165,250,0.85)" name="ריאליסטי" radius={[4, 4, 0, 0]} />
              <Bar dataKey="optimistic" fill="rgba(52,211,153,0.8)" name="אופטימי" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-4 sm:gap-5 mt-3">
            <span className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'rgba(248,113,113,0.7)' }} /> שמרני
            </span>
            <span className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'rgba(96,165,250,0.85)' }} /> ריאליסטי
            </span>
            <span className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'rgba(52,211,153,0.8)' }} /> אופטימי
            </span>
          </div>
        </SectionCard>

        {/* History Chart */}
        <SectionCard>
          <SectionHeader
            icon={<CalendarDays size={16} className="text-amber-400" />}
            title="היסטוריה — הכנסות מול הוצאות"
            subtitle="6 חודשים אחרונים"
          />
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={historyData}>
              <CartesianGrid {...CHART_GRID} />
              <XAxis dataKey="month" tick={CHART_AXIS} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}K`} tick={CHART_AXIS} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(v: number | undefined) => formatCurrency(v ?? 0)}
                contentStyle={TOOLTIP_STYLE}
                labelStyle={{ color: 'rgba(255,255,255,0.6)', marginBottom: 4, fontSize: 12 }}
              />
              <Bar dataKey="actual_income" fill="rgba(52,211,153,0.6)" name="הכנסות" radius={[4, 4, 0, 0]} barSize={28} />
              <Bar dataKey="actual_expenses" fill="rgba(248,113,113,0.5)" name="הוצאות" radius={[4, 4, 0, 0]} barSize={28} />
              <Line type="monotone" dataKey="actual_income" stroke="rgba(52,211,153,0.8)" strokeWidth={2} dot={false} name="מגמת הכנסות" />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-center gap-4 sm:gap-5 mt-3">
            <span className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'rgba(52,211,153,0.6)' }} /> הכנסות
            </span>
            <span className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'rgba(248,113,113,0.5)' }} /> הוצאות
            </span>
          </div>
        </SectionCard>
      </div>

      {/* Cash Flow Forecast — Full Width */}
      <SectionCard>
        <SectionHeader
          icon={<Banknote size={16} className="text-emerald-400" />}
          title="תחזית תזרים מזומנים"
          subtitle="3 חודשים קדימה — כולל ריטיינרים ותשלומים מתוכננים"
        />

        {/* Cash flow month cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          {(cashFlow?.months || []).map((m) => (
            <div
              key={m.month}
              className={cn('rounded-xl p-4 relative overflow-hidden')}
              style={{
                background: m.net >= 0
                  ? 'linear-gradient(135deg, rgba(52,211,153,0.06), rgba(52,211,153,0.02))'
                  : 'linear-gradient(135deg, rgba(248,113,113,0.06), rgba(248,113,113,0.02))',
                border: `1px solid ${m.net >= 0 ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)'}`,
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold">{m.month}</span>
                {m.net >= 0
                  ? <ArrowUpRight size={16} className="text-emerald-400" />
                  : <ArrowDownRight size={16} className="text-red-400" />
                }
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>הכנסות צפויות</span>
                  <span className="font-semibold text-emerald-400">{formatCurrency(m.projected_income)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>הוצאות צפויות</span>
                  <span className="font-semibold text-red-400">{formatCurrency(m.projected_expenses)}</span>
                </div>
                {m.scheduled_payments > 0 && (
                  <div className="flex justify-between">
                    <span style={{ color: 'rgba(255,255,255,0.3)' }}>תשלומים מתוכננים</span>
                    <span className="font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>{formatCurrency(m.scheduled_payments)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 mt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="font-bold">יתרה נטו</span>
                  <span className={cn('font-extrabold text-base', m.net >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {m.net >= 0 ? '+' : ''}{formatCurrency(m.net)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Cash flow chart */}
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={cashFlow?.months || []}>
            <defs>
              <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(52,211,153,0.3)" />
                <stop offset="100%" stopColor="rgba(52,211,153,0)" />
              </linearGradient>
              <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(248,113,113,0.2)" />
                <stop offset="100%" stopColor="rgba(248,113,113,0)" />
              </linearGradient>
            </defs>
            <CartesianGrid {...CHART_GRID} />
            <XAxis dataKey="month" tick={CHART_AXIS} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}K`} tick={CHART_AXIS} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(v: number | undefined) => formatCurrency(v ?? 0)}
              contentStyle={TOOLTIP_STYLE}
              labelStyle={{ color: 'rgba(255,255,255,0.6)', marginBottom: 4, fontSize: 12 }}
            />
            <Area type="monotone" dataKey="projected_income" stroke="rgba(52,211,153,0.8)" fill="url(#incGrad)" strokeWidth={2} name="הכנסות" />
            <Area type="monotone" dataKey="projected_expenses" stroke="rgba(248,113,113,0.7)" fill="url(#expGrad)" strokeWidth={2} name="הוצאות" />
          </AreaChart>
        </ResponsiveContainer>
      </SectionCard>

      {/* Retainers — Full Width */}
      <SectionCard>
        <SectionHeader
          icon={<CalendarDays size={16} className="text-blue-400" />}
          title="הכנסה קבועה מריטיינרים"
          subtitle={retainers?.summary ? `${retainers.summary.retainer_count} ריטיינרים פעילים — תחזית 6 חודשים` : '6 חודשים קדימה'}
        />

        {retainers?.summary && retainers.summary.retainer_count > 0 ? (
          <>
            <div className="flex items-center gap-6 mb-4">
              <StatBox label="חודשי" value={formatCurrency(retainers.summary.monthly_total)} accent="green" />
              <StatBox label="שנתי" value={formatCurrency(retainers.summary.annual_projection)} />
            </div>

            {/* Retainer breakdown table */}
            <div className="rounded-xl overflow-hidden mb-4" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="grid grid-cols-3 gap-4 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.02)' }}>
                <span>לקוח</span>
                <span>סכום חודשי</span>
                <span>שנתי</span>
              </div>
              {(retainers.months[0]?.breakdown || []).map((r) => (
                <div key={r.id} className="grid grid-cols-3 gap-4 px-4 py-3 text-sm" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <span className="font-medium">{r.name}</span>
                  <span className="text-emerald-400 font-semibold">{formatCurrency(r.amount)}</span>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>{formatCurrency(r.amount * 12)}</span>
                </div>
              ))}
            </div>

            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={retainers.months}>
                <CartesianGrid {...CHART_GRID} />
                <XAxis dataKey="month" tick={CHART_AXIS} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}K`} tick={CHART_AXIS} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v: number | undefined) => formatCurrency(v ?? 0)}
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={{ color: 'rgba(255,255,255,0.6)', marginBottom: 4, fontSize: 12 }}
                />
                <Bar dataKey="total" fill="rgba(96,165,250,0.6)" name="הכנסות ריטיינרים" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <CalendarDays size={24} style={{ color: 'rgba(255,255,255,0.2)' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>אין ריטיינרים פעילים</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>הוסף ריטיינר כדי לראות תחזית הכנסה קבועה</p>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
