import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, Brain, FileText, BarChart3, TrendingUp, Calendar, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useClient, useClientProfitability, useClientAiRecommendation } from '@/hooks/useClients';
import { formatCurrency, formatDateShort } from '@/lib/formatters';
import { toast } from 'sonner';
import type { BusinessTransaction } from '@/types';

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: client, isLoading } = useClient(id!);
  const { data: profitability } = useClientProfitability(id!);
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

      {/* Client Profitability */}
      {profitability && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              רווחיות לקוח
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Key metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-lg p-3" style={{ background: 'rgba(0,196,140,0.06)' }}>
                <p className="text-xs text-white/50">הכנסות נטו</p>
                <p className="text-lg font-bold text-emerald-400">{formatCurrency(profitability.totalRevenue)}</p>
              </div>
              <div className="rounded-lg p-3" style={{ background: 'rgba(244,63,94,0.06)' }}>
                <p className="text-xs text-white/50">הוצאות</p>
                <p className="text-lg font-bold text-red-400">{formatCurrency(profitability.totalExpenses)}</p>
              </div>
              <div className="rounded-lg p-3" style={{ background: profitability.netProfit >= 0 ? 'rgba(0,196,140,0.06)' : 'rgba(244,63,94,0.06)' }}>
                <p className="text-xs text-white/50">רווח נקי</p>
                <p className={`text-lg font-bold ${profitability.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatCurrency(profitability.netProfit)}
                </p>
              </div>
              <div className="rounded-lg p-3" style={{ background: 'rgba(106,163,255,0.06)' }}>
                <p className="text-xs text-white/50">מרווח רווח</p>
                <p className={`text-lg font-bold ${profitability.profitMargin >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                  {profitability.profitMargin}%
                </p>
              </div>
            </div>

            {/* Secondary stats */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5 text-white/40" />
                <span className="text-white/50">ממוצע לעסקה:</span>
                <span className="font-semibold text-white">{formatCurrency(profitability.avgDealSize)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-white/40" />
                <span className="text-white/50">ממוצע חודשי:</span>
                <span className="font-semibold text-white">{formatCurrency(profitability.monthlyAvg)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-white/40" />
                <span className="text-white/50">חודשים פעילים:</span>
                <span className="font-semibold text-white">{profitability.monthsActive}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Repeat className="h-3.5 w-3.5 text-white/40" />
                <span className="text-white/50">ריטיינר:</span>
                {profitability.hasRetainer ? (
                  <Badge variant="default" className="text-xs">פעיל — {formatCurrency(profitability.retainerAmount)}</Badge>
                ) : (
                  <span className="text-white/40">אין</span>
                )}
              </div>
            </div>

            {/* Monthly breakdown */}
            {profitability.monthlyBreakdown.length > 1 && (
              <div>
                <p className="text-xs text-white/50 mb-2">פירוט חודשי</p>
                <div className="space-y-1.5">
                  {profitability.monthlyBreakdown.slice(-6).map((m) => (
                    <div key={m.month} className="flex items-center gap-2 text-xs">
                      <span className="text-white/40 w-16 shrink-0">{m.month}</span>
                      <div className="flex-1 h-4 rounded-full overflow-hidden flex" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        {m.income > 0 && (
                          <div
                            className="h-full bg-emerald-500/60"
                            style={{ width: `${Math.min(100, (m.income / Math.max(m.income, m.expenses)) * 100)}%` }}
                          />
                        )}
                      </div>
                      <span className={`font-semibold w-20 text-left ${m.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(m.net)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
