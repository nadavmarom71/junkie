import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Building2, Wallet, CreditCard, TrendingUp, Bitcoin, Banknote,
  Plus, Pencil, Trash2, X, Check, ChevronDown, ChevronUp, RefreshCw,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type AccountType = 'checking' | 'cash' | 'credit_card' | 'savings' | 'investment' | 'crypto';

interface Account {
  id: string;
  name: string;
  type: AccountType;
  institution?: string;
  balance: number;
  currency: string;
  credit_limit?: number;
  billing_date?: number;
  upcoming_charges?: number;
  upcoming_subs?: { name: string; amount: number; next_billing_date: string }[];
}

interface Subscription {
  id: string;
  name: string;
  amount: number;
  currency: string;
  billing_cycle: 'weekly' | 'monthly' | 'annual';
  next_billing_date: string;
  category: string;
  account_id?: string;
  is_active: boolean;
  notes?: string;
  accounts?: { id: string; name: string; type: string; institution?: string };
}

interface AccountsResponse {
  accounts: Account[];
  grouped: Record<AccountType, Account[]>;
  summary: { net_worth: number; total_assets: number; total_liabilities: number };
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_META: Record<AccountType, { label: string; icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; color: string }> = {
  checking:    { label: 'חשבונות עו"ש',     icon: Building2,  color: '#3b82f6' },
  cash:        { label: 'מזומן',             icon: Banknote,   color: '#10b981' },
  credit_card: { label: 'כרטיסי אשראי',     icon: CreditCard, color: '#f59e0b' },
  savings:     { label: 'חסכונות',           icon: Wallet,     color: '#8b5cf6' },
  investment:  { label: 'השקעות',           icon: TrendingUp, color: '#06b6d4' },
  crypto:      { label: 'קריפטו',            icon: Bitcoin,    color: '#f97316' },
};

const TYPE_ORDER: AccountType[] = ['checking', 'cash', 'credit_card', 'savings', 'investment', 'crypto'];

const BILLING_CYCLE_LABELS = { weekly: 'שבועי', monthly: 'חודשי', annual: 'שנתי' };

// ── Account Form ───────────────────────────────────────────────────────────────

interface AccountFormState {
  name: string;
  type: AccountType;
  institution: string;
  balance: string;
  currency: string;
  credit_limit: string;
  billing_date: string;
}

const EMPTY_ACCOUNT: AccountFormState = {
  name: '', type: 'checking', institution: '', balance: '0',
  currency: 'ILS', credit_limit: '', billing_date: '',
};

function AccountFormDialog({
  account,
  onClose,
  onSave,
}: {
  account?: Account;
  onClose: () => void;
  onSave: (data: AccountFormState) => void;
}) {
  const [form, setForm] = useState<AccountFormState>(
    account
      ? {
          name: account.name,
          type: account.type,
          institution: account.institution || '',
          balance: String(account.balance),
          currency: account.currency,
          credit_limit: account.credit_limit != null ? String(account.credit_limit) : '',
          billing_date: account.billing_date != null ? String(account.billing_date) : '',
        }
      : EMPTY_ACCOUNT,
  );

  const f = (k: keyof AccountFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(s => ({ ...s, [k]: e.target.value }));

  const inputStyle = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: '10px 12px',
    color: 'var(--fg)',
    width: '100%',
    fontSize: 14,
    outline: 'none',
  } as React.CSSProperties;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-sm rounded-2xl p-5 space-y-4" style={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base">{account ? 'עריכת חשבון' : 'חשבון חדש'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X size={16} /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--t2)' }}>שם החשבון</label>
            <input style={inputStyle} value={form.name} onChange={f('name')} placeholder="בנק לאומי, Max, ביטקוין..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--t2)' }}>סוג</label>
              <select style={inputStyle} value={form.type} onChange={f('type')}>
                {TYPE_ORDER.map(t => <option key={t} value={t}>{TYPE_META[t].label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--t2)' }}>מטבע</label>
              <select style={inputStyle} value={form.currency} onChange={f('currency')}>
                {['ILS', 'USD', 'EUR', 'GBP'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--t2)' }}>מוסד</label>
            <input style={inputStyle} value={form.institution} onChange={f('institution')} placeholder="לאומי, פועלים, Max..." />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--t2)' }}>יתרה נוכחית (₪)</label>
            <input style={inputStyle} type="number" value={form.balance} onChange={f('balance')} />
          </div>
          {form.type === 'credit_card' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--t2)' }}>מסגרת אשראי</label>
                <input style={inputStyle} type="number" value={form.credit_limit} onChange={f('credit_limit')} placeholder="10000" />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--t2)' }}>יום חיוב</label>
                <input style={inputStyle} type="number" min="1" max="31" value={form.billing_date} onChange={f('billing_date')} placeholder="10" />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onSave(form)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            style={{ background: '#2563EB', color: '#fff' }}
          >
            <Check size={15} /> שמור
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--t2)' }}>
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Subscription Form ──────────────────────────────────────────────────────────

function SubFormDialog({ accounts, onClose, onSave }: {
  accounts: Account[];
  onClose: () => void;
  onSave: (data: object) => void;
}) {
  const [form, setForm] = useState({
    name: '', amount: '', billing_cycle: 'monthly', next_billing_date: '', category: 'כלים ותוכנות', account_id: '',
  });
  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(s => ({ ...s, [k]: e.target.value }));
  const inputStyle = {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, padding: '10px 12px', color: 'var(--fg)', width: '100%', fontSize: 14, outline: 'none',
  } as React.CSSProperties;

  const creditCards = accounts.filter(a => a.type === 'credit_card');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-sm rounded-2xl p-5 space-y-4" style={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base">מנוי חדש</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><X size={16} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--t2)' }}>שם השירות</label>
            <input style={inputStyle} value={form.name} onChange={f('name')} placeholder="Netflix, Adobe, ביטוח..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--t2)' }}>סכום (₪)</label>
              <input style={inputStyle} type="number" value={form.amount} onChange={f('amount')} />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--t2)' }}>מחזוריות</label>
              <select style={inputStyle} value={form.billing_cycle} onChange={f('billing_cycle')}>
                <option value="monthly">חודשי</option>
                <option value="annual">שנתי</option>
                <option value="weekly">שבועי</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--t2)' }}>תאריך חיוב הבא</label>
            <input style={inputStyle} type="date" value={form.next_billing_date} onChange={f('next_billing_date')} />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--t2)' }}>קשור לכרטיס</label>
            <select style={inputStyle} value={form.account_id} onChange={f('account_id')}>
              <option value="">— ללא קישור —</option>
              {creditCards.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onSave({ ...form, amount: Number(form.amount) || 0, account_id: form.account_id || null })}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: '#2563EB', color: '#fff' }}
          >
            <Check size={15} /> שמור
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--t2)' }}>
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Account Card ───────────────────────────────────────────────────────────────

