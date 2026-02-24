import DonutChart, { type DonutSegment } from './DonutChart';

const DONUT_COLORS = ['#2563EB', '#00C48C', '#F59E0B', '#6aa3ff', '#F43F5E', '#a78bfa', '#f97316'];

interface Props {
  data: Array<{ category: string; amount: number }>;
}

export default function ExpensesByCategoryChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="glass-card p-4 flex items-center justify-center" style={{ minHeight: 172 }}>
        <p className="text-sm" style={{ color: 'var(--t2)' }}>אין נתוני הוצאות לתצוגה</p>
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.amount, 0);
  const segments: DonutSegment[] = data.slice(0, 7).map((d, i) => ({
    label: d.category,
    amount: d.amount,
    color: DONUT_COLORS[i % DONUT_COLORS.length],
  }));

  return <DonutChart segments={segments} total={total} />;
}
