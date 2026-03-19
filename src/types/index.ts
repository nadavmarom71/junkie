// ── Shared API types ──────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  totals?: {
    income?: number;
    // New clear fields (gross = no partner split applied)
    grossRevenue?: number;    // full committed value, gross
    grossCollected?: number;  // actually received, gross
    myNetPocket?: number;     // received after partner splits
    outstanding?: number;     // grossRevenue - grossCollected
    expenses?: number;
    net?: number;             // myNetPocket - expenses
    total?: number;
    // legacy fallbacks
    turnover?: number;
    cashflow?: number;
  };
}

// ── Clients ───────────────────────────────────────────────────────────────────

export interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Computed fields (from API)
  total_revenue?: number;
  transaction_count?: number;
  avg_transaction?: number;
  last_transaction_date?: string | null;
}

export interface CreateClientInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  notes?: string | null;
}

// ── Retainers ─────────────────────────────────────────────────────────────────

export type RetainerStatus = 'active' | 'paused' | 'ended';
export type BillingCycle = 'monthly' | 'quarterly' | 'annual';

export interface Retainer {
  id: string;
  client_id: string;
  name: string;
  amount: number;
  currency: string;
  status: RetainerStatus;
  billing_cycle: BillingCycle;
  start_date: string;
  end_date: string | null;
  next_billing_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  clients?: { id: string; name: string; email?: string | null };
}

export interface CreateRetainerInput {
  client_id: string;
  name: string;
  amount: number;
  currency?: string;
  status?: RetainerStatus;
  billing_cycle?: BillingCycle;
  start_date: string;
  end_date?: string | null;
  next_billing_date?: string | null;
  notes?: string | null;
}

// ── Transactions ──────────────────────────────────────────────────────────────

export type TransactionType = 'income' | 'expense';
export type TransactionSource = 'manual' | 'webhook' | 'seed' | 'import' | 'telegram_nl';

export interface BusinessTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  description: string;
  category: string;
  date: string;
  client_id: string | null;
  retainer_id: string | null;
  is_recurring: boolean;
  notes: string | null;
  source: TransactionSource;
  payment_status: 'paid' | 'pending' | 'overdue';
  partner_split_pct: number | null;
  project_total: number | null;
  expected_payment_date: string | null;
  expected_date_unknown: boolean;
  payment_schedule: Array<{ amount: number; date: string | null; unknown: boolean }> | null;
  linked_transaction_id: string | null;
  document_link: string | null;
  linked_expenses?: BusinessTransaction[];
  created_at: string;
  updated_at: string;
  // Joined
  clients?: { name: string } | null;
}

export interface PersonalExpense {
  id: string;
  amount: number;
  currency: string;
  description: string;
  category: string;
  date: string;
  notes: string | null;
  document_link: string | null;
  source: TransactionSource;
  created_at: string;
  updated_at: string;
}

export interface CreateBusinessTransactionInput {
  type: TransactionType;
  amount: number;
  currency?: string;
  description: string;
  category: string;
  date: string;
  client_id?: string | null;
  retainer_id?: string | null;
  is_recurring?: boolean;
  notes?: string | null;
  payment_status?: 'paid' | 'pending' | 'overdue';
  partner_split_pct?: number | null;
  project_total?: number | null;
  expected_payment_date?: string | null;
  expected_date_unknown?: boolean;
  payment_schedule?: Array<{ amount: number; date: string | null; unknown: boolean }> | null;
  linked_transaction_id?: string | null;
  document_link?: string | null;
}

export interface CreatePersonalExpenseInput {
  amount: number;
  currency?: string;
  description: string;
  category: string;
  date: string;
  notes?: string | null;
  document_link?: string | null;
}

// ── AI Insights ───────────────────────────────────────────────────────────────

export type InsightSeverity = 'info' | 'warning' | 'critical' | 'positive';
export type InsightType =
  | 'cashflow_warning'
  | 'expense_spike'
  | 'revenue_opportunity'
  | 'client_retention'
  | 'forecast_update'
  | 'weekly_summary'
  | 'monthly_summary'
  | 'general';

