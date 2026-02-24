import { TrendingUp, TrendingDown, Repeat, BadgeDollarSign } from 'lucide-react';
import { useDashboardStats } from '@/hooks/useDashboard';
import KpiCard from '@/components/dashboard/KpiCard';
import RevenueChart from '@/components/dashboard/RevenueChart';
import ExpensesByCategoryChart from '@/components/dashboard/ExpensesByCategoryChart';
import AiInsightsWidget from '@/components/dashboard/AiInsightsWidget';
import UpcomingPayments from '@/components/dashboard/UpcomingPayments';

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
  const { data, isLoading, error } = useDashboardStats();

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
      <div className="anim-1">
        <h1 className="text-2xl font-extrabold tracking-tight">שלום נדב 👋</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--t2)' }}>הנה הסיכום הפיננסי שלך</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 anim-2">
        <KpiCard
          title="הכנסות"
          value=""
          rawValue={kpis.monthlyRevenue}
          prefix="₪"
          icon={<TrendingUp size={14} color="#00C48C" />}
          trend="up"
          trendLabel="+8% מהחודש שעבר"
          variant="success"
          sparkPoints={[{x:0,y:14},{x:23,y:10},{x:47,y:16},{x:70,y:2}]}
        />
        <KpiCard
          title="הוצאות"
          value=""
          rawValue={kpis.monthlyExpenses}
          prefix="₪"
          icon={<TrendingDown size={14} color="#F43F5E" />}
          trend="down"
          trendLabel="+3% מהחודש שעבר"
          variant="danger"
          sparkPoints={[{x:0,y:14},{x:23,y:5},{x:47,y:15},{x:70,y:2}]}
        />
        <KpiCard
          title="ריטיינרים"
          value=""
          rawValue={kpis.activeRetainerTotal}
          prefix="₪"
          icon={<Repeat size={14} color="#6aa3ff" />}
          trend="neutral"
          trendLabel="יציב"
          variant="purple"
          sparkPoints={[{x:0,y:9},{x:23,y:9},{x:47,y:9},{x:70,y:9}]}
        />
        <KpiCard
          title="רווח נקי"
          value=""
          rawValue={kpis.netProfit}
          prefix="₪"
          icon={<BadgeDollarSign size={14} color="rgba(255,255,255,0.7)" />}
          trend={kpis.netProfit >= 0 ? 'up' : 'down'}
          trendLabel={kpis.netProfit >= 0 ? 'חיובי' : 'שלילי'}
          variant={kpis.netProfit >= 0 ? 'success' : 'danger'}
          sparkPoints={[{x:0,y:16},{x:23,y:9},{x:47,y:9},{x:70,y:2}]}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 anim-3">
        <RevenueChart data={charts.monthly} />
        <ExpensesByCategoryChart data={charts.categories} />
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 anim-4">
        <AiInsightsWidget insights={insights} />
        <UpcomingPayments payments={upcomingPayments} />
      </div>
    </div>
  );
}
