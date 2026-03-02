/**
 * PARTNERSHIP MODULE — Fully Isolated State
 * Tracks income/expense splits between Nadav (65%) and David (35%).
 * No external dependencies on the rest of the app.
 */
import { createContext, useContext, useReducer, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export type Payer = 'nadav' | 'david';

export interface PartnershipSettings {
  taxRate: number;
  nadavSplit: number;
  davidSplit: number;
  defaultExpenseSplit: number;
  expenseCategories: string[];
}

export interface LinkedExpense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
}

export interface IncomeBreakdown {
  kind: 'income';
  linkedExpenseTotal: number; // sum of transaction-level costs
  effectiveGross: number;     // amount - linkedExpenseTotal
  taxAmount: number;          // 12% of effectiveGross
  netIncome: number;          // effectiveGross - taxAmount
  nadavShare: number;
  davidShare: number;
  nadavOwesDavidDelta: number;
  davidOwesNadavDelta: number;
}

export interface ExpenseBreakdown {
  kind: 'expense';
  category: string;
  paidBy: Payer;
  splitRatio: number;
  nadavShare: number;
  davidShare: number;
  offsetAgainstDebt: boolean;
  nadavOwesDavidDelta: number;
  davidOwesNadavDelta: number;
}

export type TxBreakdown = IncomeBreakdown | ExpenseBreakdown;

export interface PartnershipTx {
  id: string;
  type: 'income' | 'expense';
  date: string;
  description: string;
  amount: number;
  linkedExpenses?: LinkedExpense[]; // income only
  breakdown: TxBreakdown;
  createdAt: string;
}

export interface Settlement {
  id: string;
  date: string;
  description: string;
  nadavOwesDavidCleared: number;
  davidOwesNadavCleared: number;
  createdAt: string;
}

interface PartnershipState {
  transactions: PartnershipTx[];
  settlements: Settlement[];
  settings: PartnershipSettings;
}

interface EditTxPayload {
  id: string;
  description: string;
  amount: number;
  date: string;
  // expense only
  category?: string;
  paidBy?: Payer;
  splitRatio?: number;
  offsetAgainstDebt?: boolean;
}

type Action =
  | { type: 'ADD_TRANSACTION'; payload: PartnershipTx }
  | { type: 'DELETE_TRANSACTION'; payload: string }
  | { type: 'ADD_SETTLEMENT'; payload: Settlement }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<PartnershipSettings> }
  | { type: 'EDIT_TRANSACTION'; payload: EditTxPayload }
  | { type: 'ADD_LINKED_EXPENSE'; payload: { txId: string; expense: LinkedExpense } }
  | { type: 'REMOVE_LINKED_EXPENSE'; payload: { txId: string; expenseId: string } };

// ── Financial Logic Helpers ────────────────────────────────────────────────────

export function calcIncomeBreakdown(
  amount: number,
  settings: PartnershipSettings,
  linkedExpenses: LinkedExpense[] = []
): IncomeBreakdown {
  const linkedExpenseTotal = linkedExpenses.reduce((s, e) => s + e.amount, 0);
  const effectiveGross = Math.max(0, amount - linkedExpenseTotal);
  const taxAmount = effectiveGross * (settings.taxRate / 100);
  const netIncome = effectiveGross - taxAmount;
  const nadavShare = netIncome * (settings.nadavSplit / 100);
  const davidShare = netIncome * (settings.davidSplit / 100);
  return {
    kind: 'income',
    linkedExpenseTotal,
    effectiveGross,
    taxAmount,
    netIncome,
    nadavShare,
    davidShare,
    nadavOwesDavidDelta: davidShare,
    davidOwesNadavDelta: 0,
  };
}

export function calcExpenseBreakdown(
  amount: number,
  category: string,
  paidBy: Payer,
  splitRatio: number,
  offsetAgainstDebt: boolean
): ExpenseBreakdown {
  const nadavShare = amount * (splitRatio / 100);
  const davidShare = amount * ((100 - splitRatio) / 100);

  let nadavOwesDavidDelta = 0;
  let davidOwesNadavDelta = 0;

  if (paidBy === 'nadav') {
    if (offsetAgainstDebt) {
      nadavOwesDavidDelta = -davidShare;
    } else {
      davidOwesNadavDelta = davidShare;
    }
  } else {
    if (offsetAgainstDebt) {
      davidOwesNadavDelta = -nadavShare;
    } else {
      nadavOwesDavidDelta = nadavShare;
    }
  }

  return {
    kind: 'expense',
    category,
    paidBy,
    splitRatio,
    nadavShare,
    davidShare,
    offsetAgainstDebt,
    nadavOwesDavidDelta,
    davidOwesNadavDelta,
  };
}