export interface AiInsight {
  id: string;
  title: string;
  content: string;
  type: InsightType;
  severity: InsightSeverity;
  is_read: boolean;
  related_entity_type: string | null;
  related_entity_id: string | null;
  metadata: Record<string, unknown>;
  generated_at: string;
  created_at: string;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface CashflowStats {
  totalRevenue: number;
  totalExpenses: number;
  actualReceived: number;
  paidExpenses: number;
  netCashflow: number;
  netCash: number;
  expectedCashFlow: number;
  forecast: {
    expectedIn: number;
    expectedOut: number;
    balance: number;
  };
}

export interface PersonalStats {
  thisMonth: number;
  lastMonth: number;
  change: string | null;
  byCategory: Array<{ category: string; amount: number }>;
}

export interface GoalProgress {
  target: number;
  current: number;
  pct: number;
  percentage?: number;
  trajectory_date?: string | null;
  status?: 'on_track' | 'at_risk' | 'behind';
}

export interface TaxEstimate {
  incomeTax?: number;
  socialSecurity?: number;
  vat?: number;
  totalReserve: number;
  afterTax: number;
}

export interface DashboardStats {
  kpis: {
    monthlyRevenue: number;
    monthlyExpenses: number;
    netProfit: number;
    activeRetainerTotal: number;
  };
  goals?: {
    income?: GoalProgress;
    expenses?: GoalProgress;
    annual?: GoalProgress;
  };
  taxEstimate?: TaxEstimate;
  cashflow: CashflowStats;
  personal: PersonalStats;
  charts: {
    monthly: Array<{ month: string; income: number; expenses: number }>;
    categories: Array<{ category: string; amount: number }>;
  };
  insights: AiInsight[];
  upcomingPayments: {
    incoming: Array<BusinessTransaction & { clients?: { name: string } | null }>;
    outgoing: ScheduledPayment[];
  };
}

// ── Scheduled Payments ────────────────────────────────────────────────────────

export interface ScheduledPayment {
  id: string;
  description: string;
  amount: number;
  currency: string;
  due_date: string;
  category: string;
  is_paid: boolean;
  client_id: string | null;
  retainer_id: string | null;
  notes: string | null;
  created_at: string;
}

// ── Client Profitability ─────────────────────────────────────────────────────

export interface ClientProfitability {
  client: string;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  avgDealSize: number;
  monthlyAvg: number;
  transactionCount: number;
  incomeCount: number;
  monthsActive: number;
  firstTransaction: string | null;
  lastTransaction: string | null;
  hasRetainer: boolean;
  retainerAmount: number;
  monthlyBreakdown: Array<{ month: string; income: number; expenses: number; net: number }>;
}

// ── Forecast ──────────────────────────────────────────────────────────────────

export interface RetainerForecastMonth {
  month: string;
  total: number;
  breakdown: Array<{ id: string; name: string; amount: number; currency: string }>;
}

export interface RevenueForecastMonth {
  month: string;
  pessimistic: number;
  realistic: number;
  optimistic: number;
}

export interface CashFlowForecastMonth {
  month: string;
  projected_income: number;
  projected_expenses: number;
  net: number;
  scheduled_payments: number;
}

// ── Reports ───────────────────────────────────────────────────────────────────

export interface ReportData {
  period: { from: string; to: string };
  summary: {
    income: number;
    expenses: number;
    net: number;
    personal_expenses: number;
    cashflow: number;
    transaction_count: number;
  };
  expense_categories: Array<{ category: string; amount: number }>;
  top_clients: Array<{ name: string; amount: number }>;
  transactions: BusinessTransaction[];
  personal_expenses: PersonalExpense[];
  ai_insight: string | null;
  generated_at: string;
}

// ── Pending Receipts ─────────────────────────────────────────────────────────

export type ReceiptStatus = 'pending' | 'processed' | 'ignored';

export interface PendingReceipt {
  id: string;
  drive_file_url: string;
  file_name: string;
  date_received: string;
  extracted_amount: number | null;
  extracted_vendor: string | null;
  status: ReceiptStatus;
  approved_transaction_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReceiptsSummary {
  pending: number;
  processed: number;
  ignored: number;
}

export interface ApproveReceiptInput {
  amount: number;
  description: string;
  category: string;
  date: string;
  type?: 'expense' | 'income';
  client_id?: string | null;
  notes?: string | null;
}

// ── CFO Memory & Strategy ─────────────────────────────────────────────────────

export interface CFOMemory {
  life_goals?: string;
  main_concern?: string;
  strategic_notes?: string;
  last_onboarded?: string;
  timeline_notes?: string;
  monthly_income?: number | null;
  monthly_expenses?: number | null;
  balances?: {
    bank: number;
    emergency_fund: number;
    pension: number;
    investments: number;
    debts?: number;
  };
}

export interface CFOPriority {
  goal: string;
  reasoning: string;
  urgency: 'high' | 'medium' | 'low';
  actionable_steps: string[];
}

export interface CFOStrategy {
  priorities: CFOPriority[];
  income_gap: {
    exists: boolean;
    monthly_shortfall: number;
    specific_recommendation: string;
  };
  strategic_summary: string;
}
