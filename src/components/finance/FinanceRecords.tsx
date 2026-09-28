import { useDeferredValue, useState, type FormEvent } from 'react';
import { Download, Plus, Search, ArrowLeft } from 'lucide-react';
import api from '@/lib/api';
import { dateLabel, israelToday, money } from '@/lib/financeFormatters';
import {
  useDeletePersonalExpense,
  useDeleteTransaction,
  useTransactions,
} from '@/hooks/useTransactions';
import { useCollections, useMarkCollectionPaid, useRemindCollection } from '@/hooks/useCollections';
import { useRetainers } from '@/hooks/useRetainers';
import { useFinance } from '@/hooks/useFinance';
import type { BusinessTransaction, CollectionTransaction, PersonalExpense } from '@/types';
import type { ReceiptEvidence } from '@/types/finance';
import { Empty, FinanceError, FinanceSheet, Loading } from './FinanceUI';
import { FinanceBusinessEditor, FinancePersonalEditor } from './FinanceTransactionEditor';
import { FinanceDataIcon } from './FinanceVisuals';

type RecordsTab = 'business' | 'personal' | 'collections';
type Sheet =
  | {mode:'view'; scope:'business'; record:BusinessTransaction}
  | {mode:'view'; scope:'personal'; record:PersonalExpense}
  | {mode:'view'; scope:'collections'; record:CollectionTransaction}
  | {mode:'edit'; scope:'business'; record?:BusinessTransaction; linkedTo?:BusinessTransaction; collectionDraft?:boolean}
  | {mode:'edit'; scope:'personal'; record?:PersonalExpense}
  | {mode:'receipt'; record:CollectionTransaction};

const statusText = (tx: BusinessTransaction) => tx.type === 'expense' ? 'הוצאה עסקית' : tx.type === 'collection' ? 'תקבול' : tx.payment_status === 'paid' ? 'דווח שהתקבל' : tx.payment_status === 'overdue' ? 'באיחור' : 'לגבייה';
const sourceText = (source: string) => ({telegram_nl:'טלגרם', manual:'הזנה ידנית', import:'ייבוא', webhook:'קיצור דרך', seed:'נתון התחלתי'} as Record<string,string>)[source] || source;
const amountSign = (tx: BusinessTransaction) => tx.type === 'expense' ? '−' : '+';
const validDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) && new Date(date).toISOString().slice(0,10) === date;
const validUrl = (value: string) => !value || /^https?:\/\//i.test(value) && (() => {try {new URL(value);return true;} catch {return false;}})();

