import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, Brain, FileText, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useClient, useClientAiRecommendation } from '@/hooks/useClients';
import { formatCurrency, formatDateShort } from '@/lib/formatters';
import { toast } from 'sonner';
import type { BusinessTransaction } from '@/types';

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: client, isLoading } = useClient(id!);
  const aiRecommendation = useClientAiRecommendation();
  const [recommendation, setRecommendation] = useState<string | null>(null);

  async function getRecommendation() {
    try {
      const result = await aiRecommendation.mutateAsync(id!);
      setRecommendation(result.recommendation);
    } catch (e) {
      toast.error(`שגיאה: ${String(e)}`);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-16">
        <p className="text-white/50">לקוח לא נמצא</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/clients')}>חזרה ללקוחות</Button>
      </div>
    );
  }

  const transactions = (client.transactions as BusinessTransaction[]) || [];
  const income = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/clients')}>
          <ArrowRight className="h-4 w-4 ml-1" />
          חזרה
        </Button>
        <h1 className="text-2xl font-bold text-white">{client.name}</h1>
        {client.company && <Badge variant="outline">{client.company}</Badge>}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-white/50">סה"כ הכנסות</p>
            <p className="text-xl font-bold text-green-400 mt-1">{formatCurrency(income)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-white/50">עסקאות</p>
            <p className="text-xl font-bold mt-1">{transactions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-white/50">ממוצע לעסקה</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(transactions.length > 0 ? income / transactions.filter(t => t.type === 'income').length : 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-white/50">מייל</p>
            <p className="text-sm font-medium mt-1 truncate">{client.email || '—'}</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Recommendation */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Brain className="h-4 w-4 text-blue-400" />המלצת AI</CardTitle>
          <Button size="sm" variant="outline" onClick={getRecommendation} disabled={aiRecommendation.isPending}>
            <Sparkles className="h-4 w-4 ml-1" />
            {aiRecommendation.isPending ? 'מנתח...' : 'קבל המלצה'}
          </Button>
        </CardHeader>
        <CardContent>
          {recommendation ? (
            <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{recommendation}</p>
          ) : (
            <p className="text-sm text-white/40 text-center py-4">לחץ "קבל המלצה" לניתוח AI של הלקוח הזה</p>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {client.notes && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-white/60" />הערות</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-white/70">{client.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Transactions History */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4 text-blue-400" />היסטוריית עסקאות</CardTitle></CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-white/50 text-center py-4">אין עסקאות עם לקוח זה</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="pb-2 text-xs text-white/50 font-semibold">תאריך</th>
                    <th className="pb-2 text-xs text-white/50 font-semibold">סוג</th>
                    <th className="pb-2 text-xs text-white/50 font-semibold">תיאור</th>
                    <th className="pb-2 text-xs text-white/50 font-semibold">סכום</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 20).map((tx) => (
                    <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2 text-white/50">{formatDateShort(tx.date)}</td>
                      <td className="py-2">
                        <Badge variant={tx.type === 'income' ? 'default' : 'destructive'} className="text-xs">
                          {tx.type === 'income' ? 'הכנסה' : 'הוצאה'}
                        </Badge>
                      </td>
                      <td className="py-2 text-white max-w-xs truncate">{tx.description}</td>
                      <td className={`py-2 font-semibold ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(tx.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
