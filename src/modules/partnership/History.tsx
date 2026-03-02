import { useState } from 'react';
import { Download, ChevronDown, TrendingUp, TrendingDown, Award } from 'lucide-react';
import { usePartnership } from './PartnershipContext';
import type { PartnershipTx, Settlement } from './PartnershipContext';

function fmt(n: number) {
  return Math.abs(n).toLocaleString('he-IL', { maximumFractionDigits: 0 });
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: '2-digit' });
}

// ── Expanded Breakdown ────────────────────────────────────────────────────────

function TxDetail({ tx }: { tx: PartnershipTx }) {
  const b = tx.breakdown;
  if (b.kind === 'income') {
    return (
      <div className="mt-3 pt-3 space-y-1.5 text-xs border-t border-white/08">
        <div className="flex justify-between">
          <span className="text-white/45">ברוטו</span>
          <span className="text-white font-semibold">₪{fmt(tx.amount)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-yellow-400/80">מס ({(b.taxAmount / tx.amount * 100).toFixed(0)}%)</span>
          <span className="text-yellow-400">−₪{fmt(b.taxAmount)}</span>
        </div>
        <div className="flex justify-between font-semibold">
          <span className="text-white/70">נטו</span>
          <span className="text-white">₪{fmt(b.netIncome)}</span>
        </div>
        <div className="pt-1.5 border-t border-white/08 space-y-1">
          <div className="flex justify-between">
            <span className="text-blue-400">נדב</span>
            <span className="text-blue-400 font-semibold">+₪{fmt(b.nadavShare)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-purple-400">דוד</span>
            <span className="text-purple-400 font-semibold">+₪{fmt(b.davidShare)}</span>
          </div>
        </div>
        <div className="pt-1.5 border-t border-white/08">
          <div className="flex justify-between">
            <span className="text-orange-400/80 text-[11px]">אפקט יתרה</span>
            <span className="text-orange-400 text-[11px] font-semibold">
              נדב חייב לדוד +₪{fmt(b.davidShare)}
            </span>
          </div>
        </div>
      </div>
    );
  }
  // expense
  const paidByLabel = b.paidBy === 'nadav' ? 'נדב' : 'דוד';
  return (
    <div className="mt-3 pt-3 space-y-1.5 text-xs border-t border-white/08">
      <div className="flex justify-between">
        <span className="text-white/45">שילם</span>
        <span className="font-semibold" style={{ color: b.paidBy === 'nadav' ? '#60a5fa' : '#a78bfa' }}>
          {paidByLabel}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-white/45">חלוקה</span>
        <span className="text-white/70">נדב {b.splitRatio}% / דוד {100 - b.splitRatio}%</span>
      </div>
      <div className="flex justify-between">
        <span className="text-blue-400">חלק נדב</span>
        <span className="text-blue-400 font-semibold">₪{fmt(b.nadavShare)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-purple-400">חלק דוד</span>
        <span className="text-purple-400 font-semibold">₪{fmt(b.davidShare)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-white/45">קיזוז</span>
        <span className={b.offsetAgainstDebt ? 'text-green-400 font-semibold' : 'text-white/40'}>
          {b.offsetAgainstDebt ? 'כן' : 'לא'}
        </span>
      </div>
      {(b.nadavOwesDavidDelta !== 0 || b.davidOwesNadavDelta !== 0) && (
        <div className="pt-1.5 border-t border-white/08 space-y-1">
          {b.nadavOwesDavidDelta !== 0 && (
            <div className="flex justify-between">
              <span className="text-orange-400/80 text-[11px]">נדב↔דוד</span>
              <span className={`text-[11px] font-semibold ${b.nadavOwesDavidDelta > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                {b.nadavOwesDavidDelta > 0 ? '+' : '−'}₪{fmt(b.nadavOwesDavidDelta)}
              </span>
            </div>
          )}
          {b.davidOwesNadavDelta !== 0 && (
            <div className="flex justify-between">
              <span className="text-purple-400/80 text-[11px]">דוד↔נדב</span>
              <span className={`text-[11px] font-semibold ${b.davidOwesNadavDelta > 0 ? 'text-purple-400' : 'text-green-400'}`}>
                {b.davidOwesNadavDelta > 0 ? '+' : '−'}₪{fmt(b.davidOwesNadavDelta)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Settlement Row ────────────────────────────────────────────────────────────

function SettlementRow({ s }: { s: Settlement }) {
  return (
    <div
      className="rounded-xl px-3.5 py-3 flex items-center justify-between"
      style={{ background: 'rgba(0,196,140,0.07)', border: '1px solid rgba(0,196,140,0.18)' }}
    >
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,196,140,0.15)' }}>
          <Award size={14} color="#00C48C" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white">{s.description}</div>
          <div className="text-xs text-white/40">{formatDate(s.date)}</div>
        </div>
      </div>
      <div className="text-xs text-green-400 font-bold">סגירה</div>
    </div>
  );
}

// ── Main History ──────────────────────────────────────────────────────────────

export default function History() {
  const { state, dispatch } = usePartnership();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');

  const filteredTx = state.transactions.filter(t =>
    filter === 'all' || t.type === filter
  );

  function exportCSV() {
    const rows = [
      ['תאריך', 'סוג', 'תיאור', 'סכום', 'חלק נדב', 'חלק דוד', 'מס', 'שילם', 'קיזוז'],
      ...state.transactions.map(tx => {
        const b = tx.breakdown;
        const isIncome = b.kind === 'income';
        return [
          tx.date,
          tx.type === 'income' ? 'הכנסה' : 'הוצאה',
          tx.description,
          tx.amount,
          isIncome ? b.nadavShare.toFixed(0) : b.nadavShare.toFixed(0),
          isIncome ? b.davidShare.toFixed(0) : b.davidShare.toFixed(0),
          isIncome ? b.taxAmount.toFixed(0) : '',
          !isIncome ? (b.paidBy === 'nadav' ? 'נדב' : 'דוד') : '',
          !isIncome ? (b.offsetAgainstDebt ? 'כן' : 'לא') : '',
        ];
      }),
    ];
    const csv = '\uFEFF' + rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `partnership-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {(['all', 'income', 'expense'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={
                filter === f
                  ? {
                      background: f === 'income' ? 'rgba(0,196,140,0.2)' : f === 'expense' ? 'rgba(244,63,94,0.2)' : 'rgba(255,255,255,0.12)',
                      color: f === 'income' ? '#00C48C' : f === 'expense' ? '#F43F5E' : '#fff',
                      border: `1px solid ${f === 'income' ? 'rgba(0,196,140,0.35)' : f === 'expense' ? 'rgba(244,63,94,0.35)' : 'rgba(255,255,255,0.2)'}`,
                    }
                  : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }
              }
            >
              {f === 'all' ? 'הכל' : f === 'income' ? 'הכנסות' : 'הוצאות'}
            </button>
          ))}
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <Download size={12} />
          ייצוא CSV
        </button>
      </div>

      {/* Settlements (pinned at top if filter = all) */}
      {filter === 'all' && state.settlements.map(s => (
        <SettlementRow key={s.id} s={s} />
      ))}

      {/* Transaction list */}
      {filteredTx.length === 0 && (
        <div className="text-center py-10 text-white/25 text-sm">
          אין עסקאות להציג
        </div>
      )}

      {filteredTx.map(tx => {
        const isIncome = tx.type === 'income';
        const isOpen = expandedId === tx.id;
        return (
          <div
            key={tx.id}
            className="rounded-2xl overflow-hidden transition-all"
            style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <button
              className="w-full text-right px-4 py-3.5 flex items-center gap-3"
              onClick={() => setExpandedId(isOpen ? null : tx.id)}
            >
              {/* Icon */}
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: isIncome ? 'rgba(0,196,140,0.12)' : 'rgba(244,63,94,0.12)' }}
              >
                {isIncome
                  ? <TrendingUp size={14} color="#00C48C" />
                  : <TrendingDown size={14} color="#F43F5E" />}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 text-right">
                <div className="text-sm font-semibold text-white truncate">{tx.description}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-white/35">{formatDate(tx.date)}</span>
                  {tx.breakdown.kind === 'expense' && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                      style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}
                    >
                      {tx.breakdown.category}
                    </span>
                  )}
                </div>
              </div>

              {/* Amount + chevron */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className="text-base font-extrabold"
                  style={{ color: isIncome ? '#00C48C' : '#F43F5E' }}
                >
                  {isIncome ? '+' : '−'}₪{fmt(tx.amount)}
                </span>
                <ChevronDown
                  size={14}
                  className="transition-transform"
                  style={{ color: 'rgba(255,255,255,0.25)', transform: isOpen ? 'rotate(180deg)' : 'none' }}
                />
              </div>
            </button>

            {/* Expanded */}
            {isOpen && (
              <div className="px-4 pb-4" onClick={e => e.stopPropagation()}>
                <TxDetail tx={tx} />
                <button
                  onClick={() => {
                    if (confirm('למחוק את העסקה הזו?')) {
                      dispatch({ type: 'DELETE_TRANSACTION', payload: tx.id });
                      setExpandedId(null);
                    }
                  }}
                  className="mt-3 text-xs text-red-400/70 hover:text-red-400 font-semibold transition-colors"
                >
                  מחק עסקה
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