export default function FinanceRecords({from,to,enabled,collectionOnly = false,initialTab = 'business',hideTabs = false}: {from:string;to:string;enabled:boolean;collectionOnly?:boolean;initialTab?:'business'|'personal';hideTabs?:boolean}) {
  const [tab,setTab] = useState<RecordsTab>(collectionOnly ? 'collections' : initialTab);
  const [businessType,setBusinessType] = useState<'all'|'income'|'expense'|'collection'>('all');
  const [search,setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const [page,setPage] = useState(1);
  const [sheet,setSheet] = useState<Sheet | null>(null);
  const [exportError,setExportError] = useState('');
  const [exporting,setExporting] = useState(false);
  const transactions = useTransactions({tab:tab === 'personal' ? 'personal' : 'business',type:tab === 'business' ? businessType : 'all',search:deferredSearch || undefined,from,to,page,limit:25}, enabled && tab !== 'collections');
  const collections = useCollections(enabled && tab === 'collections');
  const retainers = useRetainers('active', enabled && tab === 'collections');
  const changeTab = (next: RecordsTab) => {setTab(next);setPage(1);setSheet(null);setSearch('');};
  const closeSheet = () => setSheet(null);
  const openNewRecord = () => {
    if (tab === 'personal') { setSheet({mode:'edit',scope:'personal'}); return; }
    if (tab === 'collections') { setSheet({mode:'edit',scope:'business',collectionDraft:true}); return; }
    setSheet({mode:'edit',scope:'business'});
  };

  async function exportCsv() {
    setExportError('');
    setExporting(true);
    try {
      const blob = await api.get<never, Blob>('/transactions/export.csv', {params:{tab,type:tab === 'business' ? businessType : 'all',search:deferredSearch || undefined,from,to},responseType:'blob'});
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `junkie-${tab}-${from}-${to}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch(cause) {setExportError(cause instanceof Error ? cause.message : 'לא הצלחנו לייצא את הרשומות.');}
    finally {setExporting(false);}
  }

  const title = sheet?.mode === 'receipt' ? 'רישום תקבול' : sheet?.mode === 'edit' ? sheet.record ? 'עריכת רישום' : sheet.scope === 'personal' ? 'הוצאה אישית חדשה' : sheet.collectionDraft ? 'גבייה חדשה' : sheet.linkedTo ? 'הוצאה מקושרת' : 'רישום חדש' : 'פרטי הרישום';
  return <section id="finance-records" className="fn-records" aria-label="רישומי העסק והגבייה"><div className="fn-section-head"><div><span className="fn-page-kicker">כל מה שנרשם</span><h2>{tab === 'collections' ? 'מה עוד צריך להיכנס' : 'הרישומים שלך'}</h2><p className="fn-muted">{tab === 'collections' ? 'חובות פתוחים ותשלומים קבועים שעדיין לא נכנסו לבנק.' : 'תאריך, תיאור וסכום. הפירוט נפתח בלחיצה.'}</p></div><button className="fn-primary" onClick={openNewRecord}><Plus size={16}/> {tab === 'personal' ? 'הוצאה אישית' : tab === 'collections' ? 'גבייה חדשה' : 'עסקה או הוצאה'}</button></div>
    {!collectionOnly && !hideTabs && <div className="fn-segments fn-record-tabs" aria-label="סוג רישומים"><button aria-pressed={tab==='business'} onClick={() => changeTab('business')}>עסקי</button><button aria-pressed={tab==='personal'} onClick={() => changeTab('personal')}>אישי</button></div>}
    {tab !== 'collections' && <div className="fn-record-filters"><label className="fn-record-search"><Search size={17}/><span className="sr-only">חיפוש תיאור</span><input value={search} onChange={event => {setSearch(event.target.value);setPage(1);}} placeholder="חיפוש לפי תיאור"/></label>{tab === 'business' && <label className="fn-record-select"><span>סוג</span><select value={businessType} onChange={event => {setBusinessType(event.target.value as typeof businessType);setPage(1);}}><option value="all">הכול</option><option value="income">עסקאות</option><option value="expense">הוצאות</option><option value="collection">תקבולים</option></select></label>}<button className="fn-link" disabled={exporting} onClick={() => void exportCsv()}><Download size={16}/>{exporting ? 'מכין קובץ…' : 'ייצוא CSV'}</button></div>}
    {exportError && <p className="fn-error" role="alert">{exportError}</p>}
    {tab === 'collections' ? <>
      <FinanceError error={collections.error} retry={() => void collections.refetch()}/>{collections.isPending && <Loading label="טוען את מה שממתין לגבייה…"/>}
      {collections.data && !collections.error && <div className="fn-collection-groups"><div className="fn-surface fn-record-list"><div className="fn-record-total"><span>חובות פתוחים · כסף שצריך לגבות</span><strong className="fn-collection-color">{collections.data.summary.total_pending == null ? 'צריך בדיקה' : money(collections.data.summary.total_pending)}</strong></div>{collections.data.data.length ? collections.data.data.map(item => <button className="fn-record-row" key={item.id} onClick={() => setSheet({mode:'view',scope:'collections',record:item})}><span className="fn-record-main"><FinanceDataIcon label={`${item.client_name} ${item.description}`} kind="collection"/><span className="fn-record-copy"><strong>{item.client_name}</strong><small>{item.reconciliation_issue ? 'התאמה בין תקבול ידני לבנק דורשת בדיקה' : item.description + ' · ' + (item.next_payment?.date || item.expected_payment_date ? `מועד ${dateLabel(item.next_payment?.date || item.expected_payment_date || '')}` : 'מועד עדיין לא ידוע')}</small></span></span><span className="fn-record-value fn-collection-color">{item.balance_owed == null ? 'צריך בדיקה' : money(item.balance_owed)}<ArrowLeft size={15}/></span></button>) : <Empty title="כרגע אין יתרה פתוחה לגבייה">אפשר להוסיף גבייה חדשה מהכפתור למעלה.</Empty>}</div>
      <FinanceError error={retainers.error} retry={() => void retainers.refetch()}/>{retainers.isPending && <Loading label="טוען תשלומים קבועים…"/>}{retainers.data && !retainers.error && retainers.data.retainers.length > 0 && <section className="fn-surface fn-record-list fn-upcoming-retainers" aria-labelledby="fn-upcoming-retainers-title"><div className="fn-record-total"><span id="fn-upcoming-retainers-title">תשלומים קבועים בדרך</span><small>צפי חוזי · עוד לא התקבל</small></div>{retainers.data.retainers.slice().sort((a,b)=>(a.next_billing_date || '9999').localeCompare(b.next_billing_date || '9999')).map(retainer => <div className="fn-record-row fn-static-record-row" key={retainer.id}><span className="fn-record-main"><FinanceDataIcon label={`${retainer.clients?.name || ''} ${retainer.name}`} kind="income"/><span className="fn-record-copy"><strong>{retainer.clients?.name || retainer.name}</strong><small>{retainer.name} · {retainer.next_billing_date ? `צפוי ${dateLabel(retainer.next_billing_date,true)}` : 'המועד הבא עדיין לא נקבע'}</small></span></span><span className="fn-record-value fn-income">+{money(Number(retainer.amount),retainer.currency)}</span></div>)}</section>}</div>}
    </> : <>
      <FinanceError error={transactions.error} retry={() => void transactions.refetch()}/>{transactions.isPending && <Loading label="טוען את הרישומים…"/>}
      {transactions.data && !transactions.error && <div className="fn-surface fn-record-list"><p className="fn-record-count">{transactions.data.pagination.total} רישומים בטווח הנבחר</p>{transactions.data.data.length ? groupDates(transactions.data.data).map(([date,items]) => <div className="fn-record-day" key={date}><time dateTime={date}>{dateLabel(date,true)}</time>{items.map(item => tab === 'personal' ? <PersonalRow key={item.id} item={item as PersonalExpense} onOpen={() => setSheet({mode:'view',scope:'personal',record:item as PersonalExpense})}/> : <BusinessRow key={item.id} item={item as BusinessTransaction} onOpen={() => setSheet({mode:'view',scope:'business',record:item as BusinessTransaction})}/>)}</div>) : <Empty title="אין רישומים שמתאימים לחיפוש">נסה תקופה אחרת, הסר את הסינון או צור רישום חדש.</Empty>}{transactions.data.pagination.pages > 1 && <div className="fn-pagination"><button className="fn-secondary" disabled={page<=1 || transactions.isFetching} onClick={() => setPage(previous=>previous-1)}>הקודם</button><span>עמוד {page} מתוך {transactions.data.pagination.pages}</span><button className="fn-secondary" disabled={page>=transactions.data.pagination.pages || transactions.isFetching} onClick={() => setPage(previous=>previous+1)}>הבא</button></div>}</div>}
    </>}
    <FinanceSheet open={!!sheet} onClose={closeSheet} title={title}>
      {sheet?.mode === 'edit' && (sheet.scope === 'business' ? <FinanceBusinessEditor key={`${sheet.record?.id || 'new'}:${sheet.linkedTo?.id || ''}:${sheet.collectionDraft ? 'collection' : 'record'}`} transaction={sheet.record} linkedTo={sheet.linkedTo} collectionDraft={sheet.collectionDraft} onSaved={closeSheet}/> : <FinancePersonalEditor key={sheet.record?.id || 'new'} expense={sheet.record} onSaved={closeSheet}/>)}
      {sheet?.mode === 'receipt' && <ReceiptEditor key={sheet.record.id} item={sheet.record} onSaved={closeSheet}/>}
      {sheet?.mode === 'view' && (sheet.scope === 'personal' ? <RecordDetails record={sheet.record} scope="personal" onEdit={() => setSheet({mode:'edit',scope:'personal',record:sheet.record})} onDelete={closeSheet}/> : <RecordDetails record={sheet.record} scope="business" onEdit={() => setSheet({mode:'edit',scope:'business',record:sheet.record})} onLinkedExpense={sheet.record.type === 'income' ? () => setSheet({mode:'edit',scope:'business',linkedTo:sheet.record}) : undefined} onReceipt={sheet.scope === 'collections' && (sheet.record as CollectionTransaction).balance_owed != null && !(sheet.record as CollectionTransaction).reconciliation_issue ? () => setSheet({mode:'receipt',record:sheet.record as CollectionTransaction}) : undefined} onDelete={closeSheet}/>)}
    </FinanceSheet>
  </section>;
}

function groupDates(items: Array<BusinessTransaction | PersonalExpense>) {
  const result = new Map<string,Array<BusinessTransaction | PersonalExpense>>();
  items.forEach(item => result.set(item.date,[...(result.get(item.date) || []),item]));
  return [...result.entries()];
}

function BusinessRow({item,onOpen}: {item:BusinessTransaction;onOpen:()=>void}) {
  return <button className="fn-record-row" onClick={onOpen}><span className="fn-record-main"><FinanceDataIcon label={`${item.description} ${item.category || ''}`} scope="business" kind={item.type}/><span className="fn-record-copy"><strong>{item.clients?.name || item.description}</strong><small>{item.clients?.name ? `${item.description} · ` : ''}{statusText(item)}</small></span></span><span className={`fn-record-value ${item.type === 'expense' ? 'fn-expense' : item.type === 'collection' ? 'fn-income' : ''}`}>{amountSign(item)}{money(Number(item.amount))}<ArrowLeft size={15}/></span></button>;
}

function PersonalRow({item,onOpen}: {item:PersonalExpense;onOpen:()=>void}) {
  return <button className="fn-record-row" onClick={onOpen}><span className="fn-record-main"><FinanceDataIcon label={`${item.description} ${item.category || ''}`} scope="personal" kind="expense"/><span className="fn-record-copy"><strong>{item.description}</strong><small>{item.category} · אישי</small></span></span><span className="fn-record-value fn-expense">−{money(Number(item.amount))}<ArrowLeft size={15}/></span></button>;
}

function RecordDetails({record,scope,onEdit,onLinkedExpense,onReceipt,onDelete}: {record:BusinessTransaction | PersonalExpense;scope:'business'|'personal';onEdit:()=>void;onLinkedExpense?:()=>void;onReceipt?:()=>void;onDelete:()=>void}) {
  const [confirmDelete,setConfirmDelete] = useState(false);
  const [failure,setFailure] = useState('');
  const deleteBusiness = useDeleteTransaction();
  const deletePersonal = useDeletePersonalExpense();
  const business = scope === 'business' ? record as BusinessTransaction : null;
  const receipt = useFinance<ReceiptEvidence>(`/receipts/${encodeURIComponent(record.id)}`,!!business && ['income','collection'].includes(business.type));
  const deleting = deleteBusiness.isPending || deletePersonal.isPending;
  async function remove() {
    try {if (scope === 'business') await deleteBusiness.mutateAsync(record.id); else await deletePersonal.mutateAsync(record.id);onDelete();}
    catch(cause) {setFailure(cause instanceof Error ? cause.message : 'לא הצלחנו למחוק את הרישום.');}
  }
  return <div><div className={`fn-detail-amount ${scope === 'personal' || business?.type === 'expense' ? 'fn-expense' : ''}`}>{money(Number(record.amount),record.currency)}</div><h3>{record.description}</h3><dl className="fn-definition"><div><dt>תאריך הרישום</dt><dd>{dateLabel(record.date,true)}</dd></div><div><dt>קטגוריה</dt><dd>{record.category}</dd></div><div><dt>מקור</dt><dd>{sourceText(record.source)}</dd></div>{business && <><div><dt>סוג</dt><dd>{statusText(business)}</dd></div>{business.clients?.name && <div><dt>לקוח</dt><dd>{business.clients.name}</dd></div>}{business.project_total != null && <div><dt>שווי פרויקט</dt><dd>{money(Number(business.project_total))}</dd></div>}{business.expected_payment_date && <div><dt>מועד גבייה צפוי</dt><dd>{dateLabel(business.expected_payment_date,true)}</dd></div>}{business.partner_split_pct != null && <div><dt>חלק שותף</dt><dd>{business.partner_split_pct}%</dd></div>}</>}{record.notes && <div><dt>הערה</dt><dd>{record.notes}</dd></div>}{record.document_link && <div><dt>מסמך</dt><dd><a className="fn-link" href={record.document_link} target="_blank" rel="noreferrer">פתיחת הקישור</a></dd></div>}</dl>
    {business && ['income','collection'].includes(business.type) && <div className="fn-record-reminder"><strong>מתי הכסף נכנס לבנק?</strong>{receipt.isPending && <p className="fn-muted">בודק התאמה לתנועות הבנק…</p>}<FinanceError error={receipt.error} retry={() => void receipt.refetch()}/>{receipt.data && <>{receipt.data.bankPayments.length ? <>{receipt.data.bankPayments.map(payment => <div className="fn-list-row" key={payment.source}><span>{payment.date ? dateLabel(payment.date,true) : 'תאריך לא ידוע'} · {payment.accountName || payment.merchant || 'תנועת בנק'}</span><strong>{money(payment.amount ?? 0)}</strong></div>)}{receipt.data.status === 'partially_matched' && <p className="fn-muted">אומת בבנק רק חלק מהרישום: {money(receipt.data.bankVerifiedAmount)}.</p>}</> : <p className="fn-muted">טרם הותאם לתנועת בנק. ״שולם״ בג׳אנקי אינו הוכחה שהכסף נכנס לחשבון.</p>}</>}</div>}
    {business?.payment_schedule?.length ? <details className="fn-details"><summary>לוח תשלומים · {business.payment_schedule.length} פעימות</summary>{business.payment_schedule.map((item,index)=><div className="fn-list-row" key={item.id || index}><span>{item.unknown || !item.date ? 'מועד עדיין לא ידוע' : dateLabel(item.date,true)}</span><strong>{money(item.amount)}</strong></div>)}</details> : null}
    {business?.linked_expenses?.length ? <details className="fn-details"><summary>הוצאות מקושרות · {business.linked_expenses.length}</summary>{business.linked_expenses.map(item=><div className="fn-list-row" key={item.id}><span>{item.description}</span><strong className="fn-expense">−{money(Number(item.amount))}</strong></div>)}</details> : null}
    <div className="fn-record-actions"><button className="fn-secondary" onClick={onEdit}>עריכת הרישום</button>{onLinkedExpense && <button className="fn-secondary" onClick={onLinkedExpense}>הוספת הוצאה מקושרת</button>}{onReceipt && <button className="fn-primary" onClick={onReceipt}>דיווח על תקבול</button>}</div>
    {!confirmDelete ? <button className="fn-link fn-danger-link" onClick={() => setConfirmDelete(true)}>מחיקת הרישום</button> : <div className="fn-delete-confirm"><strong>למחוק את הרישום הזה?</strong><p>המחיקה תשנה את הדוחות והחישובים. אם הוא קשור לתקבול או לעסקה אחרת, בדוק את הקשרים לפני המחיקה.</p><div className="fn-inline-entry"><button className="fn-secondary" onClick={() => setConfirmDelete(false)}>השארת הרישום</button><button className="fn-primary fn-danger-button" disabled={deleting} onClick={() => void remove()}>{deleting ? 'מוחק…' : 'כן, מחיקת הרישום'}</button></div></div>}{failure && <p role="alert" className="fn-error">{failure}</p>}
  </div>;
}

function ReceiptEditor({item,onSaved}: {item:CollectionTransaction;onSaved:()=>void}) {
  const [amount,setAmount] = useState(String(item.next_payment?.amount || item.balance_owed));
  const [date,setDate] = useState(israelToday());
  const [documentLink,setDocumentLink] = useState('');
  const [error,setError] = useState('');
  const [key] = useState(() => crypto.randomUUID());
  const save = useMarkCollectionPaid();
  const remind = useRemindCollection();
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(amount);
    if(item.balance_owed == null || item.reconciliation_issue || !Number.isFinite(value) || value <= 0 || value > item.balance_owed || !validDate(date)) {setError('יש לבדוק את ההתאמה ואת יתרת הגבייה לפני רישום תקבול נוסף.');return;}
    if(!validUrl(documentLink.trim())) {setError('קישור למסמך צריך להתחיל ב־https:// או http://.');return;}
    try {await save.mutateAsync({id:item.id,idempotency_key:key,amount:value,date,installment_id:item.next_payment?.id || null,document_link:documentLink.trim() || null});onSaved();}
    catch(cause) {setError(cause instanceof Error ? cause.message : 'לא הצלחנו לרשום את התקבול.');}
  }
  if(item.balance_owed == null || item.reconciliation_issue)return <div><p className="fn-error" role="alert">ייתכן שאותו תשלום נרשם גם ידנית וגם דרך הבנק. בדוק את ההתאמה לפני רישום תקבול או שליחת תזכורת.</p></div>;
  return <div><p className="fn-muted">{item.client_name} · {item.description}</p><p className="fn-record-remainder">עוד לגבייה: <strong>{money(item.balance_owed)}</strong></p><form className="fn-form" onSubmit={submit}><div className="fn-form-grid"><label>כמה התקבל<input type="number" min="0.01" max={item.balance_owed} step="0.01" required value={amount} onChange={event=>setAmount(event.target.value)}/></label><label>מתי הכסף התקבל<input type="date" required value={date} onChange={event=>setDate(event.target.value)}/></label></div><label>קישור לקבלה, אם יש<input type="url" value={documentLink} onChange={event=>setDocumentLink(event.target.value)} placeholder="https://"/></label><p className="fn-footnote">הפעולה רושמת את מה שדיווחת שהתקבל. התאמה לתנועת בנק היא בדיקה נפרדת.</p>{error && <p role="alert" className="fn-error">{error}</p>}<button className="fn-primary" disabled={save.isPending}>{save.isPending ? 'שומר תקבול…' : `שמירת תקבול של ${money(Number(amount) || 0)}`}</button></form><div className="fn-record-reminder"><button className="fn-link" disabled={remind.isPending} onClick={() => remind.mutate(item.id)}>תזכורת גבייה לטלגרם שלי</button>{remind.isSuccess && <span className="fn-saved" role="status">התזכורת נשלחה אליך, לא ללקוח.</span>}<FinanceError error={remind.error}/></div></div>;
}
