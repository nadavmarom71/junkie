import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Download, ChevronDown, Pencil, X as XIcon, Search, SlidersHorizontal } from 'lucide-react';

interface Installment { amount: string; date: string; unknown: boolean; }
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import EmptyState from '@/components/shared/EmptyState';
import {
  useTransactions,
  useCreateTransaction,
  useCreatePersonalExpense,
  useDeleteTransaction,
  useDeletePersonalExpense,
  useUpdatePaymentStatus,
  useUpdateTransaction,
} from '@/hooks/useTransactions';
import { useClients, useCreateClient } from '@/hooks/useClients';
import { formatCurrency } from '@/lib/formatters';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { BusinessTransaction, PersonalExpense } from '@/types';

// ── Form Schemas ──────────────────────────────────────────────────────────────

const businessSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.coerce.number().positive('הסכום חייב להיות חיובי'),
  description: z.string().min(1, 'תיאור נדרש'),
  category: z.string().min(1, 'קטגוריה נדרשת'),
  date: z.string().min(1, 'תאריך נדרש'),
  notes: z.string().optional(),
});

const personalSchema = z.object({
  amount: z.coerce.number().positive('הסכום חייב להיות חיובי'),
  description: z.string().min(1, 'תיאור נדרש'),
  category: z.string().min(1, 'קטגוריה נדרשת'),
  date: z.string().min(1, 'תאריך נדרש'),
  notes: z.string().optional(),
});

type BusinessForm = z.infer<typeof businessSchema>;
type PersonalForm = z.infer<typeof personalSchema>;

const BUSINESS_CATEGORIES = ['ריטיינרים', 'פרויקטים', 'כלים ותוכנות', 'שיווק ופרסום', 'משרד ושכירות', 'נסיעות ותחבורה', 'ייעוץ ושירותים', 'ציוד וחומרה', 'משכורות ושכר', 'ביטוח', 'אחר'];
const PERSONAL_CATEGORIES = ['מזון ומשקאות', 'קניות ובגדים', 'בריאות ורפואה', 'בידור ופנאי', 'תחבורה', 'חשבונות ושירותים', 'חינוך', 'נסיעות', 'אחר'];

// ── Category Emoji Map ────────────────────────────────────────────────────────

const CATEGORY_EMOJI: Record<string, string> = {
  'ריטיינרים': '📋', 'פרויקטים': '🎯', 'כלים ותוכנות': '💻',
  'שיווק ופרסום': '📣', 'משרד ושכירות': '🏢', 'נסיעות ותחבורה': '🚗',
  'ייעוץ ושירותים': '🤝', 'ייעוץ ושירותים מקצועיים': '🤝',
  'ציוד וחומרה': '🔧', 'משכורות ושכר': '👥', 'ביטוח': '🛡️',
  'מזון ומשקאות': '🍔', 'קניות ובגדים': '🛍️', 'בריאות ורפואה': '💊',
  'בידור ופנאי': '🎮', 'תחבורה': '🚌', 'חשבונות ושירותים': '💡',
  'חינוך': '📚', 'נסיעות': '✈️', 'אחר': '💼',
};

function categoryEmoji(cat: string): string {
  return CATEGORY_EMOJI[cat] || '💼';
}

// ── Date Grouping ─────────────────────────────────────────────────────────────

function groupByDate(items: (BusinessTransaction | PersonalExpense)[]) {
  const map = new Map<string, (BusinessTransaction | PersonalExpense)[]>();
  items.forEach(tx => {
    if (!map.has(tx.date)) map.set(tx.date, []);
    map.get(tx.date)!.push(tx);
  });
  return Array.from(map.entries()); // order preserved from server (desc)
}

