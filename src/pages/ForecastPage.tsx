import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Legend
} from 'recharts';
import { Sparkles, CalendarDays, BarChart3, Banknote } from 'lucide-react';
import { useRetainerForecast, useRevenueForecast, useCashFlowForecast } from '@/hooks/useForecast';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

export default function ForecastPage() {
  const retainerForecast = useRetainerForecast();
  const revenueForecast = useRevenueForecast();
  const cashFlowForecast = useCashFlowForecast();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-blue-400" />
          <h1 className="text-2xl font-bold text-white">תחזיות</h1>
        </div>
        <p className="text-sm text-white/50">תחזיות מבוססות ממוצע 3 חודשים אחרונים</p>
      </div>

      {/* Retainer Forecast */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-blue-400" />
            תחזית ריטיינרים — 6 חודשים
          </CardTitle>
        </CardHeader>
        <CardContent>
          {retainerForecast.isLoading ? (
            <Skeleton className="h-48" />
          ) : (
            <>
              {retainerForecast.data && (
                <div className="flex gap-6 mb-4 text-sm">
                  <div>
                    <span className="text-white/50">סה"כ חודשי: </span>
                    <span className="font-bold text-green-400">{formatCurrency(retainerForecast.data.summary.monthly_total)}</span>
                  </div>
                  <div>
                    <span className="text-white/50">תחזית שנתית: </span>
                    <span className="font-bold">{formatCurrency(retainerForecast.data.summary.annual_projection)}</span>
                  </div>
                  <div>
                    <span className="text-white/50">ריטיינרים פעילים: </span>
                    <span className="font-bold">{retainerForecast.data.summary.retainer_count}</span>
                  </div>
                </div>
              )}
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={retainerForecast.data?.months || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }} />
                  <YAxis tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }} />
                  <Tooltip formatter={(v: number | undefined) => formatCurrency(v ?? 0)} contentStyle={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                  <Bar dataKey="total" fill="#3b82f6" name="הכנסות ריטיינרים" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
        </CardContent>
      </Card>

      {/* Revenue Forecast (3 scenarios) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-400" />
            תחזית מחזור — 3 תרחישים
          </CardTitle>
        </CardHeader>
        <CardContent>
          {revenueForecast.isLoading ? (
            <Skeleton className="h-48" />
          ) : (
            <>
              {revenueForecast.data && (
                <p className="text-sm text-white/50 mb-4">
                  מבוסס על ממוצע חודשי של {formatCurrency(revenueForecast.data.basis.avg_monthly)} (3 חודשים אחרונים)
                </p>
              )}
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={revenueForecast.data?.months || []} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }} />
                  <YAxis tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }} />
                  <Tooltip formatter={(v: number | undefined) => formatCurrency(v ?? 0)} contentStyle={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }} />
                  <Bar dataKey="pessimistic" fill="#f87171" name="פסימי" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="realistic" fill="#3b82f6" name="ריאליסטי" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="optimistic" fill="#22c55e" name="אופטימי" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
        </CardContent>
      </Card>

      {/* Cash Flow Forecast */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Banknote className="h-4 w-4 text-green-400" />
            תחזית תזרים מזומנים — 3 חודשים
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cashFlowForecast.isLoading ? (
            <Skeleton className="h-48" />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {(cashFlowForecast.data?.months || []).map((m) => (
                  <div
                    key={m.month}
                    className={cn(
                      'rounded-lg border p-4',
                      m.net >= 0 ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
                    )}
                  >
                    <p className="text-sm font-semibold text-white mb-2">{m.month}</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/50">הכנסות:</span>
                        <span className="text-green-400 font-medium">{formatCurrency(m.projected_income)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/50">הוצאות:</span>
                        <span className="text-red-400 font-medium">{formatCurrency(m.projected_expenses)}</span>
                      </div>
                      <div className="flex justify-between border-t border-white/10 pt-1 mt-1">
                        <span className="font-semibold">נטו:</span>
                        <span className={cn('font-bold', m.net >= 0 ? 'text-green-400' : 'text-red-400')}>
                          {m.net >= 0 ? '+' : ''}{formatCurrency(m.net)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={cashFlowForecast.data?.months || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }} />
                  <YAxis tickFormatter={(v) => `₪${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }} />
                  <Tooltip formatter={(v: number | undefined) => formatCurrency(v ?? 0)} contentStyle={{ background: '#0D1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }} />
                  <Area type="monotone" dataKey="projected_income" stroke="#22c55e" fill="rgba(34,197,94,0.15)" name="הכנסות" />
                  <Area type="monotone" dataKey="projected_expenses" stroke="#ef4444" fill="rgba(239,68,68,0.15)" name="הוצאות" />
                </AreaChart>
              </ResponsiveContainer>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
