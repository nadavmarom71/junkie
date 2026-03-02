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
  taxRate: number;          // 12% default
  nadavSplit: number;       // 65% default
  davidSplit: number;       // 35% default
  defaultExpenseSplit: number; // 50% nadav default
  expenseCategories: string[];
}

export interface IncomeBreakdown {
  kind: 'income';
  taxAmount: number;
  netIncome: number;
  nadavShare: number;
  davidShare: number;
  nadavOwesDavidDelta: number;
  davidOwesNadavDelta: number;
}

export interface ExpenseBreakdown {
  kind: 'expense';
  category: string;
  paidBy: Payer;
  splitRatio: number; // nadav's % of the expense
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
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
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

type Action =
  | { type: 'ADD_TRANSACTION'; payload: PartnershipTx }
  | { type: 'DELETE_TRANSACTION'; payload: string }
  | { type: 'ADD_SETTLEMENT'; payload: Settlement }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<PartnershipSettings> };

// ── Financial Logic Helpers ────────────────────────────────────────────────────

export function calcIncomeBreakdown(
  amount: number,
  settings: PartnershipSettings
): IncomeBreakdown {
  const taxAmount = amount * (settings.taxRate / 100);
  const netIncome = amount - taxAmount;
  const nadavShare = netIncome * (settings.nadavSplit / 100);
  const davidShare = netIncome * (settings.davidSplit / 100);
  return {
    kind: 'income',
    taxAmount,
    netIncome,
    nadavShare,
    davidShare,
    nadavOwesDavidDelta: davidShare, // Nadav collects income → owes David his cut
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
    // Nadav paid → David owes Nadav his share
    if (offsetAgainstDebt) {
      // Net it against Nadav's existing debt to David
      nadavOwesDavidDelta = -davidShare;
    } else {
      // Track David's share separately
      davidOwesNadavDelta = davidShare;
    }
  } else {
    // David paid → Nadav owes David his share
    if (offsetAgainstDebt) {
      // Net it against David's existing debt to Nadav
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

  const txs: PartnershipTx[] = [
    {
      id: 'm1',
      type: 'income',
      date: '2025-12-20',
      description: 'אתר לקוח — מרמלדה קפה',
      amount: 8000,
      breakdown: calcIncomeBreakdown(8000, s),
      createdAt: '2025-12-20T10:00:00Z',
    },
    {
      id: 'm2',
      type: 'income',
      date: '2026-01-15',
      description: 'סרטון שיווקי — BizCo',
      amount: 5000,
      breakdown: calcIncomeBreakdown(5000, s),
      createdAt: '2026-01-15T10:00:00Z',
    },
    {
      id: 'm3',
      type: 'expense',
      date: '2026-01-18',
      description: 'Adobe Creative Cloud',
      amount: 500,
      breakdown: calcExpenseBreakdown(500, 'תוכנות וכלים', 'nadav', 50, true),
      createdAt: '2026-01-18T12:00:00Z',
    },
    {
      id: 'm4',
      type: 'expense',
      date: '2026-01-25',
      description: 'פרסום Facebook — קמפיין ינואר',
      amount: 800,
      breakdown: calcExpenseBreakdown(800, 'שיווק ופרסום', 'nadav', 50, false),
      createdAt: '2026-01-25T14:00:00Z',
    },
    {
      id: 'm5',
      type: 'income',
      date: '2026-02-10',
      description: 'ייעוץ דיגיטל — StartupX',
      amount: 3500,
      breakdown: calcIncomeBreakdown(3500, s),
      createdAt: '2026-02-10T09:00:00Z',
    },
    {
      id: 'm6',
      type: 'expense',
      date: '2026-02-14',
      description: 'כלים מקצועיים — Figma Pro',
      amount: 350,
      breakdown: calcExpenseBreakdown(350, 'תוכנות וכלים', 'david', 50, false),
      createdAt: '2026-02-14T11:00:00Z',
    },
    {
      id: 'm7',
      type: 'income',
      date: '2026-03-05',
      description: 'מיתוג מחדש — TechStart',
      amount: 4200,
      breakdown: calcIncomeBreakdown(4200, s),
      createdAt: '2026-03-05T10:00:00Z',
    },
    {
      id: 'm8',
      type: 'expense',
      date: '2026-03-08',
      description: 'פרילנסר — צלם',
      amount: 600,
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
    const grossProfit = totalIncome - totalExpenses;
    const taxReserve = Math.max(0, grossProfit) * (state.settings.taxRate / 100);
    const afterTaxProfit = grossProfit - taxReserve;
    const nadavNet = afterTaxProfit > 0 ? afterTaxProfit * (state.settings.nadavSplit / 100) : afterTaxProfit * (state.settings.nadavSplit / 100);
    const davidNet = afterTaxProfit > 0 ? afterTaxProfit * (state.settings.davidSplit / 100) : afterTaxProfit * (state.settings.davidSplit / 100);

    // Balances always use ALL transactions (running total), not filtered
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
