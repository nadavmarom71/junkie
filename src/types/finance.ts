export type Trust = 'confirmed' | 'estimated' | 'assumed' | 'unknown';
export interface Fact { amount: number | null; minor: number | null; status: Trust; sources?: string[]; note?: string }
export interface Missing { code: string; message: string; href?: string; source?: string; sources?: string[]; blocking?: boolean }
export interface FinancialSummary {
  from: string; to: string; currency: string; received: Fact; businessSpending: Fact; personalSpending: Fact;
  spendingCoverage?: {status: 'reviewed' | 'partial' | 'unknown'; unreviewedCount: number | null; note: string};
  grossTurnover?: Fact; collections?: Fact; cohortReceived?: Fact;
  revenueBasis?: {cohort: string; from: string; to: string; settlementAsOf: string; cashFlowField: string; invalidSources: string[]};
  categories: {scope: string; category: string; amount: number}[];
  largest: {id: string; description: string; date: string; amount: number; scope: string; source: string}[];
}
export interface FinancialActivityRecord {
  id: string; date: string; description: string; amount: number; currency: string; category: string;
  scope: 'business' | 'personal'; type: 'income' | 'expense' | 'collection'; origin: 'business_transactions' | 'personal_expenses' | 'bank_transactions';
  merchant: string | null; accountId: string | null; reviewStatus: string | null; paymentStatus: string | null;
  clientId: string | null; projectTotal: number | null; source: string; note: string | null;
}
export interface FinancialActivityRecords {
  from: string; to: string; currency: string; scope: 'business' | 'personal'; type: 'all' | 'income' | 'expense' | 'collection' | 'received';
  category: string | null; total: number; items: FinancialActivityRecord[];
}
export interface PartnershipItem {
  id: string; type: string; date: string; description: string; gross: number | null; linkedExpenses: number | null;
  tax: number | null; taxRate: number | null; net: number | null; david: number | null; mine: number | null;
  davidPercent: number | null; delta: number | null; status: Trust; issues: string[];
  settledAmount: number | null; outstanding: number | null; settlementNote: string; source: string;
  ruleSource?: string;
  recorded?: {gross: number | null; david: number | null; tax: number | null; net: number | null; davidPercent: number | null} | null;
  ruleStatus?: 'confirmed' | 'estimated' | null; ruleNote?: string | null;
  settlementStatus?: 'unknown' | 'open' | 'partial' | 'settled' | 'not_applicable';
  includedInOutstanding?: boolean;
  origin?: 'recorded' | 'bank_collection';
  transactionId?: string | null;
  bankReceived?: number | null;
  bankReceipts?: {date: string | null; amount: number | null; source: string}[];
  review?: {status: string; note: string};
}
export interface Partnership {
  status: Trust; items: PartnershipItem[];
  settlements: {id: string; date: string; description: string; paid: number | null; received: number | null; note: string}[];
  davidCalculated?: number; expenseAdjustments?: number; settled?: number; recordedOutstanding?: number;
  addedFromBank?: number; calculatedOutstanding?: number;
  components?: {oldBalance:number|null;newIncomeShare:number|null;sharedExpenseOffsets:number|null;paymentsAfterAnchor:number|null;newBankCollections:number|null;provisionalTotal:number|null};
  anchor?: {date:string;oldBalanceAfterAnchor:number|null;status:Trust;payment?:{amount?:number;date?:string;status?:Trust};note?:string;coveredByAnchor?:{id:string;date?:string;amount?:number;status:string;reason?:string;calculationEffect?:number}[]} | null;
  unresolved?: {id:string;date?:string;amount?:number;status:string;reason?:string;source?:string}[];
  outstanding: Fact; missing: unknown[];
}
export interface Obligation { id: string; label: string; amount: number | null; currency?: string; status: Trust; date: string | null; reserved: boolean; source: string; note?: string }
export interface FinancialState {
  asOf: string; currency: string; fetchedAt: string; bank: Fact; available: Fact; reserved: Fact;
  lastKnownBank?: {amount: number; asOf: string; sources: string[]} | null;
  lastKnownAvailable?: (Fact & {asOf: string}) | null;
  accounts: {id: string; name: string; type: string; providerId?: string | null; loanType?: string | null; product?: string | null; balance: number | null; currency: string; asOf: string | null; status: Trust; source: string; purpose: AccountPurpose | null; connectionStatus?: string | null; connectionDataDate?: string | null; listedInLatestSync?: boolean | null}[];
  obligations: Obligation[]; partnership: Partnership | null; summary: FinancialSummary;
  collections: {amount: number | null; status: Trust; items: {id: string; description: string; amount: number; date: string | null}[]; excluded?: {id:string;description:string;reason:string}[]};
  coverage: Record<string, {status: string; count?: number; error?: string}>;
  missing: Missing[]; canApproveSpending: boolean;
}
export interface ReceiptEvidence {
  transactionId: string; recordedDate: string | null; recordedAmount: number | null; recordedPaid: boolean;
  bankVerifiedAmount: number; status: 'not_matched' | 'partially_matched' | 'bank_verified'; note: string;
  bankPayments: {date: string | null; amount: number | null; merchant: string | null; accountName: string | null; source: string}[];
}
export interface CashEvent {
  id: string; label: string; date: string; amount: number; availableAmount: number; status: Trust; direction: 'in' | 'out';
  source: string; note?: string; bankAmount?: number; paymentTiming?: 'card_charge' | 'checking_debit'; bankBefore?: number | null; availableBefore?: number | null; bankAfter: number | null; availableAfter: number | null; cumulativeChange: number | null;
  withoutExpectedIncomeAfter: number | null;
}
export interface Checkpoint { days: number; date: string; bank: number | null; available: number | null; change: number | null; withoutExpectedIncome: number | null }
export interface Forecast {
  asOf: string; days: number; end: string; state: FinancialState; events: CashEvent[];
  livingAverage?: { status: Trust; window: { from: string; to: string; days: number }; sampleCount: number; total: number | null; daily: number | null; monthly: number | null; sources: string[]; note: string; coverage?: {partial: boolean; warnings: string[]; legacyCount: number; bankCount: number; awaitingReview: number; cardSettlements: number; cardDetails: number} };
  undated: {id: string; label: string; amount: number; date?: string; reason: string; source: string}[];
  checkpoints: Checkpoint[]; minimum: number | null; closingAvailable: number | null;
  openingBasis?: 'current_balance' | 'last_known_snapshot'; openingAsOf?: string;
  gaps: {from: string; recovery: string | null}[]; confidence: Trust; note: string;
}
export interface RecurringItem {
  id: string; name: string; accountName: string; accountType: 'checking' | 'credit_card'; currency: string;
  scope: Classification; amount: number; nextDate: string | null; lastDate: string; lastAmount: number;
  historyCount: number; decision: 'detected' | 'recurring' | 'not_recurring' | 'uncertain';
  detected: boolean; forecast: boolean; reason: string;
}
export interface RecurringResponse { asOf: string; currency: string; items: RecurringItem[] }
export interface Simulation {
  amount: number; date: string; frequency: 'once' | 'monthly'; occurrences: string[]; before: Fact; after: Fact; impact: number; minimum: number | null; requiredNet: number | null;
  firstShortfall: string | null; recovery: string | null; answer: 'unknown' | 'shortfall' | 'conditional' | 'fits';
  missing: Missing[]; baseline: Checkpoint[]; forecast: Forecast; stored: false;
}
export interface Connection { configured: boolean; missing: string[]; state: string; lastSuccess?: string; error?: {code: string; message: string}; counts?: Record<string, number>; checkingAccounts?: {id: string; name: string; providerId?: string | null; connectionStatus: string | null; connectionDataDate: string | null; balanceAt: string | null; listedInLatestSync: boolean}[]; bankConnections?: {id: string; name: string; status: string; lastFetchedDataDate: string | null; expiryDate: string | null}[] }
export type Connections = Record<'open_finance' | 'sumit', Connection>;
export interface SumitImportPreview {
  readOnly: true;
  file: {name: string; size: number};
  summary: {rows: number; receipts: number; credits: number; grossPositive: number; creditTotal: number; netDocuments: number; from: string; to: string; possibleMatches: number; ambiguousMatches: number; alreadyImported: number; readyToImport: number; needsManualReview: number};
  warnings: {row: number; code: string; message: string}[];
  rows: {id: string; sourceRow: number; number: string; cardName: string; kind: 'receipt' | 'credit'; date: string; amount: number; currency: string; customerName: string; description: string; linkedDocument: string; importStatus: 'already_imported' | 'possible_match' | 'ambiguous_match' | 'credit_review' | 'unmatched' | 'manual_review' | 'changed_existing'; candidates: {id: string; description: string; date: string; amount: number}[]}[];
  confirmationDigest: string;
  note: string;
}
export interface BankStatementPreview {
  readOnly: true;
  period: 'recent90' | 'all';
  file: {name: string; size: number; source: 'pepper_pdf'};
  summary: {rows: number; reportRows: number; excludedOlder: number; inflowCount: number; outflowCount: number; inflows: number; outflows: number; latestBalance: number | null; latestBalanceDate: string | null; from: string | null; to: string | null; cardSettlements: number; potentialTransfers: number; pairedTransfers?: number; existingPairReviewCount?: number; readyToImport: number; alreadyImported: number; needsManualReview: number; wideDateRange: boolean};
  warnings: {row: number; code: string; message: string}[];
  suggestionCounts?: Record<string,number>;
  rows: {id: string; row: number; date: string; description: string; reference: string; signedAmount: number; amount: number; balance: number; currency: string; direction: 'in'|'out'; reviewHint: 'credit_card_settlement'|'cash_withdrawal'|'bank_fee'|'possible_own_transfer'|'review'; possibleTransferPairIds?: string[]; reviewSuggestion?: {kind:'card_settlement'|'possible_transfer'|'cash_withdrawal'|'bank_fee'|'business'|'personal'|'unclassified'; category?:string|null; reason:string}; status: 'preview_only'; importStatus: 'ready'|'already_imported'|'changed_existing'|'possible_duplicate'|'blocked_source'|'blocked_statement'}[];
  confirmationDigest: string;
  importBlocked: boolean;
  importBlockReason: 'source_unavailable' | 'statement_gap' | null;
  note: string;
}
export type Classification = 'business' | 'personal' | 'transfer' | 'unclassified';
export type AccountPurpose = 'business' | 'personal' | 'mixed';
export interface AccountForReview {id: string; name: string; source: string; purpose: AccountPurpose | null; purposeSource: string | null; purposeUpdatedAt: string | null}
export interface BankTransaction {
  id: string; description: string; merchant?: string; amount: number; signedAmount: number; currency: string; date: string;
  direction: 'in' | 'out'; classification: Classification; category?: string; reviewStatus: string; accountId: string;
  transactionId?: string; personalExpenseId?: string; status: string;
  duplicate?: boolean; source?: string; note?: string | null;
  reviewHint?: 'credit_card_settlement' | 'possible_own_transfer' | 'paired_transfer_candidate' | 'cash_withdrawal' | 'bank_fee' | 'review' | null;
  possibleTransferPairIds?: string[];
  transferReview?: 'transfer' | 'not_transfer' | null;
}
export interface MatchSuggestion { id: string; bankId: string; targetId: string; targetType: 'document' | 'transaction' | 'personal'; label: string; amount: number; currency?: string; bankAmount?: number; unallocatedAmount?: number; representation?: 'collection'; date: string; confidence: number; reasons: string[]; direction: 'in' | 'out' }
export interface Inbox {
  transactions: BankTransaction[]; total: number; allCount: number;
  priorityDeposits: {items:{id:string;date:string;amount:number;currency:string;name:string;accountId:string;reviewStatus:string;pageOffset:number}[];total:number};
  accounts: AccountForReview[];
  documents: {id: string; number: string; kind: string; customerName: string; description: string; date: string; amount: number; currency: string; matchStatus: string; businessTransactionId?: string | null; businessTransactionLinkBasis?: string | null}[];
  documentCount: number; suggestions: MatchSuggestion[];
  matches: {id: string; bankId: string; targetId?: string; transactionId?: string; documentId?: string; targetType?: string; allocatedAmount?: number; representation?: string}[];
  rules: {id: string; merchant: string; classification: Classification; category?: string}[];
}
export interface ChatMessage { role: 'user' | 'assistant'; content: string }
export interface FinancialAnswer { answer: string; tools?: unknown[]; sources?: unknown[] }
