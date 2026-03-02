import { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Scale, Coins, AlertCircle, CheckCircle, Zap } from 'lucide-react';
import { usePartnership } from './PartnershipContext';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return Math.abs(n).toLocaleString('he-IL', { maximumFractionDigits: 0 });
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, color, icon, negative,
}: {
  label: string; value: number; sub?: string; color: string; icon: React.ReactNode; negative?: boolean;
}) {
  const display = (negative && value < 0 ? '-' : '') + '₪' + fmt(value);
  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-1"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
          {icon}
        </div>
        <span className="text-sm font-semibold text-white/50 uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-3xl font-extrabold tracking-tight" style={{ color }}>
        {display}
      </div>
      {sub && <div className="text-sm text-white/35 mt-0.5">{sub}</div>}
    </div>
  );
}

function PartnerCard({
  name, net, color, split,
}: { name: string; net: number; color: string; split: number }) {
  return (
    <div
      className="rounded-2xl p-4 flex-1"
      style={{
        background: `linear-gradient(135deg, ${color}18, ${color}08)`,
        border: `1px solid ${color}30`,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold uppercase tracking-wider" style={{ color }}>
          {name}
        </span>
        <span
          className="text-sm font-bold px-2 py-0.5 rounded-full"
          style={{ background: `${color}20`, color }}
        >
          {split}%
        </span>
      </div>
      <div className="text-3xl font-extrabold" style={{ color }}>
        ₪{fmt(net)}
      </div>
      <div className="text-sm mt-1" style={{ color: `${color}80` }}>
        הכנסה נטו אחרי מס
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function Dashboard({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { state, dispatch, computedForMonth } = usePartnership();
  const [filter, setFilter] = useState<'month' | 'all'>('all');
  const [settleOpen, setSettleOpen] = useState(false);

  const monthKey = currentMonthKey();
  const cv = useMemo(
    () => computedForMonth(filter === 'month' ? monthKey : 'all'),
    [computedForMonth, filter, monthKey]
  );

  // Smart Settle Up logic
  const netSettleAmount = Math.min(cv.nadavOwesDavid, cv.davidOwesNadav);
  const canSettle = cv.nadavOwesDavid > 0 || cv.davidOwesNadav > 0;

  function doSettle(mode: 'net' | 'full') {
    const cleared =
      mode === 'net'
        ? { nadavOwesDavidCleared: netSettleAmount, davidOwesNadavCleared: netSettleAmount }
        : { nadavOwesDavidCleared: cv.nadavOwesDavid, davidOwesNadavCleared: cv.davidOwesNadav };

    const total = mode === 'net' ? netSettleAmount : Math.max(cv.nadavOwesDavid, cv.davidOwesNadav);
    const finalBalance = mode === 'full' ? 0 : Math.abs(cv.nadavOwesDavid - cv.davidOwesNadav);

    dispatch({
      type: 'ADD_SETTLEMENT',
      payload: {
        id: `s_${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        description: mode === 'net' ? `קיזוז חוב — ₪${fmt(netSettleAmount)}` : `סגירת חוב מלאה — ₪${fmt(total)}`,
        createdAt: new Date().toISOString(),
        ...cleared,
      },
    });

    // Show remaining after settle
    const remaining = mode === 'full' ? 0 : finalBalance;
    alert(
      mode === 'full'
        ? 'כל היתרות נוקו ✅'
        : remaining > 0
        ? `בוצע קיזוז ₪${fmt(netSettleAmount)}.\n${cv.nadavOwesDavid > cv.davidOwesNadav ? 'נדב' : 'דוד'} עדיין חייב ₪${fmt(remaining)}`
        : 'בוצע קיזוז מלא ✅'
    );
    setSettleOpen(false);
  }

  const profits = cv.grossProfit < 0;

  return (
    <div className="space-y-4">
      {/* Filter toggle */}
      <div className="flex items-center gap-2">
        {(['month', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
            style={
              filter === f
                ? { background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff', boxShadow: '0 4px 12px rgba(124,58,237,0.35)' }
                : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' }
            }
          >
            {f === 'month' ? 'החודש' : 'כל הזמנים'}
          </button>
        ))}
        {filter === 'month' && (
          <span className="text-sm text-white/30 ms-1">
            {new Date().toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}
          </span>
        )}
      </div>

      {/* Macro KPIs */}
      <div className="grid grid-cols-3 gap-2.5">
        <StatCard
          label="סה״כ הכנסות"
          value={cv.totalIncome}
          color="#00C48C"
          icon={<TrendingUp size={14} color="#00C48C" />}
        />
        <StatCard
          label="סה״כ הוצאות"
          value={cv.totalExpenses}
          color="#F43F5E"
          icon={<TrendingDown size={14} color="#F43F5E" />}
        />
        <StatCard
          label="רווח גולמי"
          value={cv.grossProfit}
          color={profits ? '#F43F5E' : '#ffffff'}
          negative
          icon={<Scale size={14} color={profits ? '#F43F5E' : '#ffffff'} />}
        />
      </div>

      {/* Tax Reserve */}
      <div
        className="rounded-2xl p-4 flex items-center justify-between"
        style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(234,179,8,0.15)' }}>
            <Coins size={16} color="#EAB308" />
          </div>
          <div>
            <div className="text-sm font-bold text-white/80">רזרבת מס ({state.settings.taxRate}%)</div>
            <div className="text-sm text-white/40">מתוך הרווח הגולמי</div>
          </div>
        </div>
        <div className="text-3xl font-extrabold text-yellow-400">₪{fmt(cv.taxReserve)}</div>
      </div>

      {/* Partner Net Earnings */}
      <div>
        <p className="text-sm font-semibold text-white/40 uppercase tracking-widest mb-2">הכנסה נטו לשותפים</p>
        <div className="flex gap-2.5">
          <PartnerCard
            name="נדב"
            net={cv.nadavNet}
            color="#2563EB"
            split={state.settings.nadavSplit}
          />
          <PartnerCard
            name="דוד"
            net={cv.davidNet}
            color="#7c3aed"
            split={state.settings.davidSplit}
          />
        </div>
      </div>

      {/* Balance / Debt Cards */}
      <div>
        <p className="text-sm font-semibold text-white/40 uppercase tracking-widest mb-2">יתרות שוטפות</p>
        <div className="grid grid-cols-2 gap-2.5">
          {/* Nadav owes David */}
          <div
            className="rounded-2xl p-4"
            style={{
              background: cv.nadavOwesDavid > 0 ? 'rgba(249,115,22,0.08)' : 'rgba(0,196,140,0.05)',
              border: `1px solid ${cv.nadavOwesDavid > 0 ? 'rgba(249,115,22,0.25)' : 'rgba(0,196,140,0.15)'}`,
            }}
          >
            <div className="text-sm font-semibold text-white/50 mb-1">נדב חייב לדוד</div>
            <div
              className="text-2xl font-extrabold"
              style={{ color: cv.nadavOwesDavid > 0 ? '#f97316' : '#00C48C' }}
            >
              ₪{fmt(cv.nadavOwesDavid)}
            </div>
            <div className="text-sm text-white/35 mt-0.5">
              {cv.nadavOwesDavid > 0 ? 'תשלומים עתידיים' : 'מאוזן ✓'}
            </div>
          </div>

          {/* David owes Nadav */}
          <div
            className="rounded-2xl p-4"
            style={{
              background: cv.davidOwesNadav > 0 ? 'rgba(124,58,237,0.08)' : 'rgba(0,196,140,0.05)',
              border: `1px solid ${cv.davidOwesNadav > 0 ? 'rgba(124,58,237,0.25)' : 'rgba(0,196,140,0.15)'}`,
            }}
          >
            <div className="text-sm font-semibold text-white/50 mb-1">דוד חייב לנדב</div>
            <div
              className="text-2xl font-extrabold"
              style={{ color: cv.davidOwesNadav > 0 ? '#a78bfa' : '#00C48C' }}
            >
              ₪{fmt(cv.davidOwesNadav)}
            </div>
            <div className="text-sm text-white/35 mt-0.5">
              {cv.davidOwesNadav > 0 ? 'החזר הוצאות' : 'מאוזן ✓'}
            </div>
          </div>
        </div>
      </div>

      {/* Smart Settle Up */}
      {canSettle && !settleOpen && (
        <button
          onClick={() => setSettleOpen(true)}
          className="w-full rounded-2xl py-3.5 font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-98"
          style={{
            background: 'linear-gradient(135deg,#7c3aed,#2563EB)',
            boxShadow: '0 6px 24px rgba(124,58,237,0.35)',
            color: '#fff',
          }}
        >
          <Zap size={16} />
          Smart Settle Up
        </button>
      )}

      {/* Settle modal (inline) */}
      {settleOpen && canSettle && (
        <div
          className="rounded-2xl p-4 space-y-3"
          style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.3)' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Zap size={16} color="#a78bfa" />
            <span className="text-sm font-bold text-white">Smart Settle Up</span>
          </div>
          <div className="text-sm text-white/60 space-y-1">
            <div className="flex justify-between">
              <span>נדב חייב לדוד</span>
              <span className="text-orange-400 font-semibold">₪{fmt(cv.nadavOwesDavid)}</span>
            </div>
            <div className="flex justify-between">
              <span>דוד חייב לנדב</span>
              <span className="text-purple-400 font-semibold">₪{fmt(cv.davidOwesNadav)}</span>
            </div>
          </div>

          {netSettleAmount > 0 && (
            <div
              className="rounded-xl p-3 text-xs"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <AlertCircle size={13} color="#EAB308" />
                <span className="text-sm text-yellow-400 font-semibold">קיזוז חכם</span>
              </div>
              <p className="text-sm text-white/60">
                קזז ₪{fmt(netSettleAmount)} משני הצדדים.{' '}
                {cv.nadavOwesDavid > cv.davidOwesNadav
                  ? `נדב ישלם לדוד ₪${fmt(cv.nadavOwesDavid - netSettleAmount)}`
                  : cv.davidOwesNadav > cv.nadavOwesDavid
                  ? `דוד ישלם לנדב ₪${fmt(cv.davidOwesNadav - netSettleAmount)}`
                  : 'כל היתרות מתקזזות בדיוק!'}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            {netSettleAmount > 0 && (
              <button
                onClick={() => doSettle('net')}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5"
                style={{ background: 'rgba(124,58,237,0.3)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.4)' }}
              >
                <Zap size={13} />
                קיזוז חכם
              </button>
            )}
            <button
              onClick={() => doSettle('full')}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5"
              style={{ background: 'rgba(0,196,140,0.15)', color: '#00C48C', border: '1px solid rgba(0,196,140,0.3)' }}
            >
              <CheckCircle size={13} />
              סגור הכל
            </button>
            <button
              onClick={() => setSettleOpen(false)}
              className="px-3 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {/* No transactions yet */}
      {state.transactions.length === 0 && (
        <div className="text-center py-8 text-white/30 text-sm">
          <p>אין נתונים עדיין.</p>
          <button
            onClick={() => onNavigate('add')}
            className="mt-2 text-purple-400 font-semibold text-xs underline"
          >
            הוסף עסקה ראשונה
          </button>
        </div>
      )}
    </div>
  );
}