// ── Mock Initial Data ─────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: PartnershipSettings = {
  taxRate: 12,
  nadavSplit: 65,
  davidSplit: 35,
  defaultExpenseSplit: 50,
  expenseCategories: [
    'שיווק ופרסום', 'תוכנות וכלים', 'פרילנסרים', 'ציוד', 'נסיעות',
    'ייעוץ', 'אחסון ענן', 'משרד', 'אחר',
  ],
};

function makeMockData(): { transactions: PartnershipTx[]; settlements: Settlement[] } {
  const s = DEFAULT_SETTINGS;
  // Income tx m7 has a linked expense (freelancer ₪400 on a ₪4200 project)
  const le1: LinkedExpense[] = [
    { id: 'le_m7_1', description: 'פרילנסר — עריכה', amount: 400, category: 'פרילנסרים', date: '2026-03-06' },
  ];

  const txs: PartnershipTx[] = [
    {
      id: 'm1', type: 'income', date: '2025-12-20',
      description: 'אתר לקוח — מרמלדה קפה', amount: 8000,
      breakdown: calcIncomeBreakdown(8000, s), createdAt: '2025-12-20T10:00:00Z',
    },
    {
      id: 'm2', type: 'income', date: '2026-01-15',
      description: 'סרטון שיווקי — BizCo', amount: 5000,
      breakdown: calcIncomeBreakdown(5000, s), createdAt: '2026-01-15T10:00:00Z',
    },
    {
      id: 'm3', type: 'expense', date: '2026-01-18',
      description: 'Adobe Creative Cloud', amount: 500,
      breakdown: calcExpenseBreakdown(500, 'תוכנות וכלים', 'nadav', 50, true),
      createdAt: '2026-01-18T12:00:00Z',
    },
    {
      id: 'm4', type: 'expense', date: '2026-01-25',
      description: 'פרסום Facebook — קמפיין ינואר', amount: 800,
      breakdown: calcExpenseBreakdown(800, 'שיווק ופרסום', 'nadav', 50, false),
      createdAt: '2026-01-25T14:00:00Z',
    },
    {
      id: 'm5', type: 'income', date: '2026-02-10',
      description: 'ייעוץ דיגיטל — StartupX', amount: 3500,
      breakdown: calcIncomeBreakdown(3500, s), createdAt: '2026-02-10T09:00:00Z',
    },
    {
      id: 'm6', type: 'expense', date: '2026-02-14',
      description: 'כלים מקצועיים — Figma Pro', amount: 350,
      breakdown: calcExpenseBreakdown(350, 'תוכנות וכלים', 'david', 50, false),
      createdAt: '2026-02-14T11:00:00Z',
    },
    {
      id: 'm7', type: 'income', date: '2026-03-05',
      description: 'מיתוג מחדש — TechStart', amount: 4200,
      linkedExpenses: le1,
      breakdown: calcIncomeBreakdown(4200, s, le1),
      createdAt: '2026-03-05T10:00:00Z',
    },
    {
      id: 'm8', type: 'expense', date: '2026-03-08',
      description: 'פרילנסר — צלם', amount: 600,
      breakdown: calcExpenseBreakdown(600, 'פרילנסרים', 'nadav', 50, true),
      createdAt: '2026-03-08T15:00:00Z',
    },
  ];

  return { transactions: txs, settlements: [] };
}

// ── Reducer ────────────────────────────────────────────────────────────────────

