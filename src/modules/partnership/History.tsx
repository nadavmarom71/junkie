import { useState } from 'react';
import { Download, ChevronDown, TrendingUp, TrendingDown, Award, Plus, X, Pencil, Check } from 'lucide-react';
import { usePartnership } from './PartnershipContext';
import { calcExpenseBreakdown } from './PartnershipContext';
import type { PartnershipTx, Settlement, Payer } from './PartnershipContext';

function fmt(n: number) {
  return Math.abs(n).toLocaleString('he-IL', { maximumFractionDigits: 0 });
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: '2-digit' });
}

// ── Inline Edit Form ──────────────────────────────────────────────────────────

function EditTxForm({ tx, onDone }: { tx: PartnershipTx; onDone: () => void }) {
  const { state, dispatch } = usePartnership();
  const isIncome = tx.type === 'income';
  const expBreak = !isIncome ? (tx.breakdown as ReturnType<typeof calcExpenseBreakdown>) : null;

  const [desc, setDesc] = useState(tx.description);
  const [amount, setAmount] = useState(String(tx.amount));
  const [date, setDate] = useState(tx.date);
  const [category, setCategory] = useState(expBreak?.category ?? state.settings.expenseCategories[0]);
  const [paidBy, setPaidBy] = useState<Payer>(expBreak?.paidBy ?? 'nadav');
  const [splitRatio, setSplitRatio] = useState(expBreak?.splitRatio ?? 50);
  const [offset, setOffset] = useState(expBreak?.offsetAgainstDebt ?? true);

  function handleSave() {
    const n = parseFloat(amount);
    if (!n || !desc || !date) return;
    dispatch({
      type: 'EDIT_TRANSACTION',
      payload: {
        id: tx.id,
        description: desc,
        amount: n,
        date,
        ...(isIncome ? {} : { category, paidBy, splitRatio, offsetAgainstDebt: offset }),
      },
    });
    onDone();
  }

  return (
    <div
      className="mt-3 pt-3 space-y-3"
      style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
      onClick={e => e.stopPropagation()}
    >
      <p className="text-sm font-bold text-white/60">עריכת עסקה</p>
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className="text-xs font-semibold text-white/50 block mb-1">סכום (₪)</label>
          <input
            type="number" value={amount} onChange={e => setAmount(e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-sm bg-white/6 border border-white/12 text-white focus:outline-none focus:border-blue-500/50"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-white/50 block mb-1">תאריך</label>
          <input
            type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-sm bg-white/6 border border-white/12 text-white focus:outline-none focus:border-blue-500/50"
            style={{ background: '#1a1f2e' }}
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-white/50 block mb-1">תיאור</label>
        <input
          type="text" value={desc} onChange={e => setDesc(e.target.value)}
          className="w-full rounded-xl px-3 py-2 text-sm bg-white/6 border border-white/12 text-white focus:outline-none focus:border-blue-500/50"
        />
      </div>
      {!isIncome && (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-xs font-semibold text-white/50 block mb-1">קטגוריה</label>
              <select
                value={category} onChange={e => setCategory(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-sm border border-white/12 text-white focus:outline-none"
                style={{ background: '#1a1f2e' }}
              >
                {state.settings.expenseCategories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-white/50 block mb-1">שילם</label>
              <div className="flex gap-1.5 mt-0.5">
                {(['nadav', 'david'] as const).map(p => (
                  <button key={p} type="button" onClick={() => setPaidBy(p)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                    style={paidBy === p
                      ? { background: p === 'nadav' ? '#2563EB' : '#7c3aed', color: '#fff' }
                      : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}
                  >
                    {p === 'nadav' ? 'נדב' : 'דוד'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-white/50 block mb-1.5">
              חלוקה — נדב {splitRatio}% / דוד {100 - splitRatio}%
            </label>
            <input type="range" min="0" max="100" step="5" value={splitRatio}
              onChange={e => setSplitRatio(Number(e.target.value))}
              className="w-full accent-purple-500"
            />
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={offset} onChange={e => setOffset(e.target.checked)}
              className="w-4 h-4 accent-purple-500"
            />
            <span className="text-sm text-white/70">קזז מול חוב קיים?</span>
          </label>
        </>
      )}
      <div className="flex gap-2 pt-1">
        <button onClick={handleSave}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold"
          style={{ background: 'rgba(37,99,235,0.25)', color: '#60a5fa', border: '1px solid rgba(37,99,235,0.4)' }}
        >
          <Check size={14} /> שמור
        </button>
        <button onClick={onDone}
          className="px-4 py-2.5 rounded-xl text-sm font-bold"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
        >
          ביטול
        </button>
      </div>
    </div>
  );
}

// ── Add Linked Expense Mini Form ───────────────────────────────────────────────

function AddLinkedExpenseForm({ txId, onDone }: { txId: string; onDone: () => void }) {
  const { state, dispatch } = usePartnership();
  const today = new Date().toISOString().split('T')[0];
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(state.settings.expenseCategories[0]);
  const [date, setDate] = useState(today);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const n = parseFloat(amount);
    if (!n || !desc) return;
    dispatch({
      type: 'ADD_LINKED_EXPENSE',
      payload: {
        txId,
        expense: { id: `le_${Date.now()}`, description: desc, amount: n, category, date },
      },
    });
    setDesc(''); setAmount('');
    onDone();
  }

  return (
    <form onSubmit={handleAdd}
      className="mt-2 p-3 rounded-xl space-y-2.5"
      style={{ background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.2)' }}
      onClick={e => e.stopPropagation()}
    >
      <p className="text-xs font-bold text-red-400">הוצאה משויכת לעסקה</p>
      <div className="grid grid-cols-2 gap-2">
        <input type="number" min="0" step="0.01" placeholder="סכום" value={amount}
          onChange={e => setAmount(e.target.value)}
          className="rounded-lg px-2.5 py-2 text-sm bg-white/6 border border-white/12 text-white placeholder:text-white/25 focus:outline-none" required
        />
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="rounded-lg px-2.5 py-2 text-sm border border-white/12 text-white focus:outline-none"
          style={{ background: '#1a1f2e' }}
        />
      </div>
      <input type="text" placeholder="תיאור (לדוגמה: פרילנסר — עיצוב)" value={desc}
        onChange={e => setDesc(e.target.value)}
        className="w-full rounded-lg px-2.5 py-2 text-sm bg-white/6 border border-white/12 text-white placeholder:text-white/25 focus:outline-none" required
      />
      <select value={category} onChange={e => setCategory(e.target.value)}
        className="w-full rounded-lg px-2.5 py-2 text-sm border border-white/12 text-white focus:outline-none"
        style={{ background: '#1a1f2e' }}
      >
        {state.settings.expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <div className="flex gap-2">
        <button type="submit"
          className="flex-1 py-2 rounded-lg text-sm font-bold"
          style={{ background: 'rgba(244,63,94,0.2)', color: '#f87171', border: '1px solid rgba(244,63,94,0.35)' }}
        >
          הוסף הוצאה
        </button>
        <button type="button" onClick={onDone}
          className="px-3 py-2 rounded-lg text-sm font-bold"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}
        >
          ביטול
        </button>
      </div>
    </form>
  );
}

// ── Expanded Income Detail ────────────────────────────────────────────────────

function IncomeDetail({ tx }: { tx: PartnershipTx }) {
  const { dispatch } = usePartnership();
  const b = tx.breakdown as import('./PartnershipContext').IncomeBreakdown;
  const linked = tx.linkedExpenses ?? [];
  const [addingLinked, setAddingLinked] = useState(false);

  return (
    <div className="mt-3 pt-3 space-y-2 text-sm" style={{ borderTop: '1px solid rgba(255,255,255,0.09)' }}>
      {/* Gross */}
      <div className="flex justify-between">
        <span className="text-white/50">הכנסה ברוטו</span>
        <span className="text-white font-semibold">₪{fmt(tx.amount)}</span>
      </div>

      {/* Linked expenses section */}
      <div
        className="rounded-xl p-3 space-y-2"
        style={{ background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.18)' }}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-red-400">הוצאות משויכות לעסקה</span>
          <button
            onClick={() => setAddingLinked(v => !v)}
            className="flex items-center gap-1 text-xs font-bold transition-colors"
            style={{ color: addingLinked ? 'rgba(255,255,255,0.4)' : '#f87171' }}
          >
            {addingLinked ? <X size={12} /> : <Plus size={12} />}
            {addingLinked ? 'ביטול' : 'הוסף'}
          </button>
        </div>

        {linked.length === 0 && !addingLinked && (
          <p className="text-xs text-white/25 italic">אין הוצאות — הוסף פרילנסר, ציוד, תשלומי קבלן וכו׳</p>
        )}

        {linked.map(e => (
          <div key={e.id} className="flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-xs font-medium text-white/80 truncate">{e.description}</span>
              <span className="text-xs text-white/35 me-1.5"> · {e.category}</span>
              <span className="text-xs text-white/30">{formatDate(e.date)}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-sm font-bold text-red-400">−₪{fmt(e.amount)}</span>
              <button
                onClick={() => dispatch({ type: 'REMOVE_LINKED_EXPENSE', payload: { txId: tx.id, expenseId: e.id } })}
                className="text-white/20 hover:text-red-400 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        ))}

        {linked.length > 0 && (
          <div className="flex justify-between pt-1.5 border-t border-white/08">
            <span className="text-xs text-white/40">סה״כ עלויות ישירות</span>
            <span className="text-sm font-bold text-red-400">−₪{fmt(b.linkedExpenseTotal)}</span>
          </div>
        )}

        {addingLinked && (
          <AddLinkedExpenseForm txId={tx.id} onDone={() => setAddingLinked(false)} />
        )}
      </div>

      {/* Adjusted gross + tax + net */}
      {b.linkedExpenseTotal > 0 && (
        <div className="flex justify-between">
          <span className="text-white/50">ברוטו מותאם</span>
          <span className="text-white/80 font-semibold">₪{fmt(b.effectiveGross)}</span>
        </div>
      )}
      <div className="flex justify-between">
        <span className="text-yellow-400/80">מס ({((b.taxAmount / (b.effectiveGross || 1)) * 100).toFixed(0)}%)</span>
        <span className="text-yellow-400 font-semibold">−₪{fmt(b.taxAmount)}</span>
      </div>
      <div className="flex justify-between font-bold border-t border-white/09 pt-2">
        <span className="text-white/80">נטו לחלוקה</span>
        <span className="text-white">₪{fmt(b.netIncome)}</span>
      </div>
      <div className="pt-1 space-y-1.5">
        <div className="flex justify-between">
          <span className="text-blue-400">נדב</span>
          <span className="text-blue-400 font-bold">+₪{fmt(b.nadavShare)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-purple-400">דוד</span>
          <span className="text-purple-400 font-bold">+₪{fmt(b.davidShare)}</span>
        </div>
      </div>
      <div className="flex justify-between pt-1.5 border-t border-white/08">
        <span className="text-orange-400/80 text-xs">אפקט יתרה</span>
        <span className="text-orange-400 text-xs font-semibold">נדב חייב לדוד +₪{fmt(b.davidShare)}</span>
      </div>
    </div>
  );
}

// ── Expanded Expense Detail ───────────────────────────────────────────────────

function ExpenseDetail({ tx }: { tx: PartnershipTx }) {
  const b = tx.breakdown as import('./PartnershipContext').ExpenseBreakdown;
  const paidByLabel = b.paidBy === 'nadav' ? 'נדב' : 'דוד';
  return (
    <div className="mt-3 pt-3 space-y-2 text-sm" style={{ borderTop: '1px solid rgba(255,255,255,0.09)' }}>
      <div className="flex justify-between">
        <span className="text-white/50">שילם</span>
        <span className="font-semibold" style={{ color: b.paidBy === 'nadav' ? '#60a5fa' : '#a78bfa' }}>
          {paidByLabel}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-white/50">חלוקה</span>
        <span className="text-white/70">נדב {b.splitRatio}% / דוד {100 - b.splitRatio}%</span>
      </div>
      <div className="flex justify-between">
        <span className="text-blue-400">חלק נדב</span>
        <span className="text-blue-400 font-bold">₪{fmt(b.nadavShare)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-purple-400">חלק דוד</span>
        <span className="text-purple-400 font-bold">₪{fmt(b.davidShare)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-white/50">קיזוז</span>
        <span className={b.offsetAgainstDebt ? 'text-green-400 font-semibold' : 'text-white/40'}>
          {b.offsetAgainstDebt ? 'כן ✓' : 'לא'}
        </span>
      </div>
      {(b.nadavOwesDavidDelta !== 0 || b.davidOwesNadavDelta !== 0) && (
        <div className="pt-1.5 border-t border-white/08 space-y-1">
          {b.nadavOwesDavidDelta !== 0 && (
            <div className="flex justify-between">
              <span className="text-orange-400/80 text-xs">נדב↔דוד</span>
              <span className={`text-xs font-semibold ${b.nadavOwesDavidDelta > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                {b.nadavOwesDavidDelta > 0 ? '+' : '−'}₪{fmt(b.nadavOwesDavidDelta)}
              </span>
            </div>
          )}
          {b.davidOwesNadavDelta !== 0 && (
            <div className="flex justify-between">
              <span className="text-purple-400/80 text-xs">דוד↔נדב</span>
              <span className={`text-xs font-semibold ${b.davidOwesNadavDelta > 0 ? 'text-purple-400' : 'text-green-400'}`}>
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
      className="rounded-xl px-4 py-3 flex items-center justify-between"
      style={{ background: 'rgba(0,196,140,0.07)', border: '1px solid rgba(0,196,140,0.18)' }}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(0,196,140,0.15)' }}
        >
          <Award size={16} color="#00C48C" />
        </div>
        <div>
          <div className="text-base font-semibold text-white">{s.description}</div>
          <div className="text-sm text-white/40">{formatDate(s.date)}</div>
        </div>
      </div>
      <div className="text-sm text-green-400 font-bold">סגירה</div>
    </div>
  );
}

// ── Main History ──────────────────────────────────────────────────────────────

export default function History() {
  const { state, dispatch } = usePartnership();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');

  const filteredTx = state.transactions.filter(t =>
    filter === 'all' || t.type === filter
  );

  function exportCSV() {
    const rows = [
      ['תאריך', 'סוג', 'תיאור', 'סכום', 'עלויות ישירות', 'חלק נדב', 'חלק דוד', 'מס', 'שילם', 'קיזוז'],
      ...state.transactions.map(tx => {
        const b = tx.breakdown;
        const isIncome = b.kind === 'income';
        return [
          tx.date,
          tx.type === 'income' ? 'הכנסה' : 'הוצאה',
          tx.description,
          tx.amount,
          isIncome ? (b.linkedExpenseTotal ?? 0).toFixed(0) : '',
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
            <button key={f} onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-full text-sm font-semibold transition-all"
              style={filter === f
                ? {
                    background: f === 'income' ? 'rgba(0,196,140,0.2)' : f === 'expense' ? 'rgba(244,63,94,0.2)' : 'rgba(255,255,255,0.12)',
                    color: f === 'income' ? '#00C48C' : f === 'expense' ? '#F43F5E' : '#fff',
                    border: `1px solid ${f === 'income' ? 'rgba(0,196,140,0.35)' : f === 'expense' ? 'rgba(244,63,94,0.35)' : 'rgba(255,255,255,0.2)'}`,
                  }
                : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}
            >
              {f === 'all' ? 'הכל' : f === 'income' ? 'הכנסות' : 'הוצאות'}
            </button>
          ))}
        </div>
        <button onClick={exportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <Download size={13} />
          ייצוא CSV
        </button>
      </div>

      {/* Settlements */}
      {filter === 'all' && state.settlements.map(s => (
        <SettlementRow key={s.id} s={s} />
      ))}

      {filteredTx.length === 0 && (
        <div className="text-center py-10 text-white/25 text-base">אין עסקאות להציג</div>
      )}

      {filteredTx.map(tx => {
        const isIncome = tx.type === 'income';
        const isOpen = expandedId === tx.id;
        const isEditing = editingId === tx.id;
        const linkedCount = tx.linkedExpenses?.length ?? 0;

        return (
          <div key={tx.id}
            className="rounded-2xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {/* Row */}
            <button
              className="w-full text-right px-4 py-4 flex items-center gap-3"
              onClick={() => { setExpandedId(isOpen ? null : tx.id); setEditingId(null); }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: isIncome ? 'rgba(0,196,140,0.12)' : 'rgba(244,63,94,0.12)' }}
              >
                {isIncome ? <TrendingUp size={15} color="#00C48C" /> : <TrendingDown size={15} color="#F43F5E" />}
              </div>
              <div className="flex-1 min-w-0 text-right">
                <div className="text-base font-semibold text-white truncate">{tx.description}</div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-sm text-white/35">{formatDate(tx.date)}</span>
                  {tx.breakdown.kind === 'expense' && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                      style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}
                    >
                      {tx.breakdown.category}
                    </span>
                  )}
                  {linkedCount > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                      style={{ background: 'rgba(244,63,94,0.12)', color: '#f87171' }}
                    >
                      {linkedCount} הוצאות
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-lg font-extrabold" style={{ color: isIncome ? '#00C48C' : '#F43F5E' }}>
                  {isIncome ? '+' : '−'}₪{fmt(tx.amount)}
                </span>
                <ChevronDown size={15} className="transition-transform"
                  style={{ color: 'rgba(255,255,255,0.25)', transform: isOpen ? 'rotate(180deg)' : 'none' }}
                />
              </div>
            </button>

            {/* Expanded */}
            {isOpen && (
              <div className="px-4 pb-4" onClick={e => e.stopPropagation()}>
                {!isEditing && (
                  <>
                    {isIncome ? <IncomeDetail tx={tx} /> : <ExpenseDetail tx={tx} />}
                    <div className="mt-4 flex justify-between items-center">
                      <button
                        onClick={() => { if (confirm('למחוק את העסקה?')) { dispatch({ type: 'DELETE_TRANSACTION', payload: tx.id }); setExpandedId(null); } }}
                        className="text-sm text-red-400/70 hover:text-red-400 font-semibold transition-colors"
                      >
                        מחק
                      </button>
                      <button
                        onClick={() => setEditingId(tx.id)}
                        className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                      >
                        <Pencil size={13} />
                        ערוך
                      </button>
                    </div>
                  </>
                )}
                {isEditing && (
                  <EditTxForm tx={tx} onDone={() => setEditingId(null)} />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
