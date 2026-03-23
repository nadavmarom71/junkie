import { useState } from 'react';
import { useCollections, useRemindCollection, useMarkCollectionPaid } from '@/hooks/useCollections';
import { formatDateShort } from '@/lib/formatters';
import { toast } from 'sonner';

export default function CollectionsPage() {
  const { data, isLoading } = useCollections();
  const remind = useRemindCollection();
  const markPaid = useMarkCollectionPaid();
  const [remindedIds, setRemindedIds] = useState<Set<string>>(new Set());
  const [paidIds, setPaidIds] = useState<Set<string>>(new Set());

  const transactions = (data as any)?.data || [];
  const summary = (data as any)?.summary;

  const handleRemind = (id: string) => {
    remind.mutate(id, {
      onSuccess: () => setRemindedIds(prev => new Set([...prev, id])),
    });
  };

  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  const handleMarkPaid = (id: string, clientName: string) => {
    setPaidIds(prev => new Set([...prev, id]));
    markPaid.mutate(id, {
      onSuccess: () => {
        toast.success(`${clientName} סומן כשולם`);
        // After 1.5s animation, hide the item from the list
        setTimeout(() => setHiddenIds(prev => new Set([...prev, id])), 1500);
      },
      onError: () => {
        setPaidIds(prev => { const next = new Set(prev); next.delete(id); return next; });
        toast.error('שגיאה בעדכון סטטוס תשלום');
      },
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-extrabold mb-1">גבייה</h1>
      <p className="mb-5" style={{ color: 'var(--t2)' }}>חשבוניות פתוחות, ממתינות לתשלום, ויתרות פרויקט</p>

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
          {transactions.filter((tx: any) => !hiddenIds.has(tx.id)).map((tx: any) => {
            const isPaid = paidIds.has(tx.id);
            const isPartial = tx.collection_type === 'partial_payment';
            const borderColor = isPaid
              ? 'rgba(0,196,140,0.3)'
              : tx.payment_status === 'overdue'
              ? 'rgba(239,68,68,0.3)'
              : isPartial ? 'rgba(234,179,8,0.2)' : 'rgba(255,255,255,0.08)';

            return (
              <div
                key={tx.id}
                className="rounded-xl px-4 py-3 transition-all duration-500"
                style={{
                  background: isPaid ? 'rgba(0,196,140,0.06)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${borderColor}`,
                  opacity: isPaid ? 0.6 : 1,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Right: client name + description + meta */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{tx.client_name}</span>
                      {isPaid ? (
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-green-500/20 text-green-300 border border-green-500/30">
                          שולם
                        </span>
                      ) : isPartial ? (
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-yellow-500/15 text-yellow-300 border border-yellow-500/25">
                          יתרת פרויקט
                        </span>
                      ) : (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          tx.payment_status === 'overdue'
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                        }`}>
                          {tx.payment_status === 'overdue' ? 'באיחור' : 'ממתין'}
                        </span>
                      )}
                    </div>

                    <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--t2)' }}>{tx.description}</p>

                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs" style={{ color: 'var(--t2)' }}>{formatDateShort(tx.date)}</span>
                      <span className="text-xs" style={{ color: 'var(--t2)' }}>{tx.days_since} ימים</span>

                      {isPartial && (
                        <span className="text-xs">
                          <span className="text-green-400 font-semibold">שולם ₪{Number(tx.amount).toLocaleString('he-IL')}</span>
                          <span className="text-white/30 mx-1">/</span>
                          <span className="text-white/50">סה״כ ₪{Number(tx.project_total).toLocaleString('he-IL')}</span>
                        </span>
                      )}

                      {tx.expected_date_unknown ? (
                        <span className="text-xs text-yellow-400/60">תאריך לא ידוע</span>
                      ) : tx.expected_payment_date ? (
                        <span className="text-xs text-blue-400/80">צפוי: {tx.expected_payment_date}</span>
                      ) : null}
                    </div>
                  </div>

                  {/* Left: balance + action buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-left">
                      <div className="text-base font-extrabold text-yellow-400">
                        ₪{Number(tx.balance_owed).toLocaleString('he-IL')}
                      </div>
                      <div className="text-xs text-white/30">יתרה</div>
                    </div>
                    <button
                      onClick={() => handleMarkPaid(tx.id, tx.client_name)}
                      disabled={isPaid}
                      className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                        isPaid
                          ? 'bg-green-500/30 text-green-300'
                          : 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                      }`}
                    >
                      {isPaid ? '✓ שולם' : 'שולם'}
                    </button>
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
