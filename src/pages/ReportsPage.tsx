import { useState } from 'react';
import { toast } from 'sonner';
import { FileBarChart2, Download, Send, Trophy, Brain, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useGenerateReport } from '@/hooks/useReports';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { ReportData } from '@/types';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

function getDefaultDates() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const to = now.toISOString().split('T')[0];
  return { from, to };
}

export default function ReportsPage() {
  const defaults = getDefaultDates();
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [report, setReport] = useState<ReportData | null>(null);
  const generateReport = useGenerateReport();

  async function handleGenerate(format: 'json' | 'pdf' = 'json', sendTelegram = false) {
    try {
      const result = await generateReport.mutateAsync({ from, to, format, send_telegram: sendTelegram });
      if (format === 'json') {
        setReport(result);
        toast.success('דוח נוצר!');
      }
      if (sendTelegram) toast.success('דוח נשלח לטלגרם!');
    } catch (e) {
      toast.error(String(e));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <FileBarChart2 className="h-6 w-6 text-blue-400" />
          <h1 className="text-2xl font-bold text-white">דוחות</h1>
        </div>
        <p className="text-sm text-white/50">צור דוחות פיננסיים מפורטים</p>
      </div>

      {/* Report Builder */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">הגדרות דוח</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-sm font-medium block mb-1">מתאריך</label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">עד תאריך</label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
            </div>
            <Button onClick={() => handleGenerate('json')} disabled={generateReport.isPending}>
              <FileBarChart2 className="h-4 w-4 ml-1" />
              {generateReport.isPending ? 'מכין...' : 'צור דוח'}
            </Button>
            <Button variant="outline" onClick={() => handleGenerate('pdf')} disabled={generateReport.isPending}>
              <Download className="h-4 w-4 ml-1" />
              הורד PDF
            </Button>
            <Button variant="outline" onClick={() => handleGenerate('json', true)} disabled={generateReport.isPending}>
              <Send className="h-4 w-4 ml-1" />
              שלח לטלגרם
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Display */}
      {report && (
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-1">
                <ClipboardList className="h-4 w-4 text-blue-400 inline ml-1" />
                סיכום — {formatDate(report.period.from)} עד {formatDate(report.period.to)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <p className="text-xs text-white/50">הכנסות</p>
                  <p className="text-xl font-bold text-green-400">{formatCurrency(report.summary.income)}</p>
                </div>
                <div className="text-center p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-xs text-white/50">הוצאות עסקיות</p>
                  <p className="text-xl font-bold text-red-400">{formatCurrency(report.summary.expenses)}</p>
                </div>
                <div className="text-center p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-xs text-white/50">רווח נקי</p>
                  <p className={`text-xl font-bold ${report.summary.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(report.summary.net)}
                  </p>
                </div>
                <div className="text-center p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <p className="text-xs text-white/50">הוצאות אישיות</p>
                  <p className="text-xl font-bold text-purple-400">{formatCurrency(report.summary.personal_expenses)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {report.expense_categories.length > 0 && (
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">הוצאות לפי קטגוריה</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={report.expense_categories} dataKey="amount" nameKey="category" cx="50%" cy="50%" outerRadius={80} label={(props: any) => `${props.category} ${((props.percent ?? 0) * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                        {report.expense_categories.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number | undefined) => formatCurrency(v ?? 0)} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {report.top_clients.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-400" />
                    לקוחות מובילים
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {report.top_clients.map((client, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-lg font-bold text-white/40">#{i + 1}</span>
                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">{client.name}</span>
                            <span className="text-sm font-bold text-green-400">{formatCurrency(client.amount)}</span>
                          </div>
                          <div className="h-1.5 bg-white/10 rounded-full mt-1">
                            <div
                              className="h-1.5 rounded-full bg-green-500"
                              style={{ width: `${(client.amount / report.top_clients[0].amount) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* AI Insight */}
          {report.ai_insight && (
            <Card className="bg-blue-500/10 border-blue-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="h-4 w-4 text-blue-400" />
                  תובנת AI
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{report.ai_insight}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
