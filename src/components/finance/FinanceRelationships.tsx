import { useMemo, useState, type FormEvent } from 'react';
import { useClients, useClient, useClientAiRecommendation, useClientProfitability, useCreateClient } from '@/hooks/useClients';
import { useCreateRetainer, useDeleteRetainer, useRetainers, useUpdateRetainer } from '@/hooks/useRetainers';
import { dateLabel, israelToday, money } from '@/lib/financeFormatters';
import type { BillingCycle, Client, CreateRetainerInput, Retainer, RetainerStatus } from '@/types';
import { Empty, FinanceError, FinanceSheet, Loading } from './FinanceUI';
import { FinanceDataIcon } from './FinanceVisuals';

const cycles: Record<BillingCycle, string> = {monthly: 'חודשי', quarterly: 'רבעוני', annual: 'שנתי'};
const statuses: Record<RetainerStatus, string> = {active: 'פעיל', paused: 'מושהה', ended: 'הסתיים'};

export function FinanceClients() {
  const [sort, setSort] = useState('total_revenue');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const query = useClients(sort);
  const visible = useMemo(() => (query.data || []).filter(client => `${client.name} ${client.company || ''}`.toLocaleLowerCase('he-IL').includes(search.trim().toLocaleLowerCase('he-IL'))), [query.data, search]);
  return <section className="fn-relationship-view" aria-label="לקוחות">
    <div className="fn-section-head"><div><h2>לקוחות</h2><p className="fn-muted">מי עומד מאחורי העסקאות, הריטיינרים והגבייה.</p></div><button className="fn-secondary" onClick={() => setCreating(true)}>לקוח חדש</button></div>
    <div className="fn-relationship-toolbar"><label className="fn-record-search"><span className="fn-sr-only">חיפוש לקוח</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="חיפוש לפי שם או חברה"/></label><label className="fn-record-select">סדר לפי <select value={sort} onChange={event => setSort(event.target.value)}><option value="total_revenue">שווי עסקאות</option><option value="transaction_count">מספר תנועות</option><option value="last_transaction_date">עסקה אחרונה</option></select></label></div>
    <FinanceError error={query.error} retry={() => void query.refetch()}/>{query.isPending && <Loading label="טוען לקוחות…"/>}
    {query.data && !query.error && <div className="fn-surface fn-relationship-list"><p className="fn-record-count">{visible.length} מתוך {query.data.length} לקוחות · שווי העסקאות אינו הסכום שנגבה</p>{visible.map(client => <button className="fn-list-row fn-row-button fn-client-row" key={client.id} onClick={() => setSelectedId(client.id)}><span className="fn-ledger-item-main"><FinanceDataIcon label={`${client.name} ${client.company || ''}`} kind="client" tone="business"/><span><strong>{client.name}</strong><small>{client.company ? `${client.company} · ` : ''}{client.transaction_count || 0} תנועות{client.last_transaction_date ? ` · אחרונה ${dateLabel(client.last_transaction_date)}` : ''}</small></span></span><span className="fn-value-stack"><b>{money(client.total_revenue)}</b><small>עסקאות בש״ח</small></span></button>)}{!visible.length && <Empty title={search ? 'לא נמצא לקוח בשם הזה' : 'עדיין אין לקוחות'}>{search ? 'נסה שם אחר או חפש לפי החברה.' : 'אפשר להוסיף לקוח ראשון כאן, או לשייך לקוח כשמוסיפים עסקה.'}</Empty>}</div>}
    <p className="fn-footnote">הסכומים כאן הם עסקאות הכנסה שנרשמו בשקלים, לא יתרת בנק. הכנסות במטבע אחר אינן מחוברות לשקלים.</p>
    <FinanceSheet open={creating} onClose={() => setCreating(false)} title="לקוח חדש"><ClientCreate onSaved={client => {setCreating(false);setSelectedId(client.id);}}/></FinanceSheet>
    <FinanceSheet open={!!selectedId} onClose={() => setSelectedId(null)} title="תיק לקוח">{selectedId && <ClientDetail key={selectedId} id={selectedId}/>}</FinanceSheet>
  </section>;
}

