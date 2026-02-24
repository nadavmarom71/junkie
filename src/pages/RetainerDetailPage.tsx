import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useRetainer } from '@/hooks/useRetainers';
import { formatCurrency, formatDateShort } from '@/lib/formatters';

export default function RetainerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: retainer, isLoading } = useRetainer(id!);

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;
  if (!retainer) return (
    <div className="text-center py-16">
      <p className="text-white/50">ריטיינר לא נמצא</p>
      <Button variant="outline" className="mt-4" onClick={() => navigate('/retainers')}>חזרה</Button>
    </div>
  );

  const statusLabel = { active: '🟢 פעיל', paused: '⏸️ מושהה', ended: '🔴 הסתיים' }[retainer.status];
  const cycleLabel = { monthly: 'חודשי', quarterly: 'רבעוני', annual: 'שנתי' }[retainer.billing_cycle];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/retainers')}>
          <ArrowRight className="h-4 w-4 ml-1" />חזרה
        </Button>
        <h1 className="text-2xl font-bold text-white">{retainer.name}</h1>
        <Badge variant="outline">{statusLabel}</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-5">
          <p className="text-xs text-white/50">סכום</p>
          <p className="text-xl font-bold text-green-400">{formatCurrency(Number(retainer.amount))} / {cycleLabel}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5">
          <p className="text-xs text-white/50">לקוח</p>
          <p className="text-base font-semibold mt-1">{retainer.clients?.name || '—'}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5">
          <p className="text-xs text-white/50">תאריך התחלה</p>
          <p className="text-base font-semibold mt-1">{formatDateShort(retainer.start_date)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5">
          <p className="text-xs text-white/50">חיוב הבא</p>
          <p className="text-base font-semibold mt-1">{retainer.next_billing_date ? formatDateShort(retainer.next_billing_date) : '—'}</p>
        </CardContent></Card>
      </div>

      {retainer.notes && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-white/60" />הערות</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-white/70">{retainer.notes}</p></CardContent>
        </Card>
      )}
    </div>
  );
}
