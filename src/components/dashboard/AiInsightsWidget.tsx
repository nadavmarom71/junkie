import { useNavigate } from 'react-router-dom';
import type { AiInsight } from '@/types';

const SEVERITY_STYLES: Record<string, { bg: string; border: string; icon: string }> = {
  critical: { bg: 'rgba(244,63,94,0.08)',  border: 'rgba(244,63,94,0.2)',  icon: '🚨' },
  warning:  { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', icon: '⚠️' },
  positive: { bg: 'rgba(0,196,140,0.08)',  border: 'rgba(0,196,140,0.2)',  icon: '✅' },
  info:     { bg: 'rgba(37,99,235,0.08)',  border: 'rgba(37,99,235,0.2)',  icon: '💡' },
};

interface Props { insights: AiInsight[]; }

export default function AiInsightsWidget({ insights }: Props) {
  const navigate = useNavigate();

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xl font-extrabold">💡 תובנות AI</span>
        <button
          className="text-base font-semibold"
          style={{ color: '#2563EB' }}
          onClick={() => navigate('/insights')}
        >
          הכל ←
        </button>
      </div>
      <div className="space-y-2.5">
        {insights.length === 0 ? (
          <p className="text-base text-center py-6" style={{ color: 'var(--t2)' }}>
            אין תובנות חדשות
          </p>
        ) : insights.map((insight) => {
          const s = SEVERITY_STYLES[insight.severity] ?? SEVERITY_STYLES.info;
          return (
            <div
              key={insight.id}
              className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-opacity hover:opacity-80"
              style={{ background: s.bg, border: `1px solid ${s.border}` }}
              onClick={() => navigate('/insights')}
            >
              <span className="text-base flex-shrink-0 mt-0.5">{s.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold truncate text-white">{insight.title}</p>
                <p className="text-[14px] mt-0.5 line-clamp-2" style={{ color: 'var(--t2)' }}>
                  {insight.content}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