function ClientCreate({onSaved}: {onSaved: (client: Client) => void}) {
  const save = useCreateClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [notes, setNotes] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    try {onSaved(await save.mutateAsync({name:name.trim(),email:email.trim() || null,phone:phone.trim() || null,company:company.trim() || null,notes:notes.trim() || null}));} catch { /* FinanceError displays the result. */ }
  }
  return <form className="fn-form" onSubmit={submit}><label>שם הלקוח<input required maxLength={200} value={name} onChange={event => setName(event.target.value)} autoFocus/></label><details className="fn-details"><summary>פרטי קשר והערות</summary><div className="fn-form fn-form-in-details"><div className="fn-form-grid"><label>דוא״ל<input type="email" value={email} onChange={event => setEmail(event.target.value)}/></label><label>טלפון<input type="tel" value={phone} onChange={event => setPhone(event.target.value)}/></label></div><label>חברה<input value={company} onChange={event => setCompany(event.target.value)}/></label><label>הערות<textarea rows={3} value={notes} onChange={event => setNotes(event.target.value)}/></label></div></details><button className="fn-primary" disabled={save.isPending || !name.trim()}>{save.isPending ? 'שומר לקוח…' : 'שמירת לקוח בג׳אנקי'}</button><FinanceError error={save.error}/></form>;
}

function ClientDetail({id}: {id: string}) {
  const client = useClient(id);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const profitability = useClientProfitability(id, analysisOpen);
  const recommendation = useClientAiRecommendation();
  const [advice, setAdvice] = useState<string | null>(null);
  return <div className="fn-relationship-detail"><FinanceError error={client.error} retry={() => void client.refetch()}/>{client.isPending && <Loading label="פותח תיק לקוח…"/>}{client.data && <>
    <div className="fn-relationship-lead"><h3>{client.data.name}</h3>{client.data.company && <span>{client.data.company}</span>}<strong>{money(client.data.total_revenue)}</strong><small>שווי עסקאות הכנסה שנרשמו בש״ח · לא כסף שהתקבל</small></div>
    {!!client.data.other_currency_income_count && <p className="fn-notice">יש גם {client.data.other_currency_income_count} עסקאות הכנסה במטבע אחר, שאינן נכללות בסכום השקלי.</p>}
    {(client.data.email || client.data.phone || client.data.notes) && <details className="fn-details" open><summary>פרטי לקוח</summary><dl className="fn-definition">{client.data.email && <div><dt>דוא״ל</dt><dd><a href={`mailto:${client.data.email}`}>{client.data.email}</a></dd></div>}{client.data.phone && <div><dt>טלפון</dt><dd><a href={`tel:${client.data.phone}`}>{client.data.phone}</a></dd></div>}{client.data.notes && <div><dt>הערות</dt><dd>{client.data.notes}</dd></div>}</dl></details>}
    <details className="fn-details" onToggle={event => setAnalysisOpen(event.currentTarget.open)}><summary>ניתוח הפעילות</summary><FinanceError error={profitability.error} retry={() => void profitability.refetch()}/>{analysisOpen && profitability.isPending && <Loading label="מחשב פעילות לקוח…"/>}{profitability.data && <><dl className="fn-definition"><div><dt>עסקאות הכנסה רשומות</dt><dd>{money(profitability.data.totalRevenue)}</dd></div><div><dt>הוצאות מקושרות ללקוח</dt><dd>{money(profitability.data.totalExpenses)}</dd></div><div><dt>הפרש לפי הרישום</dt><dd>{money(profitability.data.netProfit)}</dd></div><div><dt>ממוצע לעסקת הכנסה</dt><dd>{money(profitability.data.avgDealSize)}</dd></div><div><dt>חודשים פעילים</dt><dd>{profitability.data.monthsActive}</dd></div></dl>{!!profitability.data.excludedForeignCurrencyCount && <p className="fn-notice">{profitability.data.excludedForeignCurrencyCount} תנועות במטבע אחר הושמטו מהסיכום השקלי.</p>}<p className="fn-footnote">זה אינו רווח חשבונאי או כסף שנגבה: החישוב לפי עסקאות והוצאות ששויכו ללקוח, לפני מס, שותף והוצאות שלא שויכו.</p>{profitability.data.monthlyBreakdown.length > 0 && <details className="fn-details"><summary>פירוט לפי חודשים</summary>{profitability.data.monthlyBreakdown.map(month => <div className="fn-list-row" key={month.month}><span>{month.month}</span><span className="fn-value-stack"><b>{money(month.net)}</b><small>הכנסה {money(month.income)} · הוצאה {money(month.expenses)}</small></span></div>)}</details>}</>}</details>
    <details className="fn-details"><summary>ריטיינרים <span>{client.data.retainers.length}</span></summary>{client.data.retainers.map(retainer => <div className="fn-list-row" key={retainer.id}><div><strong>{retainer.name}</strong><small>{statuses[retainer.status]} · {cycles[retainer.billing_cycle]}</small></div><b>{money(Number(retainer.amount),retainer.currency)}</b></div>)}{!client.data.retainers.length && <p className="fn-muted">אין ריטיינר מקושר ללקוח הזה.</p>}</details>
    <details className="fn-details"><summary>היסטוריית תנועות <span>{client.data.transactions.length}</span></summary>{client.data.transactions.slice(0,20).map(tx => <div className="fn-list-row" key={tx.id}><div><strong>{tx.description}</strong><small>{dateLabel(tx.date)} · {tx.type === 'income' ? 'עסקה' : tx.type === 'collection' ? 'תקבול' : 'הוצאה'} · {tx.payment_status === 'paid' ? 'רשום כשולם' : 'טרם שולם'}</small></div><b>{money(Number(tx.amount),tx.currency)}</b></div>)}{!client.data.transactions.length && <p className="fn-muted">אין תנועות משויכות ללקוח הזה.</p>}{client.data.transactions.length > 20 && <p className="fn-footnote">מוצגות 20 האחרונות. הרשימה המלאה זמינה באזור העסקאות.</p>}</details>
    <details className="fn-details"><summary>המלצת AI על הלקוח</summary><p className="fn-muted">מופקת רק כשתבקש; היא נעזרת ברישומים ואינה מאמתת תנועות בנק.</p><button className="fn-secondary" disabled={recommendation.isPending} onClick={async () => {try {setAdvice((await recommendation.mutateAsync(id)).recommendation);} catch { /* Shown below. */ }}}>{recommendation.isPending ? 'מנתח…' : 'הפקת המלצה'}</button><FinanceError error={recommendation.error}/>{advice && <p className="fn-ai-note">{advice}</p>}</details>
  </>}</div>;
}

