import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Download } from 'lucide-react';
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
} from '@/hooks/useTransactions';
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

// ── Transaction Form ──────────────────────────────────────────────────────────

function BusinessTransactionForm({ onClose, defaultType }: { onClose: () => void; defaultType?: 'income' | 'expense' }) {
  const createMutation = useCreateTransaction();
  const { register, handleSubmit, formState: { errors }, setValue } = useForm({
    resolver: zodResolver(businessSchema),
    defaultValues: { type: defaultType || 'income', date: new Date().toISOString().split('T')[0] },
  });

  async function onSubmit(values: Record<string, unknown>) {
    const typedValues = values as BusinessForm;
    try {
      await createMutation.mutateAsync(typedValues);
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

// ── Transaction Row ────────────────────────────────────────────────────────────

function TransactionRow({ tx, tab, onDelete }: { tx: BusinessTransaction | PersonalExpense; tab: string; onDelete: (id: string) => void }) {
  const isBusiness = tab === 'business';
  const bTx = tx as BusinessTransaction;

  return (
    <tr className="hover:bg-white/5 transition-colors">
      <td className="px-4 py-3 text-sm text-white/60">{formatDateShort(tx.date)}</td>
      {isBusiness && (
        <td className="px-4 py-3">
          <Badge variant={bTx.type === 'income' ? 'default' : 'destructive'} className="text-xs">
            {bTx.type === 'income' ? 'הכנסה' : 'הוצאה'}
          </Badge>
        </td>
      )}
      <td className="px-4 py-3 text-sm text-white max-w-48 truncate">{tx.description}</td>
      <td className="px-4 py-3">
        <Badge variant="outline" className="text-xs">{tx.category}</Badge>
      </td>
      <td className={`px-4 py-3 text-sm font-semibold ${isBusiness && bTx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
        {isBusiness && bTx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => onDelete(tx.id)}
          className="text-xs text-red-500 hover:text-red-700 hover:underline"
        >
          מחק
        </button>
      </td>
    </tr>
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
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(!!addParam);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteTab, setDeleteTab] = useState<'business' | 'personal'>('business');

  const filters = { tab, search: search || undefined, type: typeFilter as 'income' | 'expense' | 'all', page };
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
  const total = pagination?.total || 0;

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

      <Tabs value={tab} onValueChange={(v) => { setTab(v as 'business' | 'personal'); setPage(1); }}>
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

        {['business', 'personal'].map((t) => (
          <TabsContent key={t} value={t}>
            {isLoading ? (
              <div className="space-y-2 mt-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : transactions.length === 0 ? (
              <EmptyState icon="📋" title="אין עסקאות" description="הוסף עסקה חדשה לתחילת המעקב" />
            ) : (
              <div className="mt-4 rounded-lg border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead className="bg-white/5 border-b border-white/10">
                      <tr>
                        <th className="px-4 py-3 text-xs font-semibold text-white/50 uppercase">תאריך</th>
                        {t === 'business' && <th className="px-4 py-3 text-xs font-semibold text-white/50 uppercase">סוג</th>}
                        <th className="px-4 py-3 text-xs font-semibold text-white/50 uppercase">תיאור</th>
                        <th className="px-4 py-3 text-xs font-semibold text-white/50 uppercase">קטגוריה</th>
                        <th className="px-4 py-3 text-xs font-semibold text-white/50 uppercase">סכום</th>
                        <th className="px-4 py-3 text-xs font-semibold text-white/50 uppercase"></th>
                      </tr>
                    </thead>
                    <tbody className="bg-transparent divide-y divide-white/10">
                      {transactions.map((tx) => (
                        <TransactionRow key={tx.id} tx={tx} tab={t} onDelete={handleDelete} />
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary & Pagination */}
                <div className="bg-white/5 border-t border-white/10 px-4 py-3 flex items-center justify-between">
                  <p className="text-sm text-white/60">
                    {total} עסקאות
                    {t === 'business' && (
                      <>
                        {' • '}
                        הכנסות: {formatCurrency(transactions.filter((tx) => (tx as BusinessTransaction).type === 'income').reduce((s, tx) => s + Number(tx.amount), 0))}
                        {' • '}
                        הוצאות: {formatCurrency(transactions.filter((tx) => (tx as BusinessTransaction).type === 'expense').reduce((s, tx) => s + Number(tx.amount), 0))}
                      </>
                    )}
                  </p>
                  {(pagination?.pages || 0) > 1 && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>הקודם</Button>
                      <span className="text-sm text-white/60 self-center">{page} / {pagination?.pages}</span>
                      <Button variant="outline" size="sm" disabled={page === pagination?.pages} onClick={() => setPage(p => p + 1)}>הבא</Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        ))}
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