function AccountCard({ account, onEdit, onDelete }: {
  account: Account;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showSubs, setShowSubs] = useState(false);
  const meta = TYPE_META[account.type];
  const Icon = meta.icon;
  const isCreditCard = account.type === 'credit_card';
  const usedPct = isCreditCard && account.credit_limit
    ? Math.round((Math.abs(account.balance) / account.credit_limit) * 100)
    : 0;

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 14,
      }}
      className="p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${meta.color}18` }}
          >
            <Icon size={18} style={{ color: meta.color }} />
          </div>
          <div>
            <p className="font-semibold text-sm leading-tight">{account.name}</p>
            {account.institution && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--t2)' }}>{account.institution}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <p
              className="font-bold text-base leading-tight"
              style={{ color: account.balance < 0 ? '#f87171' : 'var(--fg)' }}
            >
              {formatCurrency(account.balance)}
            </p>
            {isCreditCard && account.upcoming_charges != null && account.upcoming_charges > 0 && (
              <p className="text-xs mt-0.5" style={{ color: '#f59e0b' }}>
                חיוב קרוב: {formatCurrency(account.upcoming_charges)}
              </p>
            )}
          </div>
          <div className="flex gap-1">
            <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <Pencil size={13} style={{ color: 'var(--t2)' }} />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <Trash2 size={13} style={{ color: '#f87171' }} />
            </button>
          </div>
        </div>
      </div>

      {/* Credit utilization bar */}
      {isCreditCard && account.credit_limit && account.credit_limit > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--t2)' }}>
            <span>ניצול אשראי</span>
            <span>{usedPct}% מ-{formatCurrency(account.credit_limit)}</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(usedPct, 100)}%`,
                background: usedPct > 80 ? '#f87171' : usedPct > 50 ? '#f59e0b' : '#22c55e',
              }}
            />
          </div>
        </div>
      )}

      {/* Upcoming subscriptions detail */}
      {isCreditCard && account.upcoming_subs && account.upcoming_subs.length > 0 && (
        <div className="mt-2">
          <button
            onClick={() => setShowSubs(s => !s)}
            className="flex items-center gap-1 text-xs transition-colors"
            style={{ color: 'var(--t2)' }}
          >
            {showSubs ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {account.upcoming_subs.length} מנויים מתקרבים
          </button>
          {showSubs && (
            <div className="mt-2 space-y-1">
              {account.upcoming_subs.map((s, i) => (
                <div key={i} className="flex justify-between text-xs px-2 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <span>{s.name}</span>
                  <span style={{ color: '#f59e0b' }}>{formatCurrency(s.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Subscriptions Section ──────────────────────────────────────────────────────

function SubscriptionsSection({ accounts }: { accounts: Account[] }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: subs = [], isLoading } = useQuery<Subscription[]>({
    queryKey: ['subscriptions'],
    queryFn: () => api.get('/subscriptions'),
  });

  const createSub = useMutation({
    mutationFn: (data: object) => api.post('/subscriptions', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subscriptions'] }); qc.invalidateQueries({ queryKey: ['accounts'] }); setShowForm(false); toast.success('מנוי נוצר'); },
    onError: () => toast.error('שגיאה ביצירת מנוי'),
  });

  const deleteSub = useMutation({
    mutationFn: (id: string) => api.delete(`/subscriptions/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subscriptions'] }); qc.invalidateQueries({ queryKey: ['accounts'] }); },
  });

  const activeSubs = subs.filter(s => s.is_active);
  const monthlyTotal = activeSubs.reduce((sum, s) => {
    if (s.billing_cycle === 'annual') return sum + s.amount / 12;
    if (s.billing_cycle === 'weekly') return sum + s.amount * 4.33;
    return sum + s.amount;
  }, 0);

  if (isLoading) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-bold text-sm">מנויים קבועים</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--t2)' }}>
            ₪{Math.round(monthlyTotal).toLocaleString('he-IL')}/חודש סה"כ ({activeSubs.length} מנויים)
          </p>
        </div>
        <Button size="sm" variant="outline" className="gap-1 text-xs h-8" onClick={() => setShowForm(true)}>
          <Plus size={13} /> מנוי
        </Button>
      </div>

      <div className="space-y-2">
        {activeSubs.map((sub) => (
          <div
            key={sub.id}
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 }}
            className="flex items-center justify-between px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium">{sub.name}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--t2)' }}>
                {BILLING_CYCLE_LABELS[sub.billing_cycle]}
                {sub.accounts && ` · ${sub.accounts.name}`}
                {' · '}{new Date(sub.next_billing_date).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm" style={{ color: '#f59e0b' }}>
                {formatCurrency(sub.amount)}
              </span>
              <button onClick={() => deleteSub.mutate(sub.id)} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
                <Trash2 size={13} style={{ color: '#f87171' }} />
              </button>
            </div>
          </div>
        ))}
        {activeSubs.length === 0 && (
          <p className="text-sm text-center py-6" style={{ color: 'var(--t2)' }}>
            אין מנויים — הוסף שירותים חוזרים כמו Netflix, Adobe, ביטוח...
          </p>
        )}
      </div>

      {showForm && <SubFormDialog accounts={accounts} onClose={() => setShowForm(false)} onSave={(d) => createSub.mutate(d)} />}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AccountsPage() {
  const qc = useQueryClient();
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  const { data, isLoading, refetch } = useQuery<AccountsResponse>({
    queryKey: ['accounts'],
    queryFn: () => api.get('/accounts'),
  });

  const createAccount = useMutation({
    mutationFn: (body: object) => api.post('/accounts', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounts'] }); setShowNewForm(false); toast.success('חשבון נוצר'); },
    onError: () => toast.error('שגיאה ביצירת חשבון'),
  });

  const updateAccount = useMutation({
    mutationFn: ({ id, ...body }: { id: string; [k: string]: unknown }) => api.put(`/accounts/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounts'] }); setEditAccount(null); toast.success('חשבון עודכן'); },
    onError: () => toast.error('שגיאה בעדכון חשבון'),
  });

  const deleteAccount = useMutation({
    mutationFn: (id: string) => api.delete(`/accounts/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['accounts'] }); toast.success('חשבון נמחק'); },
  });

  const handleSave = (form: AccountFormState) => {
    const body = {
      name: form.name,
      type: form.type,
      institution: form.institution || undefined,
      balance: Number(form.balance) || 0,
      currency: form.currency,
      credit_limit: form.credit_limit ? Number(form.credit_limit) : undefined,
      billing_date: form.billing_date ? Number(form.billing_date) : undefined,
    };
    if (editAccount) {
      updateAccount.mutate({ id: editAccount.id, ...body });
    } else {
      createAccount.mutate(body);
    }
  };

  const summary = data?.summary;
  const grouped = data?.grouped || {};
  const allAccounts = data?.accounts || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">חשבונות ונכסים</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--t2)' }}>שווי נטו + מעקב מנויים</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="p-2 rounded-xl hover:bg-white/10 transition-colors" title="רענן">
            <RefreshCw size={16} style={{ color: 'var(--t2)' }} />
          </button>
          <Button size="sm" className="gap-1.5 text-xs" onClick={() => setShowNewForm(true)}>
            <Plus size={14} /> חשבון
          </Button>
        </div>
      </div>

      {/* Net Worth Banner */}
      {summary && (
        <div
          className="rounded-2xl p-5"
          style={{
            background: 'linear-gradient(135deg, rgba(37,99,235,0.15), rgba(5,109,255,0.08))',
            border: '1px solid rgba(37,99,235,0.25)',
          }}
        >
          <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>שווי נטו</p>
          <p className="text-3xl font-extrabold tracking-tight">{formatCurrency(summary.net_worth)}</p>
          <div className="flex gap-4 mt-3">
            <div>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>נכסים</p>
              <p className="text-sm font-semibold text-green-400">{formatCurrency(summary.total_assets)}</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>התחייבויות</p>
              <p className="text-sm font-semibold text-red-400">−{formatCurrency(summary.total_liabilities)}</p>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      )}

      {/* Grouped account sections */}
      {!isLoading && TYPE_ORDER.map((type) => {
        const items = (grouped as Record<AccountType, Account[]>)[type];
        if (!items || items.length === 0) return null;
        const meta = TYPE_META[type];
        const Icon = meta.icon;
        const sectionTotal = items.reduce((s: number, a: Account) => s + Number(a.balance), 0);

        return (
          <div key={type}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Icon size={15} style={{ color: meta.color }} />
                <span className="text-sm font-semibold">{meta.label}</span>
              </div>
              <span className="text-sm font-semibold" style={{ color: sectionTotal < 0 ? '#f87171' : 'var(--fg)' }}>
                {formatCurrency(sectionTotal)}
              </span>
            </div>
            <div className="space-y-2">
              {items.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  onEdit={() => setEditAccount(account)}
                  onDelete={() => deleteAccount.mutate(account.id)}
                />
              ))}
            </div>
          </div>
        );
      })}

      {!isLoading && allAccounts.length === 0 && (
        <div
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16 }}
          className="py-10 text-center"
        >
          <Building2 size={32} className="mx-auto mb-3" style={{ color: 'var(--t3)' }} />
          <p className="text-sm font-medium mb-1">אין חשבונות עדיין</p>
          <p className="text-xs mb-4" style={{ color: 'var(--t2)' }}>הוסף את חשבון הבנק, כרטיסי האשראי, וההשקעות שלך</p>
          <Button size="sm" onClick={() => setShowNewForm(true)} className="gap-1.5">
            <Plus size={14} /> הוסף חשבון ראשון
          </Button>
        </div>
      )}

      {/* Subscriptions */}
      {!isLoading && <SubscriptionsSection accounts={allAccounts} />}

      {/* Dialogs */}
      {(showNewForm || editAccount) && (
        <AccountFormDialog
          account={editAccount || undefined}
          onClose={() => { setShowNewForm(false); setEditAccount(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
