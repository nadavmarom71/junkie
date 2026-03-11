import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Download, ChevronDown, Pencil, X as XIcon } from 'lucide-react';

interface Installment { amount: string; date: string; unknown: boolean; }
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
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
import { formatCurrency, formatDateShort } from '@/lib/formatters';
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

const PAYMENT_STATUS_MAP = {
  paid:    { bg: 'bg-green-500/25',  text: 'text-green-300',  border: 'border border-green-500/40',  label: 'שולם ✓' },
  pending: { bg: 'bg-yellow-500/25', text: 'text-yellow-200', border: 'border border-yellow-500/40', label: 'ממתין' },
  overdue: { bg: 'bg-red-500/30',    text: 'text-red-300',    border: 'border border-red-500/50',    label: 'באיחור ⚠' },
} as const;

// ── Month Options ─────────────────────────────────────────────────────────────

function buildMonthOptions() {
  // "all" is a sentinel — Radix UI SelectItem cannot have value=""
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

// ── Transactions Summary Banner ───────────────────────────────────────────────

function TransactionsSummaryBanner({
  totals,
  tab,
  month,
  onMonthChange,
}: {
  totals: { income?: number; expenses?: number; net?: number; total?: number };
  tab: 'business' | 'personal';
  month: string;
  onMonthChange: (v: string) => void;
}) {
  const monthSelect = (
    <Select value={month} onValueChange={onMonthChange}>
      <SelectTrigger
        className="h-auto gap-1 text-lg font-bold focus:ring-0 focus:ring-offset-0"
        style={{ border: 'none', background: 'transparent', padding: 0, boxShadow: 'none', color: 'var(--t2)' }}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {MONTH_OPTIONS.map(o => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (tab === 'personal') {
    return (
      <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}>
        <div className="flex items-center gap-1 mb-2" style={{ color: 'var(--t2)' }}>
          <span className="text-lg font-bold">סה״כ הוצאות אישיות —</span>
          {monthSelect}
        </div>
        <div className="text-2xl font-extrabold text-red-400">-{formatCurrency(totals.total ?? 0)}</div>
      </div>
    );
  }

  const income   = totals.income   ?? 0;
  const expenses = totals.expenses ?? 0;
  const net      = totals.net      ?? (income - expenses);

  return (
    <div
      className="rounded-2xl p-4 md:p-5"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}
    >
      <div className="flex items-center gap-1 mb-4" style={{ color: 'var(--t2)' }}>
        <span className="text-lg font-bold">סיכום פיננסי —</span>
        {monthSelect}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <div className="text-sm mb-1 font-medium" style={{ color: 'var(--t2)' }}>הכנסות</div>
          <div className="text-2xl font-extrabold text-green-400">+{formatCurrency(income)}</div>
        </div>
        <div className="text-center">
          <div className="text-sm mb-1 font-medium" style={{ color: 'var(--t2)' }}>הוצאות</div>
          <div className="text-2xl font-extrabold text-red-400">-{formatCurrency(expenses)}</div>
        </div>
        <div
          className="text-center rounded-xl p-2"
          style={{
            background: net >= 0 ? 'rgba(0,196,140,0.08)' : 'rgba(244,63,94,0.08)',
            border: `1px solid ${net >= 0 ? 'rgba(0,196,140,0.2)' : 'rgba(244,63,94,0.2)'}`,
          }}
        >
          <div className="text-sm mb-1 font-bold" style={{ color: 'var(--t2)' }}>נטו</div>
          <div className={`text-2xl font-extrabold ${net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {net >= 0 ? '+' : ''}{formatCurrency(net)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Payment Status Badge ───────────────────────────────────────────────────────

function PaymentStatusBadge({ status }: { status?: string }) {
  if (!status) return null;
  const s = PAYMENT_STATUS_MAP[status as keyof typeof PAYMENT_STATUS_MAP];
  if (!s) return null;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${s.bg} ${s.text} ${s.border}`}>
      {s.label}
    </span>
  );
}

// ── Transaction Form ──────────────────────────────────────────────────────────

function BusinessTransactionForm({ onClose, defaultType }: { onClose: () => void; defaultType?: 'income' | 'expense' }) {
  const createMutation = useCreateTransaction();
  const { data: clients } = useClients();
  const createClientMutation = useCreateClient();
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending'>('paid');
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
  const balance = projectTotal !== '' && watchedAmount
    ? Math.max(0, parseFloat(projectTotal) - Number(watchedAmount))
    : 0;
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
    } catch (e) {
      toast.error(String(e));
    }
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
        ...(isIncome && { payment_status: paymentStatus }),
        ...(isIncome && {
          partner_split_pct: partnerSplit !== '' ? parseFloat(partnerSplit) : null,
          project_total: projectTotal !== '' ? parseFloat(projectTotal) : null,
          payment_schedule: schedule,
          expected_payment_date: schedule ? (schedule.find(s => !s.unknown && s.date)?.date ?? null) : null,
          expected_date_unknown: schedule ? schedule.every(s => s.unknown) : false,
        }),
      };
      await createMutation.mutateAsync(createData);
      toast.success('העסקה נוספה בהצלחה!');
      onClose();
    } catch (e) {
      toast.error(String(e));
    }
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

      {/* Client selector */}
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
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="flex-shrink-0"
              onClick={() => setShowNewClient(true)}
              title="הוסף לקוח חדש"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex gap-2 mt-1">
            <Input
              className="flex-1"
              placeholder="שם לקוח חדש..."
              value={newClientName}
              onChange={e => setNewClientName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateNewClient(); } }}
              autoFocus
            />
            <Button
              type="button"
              size="sm"
              onClick={handleCreateNewClient}
              disabled={!newClientName.trim() || createClientMutation.isPending}
            >
              {createClientMutation.isPending ? '...' : 'צור'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => { setShowNewClient(false); setNewClientName(''); }}
            >
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

      {/* Payment status — income only */}
      {isIncome && (
        <div>
          <label className="text-sm font-medium">סטטוס תשלום</label>
          <div className="flex gap-2 mt-1">
            <button
              type="button"
              onClick={() => setPaymentStatus('paid')}
              className={`flex-1 text-sm px-3 py-2 rounded-lg font-semibold transition-colors ${paymentStatus === 'paid' ? 'bg-green-500/30 text-green-300 border border-green-500/50' : 'bg-white/5 text-white/50 hover:bg-white/10 border border-white/10'}`}
            >
              שולם ✅
            </button>
            <button
              type="button"
              onClick={() => setPaymentStatus('pending')}
              className={`flex-1 text-sm px-3 py-2 rounded-lg font-semibold transition-colors ${paymentStatus === 'pending' ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/50' : 'bg-white/5 text-white/50 hover:bg-white/10 border border-white/10'}`}
            >
              ממתין 🟡
            </button>
          </div>
        </div>
      )}

      {/* Partial payment section — income only */}
      {isIncome && (
        <div className="rounded-xl p-3 space-y-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--t2)' }}>פרטי פרויקט (אופציונלי)</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">% לשותף</label>
              <Input
                type="number" min="0" max="100" step="1"
                className="mt-1"
                placeholder="לדוגמה: 35"
                value={partnerSplit}
                onChange={e => setPartnerSplit(e.target.value)}
              />
              {partnerSplit !== '' && !isNaN(parseFloat(partnerSplit)) && (
                <p className="text-xs text-white/50 mt-0.5">חלקך: {100 - parseFloat(partnerSplit)}%</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">סה״כ פרויקט (₪)</label>
              <Input
                type="number" min="0" step="0.01"
                className="mt-1"
                placeholder="לדוגמה: 15000"
                value={projectTotal}
                onChange={e => setProjectTotal(e.target.value)}
              />
              {balance > 0 && (
                <p className="text-xs text-yellow-400 mt-0.5 font-semibold">
                  יתרה לגביה: ₪{balance.toLocaleString('he-IL')}
                </p>
              )}
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
                  <Input
                    type="number" min="0" step="0.01"
                    className="h-8 text-sm w-24 flex-shrink-0"
                    placeholder="₪ סכום"
                    value={inst.amount}
                    onChange={e => updateInstallment(idx, { amount: e.target.value })}
                  />
                  {inst.unknown ? (
                    <label className="flex items-center gap-1.5 flex-1 cursor-pointer min-w-0">
                      <input type="checkbox" checked onChange={() => updateInstallment(idx, { unknown: false })} />
                      <span className="text-xs text-white/50 truncate">תאריך לא ידוע</span>
                    </label>
                  ) : (
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <Input
                        type="date"
                        className="h-8 text-sm flex-1 min-w-0"
                        value={inst.date}
                        onChange={e => updateInstallment(idx, { date: e.target.value })}
                      />
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
              <button
                type="button"
                onClick={addInstallment}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
              >
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
    } catch (e) {
      toast.error(String(e));
    }
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

// ── Edit Transaction Dialog ───────────────────────────────────────────────────

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

  // Init installments from payment_schedule, or legacy single-date field
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
    defaultValues: {
      type: tx.type,
      amount: tx.amount,
      description: tx.description,
      category: tx.category,
      date: tx.date,
      notes: tx.notes ?? '',
    },
  });

  const watchedAmount = watch('amount');
  const balance = projectTotal !== '' && watchedAmount
    ? Math.max(0, parseFloat(projectTotal) - Number(watchedAmount))
    : 0;
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
    } catch (e) {
      toast.error(String(e));
    }
  }

  async function onSubmit(values: Record<string, unknown>) {
    const typed = values as BusinessForm;
    try {
      const schedule = installments.length > 0
        ? installments.map(i => ({ amount: parseFloat(i.amount) || 0, date: i.unknown ? null : (i.date || null), unknown: i.unknown }))
        : null;
      const updateData = {
        ...typed,
        client_id: selectedClientId || null,
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
    } catch (e) {
      toast.error(String(e));
    }
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

      {/* Client selector */}
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
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="flex-shrink-0"
              onClick={() => setShowNewClient(true)}
              title="הוסף לקוח חדש"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex gap-2 mt-1">
            <Input
              className="flex-1"
              placeholder="שם לקוח חדש..."
              value={newClientName}
              onChange={e => setNewClientName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateNewClient(); } }}
              autoFocus
            />
            <Button
              type="button"
              size="sm"
              onClick={handleCreateNewClient}
              disabled={!newClientName.trim() || createClientMutation.isPending}
            >
              {createClientMutation.isPending ? '...' : 'צור'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => { setShowNewClient(false); setNewClientName(''); }}
            >
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
              <Input
                type="number" min="0" max="100" step="1"
                className="mt-1"
                placeholder="לדוגמה: 35"
                value={partnerSplit}
                onChange={e => setPartnerSplit(e.target.value)}
              />
              {partnerSplit !== '' && !isNaN(parseFloat(partnerSplit)) && (
                <p className="text-xs text-white/50 mt-0.5">חלקך: {100 - parseFloat(partnerSplit)}%</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium">סה״כ פרויקט (₪)</label>
              <Input
                type="number" min="0" step="0.01"
                className="mt-1"
                placeholder="לדוגמה: 15000"
                value={projectTotal}
                onChange={e => setProjectTotal(e.target.value)}
              />
              {balance > 0 && (
                <p className="text-xs text-yellow-400 mt-0.5 font-semibold">
                  יתרה לגביה: ₪{balance.toLocaleString('he-IL')}
                </p>
              )}
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
                  <Input
                    type="number" min="0" step="0.01"
                    className="h-8 text-sm w-24 flex-shrink-0"
                    placeholder="₪ סכום"
                    value={inst.amount}
                    onChange={e => updateInstallment(idx, { amount: e.target.value })}
                  />
                  {inst.unknown ? (
                    <label className="flex items-center gap-1.5 flex-1 cursor-pointer min-w-0">
                      <input type="checkbox" checked onChange={() => updateInstallment(idx, { unknown: false })} />
                      <span className="text-xs text-white/50 truncate">תאריך לא ידוע</span>
                    </label>
                  ) : (
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <Input
                        type="date"
                        className="h-8 text-sm flex-1 min-w-0"
                        value={inst.date}
                        onChange={e => updateInstallment(idx, { date: e.target.value })}
                      />
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
              <button
                type="button"
                onClick={addInstallment}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
              >
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

// ── Personal Transaction Card (mobile + desktop for personal tab) ──────────────────────────────────────────────────

function TransactionCard({ tx, tab, onDelete }: { tx: BusinessTransaction | PersonalExpense; tab: string; onDelete: (id: string) => void }) {
  const isBusiness = tab === 'business';
  const bTx = tx as BusinessTransaction;
  const isIncome = isBusiness && bTx.type === 'income';

  return (
    <div className="px-4 py-3 border-b border-white/10 last:border-0">
      {/* Top row: type badge + amount */}
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-lg font-bold ${isIncome ? 'text-green-400' : 'text-red-400'}`}>
          {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
        </span>
        {isBusiness ? (
          <Badge variant={isIncome ? 'default' : 'destructive'} className="text-sm px-3">
            {isIncome ? 'הכנסה' : 'הוצאה'}
          </Badge>
        ) : (
          <Badge variant="destructive" className="text-sm px-3">הוצאה אישית</Badge>
        )}
      </div>
      {/* Description */}
      <p className="text-base text-white font-medium truncate mb-1.5">{tx.description}</p>
      {/* Bottom row: category + date + delete */}
      <div className="flex items-center justify-between">
        <button onClick={() => onDelete(tx.id)} className="text-sm text-red-500 hover:text-red-400">
          מחק
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/50">{formatDateShort(tx.date)}</span>
          <Badge variant="outline" className="text-sm">{tx.category}</Badge>
        </div>
      </div>
    </div>
  );
}

// ── Expandable Business Transaction Card ──────────────────────────────────────

// ── Linked Expense Mini Form ───────────────────────────────────────────────────

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
      await createMutation.mutateAsync({
        ...typed,
        type: 'expense',
        payment_status: 'paid',
        linked_transaction_id: parentTx.id,
      });
      toast.success('הוצאה מקושרת נוספה!');
      onClose();
    } catch (e) {
      toast.error(String(e));
    }
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

function ExpandableTransactionCard({
  tx,
  expanded,
  onToggle,
  onDelete,
}: {
  tx: BusinessTransaction;
  expanded: boolean;
  onToggle: () => void;
  onDelete: (id: string) => void;
}) {
  const updatePaymentStatus = useUpdatePaymentStatus();
  const isIncome = tx.type === 'income';
  const [editOpen, setEditOpen] = useState(false);
  const [addLinkedOpen, setAddLinkedOpen] = useState(false);
  const deleteLinkedExpense = useDeleteTransaction();

  return (
    <>
      <div
        className="rounded-xl overflow-hidden mb-2 cursor-pointer"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
        onClick={onToggle}
      >
        {/* Collapsed row — explicit RTL: text on RIGHT, controls on LEFT */}
        <div className="flex items-center justify-between px-4 py-3" dir="rtl">
          {/* RIGHT side (first in RTL flex): description + client + date */}
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-sm font-medium truncate">{tx.description}</span>
            {tx.clients?.name && (
              <span className="text-xs text-white/40 truncate hidden sm:block">— {tx.clients.name}</span>
            )}
            <span className="text-sm font-semibold text-white/50 flex-shrink-0">{formatDateShort(tx.date)}</span>
          </div>
          {/* LEFT side (second in RTL flex): chevron → type → status → amount (LTR order within group) */}
          <div className="flex items-center gap-2 flex-shrink-0" dir="ltr">
            <ChevronDown className={`h-4 w-4 text-white/30 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
              tx.type === 'income'
                ? 'bg-green-500/15 text-green-400 border border-green-500/25'
                : 'bg-red-500/15 text-red-400 border border-red-500/25'
            }`}>
              {tx.type === 'income' ? 'הכנסה' : 'הוצאה'}
            </span>
            <PaymentStatusBadge status={tx.payment_status} />
            {/* Show green paid + yellow remaining when partial payment exists */}
            {isIncome && tx.project_total != null && Number(tx.project_total) > Number(tx.amount) ? (
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold text-green-400">
                  +₪{Number(tx.amount).toLocaleString('he-IL')}
                </span>
                <span className="text-xs font-bold text-yellow-400 bg-yellow-500/10 border border-yellow-500/25 px-1.5 py-0.5 rounded-full">
                  +₪{(Number(tx.project_total) - Number(tx.amount)).toLocaleString('he-IL')} יתרה
                </span>
              </div>
            ) : (
              <span className={`text-base font-bold ${isIncome ? 'text-green-400' : 'text-red-400'}`}>
                {isIncome ? '+' : '-'}₪{Number(tx.amount).toLocaleString('he-IL')}
              </span>
            )}
          </div>
        </div>

        {/* Expanded panel */}
        {expanded && (
          <div
            className="px-4 pb-4 pt-1"
            style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Category + notes */}
            <div className="flex flex-wrap gap-2 items-center mb-3">
              <span className="text-xs text-white/50">קטגוריה:</span>
              <span className="text-sm">{tx.category}</span>
              {tx.notes && (
                <>
                  <span className="text-xs text-white/50 mr-2">הערות:</span>
                  <span className="text-sm">{tx.notes}</span>
                </>
              )}
            </div>

            {/* Partner split / project tracking info */}
            {isIncome && (tx.partner_split_pct != null || tx.project_total != null) && (
              <div className="mb-3 rounded-lg p-2.5 space-y-1.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {tx.partner_split_pct != null && (
                  <div className="flex items-center gap-3 text-sm flex-wrap">
                    <span className="text-white/50">חלקי:</span>
                    <span className="text-green-300 font-semibold">
                      ₪{(Number(tx.amount) * (1 - tx.partner_split_pct / 100)).toLocaleString('he-IL')}
                      <span className="text-white/40 font-normal"> ({100 - tx.partner_split_pct}%)</span>
                    </span>
                    <span className="text-white/20">|</span>
                    <span className="text-white/50">שותף:</span>
                    <span className="text-white/60">
                      ₪{(Number(tx.amount) * tx.partner_split_pct / 100).toLocaleString('he-IL')}
                      <span className="text-white/40"> ({tx.partner_split_pct}%)</span>
                    </span>
                  </div>
                )}
                {tx.project_total != null && (
                  <div className="flex items-center gap-3 text-sm flex-wrap">
                    <span className="text-white/50">פרויקט:</span>
                    <span className="text-white/70">₪{Number(tx.project_total).toLocaleString('he-IL')} סה״כ</span>
                    {Number(tx.project_total) > Number(tx.amount) && (
                      <>
                        <span className="text-white/20">|</span>
                        <span className="text-yellow-400 font-semibold">
                          יתרה לגביה: ₪{(Number(tx.project_total) - Number(tx.amount)).toLocaleString('he-IL')}
                        </span>
                      </>
                    )}
                  </div>
                )}
                {/* Expected payment date */}
                {tx.project_total != null && Number(tx.project_total) > Number(tx.amount) && (
                  <div className="flex items-center gap-2 text-xs pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <span className="text-white/40">תאריך צפוי:</span>
                    {tx.expected_date_unknown ? (
                      <span className="text-yellow-400/70 font-medium">תאריך לא ידוע</span>
                    ) : tx.expected_payment_date ? (
                      <span className="text-white/60 font-medium">{tx.expected_payment_date}</span>
                    ) : (
                      <span className="text-white/30 italic">לא הוגדר</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Payment status toggle (only for income) */}
            {isIncome && (
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={(e) => { e.stopPropagation(); updatePaymentStatus.mutate({ id: tx.id, payment_status: 'paid' }); }}
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${tx.payment_status === 'paid' ? 'bg-green-500/30 text-green-300 border border-green-500/50' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                >
                  שולם ✅
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); updatePaymentStatus.mutate({ id: tx.id, payment_status: 'pending' }); }}
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${tx.payment_status === 'pending' ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/50' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                >
                  ממתין 🟡
                </button>
              </div>
            )}
            {/* Linked Expenses Section (income only) */}
            {isIncome && (
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-white/50">הוצאות מקושרות</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setAddLinkedOpen(true); }}
                    className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    הוסף הוצאה
                  </button>
                </div>
                {tx.linked_expenses && tx.linked_expenses.length > 0 ? (
                  <div className="space-y-1.5">
                    {tx.linked_expenses.map(exp => (
                      <div
                        key={exp.id}
                        className="flex items-center justify-between rounded-lg px-2.5 py-1.5"
                        style={{ background: 'rgba(244,63,94,0.07)', border: '1px solid rgba(244,63,94,0.15)' }}
                      >
                        <div className="min-w-0">
                          <span className="text-xs font-medium text-white/80 truncate">{exp.description}</span>
                          <span className="text-xs text-white/40 mr-2">{exp.category}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs font-bold text-red-400">-₪{Number(exp.amount).toLocaleString('he-IL')}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteLinkedExpense.mutate(exp.id); }}
                            className="text-white/20 hover:text-red-400 transition-colors"
                          >
                            <XIcon className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-end pt-0.5">
                      <span className="text-xs text-white/40">
                        סה״כ הוצאות: <span className="text-red-400 font-semibold">
                          ₪{tx.linked_expenses.reduce((s, e) => s + Number(e.amount), 0).toLocaleString('he-IL')}
                        </span>
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-white/25 italic">אין הוצאות מקושרות</p>
                )}
              </div>
            )}

            {/* Edit + Delete buttons */}
            <div className="mt-3 flex justify-between items-center">
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(tx.id); }}
                className="text-xs text-red-400 hover:text-red-300 font-medium"
              >
                מחק
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setEditOpen(true); }}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium"
              >
                <Pencil className="h-3 w-3" />
                ערוך
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>ערוך עסקה</DialogTitle>
          </DialogHeader>
          <EditTransactionDialog tx={tx} onClose={() => setEditOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Add Linked Expense Dialog */}
      <Dialog open={addLinkedOpen} onOpenChange={setAddLinkedOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>הוסף הוצאה מקושרת</DialogTitle>
          </DialogHeader>
          <AddLinkedExpenseDialog parentTx={tx} onClose={() => setAddLinkedOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TransactionsPage() {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as 'business' | 'personal' | null;
  const addParam = searchParams.get('add');

  const [tab, setTab] = useState<'business' | 'personal'>(tabParam || 'business');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [month, setMonth] = useState('all');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(!!addParam);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteTab, setDeleteTab] = useState<'business' | 'personal'>('business');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const activeMonth = month === 'all' ? undefined : month;
  const filters = { tab, search: search || undefined, type: typeFilter as 'income' | 'expense' | 'all', month: activeMonth, page };
  const { data, isLoading } = useTransactions(filters);

  const deleteBusinessTx = useDeleteTransaction();
  const deletePersonalTx = useDeletePersonalExpense();

  function handleDelete(id: string) {
    setDeleteId(id);
    setDeleteTab(tab);
  }

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      if (deleteTab === 'business') await deleteBusinessTx.mutateAsync(deleteId);
      else await deletePersonalTx.mutateAsync(deleteId);
      toast.success('העסקה נמחקה');
    } catch (e) {
      toast.error(String(e));
    } finally {
      setDeleteId(null);
    }
  }

  const transactions = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">עסקאות</h1>
        <div className="flex gap-2">
          <a
            href={`/api/v1/transactions/export.csv?tab=${tab}&x-api-key=${import.meta.env.VITE_API_KEY || ''}`}
            className="inline-flex items-center gap-1.5 text-sm border border-white/20 rounded-md px-3 py-1.5 hover:bg-white/5 transition-colors"
          >
            <Download className="h-4 w-4" />
            ייצוא CSV
          </a>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 ml-1" />
            הוסף עסקה
          </Button>
        </div>
      </div>

      {/* Financial Summary Banner */}
      {!isLoading && data?.totals && (
        <TransactionsSummaryBanner
          totals={data.totals}
          tab={tab}
          month={month}
          onMonthChange={(v) => { setMonth(v); setPage(1); }}
        />
      )}

      <Tabs value={tab} onValueChange={(v) => { setTab(v as 'business' | 'personal'); setPage(1); setExpandedId(null); }}>
        <div className="flex items-center gap-4 flex-wrap">
          <TabsList>
            <TabsTrigger value="business">עסקי</TabsTrigger>
            <TabsTrigger value="personal">אישי</TabsTrigger>
          </TabsList>

          <div className="flex gap-2 flex-1">
            <Input
              placeholder="חיפוש..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-48 h-9 text-sm"
            />
            {tab === 'business' && (
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-32 h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">הכל</SelectItem>
                  <SelectItem value="income">הכנסות</SelectItem>
                  <SelectItem value="expense">הוצאות</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Business Tab — expandable card list */}
        <TabsContent value="business">
          {isLoading ? (
            <div className="space-y-2 mt-4">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : transactions.length === 0 ? (
            <EmptyState icon="📋" title="אין עסקאות" description="הוסף עסקה חדשה לתחילת המעקב" />
          ) : (
            <div className="mt-4">
              {transactions.map((tx) => (
                <ExpandableTransactionCard
                  key={tx.id}
                  tx={tx as BusinessTransaction}
                  expanded={expandedId === tx.id}
                  onToggle={() => setExpandedId(expandedId === tx.id ? null : tx.id)}
                  onDelete={handleDelete}
                />
              ))}

              {/* Pagination */}
              {(pagination?.pages || 0) > 1 && (
                <div className="flex gap-2 justify-center mt-3">
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>הקודם</Button>
                  <span className="text-sm text-white/60 self-center">{page} / {pagination?.pages}</span>
                  <Button variant="outline" size="sm" disabled={page === pagination?.pages} onClick={() => setPage(p => p + 1)}>הבא</Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Personal Tab — original table/card layout unchanged */}
        <TabsContent value="personal">
          {isLoading ? (
            <div className="space-y-2 mt-4">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : transactions.length === 0 ? (
            <EmptyState icon="📋" title="אין עסקאות" description="הוסף עסקה חדשה לתחילת המעקב" />
          ) : (
            <div className="mt-4 rounded-lg border border-white/10 overflow-hidden">
              {/* Mobile: card list */}
              <div className="sm:hidden divide-y divide-white/10">
                {transactions.map((tx) => (
                  <TransactionCard key={tx.id} tx={tx} tab="personal" onDelete={handleDelete} />
                ))}
              </div>

              {/* Desktop: table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-right">
                  <thead className="bg-white/5 border-b border-white/10">
                    <tr>
                      <th className="px-4 py-3 text-sm font-semibold text-white/50 uppercase">תאריך</th>
                      <th className="px-4 py-3 text-sm font-semibold text-white/50 uppercase">קטגוריה</th>
                      <th className="px-4 py-3 text-sm font-semibold text-white/50 uppercase">תיאור</th>
                      <th className="px-4 py-3 text-sm font-semibold text-white/50 uppercase">סכום</th>
                      <th className="px-4 py-3 text-sm font-semibold text-white/50 uppercase">סוג</th>
                      <th className="px-4 py-3 text-sm font-semibold text-white/50 uppercase"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-transparent divide-y divide-white/10">
                    {transactions.map((tx) => {
                      const isIncome = false; // personal expenses are always expenses
                      return (
                        <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3 text-sm text-white/60">{formatDateShort(tx.date)}</td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="text-sm">{tx.category}</Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-white max-w-52 truncate">{tx.description}</td>
                          <td className={`px-4 py-3 text-base font-bold ${isIncome ? 'text-green-400' : 'text-red-400'}`}>
                            -{Math.abs(Number(tx.amount)).toLocaleString('he-IL')}₪
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium border bg-red-500/20 text-red-300 border-red-500/30">
                              הוצאה אישית
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleDelete(tx.id)}
                              className="text-red-400 hover:text-red-300 text-sm font-medium"
                            >
                              מחק
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {(pagination?.pages || 0) > 1 && (
                <div className="bg-white/5 border-t border-white/10 px-4 py-3 flex justify-center gap-2">
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>הקודם</Button>
                  <span className="text-sm text-white/60 self-center">{page} / {pagination?.pages}</span>
                  <Button variant="outline" size="sm" disabled={page === pagination?.pages} onClick={() => setPage(p => p + 1)}>הבא</Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
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

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="מחק עסקה"
        description="האם אתה בטוח שברצונך למחוק את העסקה? פעולה זו לא ניתנת לביטול."
        loading={deleteBusinessTx.isPending || deletePersonalTx.isPending}
      />
    </div>
  );
}
