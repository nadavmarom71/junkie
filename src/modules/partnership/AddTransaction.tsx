import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Eye } from 'lucide-react';
import { usePartnership, calcIncomeBreakdown, calcExpenseBreakdown } from './PartnershipContext';
import type { Payer } from './PartnershipContext';

function fmt(n: number) {
  return Math.abs(n).toLocaleString('he-IL', { maximumFractionDigits: 0 });
}

// ── Income Form ───────────────────────────────────────────────────────────────

function IncomeForm({ onSaved }: { onSaved: () => void }) {
  const { state, dispatch } = usePartnership();
  const today = new Date().toISOString().split('T')[0];
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const [saved, setSaved] = useState(false);

  const preview = useMemo(() => {
    const n = parseFloat(amount);
    if (!n || n <= 0) return null;
    return calcIncomeBreakdown(n, state.settings);
  }, [amount, state.settings]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseFloat(amount);
    if (!n || !desc || !date) return;
    dispatch({
      type: 'ADD_TRANSACTION',
      payload: {
        id: `tx_${Date.now()}`,
        type: 'income',
        date,
        description: desc,
        amount: n,
        breakdown: calcIncomeBreakdown(n, state.settings),
        createdAt: new Date().toISOString(),
      },
    });
    setDesc(''); setAmount(''); setDate(today);
    setSaved(true);
    setTimeout(() => { setSaved(false); onSaved(); }, 900);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-white/60 block mb-1.5">סכום (₪)</label>
          <input
            type="number" min="0" step="0.01"
            value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="0"
            className="w-full rounded-xl px-3 py-2.5 text-sm font-semibold bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/50 transition-colors"
            required
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-white/60 block mb-1.5">תאריך</label>
          <input
            type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full rounded-xl px-3 py-2.5 text-sm bg-white/5 border border-white/10 text-white focus:outline-none focus:border-green-500/50 transition-colors"
            required
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-white/60 block mb-1.5">תיאור / לקוח</label>
        <input
          type="text" value={desc} onChange={e => setDesc(e.target.value)}
          placeholder="לדוגמה: אתר לקוח — חברה בע״מ"
          className="w-full rounded-xl px-3 py-2.5 text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/50 transition-colors"
          required
        />
      </div>

      {/* Live Preview */}
      {preview && (
        <div
          className="rounded-2xl p-3.5 space-y-2"
          style={{ background: 'rgba(0,196,140,0.06)', border: '1px solid rgba(0,196,140,0.2)' }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <Eye size={12} color="#00C48C" />
            <span className="text-xs font-bold text-green-400">תצוגה מקדימה</span>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-white/50">ברוטו</span>
              <span className="text-white font-semibold">₪{fmt(parseFloat(amount))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">מס ({state.settings.taxRate}%)</span>
              <span className="text-yellow-400 font-semibold">−₪{fmt(preview.taxAmount)}</span>
            </div>
            <div className="flex justify-between border-t border-white/10 pt-1.5">
              <span className="text-white/70 font-semibold">נטו</span>
              <span className="text-white font-bold">₪{fmt(preview.netIncome)}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-blue-400">נדב ({state.settings.nadavSplit}%)</span>
              <span className="text-blue-400 font-bold">+₪{fmt(preview.nadavShare)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-purple-400">דוד ({state.settings.davidSplit}%)</span>
              <span className="text-purple-400 font-bold">+₪{fmt(preview.davidShare)}</span>
            </div>
            <div className="flex justify-between pt-1.5 border-t border-white/10">
              <span className="text-orange-400 text-[11px]">אפקט על יתרה</span>
              <span className="text-orange-400 font-semibold text-[11px]">
                נדב חייב לדוד +₪{fmt(preview.davidShare)}
              </span>
            </div>
          </div>
        </div>
      )}

      <button
        type="submit"
        className="w-full rounded-2xl py-3 font-bold text-sm transition-all active:scale-98"
        style={{
          background: saved
            ? 'linear-gradient(135deg,#00C48C,#059669)'
            : 'linear-gradient(135deg,#059669,#00C48C)',
          color: '#fff',
          boxShadow: '0 6px 20px rgba(0,196,140,0.3)',
        }}
      >
        {saved ? '✓ נשמר!' : 'שמור הכנסה'}
      </button>
    </form>
  );
}

// ── Expense Form ──────────────────────────────────────────────────────────────

function ExpenseForm({ onSaved }: { onSaved: () => void }) {
  const { state, dispatch } = usePartnership();
  const today = new Date().toISOString().split('T')[0];
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const [category, setCategory] = useState(state.settings.expenseCategories[0]);
  const [paidBy, setPaidBy] = useState<Payer>('nadav');
  const [splitRatio, setSplitRatio] = useState(state.settings.defaultExpenseSplit);
  const [offset, setOffset] = useState(true);
  const [saved, setSaved] = useState(false);

  const preview = useMemo(() => {
    const n = parseFloat(amount);
    if (!n || n <= 0) return null;
    return calcExpenseBreakdown(n, category, paidBy, splitRatio, offset);
  }, [amount, category, paidBy, splitRatio, offset]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseFloat(amount);
    if (!n || !desc || !date) return;
    dispatch({
      type: 'ADD_TRANSACTION',
      payload: {
        id: `tx_${Date.now()}`,
        type: 'expense',
        date,
        description: desc,
        amount: n,
        breakdown: calcExpenseBreakdown(n, category, paidBy, splitRatio, offset),
        createdAt: new Date().toISOString(),
      },
    });
    setDesc(''); setAmount(''); setDate(today);
    setSaved(true);
    setTimeout(() => { setSaved(false); onSaved(); }, 900);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-white/60 block mb-1.5">סכום (₪)</label>
          <input
            type="number" min="0" step="0.01"
            value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="0"
            className="w-full rounded-xl px-3 py-2.5 text-sm font-semibold bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/50 transition-colors"
            required
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-white/60 block mb-1.5">תאריך</label>
          <input
            type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full rounded-xl px-3 py-2.5 text-sm bg-white/5 border border-white/10 text-white focus:outline-none focus:border-red-500/50 transition-colors"
            required
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-white/60 block mb-1.5">תיאור</label>
        <input
          type="text" value={desc} onChange={e => setDesc(e.target.value)}
          placeholder="לדוגמה: Adobe Creative Cloud"
          className="w-full rounded-xl px-3 py-2.5 text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/50 transition-colors"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-white/60 block mb-1.5">קטגוריה</label>
          <select
            value={category} onChange={e => setCategory(e.target.value)}
            className="w-full rounded-xl px-3 py-2.5 text-sm bg-white/5 border border-white/10 text-white focus:outline-none transition-colors"
            style={{ background: '#1a1f2e' }}
          >
            {state.settings.expenseCategories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-white/60 block mb-1.5">שילם</label>
          <div className="flex gap-1.5 mt-0.5">
            {(['nadav', 'david'] as const).map(p => (
              <button
                key={p} type="button"
                onClick={() => setPaidBy(p)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all"
                style={
                  paidBy === p
                    ? { background: p === 'nadav' ? '#2563EB' : '#7c3aed', color: '#fff' }
                    : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }
                }
              >
                {p === 'nadav' ? 'נדב' : 'דוד'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Split Ratio */}
      <div>
        <label className="text-xs font-semibold text-white/60 block mb-2">
          חלוקת הוצאה — נדב {splitRatio}% / דוד {100 - splitRatio}%
        </label>
        <div className="flex items-center gap-3">
          <span className="text-xs text-blue-400 font-bold w-8">0%</span>
          <input
            type="range" min="0" max="100" step="5"
            value={splitRatio} onChange={e => setSplitRatio(Number(e.target.value))}
            className="flex-1 accent-purple-500"
          />
          <span className="text-xs text-purple-400 font-bold w-9 text-right">100%</span>
        </div>
      </div>

      {/* Offset checkbox */}
      <label
        className="flex items-start gap-3 p-3.5 rounded-xl cursor-pointer transition-colors"
        style={
          offset
            ? { background: 'rgba(124,58,237,0.10)', border: '1px solid rgba(124,58,237,0.3)' }
            : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }
        }
      >
        <input
          type="checkbox" checked={offset} onChange={e => setOffset(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-purple-500 flex-shrink-0"
        />
        <div>
          <div className="text-sm font-semibold text-white">קזז מול חוב קיים?</div>
          <div className="text-xs text-white/45 mt-0.5">
            {paidBy === 'nadav'
              ? offset
                ? 'חלק דוד יופחת מ"נדב חייב לדוד"'
                : 'חלק דוד יתווסף ל"דוד חייב לנדב"'
              : offset
              ? 'חלק נדב יופחת מ"דוד חייב לנדב"'
              : 'חלק נדב יתווסף ל"נדב חייב לדוד"'}
          </div>
        </div>
      </label>

      {/* Live Preview */}
      {preview && (
        <div
          className="rounded-2xl p-3.5 space-y-2"
          style={{ background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.2)' }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <Eye size={12} color="#F43F5E" />
            <span className="text-xs font-bold text-red-400">תצוגה מקדימה</span>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-white/50">סה״כ הוצאה</span>
              <span className="text-red-400 font-semibold">₪{fmt(parseFloat(amount))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-400">חלק נדב ({splitRatio}%)</span>
              <span className="text-blue-400 font-semibold">₪{fmt(preview.nadavShare)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-purple-400">חלק דוד ({100 - splitRatio}%)</span>
              <span className="text-purple-400 font-semibold">₪{fmt(preview.davidShare)}</span>
            </div>
            <div className="border-t border-white/10 pt-1.5 space-y-1">
              {preview.nadavOwesDavidDelta !== 0 && (
                <div className="flex justify-between">
                  <span className="text-orange-400 text-[11px]">נדב חייב לדוד</span>
                  <span className={`font-semibold text-[11px] ${preview.nadavOwesDavidDelta > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                    {preview.nadavOwesDavidDelta > 0 ? '+' : ''}₪{fmt(preview.nadavOwesDavidDelta)}
                  </span>
                </div>
              )}
              {preview.davidOwesNadavDelta !== 0 && (
                <div className="flex justify-between">
                  <span className="text-purple-400 text-[11px]">דוד חייב לנדב</span>
                  <span className={`font-semibold text-[11px] ${preview.davidOwesNadavDelta > 0 ? 'text-purple-400' : 'text-green-400'}`}>
                    {preview.davidOwesNadavDelta > 0 ? '+' : ''}₪{fmt(preview.davidOwesNadavDelta)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <button
        type="submit"
        className="w-full rounded-2xl py-3 font-bold text-sm transition-all active:scale-98"
        style={{
          background: saved
            ? 'linear-gradient(135deg,#00C48C,#059669)'
            : 'linear-gradient(135deg,#dc2626,#F43F5E)',
          color: '#fff',
          boxShadow: '0 6px 20px rgba(244,63,94,0.3)',
        }}
      >
        {saved ? '✓ נשמר!' : 'שמור הוצאה'}
      </button>
    </form>
  );
}

// ── Main Add View ─────────────────────────────────────────────────────────────

export default function AddTransaction({ onSaved }: { onSaved: () => void }) {
  const [txType, setTxType] = useState<'income' | 'expense'>('income');

  return (
    <div className="space-y-4">
      {/* Type Toggle */}
      <div
        className="flex rounded-2xl p-1 gap-1"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <button
          type="button"
          onClick={() => setTxType('income')}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all"
          style={
            txType === 'income'
              ? { background: 'linear-gradient(135deg,#059669,#00C48C)', color: '#fff', boxShadow: '0 4px 12px rgba(0,196,140,0.3)' }
              : { color: 'rgba(255,255,255,0.35)' }
          }
        >
          <TrendingUp size={15} />
          הכנסה
        </button>
        <button
          type="button"
          onClick={() => setTxType('expense')}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all"
          style={
            txType === 'expense'
              ? { background: 'linear-gradient(135deg,#dc2626,#F43F5E)', color: '#fff', boxShadow: '0 4px 12px rgba(244,63,94,0.3)' }
              : { color: 'rgba(255,255,255,0.35)' }
          }
        >
          <TrendingDown size={15} />
          הוצאה
        </button>
      </div>

      {txType === 'income'
        ? <IncomeForm onSaved={onSaved} />
        : <ExpenseForm onSaved={onSaved} />}
    </div>
  );
}
