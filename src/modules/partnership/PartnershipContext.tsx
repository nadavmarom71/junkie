/**
 * Historical partnership editor. Running debts and settlement confirmations
 * come from the shared server finance engine, including bank receipts and anchors.
 */
import { createContext, useContext, useReducer, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useFinance } from '@/hooks/useFinance';
import { useQueryClient } from '@tanstack/react-query';
import type { Partnership } from '@/types/finance';
import { createSettlementWriter } from './settlement-client';
import type { PendingSettlement, SettlementInput } from './settlement-client';

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
  splitOverride?: { nadav: number; david: number }; // income: per-tx split override
  recurring?: { dayOfMonth: number };               // income: auto-replicate monthly
  recurringSourceId?: string;                        // present on auto-generated instances
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
  | { type: 'UPDATE_SETTINGS'; payload: Partial<PartnershipSettings> }
  | { type: 'EDIT_TRANSACTION'; payload: EditTxPayload }
  | { type: 'ADD_LINKED_EXPENSE'; payload: { txId: string; expense: LinkedExpense } }
  | { type: 'REMOVE_LINKED_EXPENSE'; payload: { txId: string; expenseId: string } }
  | { type: 'RESET'; payload: PartnershipState };

// ── Financial Logic Helpers ────────────────────────────────────────────────────

export function calcIncomeBreakdown(
  amount: number,
  settings: PartnershipSettings,
  linkedExpenses: LinkedExpense[] = [],
  splitOverride?: { nadav: number; david: number }
): IncomeBreakdown {
  const nadavSplit = splitOverride?.nadav ?? settings.nadavSplit;
  const davidSplit = splitOverride?.david ?? settings.davidSplit;
  const linkedExpenseTotal = linkedExpenses.reduce((s, e) => s + e.amount, 0);
  const effectiveGross = Math.max(0, amount - linkedExpenseTotal);
  const taxAmount = effectiveGross * (settings.taxRate / 100);
  const netIncome = effectiveGross - taxAmount;
  const nadavShare = netIncome * (nadavSplit / 100);
  const davidShare = netIncome * (davidSplit / 100);
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
              breakdown: calcIncomeBreakdown(p.amount, state.settings, linked, tx.splitOverride),
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
            breakdown: calcIncomeBreakdown(tx.amount, state.settings, linked, tx.splitOverride),
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
            breakdown: calcIncomeBreakdown(tx.amount, state.settings, linked, tx.splitOverride),
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
  nadavOwesDavid: number | null;
  davidOwesNadav: number | null;
}

interface SettlementResult { data: PartnershipState; revision: string; partnership: Partnership; settlement: Settlement; replayed: boolean }

interface PartnershipContextValue {
  state: PartnershipState;
  dispatch: React.Dispatch<Action>;
  computed: ComputedValues;
  computedForMonth: (month: string | 'all') => ComputedValues;
  isLoading: boolean;
  loadError: string | null;
  saveError: string | null;
  pendingRecurring: PartnershipTx[];
  approveRecurring: (id: string) => void;
  canonical: Partnership | null;
  isSavingSettlement: boolean;
  pendingSettlement: PendingSettlement | null;
  recordSettlement: (input: SettlementInput, fingerprint: string) => Promise<SettlementResult>;
}

const PartnershipContext = createContext<PartnershipContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'partnership-module-v1';

