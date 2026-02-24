import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Repeat, Circle, PauseCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/shared/EmptyState';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { useRetainers, useCreateRetainer, useUpdateRetainer, useDeleteRetainer } from '@/hooks/useRetainers';
import { useClients } from '@/hooks/useClients';
import { formatCurrency, formatDateShort } from '@/lib/formatters';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Retainer } from '@/types';

const retainerSchema = z.object({
  client_id: z.string().min(1, 'בחר לקוח או הכנס שם'),
  name: z.string().min(1, 'שם נדרש'),
  amount: z.coerce.number().positive('סכום חייב להיות חיובי'),
  currency: z.string().default('ILS'),
  billing_cycle: z.enum(['monthly', 'quarterly', 'annual']).default('monthly'),
  start_date: z.string().min(1, 'תאריך התחלה נדרש'),
  notes: z.string().optional(),
});

type RetainerForm = z.infer<typeof retainerSchema>;

function RetainerFormDialog({ onClose }: { onClose: () => void }) {
  const createMutation = useCreateRetainer();
  const { data: clients } = useClients();
  const [manualClient, setManualClient] = useState(false);
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<RetainerForm>({
    resolver: zodResolver(retainerSchema) as any,
    defaultValues: { currency: 'ILS', billing_cycle: 'monthly', start_date: new Date().toISOString().split('T')[0] },
  });

  async function onSubmit(values: RetainerForm) {
    try {
      await createMutation.mutateAsync(values);
      toast.success('ריטיינר נוסף!');
      onClose();
    } catch (e) {
      toast.error(String(e));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium">לקוח *</label>
          <button
            type="button"
            className="text-xs text-white/40 hover:text-white/70 transition-colors"
            onClick={() => { setManualClient(!manualClient); setValue('client_id', ''); }}
          >
            {manualClient ? 'בחר מהרשימה' : 'הכנס ידנית'}
          </button>
        </div>
        {manualClient ? (
          <Input className="mt-1" placeholder="שם הלקוח" onChange={(e) => setValue('client_id', e.target.value)} />
        ) : (
          <Select onValueChange={(v) => setValue('client_id', v)}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="בחר לקוח" /></SelectTrigger>
            <SelectContent>
              {(clients || []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {errors.client_id && <p className="text-xs text-red-500 mt-0.5">{errors.client_id.message}</p>}
      </div>
      <div>
        <label className="text-sm font-medium">שם הריטיינר *</label>
        <Input className="mt-1" placeholder="לדוגמה: ייעוץ חודשי" {...register('name')} />
        {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">סכום (₪) *</label>
          <Input type="number" className="mt-1" {...register('amount')} />
          {errors.amount && <p className="text-xs text-red-500 mt-0.5">{errors.amount.message}</p>}
        </div>
        <div>
          <label className="text-sm font-medium">תדירות חיוב</label>
          <Select onValueChange={(v) => setValue('billing_cycle', v as 'monthly' | 'quarterly' | 'annual')} defaultValue="monthly">
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">חודשי</SelectItem>
              <SelectItem value="quarterly">רבעוני</SelectItem>
              <SelectItem value="annual">שנתי</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">תאריך התחלה *</label>
        <Input type="date" className="mt-1" {...register('start_date')} />
      </div>
      <div>
        <label className="text-sm font-medium">הערות</label>
        <Input className="mt-1" {...register('notes')} />
      </div>
      <Button type="submit" className="w-full" disabled={createMutation.isPending}>
        {createMutation.isPending ? 'שומר...' : 'הוסף ריטיינר'}
      </Button>
    </form>
  );
}

function RetainerCard({ retainer }: { retainer: Retainer }) {
  const navigate = useNavigate();
  const updateMutation = useUpdateRetainer();
  const deleteMutation = useDeleteRetainer();
  const [showDelete, setShowDelete] = useState(false);

  const statusLabel = { active: '🟢 פעיל', paused: '⏸️ מושהה', ended: '🔴 הסתיים' }[retainer.status];
  const cycleLabel = { monthly: 'חודשי', quarterly: 'רבעוני', annual: 'שנתי' }[retainer.billing_cycle];

  async function togglePause() {
    const newStatus = retainer.status === 'active' ? 'paused' : 'active';
    try {
      await updateMutation.mutateAsync({ id: retainer.id, data: { status: newStatus } });
      toast.success(newStatus === 'active' ? 'ריטיינר הופעל מחדש' : 'ריטיינר הושהה');
    } catch (e) { toast.error(String(e)); }
  }

  async function confirmDelete() {
    try {
      await deleteMutation.mutateAsync(retainer.id);
      toast.success('ריטיינר נמחק');
    } catch (e) { toast.error(String(e)); }
    setShowDelete(false);
  }

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base">{retainer.name}</CardTitle>
              <p className="text-xs text-white/50 mt-0.5">{retainer.clients?.name || ''}</p>
            </div>
            <Badge variant="outline" className="text-xs">{statusLabel}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-white/50">סכום</span>
            <span className="font-bold text-green-400">{formatCurrency(Number(retainer.amount))} / {cycleLabel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">התחלה</span>
            <span>{formatDateShort(retainer.start_date)}</span>
          </div>
          {retainer.next_billing_date && (
            <div className="flex justify-between">
              <span className="text-white/50">חיוב הבא</span>
              <span>{formatDateShort(retainer.next_billing_date)}</span>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={togglePause} disabled={updateMutation.isPending}>
              {retainer.status === 'active' ? '⏸️ השהה' : '▶️ הפעל'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/retainers/${retainer.id}`)}>פרטים</Button>
            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => setShowDelete(true)}>מחק</Button>
          </div>
        </CardContent>
      </Card>
      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={confirmDelete}
        title="מחק ריטיינר"
        description={`האם למחוק את ריטיינר "${retainer.name}"? הפעולה לא ניתנת לביטול.`}
        loading={deleteMutation.isPending}
      />
    </>
  );
}

export default function RetainersPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading } = useRetainers();

  const retainers = data?.retainers || [];
  const summary = data?.summary;
  const active = retainers.filter((r) => r.status === 'active');
  const paused = retainers.filter((r) => r.status === 'paused');
  const ended = retainers.filter((r) => r.status === 'ended');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Repeat className="h-6 w-6 text-blue-400" />
          <h1 className="text-2xl font-bold text-white">ריטיינרים</h1>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 ml-1" />
          ריטיינר חדש
        </Button>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-5 text-center">
              <p className="text-2xl font-bold text-green-400">{formatCurrency(summary.monthly_total)}</p>
              <p className="text-xs text-white/50 mt-1">הכנסה חודשית</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 text-center">
              <p className="text-2xl font-bold">{summary.active_count}</p>
              <p className="text-xs text-white/50 mt-1">ריטיינרים פעילים</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 text-center">
              <p className="text-2xl font-bold text-blue-400">{formatCurrency(summary.annual_projection)}</p>
              <p className="text-xs text-white/50 mt-1">תחזית שנתית</p>
            </CardContent>
          </Card>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-52" />)}
        </div>
      ) : retainers.length === 0 ? (
        <EmptyState icon="🔄" title="אין ריטיינרים" description="הוסף ריטיינר ראשון לצמיחת ההכנסה הקבועה שלך" action={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 ml-1" />הוסף ריטיינר</Button>} />
      ) : (
        <>
          {active.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-white/60 mb-3 flex items-center gap-1.5"><Circle className="h-3 w-3 text-green-400 fill-green-400" />פעילים ({active.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {active.map((r) => <RetainerCard key={r.id} retainer={r} />)}
              </div>
            </div>
          )}
          {paused.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-white/60 mb-3 flex items-center gap-1.5"><PauseCircle className="h-3.5 w-3.5 text-yellow-400" />מושהים ({paused.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paused.map((r) => <RetainerCard key={r.id} retainer={r} />)}
              </div>
            </div>
          )}
          {ended.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-white/60 mb-3 flex items-center gap-1.5"><XCircle className="h-3.5 w-3.5 text-red-400" />הסתיימו ({ended.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ended.map((r) => <RetainerCard key={r.id} retainer={r} />)}
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader><DialogTitle>ריטיינר חדש</DialogTitle></DialogHeader>
          <RetainerFormDialog onClose={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
