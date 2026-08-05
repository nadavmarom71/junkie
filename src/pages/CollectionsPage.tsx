import { useMemo, useState } from 'react';
import { useCollections, useRemindCollection, useMarkCollectionPaid } from '@/hooks/useCollections';
import { formatDateShort } from '@/lib/formatters';
import { toast } from 'sonner';
import { Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CollectionTransaction, CollectionsSummary } from '@/types';

const ALL_CLIENTS = 'all';

function getClientFilterKey(transaction: CollectionTransaction) {
  return transaction.client_id
    ? `client:${transaction.client_id}`
    : `name:${transaction.client_name.trim().toLocaleLowerCase('he-IL')}`;
}

export default function CollectionsPage() {
  const { data, isLoading } = useCollections();
  const remind = useRemindCollection();
  const markPaid = useMarkCollectionPaid();
  const [remindedIds, setRemindedIds] = useState<Set<string>>(new Set());
  const [paidIds, setPaidIds] = useState<Set<string>>(new Set());
  const [selectedClientKey, setSelectedClientKey] = useState(ALL_CLIENTS);

  const transactions = useMemo(() => data?.data ?? [], [data?.data]);

  const handleRemind = (id: string) => {
    remind.mutate(id, {
      onSuccess: () => setRemindedIds(prev => new Set([...prev, id])),
    });
  };

  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  const visibleTransactions = useMemo(
    () => transactions.filter((transaction) => !hiddenIds.has(transaction.id)),
    [transactions, hiddenIds]
  );

  const clientOptions = useMemo(() => {
    const clients = new Map<string, { key: string; name: string; count: number }>();

    visibleTransactions.forEach((transaction) => {
      const key = getClientFilterKey(transaction);
      const current = clients.get(key);

      clients.set(key, {
        key,
        name: transaction.client_name,
        count: (current?.count ?? 0) + 1,
      });
    });

    return [...clients.values()].sort((a, b) => a.name.localeCompare(b.name, 'he'));
  }, [visibleTransactions]);

  const activeClientKey = selectedClientKey === ALL_CLIENTS || clientOptions.some(({ key }) => key === selectedClientKey)
    ? selectedClientKey
    : ALL_CLIENTS;

  const filteredTransactions = useMemo(
    () => activeClientKey === ALL_CLIENTS
      ? visibleTransactions
      : visibleTransactions.filter((transaction) => getClientFilterKey(transaction) === activeClientKey),
    [activeClientKey, visibleTransactions]
  );

  const filteredSummary = useMemo<CollectionsSummary>(() => ({
    total_pending: filteredTransactions.reduce(
      (total, transaction) => total + Number(transaction.balance_owed),
      0
    ),
    client_count: new Set(filteredTransactions.map(getClientFilterKey)).size,
    oldest_days: filteredTransactions.length
      ? Math.max(...filteredTransactions.map((transaction) => transaction.days_since))
      : 0,
  }), [filteredTransactions]);

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
      {data?.summary && (
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
          <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="text-xs mb-1" style={{ color: 'var(--t2)' }}>סה"כ לגבייה</div>
            <div className="text-lg font-extrabold text-yellow-400">₪{filteredSummary.total_pending.toLocaleString('he-IL')}</div>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="text-xs mb-1" style={{ color: 'var(--t2)' }}>לקוחות</div>
            <div className="text-lg font-extrabold">{filteredSummary.client_count}</div>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="text-xs mb-1" style={{ color: 'var(--t2)' }}>הכי ישן</div>
            <div className={`text-lg font-extrabold ${filteredSummary.oldest_days > 30 ? 'text-red-400' : filteredSummary.oldest_days > 14 ? 'text-yellow-400' : 'text-white'}`}>
              {filteredSummary.oldest_days} ימים
            </div>
          </div>
        </div>
      )}

      {!isLoading && visibleTransactions.length > 0 && (
        <section
          aria-label="סינון רשומות גבייה לפי לקוח"
          className="mb-4 flex flex-col gap-3 border-y border-white/10 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-blue-400" aria-hidden="true" />
            <div>
              <label htmlFor="collections-client-filter" className="block text-sm font-semibold">
                סינון לפי לקוח
              </label>
              <p className="text-xs" style={{ color: 'var(--t2)' }}>
                מוצגים רק לקוחות שיש להם גבייה פתוחה
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
              <Select
                value={activeClientKey}
                onValueChange={setSelectedClientKey}
                dir="rtl"
              >
                <SelectTrigger
                  id="collections-client-filter"
                  className="h-11 w-full rounded-lg border-white/10 bg-[#111621] px-3 text-sm font-semibold text-white shadow-none hover:border-white/20 hover:bg-[#161c29] focus-visible:border-blue-400/70 focus-visible:ring-2 focus-visible:ring-blue-400/40"
                  aria-describedby="collections-filter-result-count"
                  aria-label="בחירת לקוח לסינון הגבייה"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  align="end"
                  className="min-w-[var(--radix-select-trigger-width)] border-white/10 bg-[#111621] p-1 text-white shadow-xl shadow-black/40"
                >
                  <SelectItem
                    value={ALL_CLIENTS}
                    className="text-white focus:bg-blue-500/20 focus:text-white data-[state=checked]:bg-blue-500/15"
                  >
                    כל הלקוחות ({clientOptions.length})
                  </SelectItem>
                  {clientOptions.map((client) => (
                    <SelectItem
                      key={client.key}
                      value={client.key}
                      className="text-white focus:bg-blue-500/20 focus:text-white data-[state=checked]:bg-blue-500/15"
                    >
                      {client.name} ({client.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span
              id="collections-filter-result-count"
              className="whitespace-nowrap text-xs"
              style={{ color: 'var(--t2)' }}
              aria-live="polite"
            >
              {filteredTransactions.length} {filteredTransactions.length === 1 ? 'רשומה' : 'רשומות'}
            </span>
          </div>
        </section>
      )}

      {/* Transactions list */}
      {isLoading ? (
        <div className="text-center py-10" style={{ color: 'var(--t2)' }}>טוען...</div>
      ) : visibleTransactions.length === 0 ? (
        <div className="text-center py-10 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="text-4xl mb-2">✅</div>
          <p className="text-base font-semibold">אין חשבוניות פתוחות!</p>
          <p className="text-sm mt-1" style={{ color: 'var(--t2)' }}>כל התשלומים התקבלו</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTransactions.map((tx) => {
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
