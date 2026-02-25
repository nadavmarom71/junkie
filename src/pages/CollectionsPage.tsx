import { useState } from 'react';
import { useCollections, useRemindCollection } from '@/hooks/useCollections';

export default function CollectionsPage() {
  const { data, isLoading } = useCollections();
  const remind = useRemindCollection();
  const [remindedIds, setRemindedIds] = useState<Set<string>>(new Set());

  const transactions = (data as any)?.data || [];
  const summary = (data as any)?.summary;

  const handleRemind = (id: string) => {
    remind.mutate(id, {
      onSuccess: () => setRemindedIds(prev => new Set([...prev, id])),
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-extrabold mb-1">גבייה</h1>
      <p className="mb-5" style={{ color: 'var(--t2)' }}>חשבוניות פתוחות וממתינות לתשלום</p>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="text-xs mb-1" style={{ color: 'var(--t2)' }}>סה"כ לגבייה</div>
            <div className="text-lg font-extrabold text-yellow-400">₪{Number(summary.total_pending).toLocaleString('he-IL')}</div>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="text-xs mb-1" style={{ color: 'var(--t2)' }}>לקוחות</div>
            <div className="text-lg font-extrabold">{summary.client_count}</div>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="text-xs mb-1" style={{ color: 'var(--t2)' }}>הכי ישן</div>
            <div className={`text-lg font-extrabold ${summary.oldest_days > 30 ? 'text-red-400' : summary.oldest_days > 14 ? 'text-yellow-400' : 'text-white'}`}>
              {summary.oldest_days} ימים
            </div>
          </div>
        </div>
      )}

      {/* Transactions list */}
      {isLoading ? (
        <div className="text-center py-10" style={{ color: 'var(--t2)' }}>טוען...</div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-10 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="text-4xl mb-2">✅</div>
          <p className="text-base font-semibold">אין חשבוניות פתוחות!</p>
          <p className="text-sm mt-1" style={{ color: 'var(--t2)' }}>כל התשלומים התקבלו</p>
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map((tx: any) => (
            <div
              key={tx.id}
              className="rounded-xl px-4 py-3 flex items-center justify-between"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${tx.payment_status === 'overdue' ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              {/* Right: client name + description */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{tx.client_name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    tx.payment_status === 'overdue' ? 'bg-red-500/20 text-red-300' : 'bg-yellow-500/20 text-yellow-300'
                  }`}>
                    {tx.payment_status === 'overdue' ? 'באיחור' : 'ממתין'}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs" style={{ color: 'var(--t2)' }}>{tx.date}</span>
                  <span className="text-xs" style={{ color: 'var(--t2)' }}>{tx.days_since} ימים</span>
                </div>
              </div>
              {/* Left: amount + remind button */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-base font-extrabold text-green-400">+₪{Number(tx.amount).toLocaleString('he-IL')}</span>
                <button
                  onClick={() => handleRemind(tx.id)}
                  disabled={remindedIds.has(tx.id) || remind.isPending}
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    remindedIds.has(tx.id)
                      ? 'bg-green-500/20 text-green-300'
                      : 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                  }`}
                >
                  {remindedIds.has(tx.id) ? '✓ נשלח' : 'שלח תזכורת'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
