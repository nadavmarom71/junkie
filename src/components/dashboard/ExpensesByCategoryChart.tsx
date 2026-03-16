import { useState } from 'react';
import { PieChart, Pie, Cell, Sector } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/lib/formatters';

const DONUT_COLORS = ['#2563EB', '#00C48C', '#F59E0B', '#6aa3ff', '#F43F5E', '#a78bfa', '#f97316'];

interface Props {
  data: Array<{ category: string; amount: number }>;
  month?: string; // YYYY-MM — used to build the /transactions navigation URL
}

// Active (hovered) slice — expands outward with a ring accent
function renderActiveShape(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props;
  return (
    <g>
      {/* Centre: category amount */}
      <text
        x={cx} y={cy - 9}
        textAnchor="middle"
        fill="#fff"
        style={{ fontSize: 13, fontWeight: 800 }}
      >
        {formatCurrency(payload.amount)}
      </text>
      <text
        x={cx} y={cy + 9}
        textAnchor="middle"
        fill="rgba(255,255,255,0.45)"
        style={{ fontSize: 11 }}
      >
        {Math.round(percent * 100)}%
      </text>
      {/* Expanded slice */}
      <Sector
        cx={cx} cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      {/* Outer ring accent */}
      <Sector
        cx={cx} cy={cy}
        innerRadius={outerRadius + 11}
        outerRadius={outerRadius + 13}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    </g>
  );
}

export default function ExpensesByCategoryChart({ data, month }: Props) {
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  if (!data || data.length === 0) {
    return (
      <div className="glass-card p-4 flex items-center justify-center" style={{ minHeight: 172 }}>
        <p className="text-sm" style={{ color: 'var(--t2)' }}>אין נתוני הוצאות לתצוגה</p>
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.amount, 0);
  const slices = data.slice(0, 7).map((d, i) => ({
    ...d,
    color: DONUT_COLORS[i % DONUT_COLORS.length],
  }));

  function handleClick(entry: { category: string }) {
    const params = new URLSearchParams({ tab: 'business', type: 'expense' });
    if (month) params.set('month', month);
    if (entry.category) params.set('category', entry.category);
    navigate(`/transactions?${params.toString()}`);
  }

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xl font-extrabold">התפלגות הוצאות</span>
        <span className="text-base font-bold" style={{ color: '#2563EB' }}>
          סה"כ: {formatCurrency(total)}
        </span>
      </div>

      <div className="flex flex-col items-center gap-4">
        {/* Donut */}
        <div style={{ position: 'relative', width: 160, height: 160 }}>
          <PieChart width={160} height={160}>
            <Pie
              data={slices}
              cx={75}
              cy={75}
              innerRadius={48}
              outerRadius={68}
              dataKey="amount"
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(undefined)}
              onClick={(entry) => handleClick(entry as { category: string })}
              style={{ cursor: 'pointer', outline: 'none' }}
              strokeWidth={0}
            >
              {slices.map((entry) => (
                <Cell key={entry.category} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>

          {/* Centre label — shown only when nothing is hovered */}
          {activeIndex === undefined && (
            <div
              style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none',
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 800 }}>{formatCurrency(total)}</span>
              <span style={{ fontSize: 11, color: 'var(--t2)' }}>סה"כ</span>
            </div>
          )}
        </div>

        {/* Legend — clickable */}
        <div className="w-full grid grid-cols-2 gap-x-4 gap-y-1.5">
          {slices.map((seg) => {
            const pct = total > 0 ? Math.round((seg.amount / total) * 100) : 0;
            return (
              <button
                key={seg.category}
                onClick={() => handleClick(seg)}
                className="flex items-center gap-2 text-start hover:opacity-75 transition-opacity"
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: seg.color }} />
                <span className="text-sm flex-1 truncate" style={{ color: 'var(--t2)' }}>{seg.category}</span>
                <span className="text-sm font-extrabold" style={{ color: seg.color }}>{pct}%</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
