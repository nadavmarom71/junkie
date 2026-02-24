import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/shared/EmptyState';
import { useClients, useCreateClient } from '@/hooks/useClients';
import { formatCurrency, formatDateShort } from '@/lib/formatters';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Client } from '@/types';

const clientSchema = z.object({
  name: z.string().min(1, 'שם נדרש'),
  email: z.string().email('מייל לא תקין').optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
});

type ClientForm = z.infer<typeof clientSchema>;

function ClientFormDialog({ onClose }: { onClose: () => void }) {
  const createMutation = useCreateClient();
  const { register, handleSubmit, formState: { errors } } = useForm<ClientForm>({
    resolver: zodResolver(clientSchema),
  });

  async function onSubmit(values: ClientForm) {
    try {
      await createMutation.mutateAsync({ ...values, email: values.email || null, phone: values.phone || null, company: values.company || null });
      toast.success('לקוח נוסף!');
      onClose();
    } catch (e) {
      toast.error(String(e));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="text-sm font-medium">שם הלקוח *</label>
        <Input className="mt-1" {...register('name')} />
        {errors.name && <p className="text-xs text-red-500 mt-0.5">{errors.name.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">מייל</label>
          <Input type="email" className="mt-1" {...register('email')} />
          {errors.email && <p className="text-xs text-red-500 mt-0.5">{errors.email.message}</p>}
        </div>
        <div>
          <label className="text-sm font-medium">טלפון</label>
          <Input className="mt-1" {...register('phone')} />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">חברה</label>
        <Input className="mt-1" {...register('company')} />
      </div>
      <div>
        <label className="text-sm font-medium">הערות</label>
        <Input className="mt-1" {...register('notes')} />
      </div>
      <Button type="submit" className="w-full" disabled={createMutation.isPending}>
        {createMutation.isPending ? 'שומר...' : 'הוסף לקוח'}
      </Button>
    </form>
  );
}

function ClientCard({ client }: { client: Client }) {
  const navigate = useNavigate();
  const revenue = client.total_revenue || 0;
  const stars = revenue > 50000 ? 5 : revenue > 30000 ? 4 : revenue > 15000 ? 3 : revenue > 5000 ? 2 : 1;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`/clients/${client.id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{client.name}</CardTitle>
            {client.company && (
              <p className="text-xs text-white/50 mt-0.5">{client.company}</p>
            )}
          </div>
          <div className="text-yellow-400 text-sm">{'⭐'.repeat(stars)}</div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-white/50">סה"כ הכנסות</span>
          <span className="font-bold text-green-400">{formatCurrency(revenue)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-white/50">עסקאות</span>
          <span className="font-semibold">{client.transaction_count || 0}</span>
        </div>
        {client.avg_transaction ? (
          <div className="flex justify-between text-sm">
            <span className="text-white/50">ממוצע לעסקה</span>
            <span>{formatCurrency(client.avg_transaction)}</span>
          </div>
        ) : null}
        {client.last_transaction_date && (
          <div className="flex justify-between text-sm">
            <span className="text-white/50">עסקה אחרונה</span>
            <span className="text-white/70">{formatDateShort(client.last_transaction_date)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ClientsPage() {
  const [sort, setSort] = useState('total_revenue');
  const [createOpen, setCreateOpen] = useState(false);
  const { data: clients, isLoading } = useClients(sort);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">לקוחות</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <UserPlus className="h-4 w-4 ml-1" />
          לקוח חדש
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-48 h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="total_revenue">לפי הכנסות (גבוה לנמוך)</SelectItem>
            <SelectItem value="transaction_count">לפי מספר עסקאות</SelectItem>
            <SelectItem value="last_transaction_date">לפי עסקה אחרונה</SelectItem>
          </SelectContent>
        </Select>
        {clients && <p className="text-sm text-white/50">{clients.length} לקוחות</p>}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : clients?.length === 0 ? (
        <EmptyState
          icon="👤"
          title="אין לקוחות עדיין"
          description="הוסף לקוח ראשון כדי להתחיל לעקוב"
          action={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4 ml-1" />הוסף לקוח</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(clients || []).map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>הוסף לקוח חדש</DialogTitle>
          </DialogHeader>
          <ClientFormDialog onClose={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
