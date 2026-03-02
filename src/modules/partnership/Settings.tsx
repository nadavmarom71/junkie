import { useState } from 'react';
import { Plus, X, Save } from 'lucide-react';
import { usePartnership } from './PartnershipContext';

export default function Settings() {
  const { state, dispatch } = usePartnership();
  const s = state.settings;

  const [taxRate, setTaxRate] = useState(s.taxRate);
  const [nadavSplit, setNadavSplit] = useState(s.nadavSplit);
  const [expSplit, setExpSplit] = useState(s.defaultExpenseSplit);
  const [categories, setCategories] = useState<string[]>([...s.expenseCategories]);
  const [newCat, setNewCat] = useState('');
  const [saved, setSaved] = useState(false);

  const davidSplit = 100 - nadavSplit;

  function handleSave() {
    dispatch({
      type: 'UPDATE_SETTINGS',
      payload: {
        taxRate,
        nadavSplit,
        davidSplit,
        defaultExpenseSplit: expSplit,
        expenseCategories: categories,
      },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  function addCategory() {
    const trimmed = newCat.trim();
    if (!trimmed || categories.includes(trimmed)) return;
    setCategories(prev => [...prev, trimmed]);
    setNewCat('');
  }

  function removeCategory(cat: string) {
    setCategories(prev => prev.filter(c => c !== cat));
  }

  return (
    <div className="space-y-5">

      {/* Tax Rate */}
      <div
        className="rounded-2xl p-4 space-y-3"
        style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-white">רזרבת מס</span>
          <span
            className="text-lg font-extrabold text-yellow-400"
          >
            {taxRate}%
          </span>
        </div>
        <input
          type="range" min="0" max="40" step="1"
          value={taxRate} onChange={e => setTaxRate(Number(e.target.value))}
          className="w-full accent-yellow-400"
        />
        <div className="flex justify-between text-sm text-white/30">
          <span>0%</span>
          <span className="text-white/50">ברירת מחדל: 12%</span>
          <span>40%</span>
        </div>
      </div>

      {/* Income Split */}
      <div
        className="rounded-2xl p-4 space-y-3"
        style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <span className="text-sm font-bold text-white block">חלוקת הכנסות</span>
        <div className="flex items-center gap-3">
          <div className="flex-1 text-right">
            <div className="text-sm text-blue-400 font-semibold mb-1">נדב</div>
            <div className="text-2xl font-extrabold text-blue-400">{nadavSplit}%</div>
          </div>
          <div className="flex-1">
            <input
              type="range" min="50" max="95" step="5"
              value={nadavSplit} onChange={e => setNadavSplit(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
          </div>
          <div className="flex-1 text-left">
            <div className="text-sm text-purple-400 font-semibold mb-1">דוד</div>
            <div className="text-2xl font-extrabold text-purple-400">{davidSplit}%</div>
          </div>
        </div>
        <p className="text-sm text-white/30 text-center">ברירת מחדל: נדב 65% / דוד 35%</p>
      </div>

      {/* Default Expense Split */}
      <div
        className="rounded-2xl p-4 space-y-3"
        style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-white">חלוקת הוצאות — ברירת מחדל</span>
          <span className="text-sm font-bold text-white/60">נדב {expSplit}% / דוד {100 - expSplit}%</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-blue-400 font-bold">נדב</span>
          <input
            type="range" min="0" max="100" step="5"
            value={expSplit} onChange={e => setExpSplit(Number(e.target.value))}
            className="flex-1 accent-purple-500"
          />
          <span className="text-sm text-purple-400 font-bold">דוד</span>
        </div>
      </div>

      {/* Expense Categories */}
      <div
        className="rounded-2xl p-4 space-y-3"
        style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <span className="text-sm font-bold text-white block">קטגוריות הוצאות</span>
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <div
              key={cat}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-semibold"
              style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa' }}
            >
              <span>{cat}</span>
              <button
                onClick={() => removeCategory(cat)}
                className="hover:text-red-400 transition-colors"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newCat}
            onChange={e => setNewCat(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCategory())}
            placeholder="קטגוריה חדשה..."
            className="flex-1 rounded-xl px-3 py-2 text-sm bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 transition-colors"
          />
          <button
            type="button"
            onClick={addCategory}
            className="px-3 py-2 rounded-xl flex items-center gap-1 text-xs font-bold transition-colors"
            style={{ background: 'rgba(124,58,237,0.2)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.3)' }}
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className="w-full rounded-2xl py-3.5 font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-98"
        style={{
          background: saved
            ? 'linear-gradient(135deg,#00C48C,#059669)'
            : 'linear-gradient(135deg,#7c3aed,#6d28d9)',
          color: '#fff',
          boxShadow: saved
            ? '0 6px 20px rgba(0,196,140,0.3)'
            : '0 6px 20px rgba(124,58,237,0.35)',
        }}
      >
        {saved ? '✓ הגדרות נשמרו!' : <><Save size={15} /> שמור הגדרות</>}
      </button>

      {/* Danger zone */}
      <div
        className="rounded-2xl p-4"
        style={{ background: 'rgba(244,63,94,0.04)', border: '1px solid rgba(244,63,94,0.15)' }}
      >
        <p className="text-sm font-bold text-red-400/80 mb-2">אזור מסוכן</p>
        <button
          onClick={() => {
            if (confirm('האם לאפס את כל הנתונים של השותפות? פעולה זו בלתי הפיכה.')) {
              localStorage.removeItem('partnership-module-v1');
              window.location.reload();
            }
          }}
          className="text-sm text-red-400/60 hover:text-red-400 font-semibold transition-colors underline"
        >
          אפס את כל נתוני השותפות
        </button>
      </div>
    </div>
  );
}