function formatGroupLabel(dateStr: string): string {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (dateStr === today) return 'היום';
  if (dateStr === yesterday) return 'אתמול';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('he-IL', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

// ── Month Options ─────────────────────────────────────────────────────────────

function buildMonthOptions() {
  const opts: { label: string; value: string }[] = [{ label: 'כל הזמן', value: 'all' }];
  const now = new Date();
  for (let i = 0; i < 18; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
    opts.push({ label, value });
  }
  return opts;
}
const MONTH_OPTIONS = buildMonthOptions();

// ── Summary Banner ────────────────────────────────────────────────────────────

function TransactionsSummaryBanner({
  totals, tab, month, onMonthChange,
}: {
  totals: { grossRevenue?: number; grossCollected?: number; myNetPocket?: number; outstanding?: number; expenses?: number; net?: number; total?: number; turnover?: number; cashflow?: number };
  tab: 'business' | 'personal';
  month: string;
  onMonthChange: (v: string) => void;
}) {
  const monthSelect = (
    <Select value={month} onValueChange={onMonthChange}>
      <SelectTrigger
        className="h-auto gap-1 text-sm font-semibold focus:ring-0 focus:ring-offset-0"
        style={{ border: 'none', background: 'transparent', padding: 0, boxShadow: 'none', color: 'var(--t2)' }}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {MONTH_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );

  if (tab === 'personal') {
    return (
      <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}>
        <div className="flex items-center gap-1 mb-2" style={{ color: 'var(--t2)' }}>
          <span className="text-sm font-semibold">סה״כ הוצאות אישיות —</span>
          {monthSelect}
        </div>
        <div className="text-2xl font-extrabold text-red-400">-{formatCurrency(totals.total ?? 0)}</div>
      </div>
    );
  }

  const grossRevenue   = totals.grossRevenue  ?? totals.turnover  ?? 0;
  const grossCollected = totals.grossCollected ?? totals.cashflow  ?? 0;
  const myNetPocket    = totals.myNetPocket    ?? grossCollected;
  const outstanding    = totals.outstanding    ?? Math.max(0, grossRevenue - grossCollected);
  const expenses       = totals.expenses       ?? 0;
  const net            = totals.net            ?? (myNetPocket - expenses);
  const partnerCut     = grossCollected - myNetPocket;

  return (
    <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}>
      <div className="flex items-center gap-1 mb-3" style={{ color: 'var(--t2)' }}>
        <span className="text-sm font-semibold">סיכום —</span>
        {monthSelect}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="text-center">
          <div className="text-xs mb-0.5" style={{ color: 'var(--t2)' }}>מחזור גולמי</div>
          <div className="text-lg font-extrabold text-green-400">+{formatCurrency(grossRevenue)}</div>
          {outstanding > 0 && <div className="text-xs text-amber-400 font-semibold">לגבייה: {formatCurrency(outstanding)}</div>}
        </div>
        <div className="text-center rounded-xl p-1.5" style={{ background: 'rgba(96,165,250,0.07)', border: '1px solid rgba(96,165,250,0.18)' }}>
          <div className="text-xs mb-0.5" style={{ color: 'var(--t2)' }}>תזרים שנגבה</div>
          <div className="text-lg font-extrabold text-blue-400">+{formatCurrency(grossCollected)}</div>
        </div>
        <div className="text-center rounded-xl p-1.5" style={{ background: 'rgba(168,85,247,0.07)', border: '1px solid rgba(168,85,247,0.18)' }}>
          <div className="text-xs mb-0.5" style={{ color: 'var(--t2)' }}>בכיס שלי</div>
          <div className="text-lg font-extrabold text-purple-400">+{formatCurrency(myNetPocket)}</div>
          {partnerCut > 0 && <div className="text-xs" style={{ color: 'var(--t2)' }}>שותף: -{formatCurrency(partnerCut)}</div>}
        </div>
        <div
          className="text-center rounded-xl p-1.5"
          style={{ background: net >= 0 ? 'rgba(0,196,140,0.08)' : 'rgba(244,63,94,0.08)', border: `1px solid ${net >= 0 ? 'rgba(0,196,140,0.2)' : 'rgba(244,63,94,0.2)'}` }}
        >
          <div className="text-xs mb-0.5" style={{ color: 'var(--t2)' }}>נטו</div>
          <div className={`text-lg font-extrabold ${net >= 0 ? 'text-green-400' : 'text-red-400'}`}>{net >= 0 ? '+' : ''}{formatCurrency(net)}</div>
          <div className="text-xs" style={{ color: 'var(--t2)' }}>-{formatCurrency(expenses)} הוצ׳</div>
        </div>
      </div>
    </div>
  );
}

// ── Business Transaction Form (unchanged) ─────────────────────────────────────

function BusinessTransactionForm({ onClose, defaultType }: { onClose: () => void; defaultType?: 'income' | 'expense' }) {
  const createMutation = useCreateTransaction();
  const { data: clients } = useClients();
  const createClientMutation = useCreateClient();
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending'>('paid');
  const [expectedDate, setExpectedDate] = useState('');
  const [partnerSplit, setPartnerSplit] = useState('');
  const [projectTotal, setProjectTotal] = useState('');
  const [installments, setInstallments] = useState<Installment[]>([]);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    resolver: zodResolver(businessSchema),
    defaultValues: { type: defaultType || 'income', date: new Date().toISOString().split('T')[0] },
  });

  const watchedType = watch('type');
  const watchedAmount = watch('amount');
  const isIncome = watchedType === 'income';
  const balance = projectTotal !== '' && watchedAmount ? Math.max(0, parseFloat(projectTotal) - Number(watchedAmount)) : 0;
  const scheduledTotal = installments.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);

  function addInstallment() {
    const remaining = Math.max(0, balance - scheduledTotal);
    setInstallments(prev => [...prev, { amount: remaining > 0 ? String(remaining) : '', date: '', unknown: false }]);
  }
  function removeInstallment(idx: number) { setInstallments(prev => prev.filter((_, i) => i !== idx)); }
  function updateInstallment(idx: number, patch: Partial<Installment>) {
    setInstallments(prev => prev.map((inst, i) => i === idx ? { ...inst, ...patch } : inst));
  }

  async function handleCreateNewClient() {
    if (!newClientName.trim()) return;
    try {
      const created = await createClientMutation.mutateAsync({ name: newClientName.trim() });
      setSelectedClientId(created.id);
      setShowNewClient(false);
      setNewClientName('');
      toast.success(`לקוח "${created.name}" נוצר!`);
    } catch (e) { toast.error(String(e)); }
  }

  async function onSubmit(values: Record<string, unknown>) {
    const typedValues = values as BusinessForm;
    try {
      const schedule = installments.length > 0
        ? installments.map(i => ({ amount: parseFloat(i.amount) || 0, date: i.unknown ? null : (i.date || null), unknown: i.unknown }))
        : null;
      const createData = {
        ...typedValues,
        client_id: selectedClientId || null,
        ...(isIncome && {
          payment_status: paymentStatus,
          expected_payment_date: paymentStatus === 'pending' && expectedDate ? expectedDate : (schedule ? (schedule.find(s => !s.unknown && s.date)?.date ?? null) : null),
          partner_split_pct: partnerSplit !== '' ? parseFloat(partnerSplit) : null,
          project_total: projectTotal !== '' ? parseFloat(projectTotal) : null,
          payment_schedule: schedule,
          expected_date_unknown: schedule ? schedule.every(s => s.unknown) : false,
        }),
      };
      await createMutation.mutateAsync(createData);
      toast.success('העסקה נוספה בהצלחה!');
      onClose();
    } catch (e) { toast.error(String(e)); }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">סוג</label>
          <Select onValueChange={(v: string) => setValue('type', v as 'income' | 'expense')} defaultValue={defaultType || 'income'}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="income">הכנסה</SelectItem>
              <SelectItem value="expense">הוצאה</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">סכום (₪)</label>
          <Input type="number" step="0.01" className="mt-1" {...register('amount')} />
          {errors.amount && <p className="text-xs text-red-500 mt-0.5">{errors.amount.message}</p>}
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">תיאור</label>
        <Input className="mt-1" placeholder="לדוגמה: פרויקט עיצוב עבור לקוח ABC" {...register('description')} />
        {errors.description && <p className="text-xs text-red-500 mt-0.5">{errors.description.message}</p>}
      </div>
      <div>
        <label className="text-sm font-medium">לקוח (אופציונלי)</label>
        {!showNewClient ? (
          <div className="flex gap-2 mt-1">
            <Select value={selectedClientId} onValueChange={(v: string) => setSelectedClientId(v === '_none' ? '' : v)}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="בחר לקוח..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">ללא לקוח</SelectItem>
                {clients?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="icon" className="flex-shrink-0" onClick={() => setShowNewClient(true)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex gap-2 mt-1">
            <Input className="flex-1" placeholder="שם לקוח חדש..." value={newClientName}
              onChange={e => setNewClientName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateNewClient(); } }} autoFocus />
            <Button type="button" size="sm" onClick={handleCreateNewClient} disabled={!newClientName.trim() || createClientMutation.isPending}>
              {createClientMutation.isPending ? '...' : 'צור'}
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => { setShowNewClient(false); setNewClientName(''); }}>
              <XIcon className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">קטגוריה</label>
          <Select onValueChange={(v: string) => setValue('category', v)}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="בחר קטגוריה" /></SelectTrigger>
            <SelectContent>
              {BUSINESS_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.category && <p className="text-xs text-red-500 mt-0.5">{errors.category.message}</p>}
        </div>
        <div>
          <label className="text-sm font-medium">תאריך</label>
          <Input type="date" className="mt-1" {...register('date')} />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">הערות (אופציונלי)</label>
        <Input className="mt-1" {...register('notes')} />
      </div>
      {isIncome && (
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">סטטוס תשלום</label>
            <div className="flex gap-2 mt-1">
              <button type="button" onClick={() => setPaymentStatus('paid')}
                className={`flex-1 text-sm px-3 py-2 rounded-lg font-semibold transition-colors ${paymentStatus === 'paid' ? 'bg-green-500/30 text-green-300 border border-green-500/50' : 'bg-white/5 text-white/50 hover:bg-white/10 border border-white/10'}`}>
                שולם ✅
              </button>
              <button type="button" onClick={() => setPaymentStatus('pending')}
                className={`flex-1 text-sm px-3 py-2 rounded-lg font-semibold transition-colors ${paymentStatus === 'pending' ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/50' : 'bg-white/5 text-white/50 hover:bg-white/10 border border-white/10'}`}>
                ממתין 🟡
              </button>
            </div>
          </div>
          {paymentStatus === 'pending' && (
            <div>
              <label className="text-sm font-medium">תאריך גביה צפוי</label>
              <Input type="date" className="mt-1" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} />
              <p className="text-xs text-white/40 mt-1">אם התאריך יעבור והסטטוס עדיין ״ממתין״, המערכת תסמן אוטומטית כ״באיחור״</p>
            </div>
          )}
        </div>
      )}
      {isIncome && (
        <div className="rounded-xl p-3 space-y-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--t2)' }}>פרטי פרויקט (אופציונלי)</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">% לשותף</label>
              <Input type="number" min="0" max="100" step="1" className="mt-1" placeholder="לדוגמה: 35"
                value={partnerSplit} onChange={e => setPartnerSplit(e.target.value)} />
              {partnerSplit !== '' && !isNaN(parseFloat(partnerSplit)) && (
                <p className="text-xs text-white/50 mt-0.5">חלקך: {100 - parseFloat(partnerSplit)}%</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">סה״כ פרויקט (₪)</label>
              <Input type="number" min="0" step="0.01" className="mt-1" placeholder="לדוגמה: 15000"
                value={projectTotal} onChange={e => setProjectTotal(e.target.value)} />
              {balance > 0 && <p className="text-xs text-yellow-400 mt-0.5 font-semibold">יתרה לגביה: ₪{balance.toLocaleString('he-IL')}</p>}
            </div>
          </div>
          {balance > 0 && (
            <div className="pt-1 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-yellow-400/80">תזמון תשלומים</p>
                {scheduledTotal > 0 && (
                  <p className={`text-xs font-semibold ${scheduledTotal >= balance ? 'text-green-400' : 'text-yellow-400'}`}>
                    {scheduledTotal >= balance ? '✓' : ''} מתוזמן: ₪{scheduledTotal.toLocaleString('he-IL')} / ₪{balance.toLocaleString('he-IL')}
                  </p>
                )}
              </div>
              {installments.map((inst, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input type="number" min="0" step="0.01" className="h-8 text-sm w-24 flex-shrink-0" placeholder="₪ סכום"
                    value={inst.amount} onChange={e => updateInstallment(idx, { amount: e.target.value })} />
                  {inst.unknown ? (
                    <label className="flex items-center gap-1.5 flex-1 cursor-pointer min-w-0">
                      <input type="checkbox" checked onChange={() => updateInstallment(idx, { unknown: false })} />
                      <span className="text-xs text-white/50 truncate">תאריך לא ידוע</span>
                    </label>
                  ) : (
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <Input type="date" className="h-8 text-sm flex-1 min-w-0" value={inst.date}
                        onChange={e => updateInstallment(idx, { date: e.target.value })} />
                      <label className="flex items-center gap-1 cursor-pointer flex-shrink-0">
                        <input type="checkbox" checked={false} onChange={() => updateInstallment(idx, { unknown: true, date: '' })} />
                        <span className="text-xs text-white/40">לא ידוע</span>
                      </label>
                    </div>
                  )}
                  <button type="button" onClick={() => removeInstallment(idx)} className="text-white/30 hover:text-red-400 flex-shrink-0">
                    <XIcon size={14} />
                  </button>
                </div>
              ))}
              <button type="button" onClick={addInstallment} className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1">
                + הוסף תשלום
              </button>
            </div>
          )}
        </div>
      )}
      <Button type="submit" className="w-full" disabled={createMutation.isPending}>
        {createMutation.isPending ? 'שומר...' : 'שמור עסקה'}
      </Button>
    </form>
  );
}

// ── Personal Expense Form (unchanged) ─────────────────────────────────────────

function PersonalExpenseForm({ onClose }: { onClose: () => void }) {
  const createMutation = useCreatePersonalExpense();
  const { register, handleSubmit, formState: { errors }, setValue } = useForm({
    resolver: zodResolver(personalSchema),
    defaultValues: { date: new Date().toISOString().split('T')[0] },
  });

  async function onSubmit(values: Record<string, unknown>) {
    const typedValues = values as PersonalForm;
    try {
      await createMutation.mutateAsync(typedValues);
      toast.success('הוצאה אישית נוספה!');
      onClose();
    } catch (e) { toast.error(String(e)); }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">סכום (₪)</label>
          <Input type="number" step="0.01" className="mt-1" {...register('amount')} />
          {errors.amount && <p className="text-xs text-red-500 mt-0.5">{errors.amount.message}</p>}
        </div>
        <div>
          <label className="text-sm font-medium">תאריך</label>
          <Input type="date" className="mt-1" {...register('date')} />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">תיאור</label>
        <Input className="mt-1" placeholder="לדוגמה: קניות בסופרסל" {...register('description')} />
        {errors.description && <p className="text-xs text-red-500 mt-0.5">{errors.description.message}</p>}
      </div>
      <div>
        <label className="text-sm font-medium">קטגוריה</label>
        <Select onValueChange={(v: string) => setValue('category', v)}>
          <SelectTrigger className="mt-1"><SelectValue placeholder="בחר קטגוריה" /></SelectTrigger>
          <SelectContent>
            {PERSONAL_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        {errors.category && <p className="text-xs text-red-500 mt-0.5">{errors.category.message}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={createMutation.isPending}>
        {createMutation.isPending ? 'שומר...' : 'שמור הוצאה'}
      </Button>
    </form>
  );
}

// ── Edit Transaction Dialog (unchanged) ───────────────────────────────────────

function EditTransactionDialog({ tx, onClose }: { tx: BusinessTransaction; onClose: () => void }) {
  const updateMutation = useUpdateTransaction();
  const { data: clients } = useClients();
  const createClientMutation = useCreateClient();
  const [selectedClientId, setSelectedClientId] = useState<string>(tx.client_id ?? '');
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const isIncome = tx.type === 'income';
  const [partnerSplit, setPartnerSplit] = useState(tx.partner_split_pct != null ? String(tx.partner_split_pct) : '');
  const [projectTotal, setProjectTotal] = useState(tx.project_total != null ? String(tx.project_total) : '');
  const [installments, setInstallments] = useState<Installment[]>(() => {
    if (tx.payment_schedule && tx.payment_schedule.length > 0) {
      return tx.payment_schedule.map(s => ({ amount: String(s.amount), date: s.date ?? '', unknown: s.unknown }));
    }
    if (tx.expected_payment_date || tx.expected_date_unknown) {
      const bal = tx.project_total ? Math.max(0, Number(tx.project_total) - Number(tx.amount)) : Number(tx.amount);
      return [{ amount: String(bal), date: tx.expected_payment_date ?? '', unknown: tx.expected_date_unknown ?? false }];
    }
    return [];
  });

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    resolver: zodResolver(businessSchema),
    defaultValues: { type: tx.type, amount: tx.amount, description: tx.description, category: tx.category, date: tx.date, notes: tx.notes ?? '' },
  });

  const watchedAmount = watch('amount');
  const balance = projectTotal !== '' && watchedAmount ? Math.max(0, parseFloat(projectTotal) - Number(watchedAmount)) : 0;
  const scheduledTotal = installments.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);

  function addInstallment() {
    const remaining = Math.max(0, balance - scheduledTotal);
    setInstallments(prev => [...prev, { amount: remaining > 0 ? String(remaining) : '', date: '', unknown: false }]);
  }
  function removeInstallment(idx: number) { setInstallments(prev => prev.filter((_, i) => i !== idx)); }
  function updateInstallment(idx: number, patch: Partial<Installment>) {
    setInstallments(prev => prev.map((inst, i) => i === idx ? { ...inst, ...patch } : inst));
  }

  async function handleCreateNewClient() {
    if (!newClientName.trim()) return;
    try {
      const created = await createClientMutation.mutateAsync({ name: newClientName.trim() });
      setSelectedClientId(created.id);
      setShowNewClient(false);
      setNewClientName('');
      toast.success(`לקוח "${created.name}" נוצר!`);
    } catch (e) { toast.error(String(e)); }
  }

  async function onSubmit(values: Record<string, unknown>) {
    const typed = values as BusinessForm;
    try {
      const schedule = installments.length > 0
        ? installments.map(i => ({ amount: parseFloat(i.amount) || 0, date: i.unknown ? null : (i.date || null), unknown: i.unknown }))
        : null;
      const updateData = {
        ...typed, client_id: selectedClientId || null,
        ...(isIncome && {
          partner_split_pct: partnerSplit !== '' ? parseFloat(partnerSplit) : null,
          project_total: projectTotal !== '' ? parseFloat(projectTotal) : null,
          payment_schedule: schedule,
          expected_payment_date: schedule ? (schedule.find(s => !s.unknown && s.date)?.date ?? null) : null,
          expected_date_unknown: schedule ? schedule.every(s => s.unknown) : false,
        }),
      };
      await updateMutation.mutateAsync({ id: tx.id, data: updateData });
      toast.success('העסקה עודכנה!');
      onClose();
    } catch (e) { toast.error(String(e)); }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">סכום (₪)</label>
          <Input type="number" step="0.01" className="mt-1" {...register('amount')} />
          {errors.amount && <p className="text-xs text-red-500 mt-0.5">{errors.amount.message}</p>}
        </div>
        <div>
          <label className="text-sm font-medium">תאריך</label>
          <Input type="date" className="mt-1" {...register('date')} />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">תיאור</label>
        <Input className="mt-1" {...register('description')} />
        {errors.description && <p className="text-xs text-red-500 mt-0.5">{errors.description.message}</p>}
      </div>
      <div>
        <label className="text-sm font-medium">לקוח (אופציונלי)</label>
        {!showNewClient ? (
          <div className="flex gap-2 mt-1">
            <Select value={selectedClientId} onValueChange={(v: string) => setSelectedClientId(v === '_none' ? '' : v)}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="בחר לקוח..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">ללא לקוח</SelectItem>
                {clients?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="icon" className="flex-shrink-0" onClick={() => setShowNewClient(true)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex gap-2 mt-1">
            <Input className="flex-1" placeholder="שם לקוח חדש..." value={newClientName}
              onChange={e => setNewClientName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateNewClient(); } }} autoFocus />
            <Button type="button" size="sm" onClick={handleCreateNewClient} disabled={!newClientName.trim() || createClientMutation.isPending}>
              {createClientMutation.isPending ? '...' : 'צור'}
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => { setShowNewClient(false); setNewClientName(''); }}>
              <XIcon className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">קטגוריה</label>
          <Select defaultValue={tx.category} onValueChange={(v) => setValue('category', v)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {BUSINESS_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">הערות</label>
          <Input className="mt-1" {...register('notes')} />
        </div>
      </div>
      {isIncome && (
        <div className="rounded-xl p-3 space-y-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--t2)' }}>פרטי פרויקט (אופציונלי)</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">% לשותף</label>
              <Input type="number" min="0" max="100" step="1" className="mt-1" placeholder="לדוגמה: 35"
                value={partnerSplit} onChange={e => setPartnerSplit(e.target.value)} />
              {partnerSplit !== '' && !isNaN(parseFloat(partnerSplit)) && (
                <p className="text-xs text-white/50 mt-0.5">חלקך: {100 - parseFloat(partnerSplit)}%</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">סה״כ פרויקט (₪)</label>
              <Input type="number" min="0" step="0.01" className="mt-1" placeholder="לדוגמה: 15000"
                value={projectTotal} onChange={e => setProjectTotal(e.target.value)} />
              {balance > 0 && <p className="text-xs text-yellow-400 mt-0.5 font-semibold">יתרה לגביה: ₪{balance.toLocaleString('he-IL')}</p>}
            </div>
          </div>
          {balance > 0 && (
            <div className="pt-1 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-yellow-400/80">תזמון תשלומים</p>
                {scheduledTotal > 0 && (
                  <p className={`text-xs font-semibold ${scheduledTotal >= balance ? 'text-green-400' : 'text-yellow-400'}`}>
                    {scheduledTotal >= balance ? '✓' : ''} מתוזמן: ₪{scheduledTotal.toLocaleString('he-IL')} / ₪{balance.toLocaleString('he-IL')}
                  </p>
                )}
              </div>
              {installments.map((inst, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input type="number" min="0" step="0.01" className="h-8 text-sm w-24 flex-shrink-0" placeholder="₪ סכום"
                    value={inst.amount} onChange={e => updateInstallment(idx, { amount: e.target.value })} />
                  {inst.unknown ? (
                    <label className="flex items-center gap-1.5 flex-1 cursor-pointer min-w-0">
                      <input type="checkbox" checked onChange={() => updateInstallment(idx, { unknown: false })} />
                      <span className="text-xs text-white/50 truncate">תאריך לא ידוע</span>
                    </label>
                  ) : (
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <Input type="date" className="h-8 text-sm flex-1 min-w-0" value={inst.date}
                        onChange={e => updateInstallment(idx, { date: e.target.value })} />
                      <label className="flex items-center gap-1 cursor-pointer flex-shrink-0">
                        <input type="checkbox" checked={false} onChange={() => updateInstallment(idx, { unknown: true, date: '' })} />
                        <span className="text-xs text-white/40">לא ידוע</span>
                      </label>
                    </div>
                  )}
                  <button type="button" onClick={() => removeInstallment(idx)} className="text-white/30 hover:text-red-400 flex-shrink-0">
                    <XIcon size={14} />
                  </button>
                </div>
              ))}
              <button type="button" onClick={addInstallment} className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1">
                + הוסף תשלום
              </button>
            </div>
          )}
        </div>
      )}
      <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
        {updateMutation.isPending ? 'שומר...' : 'שמור שינויים'}
      </Button>
    </form>
  );
}

// ── Add Linked Expense Dialog (unchanged) ─────────────────────────────────────

const linkedExpenseSchema = z.object({
  amount: z.coerce.number().positive('הסכום חייב להיות חיובי'),
  description: z.string().min(1, 'תיאור נדרש'),
  category: z.string().min(1, 'קטגוריה נדרשת'),
  date: z.string().min(1, 'תאריך נדרש'),
  notes: z.string().optional(),
});
type LinkedExpenseForm = z.infer<typeof linkedExpenseSchema>;

function AddLinkedExpenseDialog({ parentTx, onClose }: { parentTx: BusinessTransaction; onClose: () => void }) {
  const today = new Date().toISOString().split('T')[0];
  const createMutation = useCreateTransaction();
  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(linkedExpenseSchema),
    defaultValues: { date: today, category: BUSINESS_CATEGORIES[0] },
  });

  async function onSubmit(values: Record<string, unknown>) {
    const typed = values as LinkedExpenseForm;
    try {
      await createMutation.mutateAsync({ ...typed, type: 'expense', payment_status: 'paid', linked_transaction_id: parentTx.id });
      toast.success('הוצאה מקושרת נוספה!');
      onClose();
    } catch (e) { toast.error(String(e)); }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <p className="text-sm text-white/50">מקושרת ל: <span className="text-white/80 font-semibold">{parentTx.description}</span></p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">סכום (₪)</label>
          <Input type="number" step="0.01" className="mt-1" {...register('amount')} />
          {errors.amount && <p className="text-xs text-red-500 mt-0.5">{errors.amount.message}</p>}
        </div>
        <div>
          <label className="text-sm font-medium">תאריך</label>
          <Input type="date" className="mt-1" {...register('date')} />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">תיאור</label>
        <Input className="mt-1" {...register('description')} />
        {errors.description && <p className="text-xs text-red-500 mt-0.5">{errors.description.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">קטגוריה</label>
          <Select defaultValue={BUSINESS_CATEGORIES[0]} onValueChange={(v) => setValue('category', v)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {BUSINESS_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">הערות</label>
          <Input className="mt-1" {...register('notes')} />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={createMutation.isPending}>
        {createMutation.isPending ? 'שומר...' : 'הוסף הוצאה'}
      </Button>
    </form>
  );
}

// ── Transaction Row — new App Store–style design ───────────────────────────────

function TransactionRow({
  tx, tab, expanded, onToggle, onDelete,
}: {
  tx: BusinessTransaction | PersonalExpense;
  tab: 'business' | 'personal';
  expanded: boolean;
  onToggle: () => void;
  onDelete: (id: string) => void;
}) {
  const isBusiness = tab === 'business';
  const bTx = tx as BusinessTransaction;
  const isIncome = isBusiness && bTx.type === 'income';
  const isCollection = isBusiness && bTx.type === 'collection';
  const isPending = isBusiness && bTx.payment_status === 'pending';
  const isOverdue = isBusiness && bTx.payment_status === 'overdue';

  const amount = Number(tx.amount);
  const amountColor = isIncome ? (isPending ? '#EAB308' : '#22c55e') : isCollection ? '#F97316' : '#F43F5E';
  const amountPrefix = isIncome || isCollection ? '+' : '-';

  const hasBalance = isIncome && bTx.project_total != null && Number(bTx.project_total) > amount;
  const balanceAmount = hasBalance ? Number(bTx.project_total) - amount : 0;

  const updatePaymentStatus = useUpdatePaymentStatus();
  const [editOpen, setEditOpen] = useState(false);
  const [addLinkedOpen, setAddLinkedOpen] = useState(false);
  const deleteLinkedExpense = useDeleteTransaction();

  // Primary label: client name for business income, category otherwise
  const primaryLabel = isBusiness && bTx.clients?.name ? bTx.clients.name : tx.category;

  return (
    <>
      <div>
        {/* ── Collapsed row ── */}
        <button
          className="w-full flex items-center gap-3 px-4 py-3 text-start transition-colors active:bg-white/[0.04]"
          style={{ background: 'transparent' }}
          onClick={onToggle}
        >
          {/* Category emoji badge */}
          <div
            className="flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 text-lg select-none"
            style={{
              background: isIncome ? 'rgba(34,197,94,0.1)' : isCollection ? 'rgba(249,115,22,0.1)' : 'rgba(244,63,94,0.08)',
              border: `1px solid ${isIncome ? 'rgba(34,197,94,0.2)' : isCollection ? 'rgba(249,115,22,0.25)' : 'rgba(244,63,94,0.15)'}`,
            }}
          >
            {categoryEmoji(tx.category)}
          </div>

          {/* Center: primary label + description */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-snug">{primaryLabel}</p>
            <p className="text-xs truncate mt-0.5" style={{ color: 'var(--t2)' }}>{tx.description}</p>
          </div>

          {/* Amount + status sub-label */}
          <div className="flex flex-col items-end flex-shrink-0 ms-2">
            <span className="text-base font-bold tabular-nums" style={{ color: amountColor }}>
              {amountPrefix}₪{amount.toLocaleString('he-IL')}
            </span>
            {isPending && <span className="text-[10px] font-semibold text-amber-400/80 mt-0.5">ממתין</span>}
            {isOverdue && <span className="text-[10px] font-semibold text-red-400/80 mt-0.5">באיחור</span>}
            {isCollection && <span className="text-[10px] font-semibold mt-0.5" style={{ color: '#F97316' }}>גביה</span>}
            {hasBalance && <span className="text-[10px] font-semibold text-amber-400/70 mt-0.5">יתרה ₪{balanceAmount.toLocaleString('he-IL')}</span>}
          </div>

          {/* Chevron */}
          <ChevronDown
            size={13}
            className="flex-shrink-0 transition-transform duration-200"
            style={{ color: 'rgba(255,255,255,0.2)', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        </button>

        {/* ── Expanded panel ── */}
        {expanded && (
          <div
            className="px-4 pb-4 pt-3 space-y-3"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.015)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Meta chips */}
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {[
                { icon: '📅', text: new Date(tx.date + 'T12:00:00').toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' }) },
                { icon: '🏷️', text: tx.category },
                ...(isBusiness && bTx.clients?.name ? [{ icon: '👤', text: bTx.clients.name }] : []),
                ...(isBusiness && bTx.notes ? [{ icon: '📝', text: bTx.notes }] : []),
              ].map((chip, i) => (
                <span key={i} className="text-xs" style={{ color: 'var(--t2)' }}>
                  {chip.icon} {chip.text}
                </span>
              ))}
            </div>

            {/* Partner split / project info */}
            {isIncome && (bTx.partner_split_pct != null || bTx.project_total != null) && (
              <div className="rounded-xl p-2.5 space-y-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                {bTx.partner_split_pct != null && (
                  <div className="flex gap-4 flex-wrap text-xs" style={{ color: 'var(--t2)' }}>
                    <span>חלקי: <strong className="text-green-400">
                      ₪{(amount * (1 - bTx.partner_split_pct / 100)).toLocaleString('he-IL')} ({100 - bTx.partner_split_pct}%)
                    </strong></span>
                    <span>שותף: <strong className="text-white/50">
                      ₪{(amount * bTx.partner_split_pct / 100).toLocaleString('he-IL')} ({bTx.partner_split_pct}%)
                    </strong></span>
                  </div>
                )}
                {bTx.project_total != null && (
                  <div className="flex gap-4 flex-wrap text-xs" style={{ color: 'var(--t2)' }}>
                    <span>פרויקט: <strong className="text-white/70">₪{Number(bTx.project_total).toLocaleString('he-IL')} סה״כ</strong></span>
                    {Number(bTx.project_total) > amount && (
                      <span>יתרה: <strong className="text-amber-400">₪{(Number(bTx.project_total) - amount).toLocaleString('he-IL')}</strong></span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Payment status toggle — income only */}
            {isIncome && (
              <div className="flex gap-2 flex-wrap">
                {(['paid', 'pending', 'overdue'] as const).map(s => {
                  const cfg = {
                    paid:    { label: 'שולם ✅',   active: 'bg-green-500/25 text-green-300 border-green-500/40' },
                    pending: { label: 'ממתין 🟡', active: 'bg-yellow-500/25 text-yellow-300 border-yellow-500/40' },
                    overdue: { label: 'באיחור 🔴', active: 'bg-red-500/25 text-red-300 border-red-500/40' },
                  }[s];
                  const isActive = bTx.payment_status === s;
                  return (
                    <button key={s}
                      onClick={e => { e.stopPropagation(); updatePaymentStatus.mutate({ id: tx.id, payment_status: s }); }}
                      className={`text-xs px-2.5 py-1 rounded-lg font-semibold border transition-colors ${isActive ? cfg.active : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'}`}
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Linked expenses — income only */}
            {isIncome && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold" style={{ color: 'var(--t2)' }}>הוצאות מקושרות</span>
                  <button
                    onClick={e => { e.stopPropagation(); setAddLinkedOpen(true); }}
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium"
                  >
                    <Plus size={11} /> הוסף
                  </button>
                </div>
                {bTx.linked_expenses && bTx.linked_expenses.length > 0 ? (
                  <div className="space-y-1">
                    {bTx.linked_expenses.map(exp => (
                      <div key={exp.id}
                        className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
                        style={{ background: 'rgba(244,63,94,0.07)', border: '1px solid rgba(244,63,94,0.15)' }}
                      >
                        <span className="text-xs text-white/70 flex-1 min-w-0 truncate">{exp.description} · {exp.category}</span>
                        <span className="text-xs font-bold text-red-400 flex-shrink-0">-₪{Number(exp.amount).toLocaleString('he-IL')}</span>
                        <button onClick={e => { e.stopPropagation(); deleteLinkedExpense.mutate(exp.id); }} className="text-white/20 hover:text-red-400 flex-shrink-0">
                          <XIcon size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs italic" style={{ color: 'var(--t2)', opacity: 0.5 }}>אין הוצאות מקושרות</p>
                )}
              </div>
            )}

            {/* Edit / Delete */}
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={e => { e.stopPropagation(); onDelete(tx.id); }}
                className="text-xs text-red-400 hover:text-red-300 font-medium"
              >
                מחק
              </button>
              {isBusiness && (
                <button
                  onClick={e => { e.stopPropagation(); setEditOpen(true); }}
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium"
                >
                  <Pencil size={12} /> ערוך
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      {isBusiness && (
        <>
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent className="sm:max-w-md" dir="rtl">
              <DialogHeader><DialogTitle>ערוך עסקה</DialogTitle></DialogHeader>
              <EditTransactionDialog tx={bTx} onClose={() => setEditOpen(false)} />
            </DialogContent>
          </Dialog>
          <Dialog open={addLinkedOpen} onOpenChange={setAddLinkedOpen}>
            <DialogContent className="sm:max-w-md" dir="rtl">
              <DialogHeader><DialogTitle>הוסף הוצאה מקושרת</DialogTitle></DialogHeader>
              <AddLinkedExpenseDialog parentTx={bTx} onClose={() => setAddLinkedOpen(false)} />
            </DialogContent>
          </Dialog>
        </>
      )}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TransactionsPage() {
  const [searchParams] = useSearchParams();
  const tabParam    = searchParams.get('tab') as 'business' | 'personal' | null;
  const addParam    = searchParams.get('add');
  const catParam    = searchParams.get('category') || '';
  const typeParam   = (searchParams.get('type') || 'all') as 'income' | 'expense' | 'collection' | 'all';
  const monthParam  = searchParams.get('month') || 'all';

  const [tab, setTab]             = useState<'business' | 'personal'>(tabParam || 'business');
  const [search, setSearch]       = useState('');
  const [typeFilter, setTypeFilter] = useState<'income' | 'expense' | 'collection' | 'all'>(typeParam);
  const [month, setMonth]         = useState(monthParam);
  const [categoryFilter, setCategoryFilter] = useState(catParam);
  const [page, setPage]           = useState(1);
  const [createOpen, setCreateOpen] = useState(!!addParam);
  const [deleteId, setDeleteId]   = useState<string | null>(null);
  const [deleteTab, setDeleteTab] = useState<'business' | 'personal'>('business');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(!!(catParam || typeParam !== 'all' || monthParam !== 'all'));

  const activeMonth = month === 'all' ? undefined : month;
  const filters = {
    tab,
    search: search || undefined,
    type: typeFilter,
    month: activeMonth,
    category: categoryFilter || undefined,
    page,
  };
  const { data, isLoading } = useTransactions(filters);

  const deleteBusinessTx = useDeleteTransaction();
  const deletePersonalTx = useDeletePersonalExpense();

  function handleDelete(id: string) { setDeleteId(id); setDeleteTab(tab); }

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      if (deleteTab === 'business') await deleteBusinessTx.mutateAsync(deleteId);
      else await deletePersonalTx.mutateAsync(deleteId);
      toast.success('העסקה נמחקה');
    } catch (e) { toast.error(String(e)); }
    finally { setDeleteId(null); }
  }

  function handleTabChange(newTab: 'business' | 'personal') {
    setTab(newTab);
    setPage(1);
    setExpandedId(null);
    setCategoryFilter('');
    setTypeFilter('all');
  }

  const transactions = data?.data || [];
  const pagination   = data?.pagination;
  const groups       = groupByDate(transactions);

  const hasActiveFilters = !!search || typeFilter !== 'all' || month !== 'all' || !!categoryFilter;

  return (
    <div className="space-y-4 pb-8">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">עסקאות</h1>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              try {
                const res = await fetch(
                  `${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/transactions/export.csv?tab=${tab}`,
                  { credentials: 'include' }
                );
                if (!res.ok) throw new Error('Export failed');
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `transactions-${tab}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              } catch { /* ignore */ }
            }}
            className="inline-flex items-center gap-1.5 text-sm border border-white/20 rounded-lg px-3 py-1.5 hover:bg-white/5 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">ייצוא CSV</span>
          </button>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            הוסף
          </Button>
        </div>
      </div>

      {/* ── iOS-style segmented control ── */}
      <div
        className="flex p-1 rounded-2xl"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {(['business', 'personal'] as const).map(t => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
            style={tab === t ? {
              background: 'rgba(255,255,255,0.12)',
              color: '#fff',
              boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            } : {
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            {t === 'business' ? 'עסקי' : 'אישי'}
          </button>
        ))}
      </div>

      {/* ── Search + filter toggle ── */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search size={14} className="absolute end-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--t2)' }} />
          <Input
            placeholder="חיפוש..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="h-9 pe-9 text-sm"
          />
        </div>
        <button
          onClick={() => setFiltersOpen(o => !o)}
          className="flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-medium transition-colors"
          style={{
            background: hasActiveFilters ? 'rgba(37,99,235,0.2)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${hasActiveFilters ? 'rgba(37,99,235,0.4)' : 'rgba(255,255,255,0.1)'}`,
            color: hasActiveFilters ? '#6aa3ff' : 'rgba(255,255,255,0.6)',
          }}
        >
          <SlidersHorizontal size={13} />
          <span className="hidden sm:inline">סינון</span>
          {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
        </button>
      </div>

      {/* ── Expanded filters ── */}
      {filtersOpen && (
        <div className="rounded-xl p-3 space-y-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="grid grid-cols-2 gap-2">
            {/* Month */}
            <div>
              <label className="text-xs text-white/50 mb-1 block">חודש</label>
              <Select value={month} onValueChange={v => { setMonth(v); setPage(1); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTH_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {/* Type filter — business only */}
            {tab === 'business' && (
              <div>
                <label className="text-xs text-white/50 mb-1 block">סוג</label>
                <Select value={typeFilter} onValueChange={v => { setTypeFilter(v as typeof typeFilter); setPage(1); }}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">הכל</SelectItem>
                    <SelectItem value="income">הכנסות</SelectItem>
                    <SelectItem value="expense">הוצאות</SelectItem>
                    <SelectItem value="collection">גביה</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          {/* Category filter (from dashboard click) */}
          {categoryFilter && (
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--t2)' }}>קטגוריה:</span>
              <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/25 px-2 py-0.5 rounded-full">
                {categoryFilter}
              </span>
              <button onClick={() => setCategoryFilter('')} className="text-white/30 hover:text-white/60">
                <XIcon size={12} />
              </button>
            </div>
          )}
          {hasActiveFilters && (
            <button
              onClick={() => { setSearch(''); setTypeFilter('all'); setMonth('all'); setCategoryFilter(''); setPage(1); }}
              className="text-xs text-red-400 hover:text-red-300 font-medium"
            >
              נקה הכל
            </button>
          )}
        </div>
      )}

      {/* ── Summary banner ── */}
      {!isLoading && data?.totals && (
        <TransactionsSummaryBanner
          totals={data.totals}
          tab={tab}
          month={month}
          onMonthChange={v => { setMonth(v); setPage(1); }}
        />
      )}

      {/* ── Transaction list ── */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-32 rounded" />
                <Skeleton className="h-3 w-48 rounded" />
              </div>
              <Skeleton className="h-4 w-16 rounded" />
            </div>
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <EmptyState icon="📋" title="אין עסקאות" description="הוסף עסקה חדשה לתחילת המעקב" />
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {groups.map(([dateStr, items], groupIdx) => (
            <div key={dateStr}>
              {/* Date group header */}
              <div
                className="flex items-center justify-between px-4 py-2"
                style={{
                  background: 'rgba(255,255,255,0.025)',
                  borderTop: groupIdx > 0 ? '1px solid rgba(255,255,255,0.06)' : undefined,
                }}
              >
                <span className="text-xs font-semibold" style={{ color: 'var(--t2)' }}>
                  {formatGroupLabel(dateStr)}
                </span>
                <span className="text-xs" style={{ color: 'var(--t2)', opacity: 0.6 }}>
                  {items.length} עסקאות
                </span>
              </div>

              {/* Rows in this date group */}
              <div>
                {items.map((tx, rowIdx) => (
                  <div
                    key={tx.id}
                    style={{ borderTop: rowIdx > 0 ? '1px solid rgba(255,255,255,0.05)' : undefined }}
                  >
                    <TransactionRow
                      tx={tx}
                      tab={tab}
                      expanded={expandedId === tx.id}
                      onToggle={() => setExpandedId(expandedId === tx.id ? null : tx.id)}
                      onDelete={handleDelete}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Pagination */}
          {(pagination?.pages || 0) > 1 && (
            <div className="flex gap-2 justify-center p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>הקודם</Button>
              <span className="text-sm self-center" style={{ color: 'var(--t2)' }}>{page} / {pagination?.pages}</span>
              <Button variant="outline" size="sm" disabled={page === pagination?.pages} onClick={() => setPage(p => p + 1)}>הבא</Button>
            </div>
          )}
        </div>
      )}

      {/* ── Create Dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{tab === 'personal' ? 'הוסף הוצאה אישית' : 'הוסף עסקה עסקית'}</DialogTitle>
          </DialogHeader>
          {tab === 'personal' ? (
            <PersonalExpenseForm onClose={() => setCreateOpen(false)} />
          ) : (
            <BusinessTransactionForm onClose={() => setCreateOpen(false)} defaultType={addParam === 'expense' ? 'expense' : 'income'} />
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <ConfirmDialog
        open={!!deleteId}
        title="מחיקת עסקה"
        description="האם אתה בטוח? פעולה זו אינה הפיכה."
        confirmLabel="מחק"
        onConfirm={confirmDelete}
        onClose={() => setDeleteId(null)}
      />
    </div>
  );
}
