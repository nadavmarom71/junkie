import { useState } from 'react';
import { useReceipts, useApproveReceipt, useIgnoreReceipt, useReopenReceipt } from '@/hooks/useReceipts';
import { formatCurrency } from '@/lib/formatters';
import type { PendingReceipt, ReceiptStatus, ApproveReceiptInput } from '@/types';
import {
  Inbox, FileText, Check, X, ExternalLink, RotateCcw,
  ChevronDown, Loader2, ScanSearch, Receipt,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Business expense categories ──────────────────────────────────────────────
const EXPENSE_CATEGORIES = [
  'משכורות ושכר', 'כלים ותוכנות', 'שיווק ופרסום', 'משרד ושכירות',
  'נסיעות ותחבורה', 'ייעוץ ושירותים מקצועיים', 'ציוד וחומרה',
  'אירוח ופינוק לקוחות', 'ביטוח', 'אחר',
];

// ── Status filter tabs ───────────────────────────────────────────────────────
const STATUS_TABS: { value: ReceiptStatus | 'all'; label: string }[] = [
  { value: 'pending', label: 'ממתינות' },
  { value: 'processed', label: 'אושרו' },
  { value: 'ignored', label: 'נדחו' },
  { value: 'all', label: 'הכל' },
];

// ── File type icon helper ────────────────────────────────────────────────────
function fileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return '📄';
  if (['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(ext || '')) return '🖼️';
  return '📎';
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}

// ── Approve Modal ────────────────────────────────────────────────────────────
function ApproveModal({
  receipt,
  onClose,
  onApprove,
  isLoading,
}: {
  receipt: PendingReceipt;
  onClose: () => void;
  onApprove: (data: ApproveReceiptInput) => void;
  isLoading: boolean;
}) {
  const [amount, setAmount] = useState(receipt.extracted_amount?.toString() || '');
  const [description, setDescription] = useState(receipt.extracted_vendor || receipt.file_name);
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date(receipt.date_received).toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || !description || !category || !date) {
      toast.error('נא למלא את כל השדות הנדרשים');
      return;
    }
    onApprove({
      amount: parseFloat(amount),
      description,
      category,
      date,
      type: 'expense',
      notes: notes || null,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-2xl p-6 space-y-5"
        style={{
          background: 'linear-gradient(145deg, #161B22, #0D1117)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition">
            <X className="w-4 h-4 text-white/50" />
          </button>
          <h3 className="text-lg font-bold text-white">אישור קבלה כהוצאה</h3>
        </div>

        {/* File info bar */}
        <div
          className="flex items-center gap-3 p-3 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <span className="text-2xl">{fileIcon(receipt.file_name)}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white/80 truncate">{receipt.file_name}</p>
            <p className="text-xs text-white/40">{formatDate(receipt.date_received)}</p>
          </div>
          <a
            href={receipt.drive_file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg hover:bg-white/10 transition"
          >
            <ExternalLink className="w-4 h-4 text-blue-400" />
          </a>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount */}
          <div>
            <label className="block text-sm text-white/60 mb-1.5 text-right">סכום (₪)</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-white text-right"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
              placeholder="0.00"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-white/60 mb-1.5 text-right">תיאור</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-white text-right"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm text-white/60 mb-1.5 text-right">קטגוריה</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-white text-right appearance-none"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
              required
            >
              <option value="">בחר קטגוריה...</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm text-white/60 mb-1.5 text-right">תאריך</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-white text-right"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm text-white/60 mb-1.5 text-right">הערות</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-white text-right"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
              placeholder="אופציונלי..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                boxShadow: '0 4px 16px rgba(34,197,94,0.3)',
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              אשר כהוצאה
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Receipt Row ──────────────────────────────────────────────────────────────
function ReceiptRow({
  receipt,
  onApprove,
  onIgnore,
  onReopen,
}: {
  receipt: PendingReceipt;
  onApprove: () => void;
  onIgnore: () => void;
  onReopen: () => void;
}) {
  const isPending = receipt.status === 'pending';
  const isIgnored = receipt.status === 'ignored';
  const isProcessed = receipt.status === 'processed';

  return (
    <div
      className="flex items-center gap-3 p-4 rounded-2xl transition-all hover:scale-[1.005]"
      style={{
        background: isPending
          ? 'linear-gradient(135deg, rgba(37,99,235,0.06), rgba(37,99,235,0.02))'
          : 'rgba(255,255,255,0.02)',
        border: `1px solid ${isPending ? 'rgba(37,99,235,0.15)' : 'rgba(255,255,255,0.06)'}`,
        opacity: isIgnored ? 0.5 : 1,
      }}
    >
      {/* File icon */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
        style={{
          background: isPending ? 'rgba(37,99,235,0.12)' : isProcessed ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.06)',
        }}
      >
        {isProcessed ? '✅' : fileIcon(receipt.file_name)}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-white truncate">
            {receipt.extracted_vendor || receipt.file_name}
          </p>
          {receipt.extracted_amount && (
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}
            >
              {formatCurrency(receipt.extracted_amount)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-white/40">{formatDate(receipt.date_received)}</span>
          <span className="text-xs text-white/30">·</span>
          <span className="text-xs text-white/40">{formatTime(receipt.date_received)}</span>
          {receipt.file_name !== receipt.extracted_vendor && receipt.extracted_vendor && (
            <>
              <span className="text-xs text-white/30">·</span>
              <span className="text-xs text-white/40 truncate">{receipt.file_name}</span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <a
          href={receipt.drive_file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg hover:bg-white/10 transition"
          title="פתח ב-Drive"
        >
          <ExternalLink className="w-4 h-4 text-white/40" />
        </a>

        {isPending && (
          <>
            <button
              onClick={onApprove}
              className="p-2 rounded-lg transition"
              style={{ background: 'rgba(34,197,94,0.12)' }}
              title="אשר כהוצאה"
            >
              <Check className="w-4 h-4 text-green-400" />
            </button>
            <button
              onClick={onIgnore}
              className="p-2 rounded-lg hover:bg-white/10 transition"
              title="דחה"
            >
              <X className="w-4 h-4 text-white/40" />
            </button>
          </>
        )}

        {isIgnored && (
          <button
            onClick={onReopen}
            className="p-2 rounded-lg hover:bg-white/10 transition"
            title="שחזר"
          >
            <RotateCcw className="w-4 h-4 text-white/40" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Empty State ──────────────────────────────────────────────────────────────
function EmptyInbox({ status }: { status: string }) {
  const messages: Record<string, { icon: string; title: string; sub: string }> = {
    pending: {
      icon: '📭',
      title: 'אין קבלות ממתינות',
      sub: 'ברגע שיגיעו קבלות מ-Gmail דרך האוטומציה, הן יופיעו כאן',
    },
    processed: { icon: '✅', title: 'אין קבלות מאושרות', sub: 'קבלות שתאשר יופיעו כאן' },
    ignored: { icon: '🗑️', title: 'אין קבלות שנדחו', sub: 'קבלות שתדחה יופיעו כאן' },
    all: { icon: '📬', title: 'התיבה ריקה', sub: 'עדיין לא התקבלו קבלות מהאוטומציה' },
  };
  const m = messages[status] || messages.all;

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <span className="text-5xl mb-4">{m.icon}</span>
      <h3 className="text-lg font-bold text-white mb-1">{m.title}</h3>
      <p className="text-sm text-white/40 max-w-xs">{m.sub}</p>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function ReceiptsInboxPage() {
  const [statusFilter, setStatusFilter] = useState<ReceiptStatus | 'all'>('pending');
  const [approvingReceipt, setApprovingReceipt] = useState<PendingReceipt | null>(null);

  const { data: response, isLoading, error } = useReceipts(statusFilter);
  const approveMutation = useApproveReceipt();
  const ignoreMutation = useIgnoreReceipt();
  const reopenMutation = useReopenReceipt();

  const receipts = response?.data || [];
  const summary = response?.summary || { pending: 0, processed: 0, ignored: 0 };

  function handleApprove(data: ApproveReceiptInput) {
    if (!approvingReceipt) return;
    approveMutation.mutate(
      { id: approvingReceipt.id, data },
      {
        onSuccess: () => {
          toast.success('הקבלה אושרה ונרשמה כהוצאה');
          setApprovingReceipt(null);
        },
        onError: (err) => toast.error(`שגיאה: ${err.message}`),
      }
    );
  }

  function handleIgnore(id: string) {
    ignoreMutation.mutate(id, {
      onSuccess: () => toast.success('הקבלה נדחתה'),
      onError: (err) => toast.error(`שגיאה: ${err.message}`),
    });
  }

  function handleReopen(id: string) {
    reopenMutation.mutate(id, {
      onSuccess: () => toast.success('הקבלה שוחזרה'),
      onError: (err) => toast.error(`שגיאה: ${err.message}`),
    });
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {summary.pending > 0 && (
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(37,99,235,0.15)', color: '#60a5fa' }}
            >
              {summary.pending} חדשות
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-white text-right">תיבת קבלות</h1>
            <p className="text-sm text-white/40 text-right">Gmail → Drive → Junkie</p>
          </div>
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(37,99,235,0.05))',
              border: '1px solid rgba(37,99,235,0.2)',
            }}
          >
            <Inbox className="w-6 h-6 text-blue-400" />
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'ממתינות', value: summary.pending, color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
          { label: 'אושרו', value: summary.processed, color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
          { label: 'נדחו', value: summary.ignored, color: '#6B7280', bg: 'rgba(107,114,128,0.1)' },
        ].map((c) => (
          <div
            key={c.label}
            className="p-3 rounded-xl text-center"
            style={{ background: c.bg, border: `1px solid ${c.color}20` }}
          >
            <p className="text-2xl font-extrabold" style={{ color: c.color }}>{c.value}</p>
            <p className="text-xs text-white/50 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Status tabs — iOS segmented control */}
      <div
        className="flex p-1 rounded-2xl"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setStatusFilter(t.value)}
            className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
            style={
              statusFilter === t.value
                ? { background: 'rgba(255,255,255,0.12)', color: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }
                : { color: 'rgba(255,255,255,0.4)' }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-red-400 text-sm">שגיאה בטעינת הקבלות</p>
        </div>
      ) : receipts.length === 0 ? (
        <EmptyInbox status={statusFilter} />
      ) : (
        <div className="space-y-2">
          {receipts.map((r) => (
            <ReceiptRow
              key={r.id}
              receipt={r}
              onApprove={() => setApprovingReceipt(r)}
              onIgnore={() => handleIgnore(r.id)}
              onReopen={() => handleReopen(r.id)}
            />
          ))}
        </div>
      )}

      {/* Approve Modal */}
      {approvingReceipt && (
        <ApproveModal
          receipt={approvingReceipt}
          onClose={() => setApprovingReceipt(null)}
          onApprove={handleApprove}
          isLoading={approveMutation.isPending}
        />
      )}

      {/* Webhook info footer */}
      <div
        className="p-4 rounded-xl text-right space-y-2"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2 justify-end">
          <p className="text-sm font-semibold text-white/60">הגדרת אוטומציה</p>
          <ScanSearch className="w-4 h-4 text-white/40" />
        </div>
        <p className="text-xs text-white/30 leading-relaxed" dir="ltr">
          POST /api/v1/webhooks/receipts?token=YOUR_TOKEN
          <br />
          {'{ "drive_file_url": "...", "file_name": "...", "extracted_amount": 123 }'}
        </p>
      </div>
    </div>
  );
}
