import { formatCurrency, formatRelativeDays } from '@/lib/formatters';
import type { ScheduledPayment } from '@/types';

interface Props { payments: ScheduledPayment[]; }

function getColor(dueDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dueDate + 'T00:00:00');
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff < 0)  return { dot: '#F43F5E', bg: 'rgba(244,63,94,0.08)',  border: 'rgba(244,63,94,0.18)' };
  if (diff <= 3) return { dot: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.18)' };
  return           { dot: '#00C48C', bg: 'rgba(0,196,140,0.08)',  border: 'rgba(0,196,140,0.18)' };
}

export default function UpcomingPayments({ payments }: Props) {
  return (
    <div className="glass-card p-4">
      <div className="mb-3">
        <span className="text-sm font-extrabold">📅 תשלומים צפויים</span>
      </div>
      <div className="space-y-2">
        {payments.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: 'var(--t2)' }}>אין תשלומים ממתינים</p>
        ) : payments.map(p => {
          const c = getColor(p.due_date);
          return (
            <div
              key={p.id}
              className="flex items-center gap-3 p-2.5 rounded-xl"
              style={{ background: c.bg, border: `1px solid ${c.border}` }}
            >
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.dot }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{p.description}</p>
                <p className="text-[10px] mt-0.5" style={{ color: c.dot }}>{formatRelativeDays(p.due_date)}</p>
              </div>
              <span className="text-xs font-bold flex-shrink-0">{formatCurrency(p.amount)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