export function FinanceRetainers() {
  const [status, setStatus] = useState<'all' | RetainerStatus>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const query = useRetainers();
  const retainers = query.data?.retainers || [];
  const visible = status === 'all' ? retainers : retainers.filter(retainer => retainer.status === status);
  const selected = retainers.find(retainer => retainer.id === selectedId);
  return <section className="fn-relationship-view" aria-label="ריטיינרים"><div className="fn-section-head"><div><h2>ריטיינרים</h2><p className="fn-muted">חוזים ומועדי חיוב. כסף נחשב שהתקבל רק אחרי תקבול מאומת.</p></div><button className="fn-secondary" onClick={() => setCreating(true)}>ריטיינר חדש</button></div>
    {query.data && <div className="fn-retainer-summary"><div><span>ממוצע חודשי מהחוזים הפעילים · ש״ח</span><strong>{money(query.data.summary.monthly_total)}</strong></div><small>{query.data.summary.active_count} פעילים{query.data.summary.other_currency_count ? ` · ${query.data.summary.other_currency_count} במטבע אחר` : ''} · לא יתרת בנק</small></div>}
    <div className="fn-segments fn-relationship-tabs" aria-label="סינון ריטיינרים">{(['all','active','paused','ended'] as const).map(value => <button key={value} aria-pressed={status === value} onClick={() => setStatus(value)}>{value === 'all' ? 'הכול' : statuses[value]}</button>)}</div>
    <FinanceError error={query.error} retry={() => void query.refetch()}/>{query.isPending && <Loading label="טוען ריטיינרים…"/>}
    {query.data && !query.error && <div className="fn-surface fn-relationship-list">{visible.map(retainer => <button className="fn-list-row fn-row-button fn-retainer-row" key={retainer.id} onClick={() => setSelectedId(retainer.id)}><span className="fn-ledger-item-main"><FinanceDataIcon label={retainer.name} kind="recurring" tone={retainer.status === 'active' ? 'income' : 'neutral'}/><span><strong>{retainer.name}</strong><small>{retainer.clients?.name || 'לקוח לא זמין'} · {statuses[retainer.status]} · {cycles[retainer.billing_cycle]}{retainer.status === 'active' && retainer.next_billing_date ? ` · ${retainer.next_billing_date < israelToday() ? 'מועד רשום שעבר' : 'הבא'} ${dateLabel(retainer.next_billing_date)}` : ''}</small></span></span><b>{money(Number(retainer.amount),retainer.currency)}</b></button>)}{!visible.length && <Empty title={status === 'all' ? 'עדיין אין ריטיינרים' : 'אין ריטיינרים במצב הזה'}>{status === 'all' ? 'אפשר להוסיף חוזה ראשון. המערכת לא תסמן כסף כהתקבל עד שרושמים תקבול.' : 'אפשר לבחור מצב אחר למעלה.'}</Empty>}</div>}
    <FinanceSheet open={creating} onClose={() => setCreating(false)} title="ריטיינר חדש"><RetainerEditor onSaved={() => setCreating(false)}/></FinanceSheet>
    <FinanceSheet open={!!selected} onClose={() => setSelectedId(null)} title="פרטי ריטיינר">{selected && <RetainerDetail key={selected.id} retainer={selected} onDeleted={() => setSelectedId(null)}/>}</FinanceSheet>
  </section>;
}