function reducer(state: PartnershipState, action: Action): PartnershipState {
  switch (action.type) {
    case 'ADD_TRANSACTION':
      return { ...state, transactions: [action.payload, ...state.transactions] };

    case 'DELETE_TRANSACTION':
      return { ...state, transactions: state.transactions.filter(t => t.id !== action.payload) };

    case 'ADD_SETTLEMENT':
      return { ...state, settlements: [action.payload, ...state.settlements] };

    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };

    case 'EDIT_TRANSACTION': {
      const p = action.payload;
      return {
        ...state,
        transactions: state.transactions.map(tx => {
          if (tx.id !== p.id) return tx;
          if (tx.type === 'income') {
            const linked = tx.linkedExpenses ?? [];
            return {
              ...tx,
              description: p.description,
              amount: p.amount,
              date: p.date,
              breakdown: calcIncomeBreakdown(p.amount, state.settings, linked),
            };
          } else {
            const b = tx.breakdown as ExpenseBreakdown;
            return {
              ...tx,
              description: p.description,
              amount: p.amount,
              date: p.date,
              breakdown: calcExpenseBreakdown(
                p.amount,
                p.category ?? b.category,
                p.paidBy ?? b.paidBy,
                p.splitRatio ?? b.splitRatio,
                p.offsetAgainstDebt ?? b.offsetAgainstDebt
              ),
            };
          }
        }),
      };
    }

    case 'ADD_LINKED_EXPENSE': {
      const { txId, expense } = action.payload;
      return {
        ...state,
        transactions: state.transactions.map(tx => {
          if (tx.id !== txId || tx.type !== 'income') return tx;
          const linked = [...(tx.linkedExpenses ?? []), expense];
          return {
            ...tx,
            linkedExpenses: linked,
            breakdown: calcIncomeBreakdown(tx.amount, state.settings, linked),
          };
        }),
      };
    }

    case 'REMOVE_LINKED_EXPENSE': {
      const { txId, expenseId } = action.payload;
      return {
        ...state,
        transactions: state.transactions.map(tx => {
          if (tx.id !== txId || tx.type !== 'income') return tx;
          const linked = (tx.linkedExpenses ?? []).filter(e => e.id !== expenseId);
          return {
            ...tx,
            linkedExpenses: linked,
            breakdown: calcIncomeBreakdown(tx.amount, state.settings, linked),
          };
        }),
      };
    }

    default:
      return state;
  }
}

// ── Context ────────────────────────────────────────────────────────────────────

interface ComputedValues {
  totalIncome: number;
  totalExpenses: number;
  grossProfit: number;
  taxReserve: number;
  afterTaxProfit: number;
  nadavNet: number;
  davidNet: number;
  nadavOwesDavid: number;
  davidOwesNadav: number;
}

interface PartnershipContextValue {
  state: PartnershipState;
  dispatch: React.Dispatch<Action>;
  computed: ComputedValues;
  computedForMonth: (month: string | 'all') => ComputedValues;
}

const PartnershipContext = createContext<PartnershipContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'partnership-module-v1';

export function PartnershipProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(
    reducer,
    undefined,
    (): PartnershipState => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw) as PartnershipState;
      } catch { /* ignore */ }
      const { transactions, settlements } = makeMockData();
      return { transactions, settlements, settings: DEFAULT_SETTINGS };
    }
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const computedForMonth = useMemo(() => (month: string | 'all'): ComputedValues => {
    const filtered = month === 'all'
      ? state.transactions
      : state.transactions.filter(t => t.date.startsWith(month));

    const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpenses = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    // Also count linked expenses as costs (deducted from gross)
    const linkedTotal = filtered
      .filter(t => t.type === 'income')
      .reduce((s, t) => s + (t.linkedExpenses ?? []).reduce((ls, e) => ls + e.amount, 0), 0);
    const grossProfit = totalIncome - totalExpenses - linkedTotal;
    const taxReserve = Math.max(0, grossProfit) * (state.settings.taxRate / 100);
    const afterTaxProfit = grossProfit - taxReserve;
    const nadavNet = afterTaxProfit * (state.settings.nadavSplit / 100);
    const davidNet = afterTaxProfit * (state.settings.davidSplit / 100);

    // Balances always use ALL transactions (running total)
    const allTxs = state.transactions;
    const rawNadavOwesDavid = allTxs.reduce((s, t) => s + t.breakdown.nadavOwesDavidDelta, 0);
    const rawDavidOwesNadav = allTxs.reduce((s, t) => s + t.breakdown.davidOwesNadavDelta, 0);
    const clearedNadavOwesDavid = state.settlements.reduce((s, st) => s + st.nadavOwesDavidCleared, 0);
    const clearedDavidOwesNadav = state.settlements.reduce((s, st) => s + st.davidOwesNadavCleared, 0);
    const nadavOwesDavid = Math.max(0, rawNadavOwesDavid - clearedNadavOwesDavid);
    const davidOwesNadav = Math.max(0, rawDavidOwesNadav - clearedDavidOwesNadav);

    return { totalIncome, totalExpenses, grossProfit, taxReserve, afterTaxProfit, nadavNet, davidNet, nadavOwesDavid, davidOwesNadav };
  }, [state]);

  const computed = useMemo(() => computedForMonth('all'), [computedForMonth]);

  return (
    <PartnershipContext.Provider value={{ state, dispatch, computed, computedForMonth }}>
      {children}
    </PartnershipContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function usePartnership() {
  const ctx = useContext(PartnershipContext);
  if (!ctx) throw new Error('usePartnership must be used inside PartnershipProvider');
  return ctx;
}
