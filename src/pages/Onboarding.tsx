import { useState, useEffect, useRef, useCallback } from 'react';
import api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';
import {
  Wallet, TrendingUp, Users, AlertTriangle,
  Gamepad2, UtensilsCrossed, ChevronLeft, Check, Brain,
  Sparkles, ShieldCheck, Rocket, X, Send,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * InputMode controls what the bottom action area renders.
 * The AI engine sets this after every response, driving the dynamic conversation.
 */
type InputMode =
  | 'financial_cards'   // 3 categorised number inputs
  | 'context_notes'     // optional freeform background notes (crypto, debts, etc.)
  | 'joy_cards'         // 2-card joy comparison
  | 'model_slider'      // 3 budget model selection cards
  | 'text'              // free-form chat input (anomaly intervention)
  | 'none'              // AI is thinking / transitioning
  | 'summary';          // interview complete — show goals card + CTA

interface ConvoMessage {
  id: string;
  role: 'ai' | 'user';
  text: string;
}

/**
 * MemoryEntry: one slot in the rolling 5-message context buffer.
 * Future integration: pass memory.slice(-5) as `messages` to backend chat API.
 */
interface MemoryEntry {
  role: 'ai' | 'user';
  text: string;
}

interface FinancialState {
  liquid: number | null;
  locked: number | null;
  receivables: number | null;
  contextNotes: string | null;
  joyChoice: 'playstation' | 'restaurant' | null;
  selectedModel: 'realistic' | 'pessimistic' | 'optimistic' | null;
}

interface GoalsSummary {
  emergencyFund: number;
  monthlyIncomeGoal: number;
  monthlySavingsTarget: number;
  chosenModel: 'realistic' | 'pessimistic' | 'optimistic';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(n);

const uid = () => Math.random().toString(36).slice(2, 9);

/**
 * Parses a free-text message to extract a financial amount and which of the
 * 3 cards it belongs to. Used by the hybrid inline chat during financial_cards mode.
 * Returns a partial update to FinancialState (only the fields detected).
 */
function parseInlineFinancialText(text: string): Partial<Pick<FinancialState, 'liquid' | 'locked' | 'receivables'>> {
  // Extract first number — handles commas and optional K/k suffix
  const numMatch = text.match(/(\d[\d,]*)\s*([KkK])?/);
  if (!numMatch) return {};

  const amount = parseInt(numMatch[1].replace(/,/g, ''), 10) * (numMatch[2] ? 1000 : 1);
  if (!amount || isNaN(amount)) return {};

  // Detect category by Hebrew + English keywords
  if (text.includes('חייב') || text.includes('מגיע') || text.includes('גביה') || text.includes('חוב') ||
      /owed|owes|debt|receivable/i.test(text)) {
    return { receivables: amount };
  }
  if (text.includes('בנק') || text.includes('נזיל') || text.includes('חשבון') ||
      /cash|bank|checking/i.test(text)) {
    return { liquid: amount };
  }
  if (text.includes('השקע') || text.includes('פנסי') || text.includes('קרן') ||
      text.includes('מניה') || text.includes('קריפטו') ||
      /invest|stock|pension|crypto|portfolio/i.test(text)) {
    return { locked: amount };
  }
  return {};
}

// ─── AI Engine (Simulated — ready for backend replacement) ───────────────────

type AIEvent = 'financial_complete' | 'text_reply' | 'joy_chosen' | 'model_selected' | 'inline_financial_text';

interface AIResponse {
  text: string;
  nextMode: InputMode;
  summaryData?: GoalsSummary;
}

/**
 * Simulated AI response engine.
 *
 * ROLLING MEMORY: The `memory` parameter contains the last ≤5 interactions
 * (both AI and User turns). This is used to detect back-references like
 * "that amount", "the second option", "change what I just typed", etc.
 *
 * TO CONNECT BACKEND: Replace the switch body with a fetch/axios call to
 * POST /api/v1/chat, passing { event, financial, context: memory.slice(-5) }.
 * The response shape stays the same: { text, nextMode, summaryData? }.
 */
function simulateAI(
  event: AIEvent,
  financial: FinancialState,
  memory: MemoryEntry[]
): AIResponse {
  // Build context string from last 5 messages for reference detection
  const ctx = memory
    .slice(-5)
    .map((m) => `[${m.role === 'ai' ? 'AI' : 'User'}] ${m.text}`)
    .join(' · ');
  const ctxLower = ctx.toLowerCase();

  switch (event) {
    case 'financial_complete': {
      const { liquid, locked, receivables } = financial;

      // Anomaly detection: very low liquid relative to locked assets
      const hasAnomaly =
        liquid !== null &&
        locked !== null &&
        locked > 0 &&
        liquid < locked * 0.08 &&
        liquid < 20000;

      if (hasAnomaly) {
        return {
          text: `עצור נדב. ${fmt(locked!)} בהשקעות — מרשים. אבל ${fmt(liquid!)} בעו״ש? אם מחר תצטרך כסף, תמשוך בהפסד. מה הסיטואציה — זה מכוון?`,
          nextMode: 'text',
        };
      }

      return {
        text: `יפה. ${fmt(liquid!)} נזיל, ${fmt(locked!)} נעול, ו-${fmt(receivables!)} חייבים לך. בסיס טוב. לפני שממשיכים — יש משהו שחשוב שאדע? קריפטו שאתה מתעלם ממנו, חוב, רכוש, או כל הקשר שמשפיע על התמונה.`,
        nextMode: 'context_notes',
      };
    }

    case 'text_reply': {
      // Post-anomaly intervention — context includes the "מסוכן" warning
      if (ctxLower.includes('מסוכן') || ctxLower.includes('הפסד') || ctxLower.includes('עו״ש')) {
        return {
          text: 'הבנתי, לוקח את זה בחשבון בתוכנית. יש עוד הקשר שחשוב שאדע?',
          nextMode: 'context_notes',
        };
      }

      // Generic open-ended follow-up (AI "remembers" previous exchange)
      return {
        text: 'מעניין. נשמור את זה. יש עוד הקשר שחשוב שאדע?',
        nextMode: 'context_notes',
      };
    }

    case 'inline_financial_text': {
      const { liquid, locked, receivables } = financial;
      const filledLabels = [
        liquid !== null && 'עו״ש',
        locked !== null && 'השקעות',
        receivables !== null && 'חייבים לי',
      ].filter(Boolean).join(', ');

      const ack = filledLabels ? `הבנתי — ${filledLabels} נרשם. ` : 'שמרתי את ההקשר. ';

      const remaining = [
        liquid === null && 'עו״ש',
        locked === null && 'השקעות',
        receivables === null && 'כמה חייבים לך',
      ].filter(Boolean) as string[];

      return {
        text: `${ack}נשאר: ${remaining.join(', ')}. אפשר בלחיצה על הכפתור או להמשיך בטקסט.`,
        nextMode: 'financial_cards',
      };
    }

    case 'joy_chosen': {
      const isRestaurant = financial.joyChoice === 'restaurant';
      const joyInsight = isRestaurant
        ? 'חוויות חברתיות הן ה-ROI הפסיכולוגי שלך — לא חותכים שם.'
        : 'בידור עצמי נותן לך אנרגיה לעסק. זה בתקציב, לא בחוץ.';
      return {
        text: `${joyInsight} עכשיו בוא נקבע יעד. נגיד חופשה ב-5,000 ₪ — צריך להכניס עוד כסף החודש. בחר מודל:`,
        nextMode: 'model_slider',
      };
    }

    case 'model_selected': {
      const incomeMap = { realistic: 26000, pessimistic: 22000, optimistic: 32000 } as const;
      const income = incomeMap[financial.selectedModel!];
      const savings = Math.round((income * 0.25) / 500) * 500;
      const emergencyFund = Math.max(
        50000,
        Math.round(((financial.liquid || 0) * 3) / 5000) * 5000
      );

      return {
        text: `מצוין. הגדרנו יחד את המסגרת הפיננסית שלך. מעכשיו אני ה-CFO שלך — עוקב, מנתח, ומתריע. יאללה נתחיל.`,
        nextMode: 'summary',
        summaryData: {
          emergencyFund,
          monthlyIncomeGoal: income,
          monthlySavingsTarget: savings,
          chosenModel: financial.selectedModel!,
        },
      };
    }
  }
}

// ─── Lottie placeholder (processing animation) ────────────────────────────────

const PROCESSING_LOTTIE: Record<string, unknown> = {
  v: '5.5.7', fr: 30, ip: 0, op: 60, w: 200, h: 200,
  nm: 'loading', ddd: 0, assets: [],
  layers: [
    {
      ddd: 0, ind: 1, ty: 4, nm: 'circle', sr: 1, ks: {
        o: { a: 1, k: [{ t: 0, s: [30], e: [100] }, { t: 30, s: [100], e: [30] }, { t: 60, s: [30] }] },
        r: { a: 0, k: 0 }, p: { a: 0, k: [100, 100, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [{ t: 0, s: [80, 80, 100], e: [110, 110, 100] }, { t: 30, s: [110, 110, 100], e: [80, 80, 100] }, { t: 60, s: [80, 80, 100] }] },
      },
      ao: 0, shapes: [
        { ty: 'el', d: 1, s: { a: 0, k: [80, 80] }, p: { a: 0, k: [0, 0] }, nm: 'ellipse' },
        { ty: 'st', c: { a: 0, k: [0.145, 0.388, 0.922, 1] }, o: { a: 0, k: 100 }, w: { a: 0, k: 3 }, lc: 2, lj: 2, nm: 'stroke' },
        { ty: 'fl', c: { a: 0, k: [0.145, 0.388, 0.922, 0.15] }, o: { a: 0, k: 100 }, r: 1, nm: 'fill' },
      ], ip: 0, op: 60, st: 0,
    },
    {
      ddd: 0, ind: 2, ty: 4, nm: 'inner', sr: 1, ks: {
        o: { a: 1, k: [{ t: 0, s: [100], e: [40] }, { t: 30, s: [40], e: [100] }, { t: 60, s: [100] }] },
        r: { a: 1, k: [{ t: 0, s: [0], e: [360] }, { t: 60, s: [360] }] },
        p: { a: 0, k: [100, 100, 0] }, a: { a: 0, k: [0, 0, 0] },
        s: { a: 0, k: [100, 100, 100] },
      },
      ao: 0, shapes: [
        { ty: 'el', d: 1, s: { a: 0, k: [40, 40] }, p: { a: 0, k: [0, 0] }, nm: 'ellipse' },
        {
          ty: 'st', c: { a: 0, k: [0.02, 0.43, 1, 1] }, o: { a: 0, k: 100 }, w: { a: 0, k: 2 },
          lc: 2, lj: 2,
          d: [{ n: 'd', nm: 'dash', v: { a: 0, k: 8 } }, { n: 'g', nm: 'gap', v: { a: 0, k: 6 } }, { n: 'o', nm: 'offset', v: { a: 0, k: 0 } }],
          nm: 'stroke',
        },
      ], ip: 0, op: 60, st: 0,
    },
  ],
};

// ─── Framer Motion Variants ───────────────────────────────────────────────────

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const messageVariant = {
  initial: { opacity: 0, y: 16, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: EASE } },
};

const cardVariant = {
  initial: { opacity: 0, y: 24 },
  animate: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.45, ease: EASE },
  }),
};