function RetainerEditor({onSaved}: {onSaved: () => void}) {
  const clients = useClients();
  const save = useCreateRetainer();
  const [manualClient, setManualClient] = useState(false);
  const [clientId, setClientId] = useState('');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('ILS');
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [start, setStart] = useState(israelToday());
  const [end, setEnd] = useState('');
  const [next, setNext] = useState('');
  const [notes, setNotes] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amountNumber = Number(amount);
    if (!clientId.trim() || !name.trim() || !Number.isFinite(amountNumber) || amountNumber <= 0 || (end && end < start)) return;
    const input: CreateRetainerInput = {client_id:clientId.trim(),name:name.trim(),amount:amountNumber,currency,billing_cycle:cycle,start_date:start,notes:notes.trim() || null};
    if (end) input.end_date = end;
    if (next) input.next_billing_date = next;
    try {await save.mutateAsync(input);onSaved();} catch { /* FinanceError displays the result. */ }
  }
  return <form className="fn-form" onSubmit={submit}><div className="fn-form-grid"><label>לקוח{manualClient ? <input required value={clientId} onChange={event => setClientId(event.target.value)} placeholder="שם הלקוח"/> : <select required value={clientId} onChange={event => setClientId(event.target.value)}><option value="">בחירת לקוח</option>{clients.data?.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}</select>}</label><button type="button" className="fn-link fn-form-switch" onClick={() => {setManualClient(value => !value);setClientId('');}}>{manualClient ? 'בחירה מהרשימה' : 'לקוח חדש לפי שם'}</button></div><FinanceError error={clients.error}/><label>שם הריטיינר<input required maxLength={200} value={name} onChange={event => setName(event.target.value)} placeholder="למשל אוטומציות חודשיות"/></label><div className="fn-form-grid"><label>סכום לחיוב<input required type="number" min="0.01" step="0.01" value={amount} onChange={event => setAmount(event.target.value)}/></label><label>תדירות<select value={cycle} onChange={event => setCycle(event.target.value as BillingCycle)}><option value="monthly">חודשי</option><option value="quarterly">רבעוני</option><option value="annual">שנתי</option></select></label></div><div className="fn-form-grid"><label>תאריך התחלה<input required type="date" value={start} onChange={event => setStart(event.target.value)}/></label><label>מטבע<select value={currency} onChange={event => setCurrency(event.target.value)}><option value="ILS">ש״ח</option><option value="USD">דולר</option><option value="EUR">אירו</option></select></label></div><details className="fn-details"><summary>מועדים והערות נוספים</summary><div className="fn-form fn-form-in-details"><div className="fn-form-grid"><label>תאריך סיום, אם יש<input type="date" min={start} value={end} onChange={event => setEnd(event.target.value)}/></label><label>תאריך חיוב הבא, אם שונה מהחוזה<input type="date" value={next} onChange={event => setNext(event.target.value)}/></label></div><label>הערות<textarea rows={3} value={notes} onChange={event => setNotes(event.target.value)}/></label></div></details><p className="fn-footnote">שמירת ריטיינר מתעדת חוזה ומועד צפוי בלבד. היא לא יוצרת עסקה, קבלה או כסף בבנק.</p><button className="fn-primary" disabled={save.isPending || !clientId.trim() || !name.trim() || Number(amount) <= 0 || (!!end && end < start)}>{save.isPending ? 'שומר ריטיינר…' : 'שמירת ריטיינר בג׳אנקי'}</button><FinanceError error={save.error}/></form>;
}

