import { useState } from 'react';
import { formatCurrency, formatRelativeDays } from '@/lib/formatters';
import type { BusinessTransaction, ScheduledPayment } from '@/types';

interface Props {
  upcomingPayments: {
    incoming: Array<BusinessTransaction & { clients?: { name: string } | null }>;
    outgoing: ScheduledPayment[];
  };
}

function getColor(dueDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dueDate + 'T00:00:00');
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff < 0)  return { dot: '#F43F5E', bg: 'rgba(244,63,94,0.08)',  border: 'rgba(244,63,94,0.18)' };
  if (diff <= 3) return { dot: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.18)' };
  return           { dot: '#00C48C', bg: 'rgba(0,196,140,0.08)',  border: 'rgba(0,196,140,0.18)' };
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export default function UpcomingPayments({ upcomingPayments }: Props) {
  const [tab, setTab] = useState<'in' | 'out'>('in');
  const { incoming, outgoing } = upcomingPayments;

  return (
    <div className="glass-card p-4">
      <div className="mb-3">
        <span className="text-base font-extrabold">📅 תשלומים צפויים</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setTab('in')}
          className={`text-xs px-3 py-1 rounded-lg font-semibold transition-colors ${tab === 'in' ? 'bg-green-500/20 text-green-300' : 'text-white/40 hover:text-white/60'}`}
        >
          צפוי להיכנס
        </button>
        <button
          onClick={() => setTab('out')}
          className={`text-xs px-3 py-1 rounded-lg font-semibold transition-colors ${tab === 'out' ? 'bg-red-500/20 text-red-300' : 'text-white/40 hover:text-white/60'}`}
        >
          צפוי לצאת
        </button>
      </div>

      <div className="space-y-2">
        {tab === 'in' && (
          incoming.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'var(--t2)' }}>אין תשלומים ממתינים</p>
          ) : incoming.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center gap-3 p-2.5 rounded-xl"
              style={{
                background: 'rgba(0,196,140,0.06)',
                border: '1px solid rgba(0,196,140,0.15)',
              }}
            >
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#00C48C' }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {tx.clients?.name || tx.description}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs" style={{ color: 'var(--t2)' }}>{tx.date}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                    tx.payment_status === 'overdue'
                      ? 'bg-red-500/20 text-red-300'
                      : 'bg-yellow-500/20 text-yellow-300'
                  }`}>
                    {tx.payment_status === 'overdue' ? 'באיחור' : 'ממתין'}
                  </span>
                </div>
              </div>
              <span className="text-sm font-bold flex-shrink-0 text-green-400">
                +{formatCurrency(tx.amount)}
              </span>
            </div>
          ))
        )}

        {tab === 'out' && (
          outgoing.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'var(--t2)' }}>אין תשלומים יוצאים</p>
          ) : outgoing.map((p) => {
            const c = getColor(p.due_date);
            const days = daysUntil(p.due_date);
            return (
              <div
                key={p.id}
                className="flex items-center gap-3 p-2.5 rounded-xl"
                style={{ background: c.bg, border: `1px solid ${c.border}` }}
              >
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.dot }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs" style={{ color: c.dot }}>{formatRelativeDays(p.due_date)}</p>
                    {days < 3 && (
                      <span className="text-xs text-orange-400 font-semibold">⚠️ בקרוב</span>
                    )}
                  </div>
                </div>
                <span className="text-sm font-bold flex-shrink-0 text-red-400">
                  -{formatCurrency(p.amount)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
