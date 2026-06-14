import { useNavigate } from 'react-router-dom';
import { X, ArrowLeft, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import BottomSheet from '@/components/shared/BottomSheet';
import { useTransactions } from '@/hooks/useTransactions';
import { useCollections } from '@/hooks/useCollections';
import { formatCurrency, formatDateShort } from '@/lib/formatters';
import type { BusinessTransaction } from '@/types';

export type PreviewKind = 'transactions' | 'collections' | null;

const META: Record<'transactions' | 'collections', { title: string; to: string }> = {
  transactions: { title: 'עסקאות', to: '/transactions' },
  collections:  { title: 'גבייה',   to: '/collections' },
};

const CARD_STYLE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.045)',
  border: '1px solid rgba(255,255,255,0.08)',
};

function SkeletonRows() {
  return (
    <div className="px-4 pt-1 pb-2 space-y-2.5">
      {[0, 1, 2].map(i => (
        <div key={i} className="flex items-center gap-3.5 p-4 rounded-2xl" style={CARD_STYLE}>
          <div className="w-12 h-12 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="flex-1">
            <div className="h-4 rounded" style={{ background: 'rgba(255,255,255,0.08)', width: '60%' }} />
            <div className="h-3 rounded mt-2" style={{ background: 'rgba(255,255,255,0.05)', width: '35%' }} />
          </div>
          <div className="h-5 rounded" style={{ background: 'rgba(255,255,255,0.08)', width: 70 }} />
        </div>
      ))}
    </div>
  );
}

function EmptyRow({ label }: { label: string }) {
  return <div className="px-5 py-10 text-center text-base" style={{ color: 'rgba(255,255,255,0.45)' }}>{label}</div>;
}

function Card({
  icon, iconColor, title, sub, amount, amountColor,
}: { icon: React.ReactNode; iconColor: string; title: string; sub: string; amount: string; amountColor: string }) {
  return (
    <div className="flex items-center gap-3.5 p-4 rounded-2xl" style={CARD_STYLE}>
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${iconColor}22` }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-lg font-bold text-white truncate leading-tight">{title}</div>
        <div className="text-sm mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>{sub}</div>
      </div>
      <div className="text-xl font-extrabold flex-shrink-0 whitespace-nowrap" style={{ color: amountColor }}>{amount}</div>
    </div>
  );
}

function TransactionsPreview() {
  const { data, isLoading } = useTransactions({ limit: 4 });
  const items = (data?.data ?? []) as BusinessTransaction[];
  if (isLoading) return <SkeletonRows />;
  if (!items.length) return <EmptyRow label="אין עסקאות אחרונות" />;
  return (
    <div className="px-4 pt-1 pb-2 space-y-2.5">
      {items.map(tx => {
        const income = tx.type === 'income';
        const color = income ? '#34d399' : '#f87171';
        return (
          <Card
            key={tx.id}
            icon={income
              ? <TrendingUp className="h-6 w-6" style={{ color }} />
              : <TrendingDown className="h-6 w-6" style={{ color }} />}
            iconColor={color}
            title={tx.description}
            sub={`${formatDateShort(tx.date)}${tx.clients?.name ? ` · ${tx.clients.name}` : ''}`}
            amount={`${income ? '+' : '-'}${formatCurrency(tx.amount, tx.currency)}`}
            amountColor={color}
          />
        );
      })}
    </div>
  );
}

function CollectionsPreview() {
  const { data, isLoading } = useCollections();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (((data as any)?.data ?? []) as any[]).slice(0, 4);
  if (isLoading) return <SkeletonRows />;
  if (!items.length) return <EmptyRow label="אין חשבוניות פתוחות" />;
  return (
    <div className="px-4 pt-1 pb-2 space-y-2.5">
      {items.map((c, i) => (
        <Card
          key={c.id ?? i}
          icon={<Clock className="h-6 w-6" style={{ color: '#fbbf24' }} />}
          iconColor="#fbbf24"
          title={c.client_name ?? c.description ?? 'גבייה'}
          sub={c.description && c.client_name ? c.description : 'ממתין לגבייה'}
          amount={formatCurrency(Number(c.amount) || 0)}
          amountColor="#fbbf24"
        />
      ))}
    </div>
  );
}

export default function TabPreviewSheet({ kind, onClose }: { kind: PreviewKind; onClose: () => void }) {
  const navigate = useNavigate();
  const meta = kind ? META[kind] : null;

  return (
    <BottomSheet open={kind !== null} onClose={onClose}>
      <div
        className="rounded-t-3xl"
        style={{
          background: '#0D1117',
          border: '1px solid rgba(255,255,255,0.08)',
          borderBottom: 'none',
          boxShadow: '0 -12px 48px rgba(0,0,0,0.5)',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3">
          <h3 className="text-xl font-extrabold text-white">{meta?.title}</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <X className="h-5 w-5" style={{ color: 'rgba(255,255,255,0.5)' }} />
          </button>
        </div>

        {/* Preview body */}
        {kind === 'transactions' && <TransactionsPreview />}
        {kind === 'collections' && <CollectionsPreview />}

        {/* Open-full CTA */}
        <div className="px-4 pt-3">
          <button
            onClick={() => { if (meta) navigate(meta.to); onClose(); }}
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-base font-bold text-white transition-transform active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg,#2563EB,#056dff)', boxShadow: '0 4px 16px rgba(37,99,235,0.35)' }}
          >
            פתח מסך מלא
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
