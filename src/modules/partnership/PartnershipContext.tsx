/**
 * PARTNERSHIP MODULE — Fully Isolated State
 * Tracks income/expense splits between Nadav (65%) and David (35%).
 * No external dependencies on the rest of the app.
 */
import { createContext, useContext, useReducer, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import api from '@/lib/api';

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
  | { type: 'REMOVE_LINKED_EXPENSE'; payload: { txId: string; expenseId: string } }
  | { type: 'RESET'; payload: PartnershipState };

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

// ── Default Settings ──────────────────────────────────────────────────────────

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

const EMPTY_STATE: PartnershipState = {
  transactions: [],
  settlements: [],
  settings: DEFAULT_SETTINGS,
};

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

    case 'RESET':
      return action.payload;

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
  isLoading: boolean;
}

const PartnershipContext = createContext<PartnershipContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'partnership-module-v1';

export function PartnershipProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, EMPTY_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Once true, state changes are persisted. Stays false until initial fetch completes.
  const readyRef = useRef(false);

  // On mount: fetch from Supabase (single source of truth), fallback to localStorage
  useEffect(() => {
    let cancelled = false;
    api.get('/partnership/state')
      .then((res: { data: PartnershipState | null }) => {
        if (cancelled) return;
        if (res.data && res.data.transactions && res.data.transactions.length > 0) {
          // Supabase has real data — use it
          dispatch({ type: 'RESET', payload: res.data });
          localStorage.setItem(STORAGE_KEY, JSON.stringify(res.data));
        } else {
          // Supabase empty — try localStorage (but only if it has real user data, not mock)
          try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
              const parsed = JSON.parse(raw) as PartnershipState;
              // Check it's not old mock data (mock IDs were m1-m8)
              const hasMockIds = parsed.transactions?.some(t => /^m\d+$/.test(t.id));
              if (parsed.transactions?.length > 0 && !hasMockIds) {
                dispatch({ type: 'RESET', payload: parsed });
                // Push localStorage data to Supabase so it's persisted
                api.put('/partnership/state', parsed).catch(() => {});
              }
            }
          } catch { /* ignore corrupt localStorage */ }
        }
      })
      .catch(() => {
        // Offline — try localStorage
        if (cancelled) return;
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as PartnershipState;
            const hasMockIds = parsed.transactions?.some(t => /^m\d+$/.test(t.id));
            if (parsed.transactions?.length > 0 && !hasMockIds) {
              dispatch({ type: 'RESET', payload: parsed });
            }
          }
        } catch { /* ignore */ }
      })
      .finally(() => {
        if (cancelled) return;
        readyRef.current = true;
        setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Save to localStorage + Supabase on state changes (only after initial load)
  useEffect(() => {
    if (!readyRef.current) return; // Don't save during initial load
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      api.put('/partnership/state', state).catch(() => {});
    }, 800);
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
    <PartnershipContext.Provider value={{ state, dispatch, computed, computedForMonth, isLoading }}>
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
