import { useState } from 'react';
import { toast } from 'sonner';
import { Sparkles, CheckCheck, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import EmptyState from '@/components/shared/EmptyState';
import { useInsights, useMarkInsightRead, useMarkAllInsightsRead, useGenerateInsight } from '@/hooks/useInsights';
import { getSeverityDisplay, formatDateShort } from '@/lib/formatters';
import type { AiInsight } from '@/types';

function InsightCard({ insight, onRead }: { insight: AiInsight; onRead: (id: string) => void }) {
  const { icon, color, bg } = getSeverityDisplay(insight.severity);

  return (
    <div className={`rounded-xl border p-5 ${bg} ${insight.is_read ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="text-xl flex-shrink-0 mt-0.5">{icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h3 className={`text-base font-bold ${color}`}>{insight.title}</h3>
              <Badge variant="outline" className="text-xs capitalize">{insight.severity}</Badge>
              {!insight.is_read && (
                <Badge className="text-xs bg-blue-500/20 text-blue-300 border-blue-500/30">חדש</Badge>
              )}
            </div>
            <p className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed">{insight.content}</p>
            <p className="text-xs text-white/40 mt-3">{formatDateShort(insight.generated_at.split('T')[0])}</p>
          </div>
        </div>
        {!insight.is_read && (
          <Button
            variant="ghost"
            size="sm"
            className="flex-shrink-0 text-white/50 hover:text-white"
            onClick={() => onRead(insight.id)}
          >
            ✓ קראתי
          </Button>
        )}
      </div>
    </div>
  );
}

export default function InsightsPage() {
  const [severityFilter, setSeverityFilter] = useState('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);

  const filters = {
    severity: severityFilter !== 'all' ? severityFilter : undefined,
    unread: unreadOnly || undefined,
    page,
    limit: 15,
  };

  const { data, isLoading } = useInsights(filters);
  const markRead = useMarkInsightRead();
  const markAllRead = useMarkAllInsightsRead();
  const generateInsight = useGenerateInsight();

  async function handleMarkRead(id: string) {
    await markRead.mutateAsync(id);
  }

  async function handleMarkAllRead() {
    await markAllRead.mutateAsync();
    toast.success('כל התובנות סומנו כנקראו');
  }

  async function handleGenerate() {
    try {
      await generateInsight.mutateAsync();
      toast.success('תובנה חדשה נוצרה!');
    } catch (e) {
      toast.error(`שגיאה: ${String(e)}`);
    }
  }

  const insights = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-blue-400" />
            <h1 className="text-2xl font-bold text-white">תובנות AI</h1>
          </div>
          <p className="text-sm text-white/50">ניתוח פיננסי חכם מבוסס נתונים</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleMarkAllRead} disabled={markAllRead.isPending}>
            <CheckCheck className="h-4 w-4 ml-1" />
            סמן הכל כנקרא
          </Button>
          <Button size="sm" onClick={handleGenerate} disabled={generateInsight.isPending}>
            <Sparkles className="h-4 w-4 ml-1" />
            {generateInsight.isPending ? 'מנתח...' : 'צור תובנה חדשה'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-36 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל החומרות</SelectItem>
            <SelectItem value="critical">קריטי 🚨</SelectItem>
            <SelectItem value="warning">אזהרה ⚠️</SelectItem>
            <SelectItem value="positive">חיובי ✅</SelectItem>
            <SelectItem value="info">מידע 💡</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant={unreadOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => setUnreadOnly(!unreadOnly)}
        >
          {unreadOnly ? '● לא נקראו בלבד' : 'הצג לא נקראו בלבד'}
        </Button>
        {pagination && (
          <p className="text-sm text-white/50 self-center">{pagination.total} תובנות</p>
        )}
      </div>

      {/* Insights List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36" />)}
        </div>
      ) : insights.length === 0 ? (
        <EmptyState
          icon="🤖"
          title="אין תובנות עדיין"
          description="לחץ על 'צור תובנה חדשה' כדי לקבל ניתוח AI של הנתונים שלך"
          action={
            <Button onClick={handleGenerate} disabled={generateInsight.isPending}>
              <Sparkles className="h-4 w-4 ml-1" />
              צור תובנה
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} onRead={handleMarkRead} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {(pagination?.pages || 0) > 1 && (
        <div className="flex gap-2 justify-center">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>הקודם</Button>
          <span className="text-sm text-white/60 self-center">{page} / {pagination?.pages}</span>
          <Button variant="outline" size="sm" disabled={page === pagination?.pages} onClick={() => setPage(p => p + 1)}>הבא</Button>
        </div>
      )}
    </div>
  );
}
