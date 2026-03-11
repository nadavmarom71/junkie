import { useState } from 'react';
import { TrendingUp, TrendingDown, Repeat, BadgeDollarSign, DollarSign, ArrowDownLeft, Clock, Target, Receipt } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDashboardStats } from '@/hooks/useDashboard';

function buildMonthOptions() {
  const opts: { label: string; value: string }[] = [
    { label: 'החודש הנוכחי', value: 'current' },
    { label: 'כל הזמנים', value: 'all' },
  ];
  const now = new Date();
  for (let i = 1; i <= 17; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
    opts.push({ label, value });
  }
  return opts;
}
const MONTH_OPTIONS = buildMonthOptions();
import KpiCard from '@/components/dashboard/KpiCard';
import RevenueChart from '@/components/dashboard/RevenueChart';
import ExpensesByCategoryChart from '@/components/dashboard/ExpensesByCategoryChart';
import AiInsightsWidget from '@/components/dashboard/AiInsightsWidget';
import UpcomingPayments from '@/components/dashboard/UpcomingPayments';

function GoalBar({ label, current, target, pct, color, inverted }: {
  label: string; current: number; target: number; pct: number; color: string; inverted?: boolean;
}) {
  const clampedPct = Math.min(pct, 100);
  const isOk = inverted ? pct < 80 : pct >= 80;
  const statusColor = isOk ? '#22c55e' : pct >= 50 || (inverted && pct < 100) ? '#eab308' : '#f43f5e';
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium" style={{ color: 'var(--t2)' }}>{label}</span>
        <span className="text-xs font-bold" style={{ color: statusColor }}>
          ₪{current.toLocaleString('he-IL')} / ₪{target.toLocaleString('he-IL')} ({pct}%)
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${clampedPct}%`, background: color, opacity: 0.8 }} />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  const box = { background: 'rgba(255,255,255,0.06)', borderRadius: 12 } as const;
  return (
    <div className="space-y-5">
      <div style={{ ...box, height: 32, width: 180 }} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} style={{ ...box, height: 110 }} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div style={{ ...box, height: 250 }} />
        <div style={{ ...box, height: 250 }} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div style={{ ...box, height: 200 }} />
        <div style={{ ...box, height: 200 }} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [dashboardMonth, setDashboardMonth] = useState('current');
  const [activeTab, setActiveTab] = useState<'business' | 'personal'>(
    () => (localStorage.getItem('dashboard-tab') as 'business' | 'personal') ?? 'business'
  );

  const activeMonthParam = dashboardMonth === 'current' ? undefined : dashboardMonth;
  const { data, isLoading, error } = useDashboardStats(activeMonthParam);

  const handleTabChange = (tab: 'business' | 'personal') => {
    setActiveTab(tab);
    localStorage.setItem('dashboard-tab', tab);
  };

  if (isLoading) return <DashboardSkeleton />;
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-4xl mb-2">⚠️</div>
          <p className="font-semibold">שגיאה בטעינת הנתונים</p>
          <p className="text-sm mt-1" style={{ color: 'var(--t2)' }}>{error.message}</p>
        </div>
      </div>
    );
  }
  if (!data) return null;

  const { kpis, charts, insights, upcomingPayments } = data;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="anim-1 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">שלום נדב 👋</h1>
          <p className="text-base mt-0.5" style={{ color: 'var(--t2)' }}>הנה הסיכום הפיננסי שלך</p>
        </div>
        {/* Month filter */}
        <Select value={dashboardMonth} onValueChange={setDashboardMonth}>
          <SelectTrigger className="w-44 h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTH_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => handleTabChange('business')}
          className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'business'
              ? 'text-white'
              : 'text-white/40 hover:text-white/70'
          }`}
          style={activeTab === 'business' ? { background: 'linear-gradient(135deg,#2563EB,#056dff)', boxShadow: '0 4px 16px rgba(37,99,235,0.35)' } : { background: 'rgba(255,255,255,0.05)' }}
        >
          עסקי
        </button>
        <button
          onClick={() => handleTabChange('personal')}
          className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'personal'
              ? 'text-white'
              : 'text-white/40 hover:text-white/70'
          }`}
          style={activeTab === 'personal' ? { background: 'linear-gradient(135deg,#7c3aed,#9333ea)', boxShadow: '0 4px 16px rgba(147,51,234,0.35)' } : { background: 'rgba(255,255,255,0.05)' }}
        >
          אישי
        </button>
      </div>

      {/* Business Tab */}
      {activeTab === 'business' && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 anim-2">
            <KpiCard
              title="מחזור חודשי"
              value=""
              rawValue={data.cashflow?.totalRevenue ?? kpis.monthlyRevenue}
              prefix="₪"
              icon={<TrendingUp size={14} color="#00C48C" />}
              trend="up"
              trendLabel="סה״כ הכנסות"
              variant="success"
              sparkPoints={[{x:0,y:14},{x:23,y:10},{x:47,y:16},{x:70,y:2}]}
            />
            <KpiCard
              title="התקבל בפועל"
              value=""
              rawValue={data.cashflow?.actualReceived ?? 0}
              prefix="₪"
              icon={<DollarSign size={14} color="#00C48C" />}
              trend="neutral"
              trendLabel="שולם"
              variant="success"
              sparkPoints={[{x:0,y:12},{x:23,y:14},{x:47,y:10},{x:70,y:8}]}
            />
            <KpiCard
              title="הוצאות החודש"
              value=""
              rawValue={data.cashflow?.totalExpenses ?? kpis.monthlyExpenses}
              prefix="₪"
              icon={<TrendingDown size={14} color="#F43F5E" />}
              trend="down"
              trendLabel="הוצאות"
              variant="danger"
              sparkPoints={[{x:0,y:14},{x:23,y:5},{x:47,y:15},{x:70,y:2}]}
            />
            <KpiCard
              title="רווח נקי"
              value=""
              rawValue={data.cashflow?.netCashflow ?? kpis.netProfit}
              prefix="₪"
              icon={<BadgeDollarSign size={14} color="rgba(255,255,255,0.7)" />}
              trend={(data.cashflow?.netCashflow ?? kpis.netProfit) >= 0 ? 'up' : 'down'}
              trendLabel={(data.cashflow?.netCashflow ?? kpis.netProfit) >= 0 ? 'חיובי' : 'שלילי'}
              variant={(data.cashflow?.netCashflow ?? kpis.netProfit) >= 0 ? 'success' : 'danger'}
              sparkPoints={[{x:0,y:16},{x:23,y:9},{x:47,y:9},{x:70,y:2}]}
            />
            <KpiCard
              title="ממתין לגביה"
              value=""
              rawValue={data.cashflow?.expectedCashFlow ?? 0}
              prefix="₪"
              icon={<Clock size={14} color="#EAB308" />}
              trend="neutral"
              trendLabel="יתרות פתוחות"
              variant="warning"
              sparkPoints={[{x:0,y:8},{x:23,y:12},{x:47,y:6},{x:70,y:14}]}
            />
          </div>

          {/* Goal Progress */}
          {data.goals && Object.keys(data.goals).length > 0 && (
            <div className="rounded-xl p-4 anim-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <Target size={16} className="text-emerald-400" />
                התקדמות יעדים
              </h3>
              <div className="space-y-3">
                {data.goals.income && (
                  <GoalBar label="הכנסה חודשית" current={data.goals.income.current} target={data.goals.income.target} pct={data.goals.income.pct} color="#22c55e" />
                )}
                {data.goals.expenses && (
                  <GoalBar label="תקציב הוצאות" current={data.goals.expenses.current} target={data.goals.expenses.target} pct={data.goals.expenses.pct} color="#f43f5e" inverted />
                )}
                {data.goals.annual && (
                  <GoalBar label="הכנסה שנתית" current={data.goals.annual.current} target={data.goals.annual.target} pct={data.goals.annual.pct} color="#3b82f6" />
                )}
              </div>
            </div>
          )}

          {/* Tax Estimate */}
          {data.taxEstimate && data.taxEstimate.totalReserve > 0 && (
            <div className="rounded-xl p-4 anim-2" style={{ background: 'rgba(234,179,8,0.04)', border: '1px solid rgba(234,179,8,0.12)' }}>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <Receipt size={16} className="text-amber-400" />
                הפרשת מס משוערת — החודש
              </h3>
              <div className="flex gap-4 flex-wrap">
                {(data.taxEstimate.incomeTax ?? 0) > 0 && (
                  <div className="text-center">
                    <div className="text-xs" style={{ color: 'var(--t2)' }}>מס הכנסה</div>
                    <div className="text-lg font-bold text-amber-400">₪{(data.taxEstimate.incomeTax ?? 0).toLocaleString('he-IL')}</div>
                  </div>
                )}
                {(data.taxEstimate.socialSecurity ?? 0) > 0 && (
                  <div className="text-center">
                    <div className="text-xs" style={{ color: 'var(--t2)' }}>ביטוח לאומי</div>
                    <div className="text-lg font-bold text-amber-400">₪{(data.taxEstimate.socialSecurity ?? 0).toLocaleString('he-IL')}</div>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-xs" style={{ color: 'var(--t2)' }}>סה״כ להפרשה</div>
                  <div className="text-lg font-bold text-red-400">₪{data.taxEstimate.totalReserve.toLocaleString('he-IL')}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs" style={{ color: 'var(--t2)' }}>נטו אחרי מס</div>
                  <div className="text-lg font-bold text-emerald-400">₪{data.taxEstimate.afterTax.toLocaleString('he-IL')}</div>
                </div>
              </div>
            </div>
          )}

          {/* 30-day Forecast */}
          {data.cashflow?.forecast && (
            <div className="rounded-xl p-4 mb-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--t2)' }}>תזרים צפוי — 30 יום</h3>
              <div className="flex gap-4">
                <div className="flex-1 text-center">
                  <div className="text-sm font-semibold mb-1" style={{ color: 'var(--t2)' }}>צפוי להיכנס</div>
                  <div className="text-2xl font-bold text-green-400">+₪{data.cashflow.forecast.expectedIn.toLocaleString('he-IL')}</div>
                </div>
                <div className="flex-1 text-center">
                  <div className="text-sm font-semibold mb-1" style={{ color: 'var(--t2)' }}>צפוי לצאת</div>
                  <div className="text-2xl font-bold text-red-400">-₪{data.cashflow.forecast.expectedOut.toLocaleString('he-IL')}</div>
                </div>
                <div className="flex-1 text-center">
                  <div className="text-sm font-semibold mb-1" style={{ color: 'var(--t2)' }}>יתרה צפויה</div>
                  <div className={`text-2xl font-bold ${data.cashflow.forecast.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {data.cashflow.forecast.balance >= 0 ? '+' : ''}₪{data.cashflow.forecast.balance.toLocaleString('he-IL')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 anim-3">
            <RevenueChart data={charts.monthly} />
            <ExpensesByCategoryChart data={charts.categories} />
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 anim-4">
            <AiInsightsWidget insights={insights} />
            <UpcomingPayments upcomingPayments={upcomingPayments} />
          </div>
        </>
      )}

      {/* Personal Tab */}
      {activeTab === 'personal' && (
        <div>
          {/* Personal KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <KpiCard
              title="הוצאות אישיות החודש"
              value=""
              rawValue={data.personal?.thisMonth ?? 0}
              prefix="₪"
              icon={<ArrowDownLeft size={14} color="#F43F5E" />}
              trend="down"
              trendLabel="החודש"
              variant="danger"
              sparkPoints={[{x:0,y:14},{x:23,y:10},{x:47,y:16},{x:70,y:8}]}
            />
            <KpiCard
              title="חודש קודם"
              value=""
              rawValue={data.personal?.lastMonth ?? 0}
              prefix="₪"
              icon={<TrendingDown size={14} color="rgba(255,255,255,0.7)" />}
              trend="neutral"
              trendLabel="חודש שעבר"
              variant="neutral"
              sparkPoints={[{x:0,y:10},{x:23,y:12},{x:47,y:8},{x:70,y:11}]}
            />
            {/* Custom "שינוי" card — KpiCard doesn't support string value with % cleanly */}
            <div
              className="glass-card flex flex-col cursor-pointer p-4 hover:-translate-y-0.5 transition-transform"
            >
              <div
                className="flex items-center justify-center w-8 h-8 rounded-lg mb-3 text-sm flex-shrink-0"
                style={{ background: Number(data.personal?.change ?? 0) > 0 ? 'rgba(244,63,94,0.10)' : 'rgba(0,196,140,0.12)' }}
              >
                <Repeat size={14} color={Number(data.personal?.change ?? 0) > 0 ? '#F43F5E' : '#00C48C'} />
              </div>
              <div className="text-sm font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--t2)' }}>
                שינוי
              </div>
              <div
                className="text-xl font-extrabold tracking-tight mb-1"
                style={{ color: Number(data.personal?.change ?? 0) > 0 ? '#F43F5E' : '#00C48C' }}
              >
                {data.personal?.change ? `${data.personal.change}%` : '—'}
              </div>
              <div
                className="text-sm font-bold flex items-center gap-0.5 mb-2"
                style={{ color: Number(data.personal?.change ?? 0) > 0 ? '#F43F5E' : '#00C48C' }}
              >
                {Number(data.personal?.change ?? 0) > 0 ? '↑' : '↓'} לעומת חודש שעבר
              </div>
            </div>
          </div>

          {/* Category breakdown */}
          {data.personal?.byCategory && data.personal.byCategory.length > 0 && (
            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="text-sm font-bold mb-3">הוצאות לפי קטגוריה</h3>
              <div className="space-y-2">
                {data.personal.byCategory.map(({ category, amount }) => (
                  <div key={category} className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--t2)' }}>{category}</span>
                    <span className="text-sm font-bold">₪{amount.toLocaleString('he-IL')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