const bottomSheetVariant = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
  exit: { opacity: 0, y: 40, transition: { duration: 0.25 } },
};

// ─── TypingIndicator ──────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-1.5 px-4 py-3 rounded-2xl w-fit mb-3"
      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full"
          style={{ background: 'rgba(255,255,255,0.4)' }}
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
          transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
        />
      ))}
    </motion.div>
  );
}

// ─── Chat Bubble ──────────────────────────────────────────────────────────────

function ChatBubble({ msg }: { msg: ConvoMessage }) {
  const isAi = msg.role === 'ai';
  return (
    <motion.div
      variants={messageVariant}
      initial="initial"
      animate="animate"
      className={`flex ${isAi ? 'justify-start' : 'justify-end'} mb-3`}
    >
      <div
        className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isAi ? 'rounded-br-md' : 'rounded-bl-md'
        }`}
        style={
          isAi
            ? { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.9)' }
            : { background: 'linear-gradient(135deg, #2563EB, #056dff)', color: '#fff' }
        }
      >
        {msg.text}
      </div>
    </motion.div>
  );
}

// ─── NumpadSheet ──────────────────────────────────────────────────────────────

function NumpadSheet({
  label,
  onSubmit,
  onCancel,
}: {
  label: string;
  onSubmit: (val: number) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState('');
  const valueRef = useRef(value);
  useEffect(() => { valueRef.current = value; }, [value]);

  // Keyboard support — digits, Backspace, Enter
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        setValue(v => v.length < 9 ? v + e.key : v);
      } else if (e.key === 'Backspace') {
        setValue(v => v.slice(0, -1));
      } else if (e.key === 'Enter') {
        const n = parseInt(valueRef.current, 10);
        if (n > 0) onSubmit(n);
      } else if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onSubmit, onCancel]);

  const handleKey = (k: string) => {
    if (k === 'del') return setValue((v) => v.slice(0, -1));
    if (k === 'submit') {
      const n = parseInt(value, 10);
      if (n > 0) onSubmit(n);
      return;
    }
    if (value.length < 9) setValue((v) => v + k);
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '00', 'del'];

  return (
    <motion.div
      variants={bottomSheetVariant}
      initial="initial"
      animate="animate"
      exit="exit"
      className="fixed inset-x-0 bottom-0 z-50 p-4 pb-8"
      style={{
        background: 'linear-gradient(180deg, rgba(13,17,23,0.97) 0%, #0D1117 100%)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(24px)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-white/90">{label}</h3>
        <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
          <X size={18} className="text-white/50" />
        </button>
      </div>

      <div
        className="text-center text-3xl font-bold mb-5 py-3 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.04)', color: value ? '#fff' : 'rgba(255,255,255,0.2)' }}
      >
        {value ? fmt(parseInt(value, 10)) : '0 ₪'}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {keys.map((k) => (
          <button
            key={k}
            onClick={() => handleKey(k)}
            className="py-3.5 rounded-xl text-lg font-semibold transition-all active:scale-95"
            style={{
              background: k === 'del' ? 'rgba(244,63,94,0.15)' : 'rgba(255,255,255,0.06)',
              color: k === 'del' ? '#F43F5E' : '#fff',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {k === 'del' ? '⌫' : k}
          </button>
        ))}
      </div>

      <button
        onClick={() => handleKey('submit')}
        disabled={!value || parseInt(value, 10) === 0}
        className="w-full py-3.5 rounded-xl text-base font-bold transition-all active:scale-[0.98]"
        style={{
          background:
            value && parseInt(value, 10) > 0
              ? 'linear-gradient(135deg, #2563EB, #056dff)'
              : 'rgba(37,99,235,0.25)',
          color: '#fff',
          boxShadow: value ? '0 4px 20px rgba(37,99,235,0.4)' : 'none',
          cursor: value && parseInt(value, 10) > 0 ? 'pointer' : 'not-allowed',
        }}
      >
        אישור
      </button>
    </motion.div>
  );
}

// ─── TerminalText ─────────────────────────────────────────────────────────────

function TerminalText() {
  const lines = [
    '> סורק היסטוריית עסקאות...',
    '> מנתח דפוסי הוצאה...',
    '> מזהה קטגוריות מובילות...',
    '> בונה פרופיל ROI פסיכולוגי...',
    '> מחשב ניקוד סיכון אישי...',
    '> בונה מודל חיזוי...',
  ];
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    if (visible >= lines.length) return;
    const t = setTimeout(() => setVisible((v) => v + 1), 380);
    return () => clearTimeout(t);
  }, [visible, lines.length]);

  return (
    <div className="text-start space-y-1.5 font-mono text-xs" style={{ color: 'rgba(37,180,140,0.85)' }}>
      {lines.slice(0, visible).map((line, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          {line}
          {i === visible - 1 && (
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              className="inline-block w-2 h-3.5 ms-1 align-middle"
              style={{ background: 'rgba(37,180,140,0.8)' }}
            />
          )}
        </motion.div>
      ))}
    </div>
  );
}

// ─── GoalsSummaryCard ─────────────────────────────────────────────────────────

function GoalsSummaryCard({ summary }: { summary: GoalsSummary }) {
  const modelLabel = {
    realistic: 'מציאותי',
    pessimistic: 'שמרני',
    optimistic: 'אגרסיבי',
  };

  const goals = [
    {
      icon: ShieldCheck,
      label: 'יעד קרן חירום',
      value: fmt(summary.emergencyFund),
      sub: 'רזרבה נזילה — כיסוי 3 חודשי הוצאות',
      color: '#00C48C',
      progress: 38,
    },
    {
      icon: TrendingUp,
      label: 'יעד הכנסה חודשי',
      value: fmt(summary.monthlyIncomeGoal),
      sub: `מודל ${modelLabel[summary.chosenModel]} · מבוסס על ההיסטוריה שלך`,
      color: '#2563EB',
      progress: 62,
    },
    {
      icon: Wallet,
      label: 'יעד חיסכון / השקעה',
      value: `${fmt(summary.monthlySavingsTarget)} / חודש`,
      sub: '25% מיעד ההכנסה החודשי',
      color: '#F59E0B',
      progress: 20,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="rounded-2xl p-4 space-y-3"
      style={{
        background: 'linear-gradient(145deg, rgba(37,99,235,0.12), rgba(5,109,255,0.06))',
        border: '1px solid rgba(37,99,235,0.28)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="flex items-center gap-2">
        <Sparkles size={15} style={{ color: '#60A5FA' }} />
        <span className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.92)' }}>
          היעדים החדשים שלך
        </span>
      </div>

      {goals.map((goal, i) => (
        <motion.div
          key={goal.label}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 + i * 0.13, duration: 0.4, ease: EASE }}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${goal.color}1A` }}
          >
            <goal.icon size={18} style={{ color: goal.color }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.75)' }}>
                {goal.label}
              </span>
              <span className="text-sm font-extrabold shrink-0" style={{ color: goal.color }}>
                {goal.value}
              </span>
            </div>
            <p className="text-[10px] mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {goal.sub}
            </p>
            {/* Animated progress bar */}
            <div
              className="mt-1.5 h-1 rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${goal.progress}%` }}
                transition={{ delay: 0.5 + i * 0.13, duration: 0.7, ease: EASE }}
                className="h-full rounded-full"
                style={{ background: goal.color }}
              />
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function Onboarding() {
  const [messages, setMessages] = useState<ConvoMessage[]>([]);
  /**
   * inputMode is the single source of truth for what the bottom area renders.
   * Set by the AI engine after each response — drives the dynamic conversation.
   */
  const [inputMode, setInputMode] = useState<InputMode>('none');
  const [typing, setTyping] = useState(false);
  const [financial, setFinancial] = useState<FinancialState>({
    liquid: null, locked: null, receivables: null,
    contextNotes: null, joyChoice: null, selectedModel: null,
  });
  const [numpadTarget, setNumpadTarget] = useState<'liquid' | 'locked' | 'receivables' | null>(null);
  const [textInput, setTextInput] = useState('');
  const [showSplash, setShowSplash] = useState(true);
  const [showProcessing, setShowProcessing] = useState(false);
  const [goalsSummary, setGoalsSummary] = useState<GoalsSummary | null>(null);

  /**
   * Rolling 5-message memory buffer.
   * Stored in a ref (no re-render needed on change).
   * Read synchronously inside fireAI before each AI call.
   */
  const memoryRef = useRef<MemoryEntry[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Keep a ref to financial so the save effect always reads the latest values
  const financialRef = useRef(financial);
  useEffect(() => { financialRef.current = financial; }, [financial]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  // When summary is set, persist goals → app_settings and balances/notes → cfo_memory
  useEffect(() => {
    if (!goalsSummary) return;
    const fin = financialRef.current;
    Promise.all([
      api.put('/settings', {
        monthly_income_goal: goalsSummary.monthlyIncomeGoal,
        monthly_savings_goal: goalsSummary.monthlySavingsTarget,
        emergency_fund_target: goalsSummary.emergencyFund,
        emergency_fund_months: 3,
      }),
      api.put('/memory', {
        balances: {
          bank: fin.liquid ?? 0,
          pension: fin.locked ?? 0,
          emergency_fund: 0,
          investments: 0,
        },
        ...(fin.contextNotes ? { strategic_notes: fin.contextNotes } : {}),
      }),
    ]).catch(console.error);
  }, [goalsSummary]); // eslint-disable-line react-hooks/exhaustive-deps

  // Add to rolling memory (always keeps last 5 entries)
  const addToMemory = useCallback((role: 'ai' | 'user', text: string) => {
    memoryRef.current = [...memoryRef.current, { role, text }].slice(-5);
  }, []);

  // Append an AI message after a typing-indicator delay
  const addAiMessage = useCallback(
    (text: string, delay = 1200): Promise<void> =>
      new Promise((resolve) => {
        setTyping(true);
        setTimeout(() => {
          setTyping(false);
          setMessages((prev) => [...prev, { id: uid(), role: 'ai', text }]);
          addToMemory('ai', text);
          resolve();
        }, delay);
      }),
    [addToMemory]
  );

  const addUserMessage = useCallback(
    (text: string) => {
      setMessages((prev) => [...prev, { id: uid(), role: 'user', text }]);
      addToMemory('user', text);
    },
    [addToMemory]
  );

  /**
   * Fire an AI event: reads the current memory buffer, calls the AI engine,
   * appends the response message, and transitions inputMode.
   */
  const fireAI = useCallback(
    async (event: AIEvent, fin: FinancialState) => {
      const response = simulateAI(event, fin, memoryRef.current);
      await addAiMessage(response.text);
      if (response.summaryData) setGoalsSummary(response.summaryData);
      setInputMode(response.nextMode);
    },
    [addAiMessage]
  );

  // ── Initial splash → first AI messages ─────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(async () => {
      setShowSplash(false);
      await new Promise((r) => setTimeout(r, 400));
      await addAiMessage(
        'תקשיב נדב, בוא נעשה סדר. נגמרו הטפסים המשעממים. כמה שאלות ואני בונה לך תוכנית.',
        1500
      );
      await addAiMessage(
        'קודם כל, מפה לי את העולם הפיננסי שלך — כמה יש לך בכל קטגוריה?',
        1000
      );
      setInputMode('financial_cards');
    }, 3000);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handle numpad submit (financial cards) ──────────────────────────────────
  const handleNumpadSubmit = useCallback(
    async (val: number) => {
      if (!numpadTarget) return;
      const labels: Record<string, string> = {
        liquid: 'עו״ש (נזיל)',
        locked: 'השקעות (נעול)',
        receivables: 'חייבים לי',
      };
      const next = { ...financial, [numpadTarget]: val };
      setFinancial(next);
      addUserMessage(`${labels[numpadTarget]}: ${fmt(val)}`);
      setNumpadTarget(null);

      // All 3 filled → brief Lottie "analysis" animation, then AI response
      if (next.liquid !== null && next.locked !== null && next.receivables !== null) {
        setInputMode('none');
        setShowProcessing(true);
        await new Promise((r) => setTimeout(r, 2600));
        setShowProcessing(false);
        await fireAI('financial_complete', next);
      }
    },
    [numpadTarget, financial, addUserMessage, fireAI]
  );

  // ── Handle free-text reply ──────────────────────────────────────────────────
  const handleTextSubmit = useCallback(async () => {
    const text = textInput.trim();
    if (!text) return;
    setTextInput('');
    addUserMessage(text);
    setInputMode('none');
    await fireAI('text_reply', financial);
  }, [textInput, financial, addUserMessage, fireAI]);

  // ── Inline financial text (free-text input alongside cards) ────────────────
  const [inlineFinancialText, setInlineFinancialText] = useState('');

  const handleInlineFinancialText = useCallback(async () => {
    const text = inlineFinancialText.trim();
    if (!text) return;
    setInlineFinancialText('');
    addUserMessage(text);

    // Parse for amounts + category, then merge into state
    const parsed = parseInlineFinancialText(text);
    const next: FinancialState = {
      ...financial,
      ...(parsed.liquid !== undefined ? { liquid: parsed.liquid } : {}),
      ...(parsed.locked !== undefined ? { locked: parsed.locked } : {}),
      ...(parsed.receivables !== undefined ? { receivables: parsed.receivables } : {}),
      // Always append the raw text to contextNotes so qualifiers ("חוב מפוקפק", etc.) are preserved
      contextNotes: financial.contextNotes ? `${financial.contextNotes}; ${text}` : text,
    };
    setFinancial(next);

    if (next.liquid !== null && next.locked !== null && next.receivables !== null) {
      setInputMode('none');
      setShowProcessing(true);
      await new Promise((r) => setTimeout(r, 2600));
      setShowProcessing(false);
      await fireAI('financial_complete', next);
    } else {
      await fireAI('inline_financial_text', next);
    }
  }, [inlineFinancialText, financial, addUserMessage, fireAI]);

  // ── Handle context notes (optional freeform background) ─────────────────────
  const [contextInput, setContextInput] = useState('');
  const handleContextSubmit = useCallback(async (skip = false) => {
    const text = skip ? null : contextInput.trim() || null;
    setContextInput('');
    if (text) {
      addUserMessage(text);
    } else {
      addUserMessage('דלג');
    }
    const next = { ...financial, contextNotes: text };
    setFinancial(next);
    setInputMode('none');
    await addAiMessage('הבנתי. שאלה אחרונה לפני שאני בונה לך את התוכנית:', 800);
    setInputMode('joy_cards');
  }, [contextInput, financial, addUserMessage, addAiMessage]);

  // ── Handle joy choice ───────────────────────────────────────────────────────
  const handleJoyChoice = useCallback(
    async (choice: 'playstation' | 'restaurant') => {
      const labels = { playstation: 'פלייסטיישן 🎮', restaurant: 'מסעדה 🍽️' };
      addUserMessage(`${labels[choice]} — זה מה שנתן לי יותר ג'וי`);
      const next = { ...financial, joyChoice: choice };
      setFinancial(next);
      setInputMode('none');
      await fireAI('joy_chosen', next);
    },
    [financial, addUserMessage, fireAI]
  );

  // ── Handle model selection ──────────────────────────────────────────────────
  const handleModelSelect = useCallback(
    async (model: 'realistic' | 'pessimistic' | 'optimistic') => {
      const labels = { realistic: 'מציאותי', pessimistic: 'פסימי (בטוח)', optimistic: 'אופטימי (סיכון)' };
      addUserMessage(`בחרתי: ${labels[model]}`);
      const next = { ...financial, selectedModel: model };
      setFinancial(next);
      setInputMode('none');
      await fireAI('model_selected', next);
    },
    [financial, addUserMessage, fireAI]
  );

  const filledCount = [financial.liquid, financial.locked, financial.receivables].filter(
    (v) => v !== null
  ).length;

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{ background: '#080B14' }}
    >
      {/* Background gradient blobs */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 30% -10%, rgba(37,99,235,0.15) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 80% 110%, rgba(5,109,255,0.1) 0%, transparent 50%)',
        }}
      />

      {/* ── Splash ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="splash"
            className="absolute inset-0 z-50 flex flex-col items-center justify-center"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.6 } }}
          >
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center gap-4"
            >
              <motion.div
                animate={{
                  boxShadow: [
                    '0 0 30px rgba(37,99,235,0.25)',
                    '0 0 60px rgba(5,109,255,0.45)',
                    '0 0 30px rgba(37,99,235,0.25)',
                  ],
                }}
                transition={{ repeat: Infinity, duration: 2.5 }}
                style={{
                  width: 96, height: 96, borderRadius: 28,
                  background: 'linear-gradient(135deg, #2563EB, #056dff)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Brain size={48} className="text-white" strokeWidth={1.5} />
              </motion.div>
              <motion.h1 className="text-4xl font-bold tracking-tight" style={{ color: '#fff' }}>
                Junkie
              </motion.h1>
              <motion.p
                className="text-sm"
                style={{ color: 'rgba(255,255,255,0.45)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                ה-CFO האישי שלך
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header bar ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {!showSplash && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 flex items-center gap-3 px-5 pt-5 pb-3"
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #2563EB, #056dff)' }}
            >
              <Brain size={20} className="text-white" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white/90">Junkie CFO</h2>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {typing ? 'מקליד...' : 'מקוון'}
              </p>
            </div>

            {/* Progress indicator dots — driven by inputMode transitions */}
            <div className="flex items-center gap-1.5 ms-auto">
              {(
                [
                  { key: 'financial_cards', done: filledCount === 3 },
                  { key: 'joy_cards', done: financial.joyChoice !== null },
                  { key: 'model_slider', done: financial.selectedModel !== null },
                  { key: 'summary', done: goalsSummary !== null },
                ] as const
              ).map(({ key, done }) => (
                <div
                  key={key}
                  className="h-1.5 rounded-full transition-all duration-500"
                  style={{
                    width: inputMode === key ? 20 : 6,
                    background:
                      done || inputMode === key
                        ? '#2563EB'
                        : 'rgba(255,255,255,0.15)',
                    borderRadius: 99,
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Chat area ───────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 py-2">
        <AnimatePresence mode="popLayout">
          {messages.map((msg) => (
            <ChatBubble key={msg.id} msg={msg} />
          ))}
        </AnimatePresence>

        {typing && <TypingIndicator />}

        {/* Lottie processing — auto-triggered after financial cards complete */}
        <AnimatePresence>
          {showProcessing && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16, transition: { duration: 0.3 } }}
              className="flex flex-col items-center gap-4 py-8"
            >
              <div className="w-28 h-28">
                <Lottie animationData={PROCESSING_LOTTIE} loop />
              </div>
              <TerminalText />
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={chatEndRef} />
      </div>

      {/* ── Bottom action area — driven by inputMode ─────────────────────────── */}
      <div className="relative z-10">
        <AnimatePresence mode="wait">

          {/* FINANCIAL CARDS */}
          {inputMode === 'financial_cards' && (
            <motion.div
              key="financial-cards"
              variants={bottomSheetVariant}
              initial="initial"
              animate="animate"
              exit="exit"
              className="px-4 pb-6 pt-2 space-y-2"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-xs text-center mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
                בחר קטגוריה להזנת סכום ({filledCount}/3)
              </p>
              {[
                {
                  key: 'liquid' as const,
                  icon: Wallet,
                  label: 'עו״ש (נזיל)',
                  desc: 'כסף זמין בחשבון הבנק',
                  color: '#00C48C',
                  filled: financial.liquid,
                },
                {
                  key: 'locked' as const,
                  icon: TrendingUp,
                  label: 'השקעות (נעול)',
                  desc: 'קרנות, מניות, פנסיה',
                  color: '#2563EB',
                  filled: financial.locked,
                },
                {
                  key: 'receivables' as const,
                  icon: Users,
                  label: 'חייבים לי',
                  desc: 'כסף שמגיע לך מלקוחות',
                  color: '#F59E0B',
                  filled: financial.receivables,
                },
              ].map((item, i) => (
                <motion.button
                  key={item.key}
                  custom={i}
                  variants={cardVariant}
                  initial="initial"
                  animate="animate"
                  disabled={item.filled !== null}
                  onClick={() => setNumpadTarget(item.key)}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl transition-all active:scale-[0.98]"
                  style={{
                    background:
                      item.filled !== null
                        ? 'rgba(255,255,255,0.03)'
                        : 'rgba(255,255,255,0.055)',
                    border: `1px solid ${
                      item.filled !== null
                        ? 'rgba(255,255,255,0.06)'
                        : 'rgba(255,255,255,0.09)'
                    }`,
                    opacity: item.filled !== null ? 0.5 : 1,
                  }}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${item.color}18` }}
                  >
                    <item.icon size={22} style={{ color: item.color }} />
                  </div>
                  <div className="flex-1 text-start">
                    <div className="text-sm font-bold text-white/90">{item.label}</div>
                    <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {item.filled !== null ? fmt(item.filled) : item.desc}
                    </div>
                  </div>
                  {item.filled !== null ? (
                    <Check size={18} style={{ color: '#00C48C' }} />
                  ) : (
                    <ChevronLeft size={18} style={{ color: 'rgba(255,255,255,0.25)' }} />
                  )}
                </motion.button>
              ))}

              {/* Hybrid inline chat — always visible alongside cards */}
              <div className="pt-3 mt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div
                  className="flex items-center gap-2 rounded-2xl px-4 py-2"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <input
                    value={inlineFinancialText}
                    onChange={(e) => setInlineFinancialText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleInlineFinancialText()}
                    placeholder='או כתוב בחופשיות — "חייבים לי 10K אבל זה חוב מפוקפק"'
                    dir="rtl"
                    className="flex-1 bg-transparent text-xs outline-none py-2"
                    style={{ color: 'rgba(255,255,255,0.8)' }}
                  />
                  <button
                    onClick={handleInlineFinancialText}
                    disabled={!inlineFinancialText.trim()}
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all active:scale-90"
                    style={{
                      background: inlineFinancialText.trim()
                        ? 'linear-gradient(135deg, #2563EB, #056dff)'
                        : 'rgba(255,255,255,0.06)',
                    }}
                  >
                    <Send size={12} className="text-white" style={{ transform: 'scaleX(-1)' }} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* FREE TEXT INPUT (open-ended questions / anomaly intervention) */}
          {inputMode === 'text' && (
            <motion.div
              key="text-input"
              variants={bottomSheetVariant}
              initial="initial"
              animate="animate"
              exit="exit"
              className="px-4 pb-6 pt-3"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div
                className="flex items-center gap-2 rounded-2xl px-4 py-2"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <input
                  autoFocus
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                  placeholder="כתוב כאן..."
                  dir="rtl"
                  className="flex-1 bg-transparent text-sm text-white/90 placeholder-white/25 outline-none py-2"
                />
                <button
                  onClick={handleTextSubmit}
                  disabled={!textInput.trim()}
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all"
                  style={{
                    background: textInput.trim()
                      ? 'linear-gradient(135deg, #2563EB, #056dff)'
                      : 'rgba(255,255,255,0.08)',
                  }}
                >
                  <Send
                    size={14}
                    className="text-white"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                </button>
              </div>
            </motion.div>
          )}

          {/* CONTEXT NOTES — optional freeform background text */}
          {inputMode === 'context_notes' && (
            <motion.div
              key="context-notes"
              variants={bottomSheetVariant}
              initial="initial"
              animate="animate"
              exit="exit"
              className="px-4 pb-6 pt-3 space-y-3"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                לדוגמה: "יש לי 3,000 דולר בקריפטו אבל אני מתעלם מזה", "יש לי הלוואה של 50K", "אני עצמאי עם הכנסה עונתית"
              </p>
              <div
                className="flex items-end gap-2 rounded-2xl px-4 py-3"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <textarea
                  autoFocus
                  value={contextInput}
                  onChange={(e) => setContextInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleContextSubmit(false);
                    }
                  }}
                  placeholder="כתוב כאן... (Enter לשליחה, Shift+Enter לשורה חדשה)"
                  dir="rtl"
                  rows={3}
                  className="flex-1 bg-transparent text-sm text-white/90 placeholder-white/25 outline-none resize-none leading-relaxed"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleContextSubmit(false)}
                  disabled={!contextInput.trim()}
                  className="flex-1 py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98]"
                  style={{
                    background: contextInput.trim()
                      ? 'linear-gradient(135deg, #2563EB, #056dff)'
                      : 'rgba(37,99,235,0.25)',
                    color: '#fff',
                  }}
                >
                  שלח
                </button>
                <button
                  onClick={() => handleContextSubmit(true)}
                  className="px-5 py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.55)',
                  }}
                >
                  דלג
                </button>
              </div>
            </motion.div>
          )}

          {/* JOY COMPARISON CARDS */}
          {inputMode === 'joy_cards' && (
            <motion.div
              key="joy-cards"
              variants={bottomSheetVariant}
              initial="initial"
              animate="animate"
              exit="exit"
              className="px-4 pb-6 pt-4"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-xs text-center mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>
                מה נתן לך יותר ערך?
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    key: 'playstation' as const,
                    icon: Gamepad2,
                    label: 'פלייסטיישן',
                    amount: '200 ₪',
                    date: '12 בפברואר',
                    gradient:
                      'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))',
                    border: 'rgba(99,102,241,0.25)',
                    iconColor: '#818CF8',
                  },
                  {
                    key: 'restaurant' as const,
                    icon: UtensilsCrossed,
                    label: 'מסעדה',
                    amount: '200 ₪',
                    date: '15 בפברואר',
                    gradient:
                      'linear-gradient(135deg, rgba(251,146,60,0.15), rgba(245,158,11,0.1))',
                    border: 'rgba(251,146,60,0.25)',
                    iconColor: '#FB923C',
                  },
                ].map((item, i) => (
                  <motion.button
                    key={item.key}
                    custom={i}
                    variants={cardVariant}
                    initial="initial"
                    animate="animate"
                    onClick={() => handleJoyChoice(item.key)}
                    className="flex flex-col items-center gap-3 p-5 rounded-2xl transition-all active:scale-95 hover:brightness-110"
                    style={{
                      background: item.gradient,
                      border: `1px solid ${item.border}`,
                    }}
                  >
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.06)' }}
                    >
                      <item.icon size={28} style={{ color: item.iconColor }} />
                    </div>
                    <div className="text-sm font-bold text-white/90">{item.label}</div>
                    <div className="text-lg font-bold text-white">{item.amount}</div>
                    <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {item.date}
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* MODEL SLIDER (3-model budget selection) */}
          {inputMode === 'model_slider' && (
            <motion.div
              key="model-slider"
              variants={bottomSheetVariant}
              initial="initial"
              animate="animate"
              exit="exit"
              className="px-4 pb-6 pt-4 space-y-2.5"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-xs text-center mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
                בחר מודל תקציב
              </p>
              {[
                {
                  key: 'realistic' as const,
                  icon: ShieldCheck,
                  label: 'מציאותי',
                  desc: '5% מעל הממוצע שלך — קליל ואפשרי.',
                  tag: 'מומלץ',
                  color: '#00C48C',
                  tagBg: 'rgba(0,196,140,0.12)',
                },
                {
                  key: 'pessimistic' as const,
                  icon: AlertTriangle,
                  label: 'פסימי (בטוח)',
                  desc: 'גם בחודש הכי חלש שלך אתה מכסה.',
                  tag: 'שמרני',
                  color: '#F59E0B',
                  tagBg: 'rgba(245,158,11,0.12)',
                },
                {
                  key: 'optimistic' as const,
                  icon: Rocket,
                  label: 'אופטימי (סיכון)',
                  desc: 'קפיצה של 30% בהכנסות — חודש שיא.',
                  tag: 'סיכון',
                  color: '#F43F5E',
                  tagBg: 'rgba(244,63,94,0.12)',
                },
              ].map((item, i) => (
                <motion.button
                  key={item.key}
                  custom={i}
                  variants={cardVariant}
                  initial="initial"
                  animate="animate"
                  onClick={() => handleModelSelect(item.key)}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl transition-all active:scale-[0.98]"
                  style={{
                    background: 'rgba(255,255,255,0.055)',
                    border: '1px solid rgba(255,255,255,0.09)',
                  }}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${item.color}18` }}
                  >
                    <item.icon size={22} style={{ color: item.color }} />
                  </div>
                  <div className="flex-1 text-start">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-bold text-white/90">{item.label}</span>
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: item.tagBg, color: item.color }}
                      >
                        {item.tag}
                      </span>
                    </div>
                    <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {item.desc}
                    </div>
                  </div>
                  <ChevronLeft size={18} style={{ color: 'rgba(255,255,255,0.25)' }} />
                </motion.button>
              ))}
            </motion.div>
          )}

          {/* SUMMARY — goals card + CTA */}
          {inputMode === 'summary' && goalsSummary && (
            <motion.div
              key="summary"
              variants={bottomSheetVariant}
              initial="initial"
              animate="animate"
              exit="exit"
              className="px-4 pb-8 pt-4 space-y-4"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <GoalsSummaryCard summary={goalsSummary} />

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => { window.location.href = '/'; }}
                className="w-full py-4 rounded-2xl text-base font-bold flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, #2563EB, #056dff)',
                  color: '#fff',
                  boxShadow: '0 4px 24px rgba(37,99,235,0.5)',
                }}
              >
                <Sparkles size={18} />
                יאללה, נתחיל לעבוד
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* ── Numpad overlay ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {numpadTarget && (
          <>
            <motion.div
              key="numpad-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(0,0,0,0.5)' }}
              onClick={() => setNumpadTarget(null)}
            />
            <NumpadSheet
              label={
                numpadTarget === 'liquid'
                  ? 'כמה יש בעו״ש?'
                  : numpadTarget === 'locked'
                  ? 'כמה בהשקעות?'
                  : 'כמה חייבים לך?'
              }
              onSubmit={handleNumpadSubmit}
              onCancel={() => setNumpadTarget(null)}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