function RetainerDetail({retainer, onDeleted}: {retainer: Retainer; onDeleted: () => void}) {
  const update = useUpdateRetainer();
  const remove = useDeleteRetainer();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [localStatus, setLocalStatus] = useState<RetainerStatus>(retainer.status);
  const [nextDate, setNextDate] = useState(retainer.next_billing_date || '');
  const staleBillingDate = !!retainer.next_billing_date && retainer.next_billing_date < israelToday();
  async function changeStatus(status: RetainerStatus) {
    try {await update.mutateAsync({id:retainer.id,data:{status}});setLocalStatus(status);} catch { /* FinanceError displays the result. */ }
  }
  async function saveBillingDate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!nextDate || nextDate < israelToday()) return;
    try {await update.mutateAsync({id:retainer.id,data:{next_billing_date:nextDate}});} catch { /* FinanceError displays the result. */ }
  }
  async function deleteRetainer() {
    try {await remove.mutateAsync(retainer.id);onDeleted();} catch { /* FinanceError displays the result. */ }
  }
  return <div className="fn-relationship-detail"><div className="fn-relationship-lead"><h3>{retainer.name}</h3><span>{retainer.clients?.name || 'לקוח לא זמין'} · {statuses[localStatus]}</span><strong>{money(Number(retainer.amount),retainer.currency)}</strong><small>לכל חיוב {cycles[retainer.billing_cycle]} · לא תקבול בבנק</small></div><dl className="fn-definition"><div><dt>החוזה התחיל</dt><dd>{dateLabel(retainer.start_date,true)}</dd></div><div><dt>{staleBillingDate ? 'מועד החיוב הרשום · עבר' : 'מועד חיוב הבא'}</dt><dd>{retainer.next_billing_date ? dateLabel(retainer.next_billing_date,true) : 'לא נקבע'}</dd></div>{retainer.end_date && <div><dt>תאריך סיום</dt><dd>{dateLabel(retainer.end_date,true)}</dd></div>}{retainer.notes && <div><dt>הערות</dt><dd>{retainer.notes}</dd></div>}</dl>{staleBillingDate && <p className="fn-notice">תאריך החיוב הזה כבר עבר. עד שמעדכנים אותו, הריטיינר נשאר חוזה פעיל אבל לא נוסף כתקבול בתזרים העתידי.</p>}<form className="fn-form" onSubmit={saveBillingDate}><label>מועד החיוב הבא, אם סוכם<input type="date" min={israelToday()} required value={nextDate} onChange={event => setNextDate(event.target.value)}/></label><button className="fn-secondary" disabled={update.isPending || !nextDate || nextDate < israelToday() || nextDate === retainer.next_billing_date}>{update.isPending ? 'שומר…' : 'עדכון מועד החיוב'}</button></form><p className="fn-footnote">ריטיינר אינו מוכיח שהתשלום נכנס. עסקה, גבייה וקבלה נשמרות בנפרד.</p><div className="fn-relationship-actions">{localStatus === 'active' && <button className="fn-secondary" disabled={update.isPending} onClick={() => void changeStatus('paused')}>השהיית הריטיינר</button>}{localStatus === 'paused' && <button className="fn-secondary" disabled={update.isPending} onClick={() => void changeStatus('active')}>הפעלה מחדש</button>}{localStatus !== 'ended' && <button className="fn-link" disabled={update.isPending} onClick={() => void changeStatus('ended')}>סיום הריטיינר</button>}<button className="fn-link fn-danger-link" onClick={() => setDeleteOpen(true)}>מחיקת ריטיינר</button></div><FinanceError error={update.error || remove.error}/>{update.isSuccess && <p className="fn-saved" role="status">פרטי הריטיינר עודכנו</p>}{deleteOpen && <div className="fn-delete-confirm"><strong>למחוק את “{retainer.name}”?</strong><p>המחיקה בלתי הפיכה. אם יש עסקאות מקושרות, המערכת תחסום אותה ותוכל לסיים או להשהות את הריטיינר.</p><div className="fn-relationship-actions"><button className="fn-primary fn-danger-button" disabled={remove.isPending} onClick={() => void deleteRetainer()}>{remove.isPending ? 'מוחק…' : 'מחיקת הריטיינר'}</button><button className="fn-secondary" onClick={() => setDeleteOpen(false)}>השארת הריטיינר</button></div></div>}</div>;
}
