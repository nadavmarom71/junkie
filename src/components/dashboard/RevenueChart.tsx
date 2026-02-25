import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '@/lib/formatters';

interface Props {
  data: Array<{ month: string; income: number; expenses: number }>;
}

export default function RevenueChart({ data }: Props) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xl font-extrabold">הכנסות מול הוצאות</span>
        <span className="text-base" style={{ color: 'var(--t2)' }}>6 חודשים</span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 14, fill: 'rgba(255,255,255,0.55)' }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}K`}
            tick={{ fontSize: 14, fill: 'rgba(255,255,255,0.55)' }}
            axisLine={false} tickLine={false}
          />
          <Tooltip
            formatter={(value: number | undefined) => [formatCurrency(value ?? 0), '']}
            contentStyle={{
              background: '#0D1117',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              color: '#fff',
              fontSize: 16,
              direction: 'rtl',
            }}
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          />
          <Legend wrapperStyle={{ fontSize: 15, color: 'rgba(255,255,255,0.65)' }} iconType="square" iconSize={10} />
          <Bar dataKey="income"   name="הכנסות" fill="#00C48C" radius={[4, 4, 2, 2]} />
          <Bar dataKey="expenses" name="הוצאות" fill="#F43F5E" radius={[4, 4, 2, 2]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