export function PartnershipProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, EMPTY_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedRef = useRef('');
  const revisionRef = useRef<string | undefined>(undefined);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  // Once true, state changes are persisted. Stays false until initial fetch completes.
  const readyRef = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  const canonicalQuery = useFinance<Partnership>('/partnership');
  const canonical = canonicalQuery.isError ? null : canonicalQuery.data || null;
  const client = useQueryClient();
  const [writer] = useState(() => createSettlementWriter<SettlementResult>(body => api.post<unknown, SettlementResult>('/partnership/settlements', body), localStorage));
  const [pendingSettlement, setPendingSettlement] = useState<PendingSettlement | null>(() => writer.pending());
  const [isSavingSettlement, setIsSavingSettlement] = useState(false);
  const savingSettlementRef = useRef(false);

  async function recordSettlement(input: SettlementInput, fingerprint: string) {
    if (!readyRef.current || JSON.stringify(stateRef.current) !== savedRef.current) throw new Error('המתן לשמירת השינויים הקודמים או רענן לפני רישום תשלום.');
    const request = { input, expectedFingerprint: fingerprint };
    savingSettlementRef.current = true;
    setIsSavingSettlement(true);
    try {
      const job = writer.save(request);
      setPendingSettlement(writer.pending());
      const result = await job;
      savedRef.current = JSON.stringify(result.data);
      revisionRef.current = result.revision;
      localStorage.setItem(STORAGE_KEY, savedRef.current);
      dispatch({ type: 'RESET', payload: result.data });
      await client.cancelQueries({ queryKey: ['finance'] });
      client.setQueryData(['finance', '/partnership'], result.partnership);
      void client.invalidateQueries({ queryKey: ['finance'] });
      writer.acknowledge(input.requestId);
      setPendingSettlement(null);
      return result;
    } catch (error) {
      setPendingSettlement(writer.pending());
      throw error;
    } finally {
      savingSettlementRef.current = false;
      setIsSavingSettlement(false);
    }
  }

  // Reads never generate income or promote stale browser data into the database.
  useEffect(() => {
    let cancelled = false;
    api.get('/partnership/state')
      .then((res: { data: PartnershipState | null; revision?: string }) => {
        if (cancelled) return;
        const loaded = res.data || EMPTY_STATE;
        if (!Array.isArray(loaded.transactions) || !Array.isArray(loaded.settlements)) throw new Error('נתוני השותפות אינם תקינים');
        savedRef.current = JSON.stringify(loaded);
        revisionRef.current = res.revision;
        readyRef.current = true;
        dispatch({ type: 'RESET', payload: loaded });
        localStorage.setItem(STORAGE_KEY, savedRef.current);
      })
      .catch(() => {
        // Offline — try localStorage
        if (cancelled) return;
        readyRef.current = false;
        setLoadError('המידע מהשרת לא נטען. מוצג עותק מקומי לקריאה בלבד; רענן כדי לערוך.');
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
        setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Preserve recurring proposals, but require a deliberate confirmation before
  // recording income. Merely opening the partnership page must never add debt.
  const pendingRecurring = useMemo(() => {
    if (isLoading || loadError) return [];

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const sources = state.transactions.filter(
      t => t.type === 'income' && t.recurring && !t.recurringSourceId
    );
    if (sources.length === 0) return [];

    const toAdd: PartnershipTx[] = [];

    for (const source of sources) {
      const srcDate = new Date(source.date + 'T00:00:00');
      const dayOfMonth = source.recurring!.dayOfMonth;

      // Start from the month AFTER the source's month
      const cur = new Date(srcDate.getFullYear(), srcDate.getMonth() + 1, 1);

      while (cur <= today) {
        const yr = cur.getFullYear();
        const mo = cur.getMonth() + 1;
        const monthStr = `${yr}-${String(mo).padStart(2, '0')}`;

        // Clamp day to last day of month
        const lastDay = new Date(yr, mo, 0).getDate();
        const txDay = Math.min(dayOfMonth, lastDay);
        const txDateStr = `${monthStr}-${String(txDay).padStart(2, '0')}`;

        // Skip if the billing day hasn't arrived yet this month
        if (txDateStr > todayStr) {
          cur.setMonth(cur.getMonth() + 1);
          continue;
        }

        const alreadyExists = state.transactions.some(
          t => t.recurringSourceId === source.id && t.date.startsWith(monthStr)
        );

        if (!alreadyExists) {
          toAdd.push({
            id: `tx_rec_${source.id}_${monthStr}`,
            type: 'income',
            date: txDateStr,
            description: source.description,
            amount: source.amount,
            breakdown: calcIncomeBreakdown(source.amount, state.settings, [], source.splitOverride),
            createdAt: new Date().toISOString(),
            splitOverride: source.splitOverride,
            recurringSourceId: source.id,
          });
        }

        cur.setMonth(cur.getMonth() + 1);
      }
    }

    return toAdd;
  }, [isLoading, loadError, state]);

  function approveRecurring(id: string) {
    if (!readyRef.current) return;
    const candidate = pendingRecurring.find(t => t.id === id);
    if (candidate) dispatch({ type: 'ADD_TRANSACTION', payload: candidate });
  }

  // Save to localStorage + Supabase on state changes (only after initial load)
  useEffect(() => {
    if (!readyRef.current) return; // Don't save during initial load
    const serialized = JSON.stringify(state);
    if (serialized === savedRef.current) return;
    localStorage.setItem(STORAGE_KEY, serialized);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      queueRef.current = queueRef.current.then(async () => {
        if (!readyRef.current || savedRef.current === serialized) return;
        try {
          const result = await api.put<unknown, { revision: string }>('/partnership/state', state, { headers: revisionRef.current ? { 'If-Match': revisionRef.current } : {} });
          revisionRef.current = result.revision;
          savedRef.current = serialized;
          setSaveError(null);
          void client.invalidateQueries({ queryKey: ['finance'] });
        } catch (error) {
          readyRef.current = false;
          const message = error instanceof Error ? error.message : 'השמירה לא הצליחה';
          setSaveError(message + ' · השינויים נשארו בעותק המקומי. רענן לפני עריכה נוספת.');
          toast.error(message);
        }
      });
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
    const taxReserve = filtered.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.breakdown as IncomeBreakdown).taxAmount, 0);
    const afterTaxProfit = grossProfit - taxReserve;
    const nadavNet = filtered.reduce((sum, t) => sum + (t.type === 'income' ? 1 : -1) * t.breakdown.nadavShare, 0);
    const davidNet = filtered.reduce((sum, t) => sum + (t.type === 'income' ? 1 : -1) * t.breakdown.davidShare, 0);

    // Balances always use ALL transactions (running total)
    const nadavOwesDavid = canonical?.outstanding.amount ?? null;
    const davidOwesNadav = canonical?.davidOwesNadav ?? null;

    return { totalIncome, totalExpenses, grossProfit, taxReserve, afterTaxProfit, nadavNet, davidNet, nadavOwesDavid, davidOwesNadav };
  }, [state, canonical]);

  const computed = useMemo(() => computedForMonth('all'), [computedForMonth]);

  return (
    <PartnershipContext.Provider value={{ state, dispatch: action => { if (readyRef.current && !savingSettlementRef.current) dispatch(action); }, computed, computedForMonth, isLoading: isLoading || canonicalQuery.isPending, loadError: loadError || (canonicalQuery.isError ? 'חישוב החוב מהשרת לא נטען. לא ניתן לרשום תשלום.' : null), saveError, pendingRecurring, approveRecurring, canonical, isSavingSettlement, pendingSettlement, recordSettlement }}>
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
