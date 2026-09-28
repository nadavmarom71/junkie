import { useRef, useState } from 'react';
import { RefreshCw, Link2, Upload, FileCheck2, TriangleAlert, Landmark, ReceiptText } from 'lucide-react';
import { useFinance, useFinanceBankPreview, useFinanceFileCommit, useFinanceFilePreview, useFinanceSave } from '@/hooks/useFinance';
import { useTransactions } from '@/hooks/useTransactions';
import type { AccountForReview, AccountPurpose, BankStatementPreview, BankTransaction, Classification, Connections, Inbox, SumitImportPreview } from '@/types/finance';
import { Empty, FinanceError, FinanceSheet, Loading } from './FinanceUI';
import { FinanceDataIcon } from './FinanceVisuals';
import { accountName, dateLabel, israelToday, money } from '@/lib/financeFormatters';

const classNames: Record<Classification, string> = {business: 'עסקי', personal: 'אישי', transfer: 'בין החשבונות שלי', unclassified: 'עדיין לא סווג'};
export default function FinanceConnections() {
  const connections = useFinance<Connections>('/connections');
  const [review, setReview] = useState('pending');
  const [offset, setOffset] = useState(0);
  const inbox = useFinance<Inbox>(`/inbox?review=${review}&offset=${offset}&limit=50`);
  const sync = useFinanceSave();
  const sumitPreview = useFinanceFilePreview<SumitImportPreview>('/import/sumit/preview');
  const sumitCommit = useFinanceFileCommit<{imported: number; needsManualReview: number}>('/import/sumit/commit');
  const [sumitFile, setSumitFile] = useState<File | null>(null);
  const sumitInput = useRef<HTMLInputElement>(null);
  const bankPreview = useFinanceBankPreview<BankStatementPreview>();
  const bankCommit = useFinanceFileCommit<{imported: number; needsManualReview: number}>('/import/bank-statement/commit');
  const [bankFile, setBankFile] = useState<File | null>(null);
  const [bankPeriod, setBankPeriod] = useState<'recent90' | 'all'>('recent90');
  const bankInput = useRef<HTMLInputElement>(null);
  const match = useFinanceSave();
  const [matchModes,setMatchModes] = useState<Record<string,string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = !inbox.error ? inbox.data?.transactions.find(transaction => transaction.id === selectedId) : undefined;
  return <section className="fn-page fn-page-connections"><div className="fn-section-head fn-page-head"><div><span className="fn-page-kicker">מאיפה המספרים מגיעים</span><h1>חיבורים והתאמות</h1><p className="fn-muted">הבנק אומר מה זז. ג׳אנקי והקבלות מסבירים למה.</p></div></div>
    <FinanceError error={connections.error} retry={() => void connections.refetch()}/>
    <div className="fn-connections">{connections.data && !connections.error && (['open_finance','sumit'] as const).map(provider => {
      const connection = connections.data[provider];
      if (provider === 'sumit') return <div className="fn-connection fn-connection-sumit" key={provider}><div className="fn-connection-title"><span className="fn-provider-icon fn-provider-sumit"><ReceiptText size={22}/></span><div><h2>SUMIT</h2><p>קבלות כאסמכתה — לא כהכנסה נוספת</p></div></div><div className="fn-connection-state"><span className="fn-trust fn-trust-confirmed">דוח היסטורי · בלי שדרוג API</span><small>עסקאות חדשות מדווחים בטלגרם; הדוח מאמת את מה שכבר יצא</small></div><input ref={sumitInput} hidden type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" onChange={event => {const file=event.target.files?.[0];if(file){sumitPreview.reset();sumitCommit.reset();setSumitFile(file);sumitPreview.mutate(file);}event.currentTarget.value='';}}/><button className="fn-secondary" disabled={sumitPreview.isPending || sumitCommit.isPending} onClick={() => sumitInput.current?.click()}><Upload size={15}/>{sumitPreview.isPending ? 'בודק את הדוח…' : 'בדיקת דוח'}</button><p className="fn-footnote">הבדיקה לא כותבת למסד הנתונים ולא משנה עסקאות.</p></div>;
      const checking=connection.checkingAccounts||[];
      const bankNeedsAttention=checking.length>0
        ? checking.some(account=>!account.listedInLatestSync||!['ACTIVE','CONNECTED','COMPLETED'].includes(account.connectionStatus||''))
        : connection.bankConnections?.some(bank=>!['ACTIVE','CONNECTED','COMPLETED'].includes(bank.status));
      const checkingBalancesCurrent=checking.length>0 && checking.every(account=>account.balanceAt===israelToday()&&(!account.connectionDataDate||account.connectionDataDate>=israelToday()));
      return <div className="fn-connection" key={provider}>
        <div className="fn-connection-title"><span className="fn-provider-icon fn-provider-bank"><Landmark size={22}/></span><div><h2>Open Finance</h2><p>חשבונות, יתרות ותנועות בנק</p></div></div>
        <div className="fn-connection-state">
          <span className={`fn-trust ${connection.state === 'ok' && !bankNeedsAttention && checkingBalancesCurrent ? 'fn-trust-confirmed' : 'fn-trust-estimated'}`}>{!connection.configured ? 'לא מחובר ל־Junkie' : bankNeedsAttention ? 'יש חשבון עו״ש שדורש בדיקה' : connection.state === 'ok' ? checkingBalancesCurrent ? 'יתרות העו״ש מעודכנות להיום' : 'החיבור פעיל · היתרות לא מהיום' : connection.state === 'syncing' ? 'מסנכרן' : connection.state === 'error' ? 'צריך לבדוק את החיבור' : 'מוכן לסנכרון ראשון'}</span>
          {connection.lastSuccess && <small>קליטה אחרונה ב־Junkie: {new Date(connection.lastSuccess).toLocaleString('he-IL')} · לא בהכרח תאריך יתרת הבנק</small>}
          {checking.map(account=><small key={account.id}>{accountName(account.name,account.providerId)}: {account.listedInLatestSync && ['ACTIVE','CONNECTED','COMPLETED'].includes(account.connectionStatus||'') ? 'נקלט בסנכרון האחרון' : 'דורש בדיקה'} · יתרה מ־{dateLabel(account.balanceAt||undefined)} · נתוני ספק מ־{dateLabel(account.connectionDataDate||undefined)}</small>)}
          {!!connection.bankConnections?.length && <details className="fn-connection-help"><summary>פירוט חיבורי הספק ({connection.bankConnections.length})</summary><p>Financy עשויה להציג גם חיבורים ישנים. מצבם אינו מחליף את מצב חשבונות העו״ש שנקלטו בסנכרון האחרון.</p>{connection.bankConnections.map(bank=><small key={bank.id}>{bank.name}: {bank.status==='ACTIVE'?'פעיל':bank.status==='CONNECTED'?'מחובר':bank.status==='COMPLETED'?'חיבור חד־פעמי':bank.status==='EXPIRED'?'פג תוקף':'דורש בדיקה'}{bank.lastFetchedDataDate?` · נתוני בנק מ־${dateLabel(bank.lastFetchedDataDate)}`:''}</small>)}</details>}
          {!connection.configured && <small>החשבון באתר Financy נפרד מהחיבור האוטומטי כאן. אפשר לבדוק דוח בנק בלי לשנות עסקאות.</small>}
        </div>
        {connection.configured ? <button className="fn-secondary" disabled={connections.isFetching || sync.isPending || connection.state === 'syncing'} onClick={() => sync.mutate({method: 'post', path: '/sync/open_finance', body: {}})}><RefreshCw size={15}/>{sync.isPending && sync.variables?.path.endsWith('open_finance') ? 'מסנכרן…' : 'סנכרון'}</button> : <><label className="fn-connection-period">טווח לבדיקה<select value={bankPeriod} disabled={bankPreview.isPending || bankCommit.isPending} onChange={event => {const period=event.target.value as 'recent90' | 'all';setBankPeriod(period);bankCommit.reset();bankPreview.reset();if(bankFile)bankPreview.mutate({file:bankFile,period});}}><option value="recent90">90 הימים האחרונים בדוח</option><option value="all">כל הדוח</option></select></label><input ref={bankInput} hidden type="file" accept=".pdf,application/pdf" onChange={event => {const file=event.target.files?.[0];if(file){bankPreview.reset();bankCommit.reset();setBankFile(file);bankPreview.mutate({file,period:bankPeriod});}event.currentTarget.value='';}}/><button className="fn-secondary" disabled={bankPreview.isPending || bankCommit.isPending} onClick={() => bankInput.current?.click()}><Upload size={15}/>{bankPreview.isPending ? 'בודק את הדוח…' : 'בדיקת דוח Pepper'}</button></>}
        {connection.error && connection.configured && <p className="fn-error">{connection.error.message}</p>}{!connection.configured && <details className="fn-connection-help"><summary>למה אין סנכרון אוטומטי?</summary><p>לא הוגדרו פרטי גישה ל־API של Financy בשרת Junkie. התחברות לבנק באתר Financy לא מעניקה אוטומטית גישה לאפליקציה שלנו. עד שיש חיבור מאושר, בודקים דוח בנק ידנית.</p><a className="fn-link" href="https://financy.open-finance.ai/settings" target="_blank" rel="noreferrer">הגדרות Financy ↗</a></details>}</div>;
    })}{connections.isPending && <Loading label="בודק את החיבורים…"/>}</div>
    <FinanceError error={sync.error || sumitPreview.error || bankPreview.error}/>{sync.isSuccess && <p className="fn-saved" role="status">הסנכרון הושלם. הרשומות נקלטו לבדיקה; לא נוצרה הכנסה כפולה.</p>}
    {sumitPreview.isSuccess && sumitPreview.data && sumitFile && <SumitPreview key={sumitPreview.data.confirmationDigest} preview={sumitPreview.data} file={sumitFile} commit={sumitCommit}/>} 
    {bankPreview.isSuccess && bankPreview.data && bankFile && <BankPreview key={bankPreview.data.confirmationDigest} preview={bankPreview.data} file={bankFile} commit={bankCommit}/>} 
    {inbox.data && !inbox.error && inbox.data.priorityDeposits?.items.length > 0 && <section className="fn-surface" aria-labelledby="fn-deposits-title"><div className="fn-section-head"><div><h2 id="fn-deposits-title">כניסות שצריך להתאים</h2><p className="fn-muted">התנועות נקלטו מהבנק. לפני שמוסיפים אותן שוב כהכנסה או כחלק של דוד, בודקים לאיזו עסקה הן שייכות.</p></div><span className="fn-record-count">{inbox.data.priorityDeposits.total} ב־60 הימים האחרונים</span></div>{inbox.data.priorityDeposits.items.map(deposit=><button className="fn-list-row fn-row-button" key={deposit.id} disabled={inbox.isFetching} onClick={()=>{setReview('all');setOffset(deposit.pageOffset);setSelectedId(deposit.id);}}><span className="fn-record-main"><FinanceDataIcon label={`${deposit.name} תקבול`} kind="income"/><span><strong>{deposit.name}</strong><small>{dateLabel(deposit.date)} · טרם הותאם לעסקה</small></span></span><b className="fn-income">+{money(deposit.amount,deposit.currency)}</b></button>)}{inbox.data.priorityDeposits.total > inbox.data.priorityDeposits.items.length && <p className="fn-footnote">מוצגות הכניסות האחרונות. שאר הכניסות נמצאות ב״התנועות שנקלטו״ למטה.</p>}</section>}
    {inbox.data && !inbox.error && <details className="fn-surface fn-details"><summary>ייעוד החשבונות <span>{inbox.data.accounts.length}</span></summary><p className="fn-muted">אמרת ש־Pepper משמש בעיקר לעסק ולאומי בעיקר לאישי. נשמור זאת רק אחרי בחירת החשבון ואישור מפורש. הייעוד לא מסווג תנועות ולא יוצר חלק לדוד — לידור בלאומי עדיין יכול להיות תקבול עסקי פרטי.</p>{inbox.data.accounts.map(account=><AccountPurposeRow key={`${account.id}:${account.purpose||''}`} account={account} disabled={inbox.isFetching}/>)}{!inbox.data.accounts.length && <p className="fn-muted">עדיין לא נקלט חשבון עם מזהה שאפשר לשייך. לא ננחש אותו לפי שם הבנק.</p>}</details>}
    <div className="fn-section-head fn-space-top"><h2>התנועות שנקלטו</h2><div className="fn-segments"><button aria-pressed={review === 'pending'} onClick={() => {setReview('pending');setOffset(0);}}>לבדיקה</button><button aria-pressed={review === 'all'} onClick={() => {setReview('all');setOffset(0);}}>הכול</button></div></div>
    <FinanceError error={inbox.error} retry={() => void inbox.refetch()}/>{inbox.isPending && <Loading/>}
    {inbox.data && !inbox.error && <>
      {inbox.isFetching && <p className="fn-muted" role="status">מעדכן את התנועות לפני אישור שינויים…</p>}
      <div className="fn-surface">{inbox.data.transactions.length ? inbox.data.transactions.map(t => <button className="fn-list-row fn-row-button" key={t.id} disabled={inbox.isFetching} onClick={() => setSelectedId(t.id)}><span className="fn-record-main"><FinanceDataIcon label={`${t.description || ''} ${t.merchant || ''} ${t.category || ''}`} scope={t.classification === 'business' || t.classification === 'personal' ? t.classification : undefined} kind={t.direction === 'in' ? 'income' : 'expense'} tone={t.reviewHint === 'credit_card_settlement' ? 'neutral' : undefined}/><span><strong>{t.description || t.merchant || 'תנועת בנק'}</strong><small>{dateLabel(t.date)} · {t.reviewHint === 'credit_card_settlement' ? 'קשור לכרטיס · לא נספר פעמיים' : ['possible_own_transfer','paired_transfer_candidate'].includes(t.reviewHint || '') && t.transferReview!=='not_transfer' ? 'העברה אפשרית · לבדיקה' : `${classNames[t.classification]} · ${t.reviewStatus === 'confirmed' ? 'נבדק' : 'לבדיקה'}`}</small></span></span><b className={t.direction === 'in' ? 'fn-income' : 'fn-expense'}>{t.direction === 'out' ? '−' : '+'}{money(t.amount, t.currency)}</b></button>) : !inbox.isFetching && <Empty title={inbox.data.allCount ? 'אין תנועות שמחכות לבדיקה בעמוד הזה' : 'עוד לא נקלטו תנועות מהבנק'}>{inbox.data.allCount ? 'אפשר לעבור להצגת כל התנועות.' : 'הרשומות הקיימות בג׳אנקי עדיין זמינות. חיבור Financy יוסיף את תנועות הבנק לתור ההתאמה הזה.'}</Empty>}
        {inbox.data.total > 50 && <div className="fn-pagination"><button className="fn-secondary" disabled={offset === 0} onClick={() => setOffset(Math.max(0,offset - 50))}>הקודם</button><span>{offset + 1}–{Math.min(offset + 50,inbox.data.total)} מתוך {inbox.data.total}</span><button className="fn-secondary" disabled={offset + 50 >= inbox.data.total} onClick={() => setOffset(offset + 50)}>הבא</button></div>}
      </div>
      <details className="fn-surface fn-details"><summary>הצעות להתאמה <span>{inbox.data.suggestions.length}</span></summary><p className="fn-muted">סכום ותאריך דומים הם רק רמז. בדוק שזאת אותה עסקה לפני אישור. מקדמה ויתרת פרויקט יכולות להיות באותו סכום — בוחרים איזו מהן התקבלה.</p>
        {inbox.data.suggestions.map(s => <div className="fn-list-row fn-suggested-match" key={s.id}><div><strong>{s.label || 'מסמך'}</strong><small>{dateLabel(s.date)} · {s.reasons.join(' · ')} · {money(s.amount,s.currency)}</small>{s.unallocatedAmount != null && <small>מתוך {money(s.bankAmount || 0,s.currency)} · {money(s.unallocatedAmount,s.currency)} יישארו לבירור, לא ייסגר חיוב אחר.</small>}{s.targetType === 'transaction' && !s.representation && <MatchMode value={matchModes[s.id] || ''} onChange={value => setMatchModes(previous => ({...previous,[s.id]:value}))} direction={s.direction || inbox.data.transactions.find(t => t.id === s.bankId)?.direction}/>}</div><button className="fn-secondary" disabled={match.isPending || inbox.isFetching} onClick={() => match.mutate({method: 'post',path: '/matches', body: {bankId:s.bankId,targetId:s.targetId,targetType:s.targetType,...(s.representation ? {representation:s.representation,allocatedAmount:s.amount} : s.targetType === 'transaction' && matchModes[s.id] ? {representation:matchModes[s.id]} : {})}})}><Link2 size={15}/> {s.representation ? 'אישור שיוך חלקי' : 'אישור ההתאמה'}</button></div>)}
        {!inbox.data.suggestions.length && <p className="fn-muted">אין כרגע הצעות. אפשר לפתוח תנועת בנק ולבחור התאמה ידנית.</p>}<FinanceError error={match.error}/>{match.isSuccess && <p role="status" className="fn-saved">ההתאמה נשמרה</p>}
      </details>
      <DocumentList count={inbox.data.documentCount}/>
      <details className="fn-details"><summary>כללי סיווג שנשמרו <span>{inbox.data.rules.length}</span></summary>{inbox.data.rules.map(rule => <div className="fn-list-row" key={rule.id}><strong>{rule.merchant}</strong><span>{classNames[rule.classification]}{rule.category ? ` · ${rule.category}` : ''}</span></div>)}{!inbox.data.rules.length && <p className="fn-muted">כשמתקנים תנועה, אפשר לבקש לזכור את הבחירה לאותו ספק וחשבון.</p>}</details>
      <FinanceSheet open={!!selected} onClose={() => setSelectedId(null)} title="בודקים את התנועה">{selected && <TransactionReview key={selected.id} transaction={selected} inbox={inbox.data} canMutate={!inbox.isFetching}/>}</FinanceSheet>
    </>}
  </section>;
}

function AccountPurposeRow({account,disabled}: {account:AccountForReview;disabled:boolean}) {
  const [purpose,setPurpose]=useState<AccountPurpose|''>(account.purpose||'');
  const save=useFinanceSave();
  const label=account.purpose==='business'?'עסקי':account.purpose==='personal'?'אישי':account.purpose==='mixed'?'מעורב':'לא נקבע';
  return <form className="fn-list-row fn-account-purpose" onSubmit={event=>{event.preventDefault();if(purpose)save.mutate({path:`/account-purposes/${encodeURIComponent(account.id)}`,body:{purpose}});}}>
    <div><strong>{account.name}</strong><small>{account.source==='pepper_statement'?'דוח Pepper':account.source==='open_finance'?'Open Finance':'חשבון בג׳אנקי'} · ייעוד עיקרי: {label}</small></div>
    <div className="fn-account-purpose-controls"><label className="fn-sr-only" htmlFor={`purpose-${account.id}`}>ייעוד עיקרי עבור {account.name}</label><select id={`purpose-${account.id}`} value={purpose} disabled={disabled||save.isPending} onChange={event=>setPurpose(event.target.value as AccountPurpose|'')}><option value="">בחר ייעוד</option><option value="business">עסקי בעיקר</option><option value="personal">אישי בעיקר</option><option value="mixed">מעורב</option></select><button className="fn-secondary" disabled={disabled||save.isPending||!purpose||purpose===account.purpose}>{save.isPending?'שומר…':'שמירה'}</button></div>
    <FinanceError error={save.error}/>{save.isSuccess && <span className="fn-saved" role="status">הייעוד נשמר לחשבון הזה בלבד</span>}
  </form>;
}

type ImportCommit = {mutate: (input: {file: File; confirmationDigest: string; period?: 'recent90' | 'all'}) => void; isPending: boolean; isSuccess: boolean; data?: {imported: number; needsManualReview: number}; error: Error | null};

function BankPreview({preview, file, commit}: {preview: BankStatementPreview; file: File; commit: ImportCommit}) {
  const [approved, setApproved] = useState(false);
  const ordered=[...preview.rows].sort((a,b)=>b.date.localeCompare(a.date)||a.row-b.row);
  const suggested=(preview.suggestionCounts?.business||0)+(preview.suggestionCounts?.personal||0);
  const reviewLabel=(row: BankStatementPreview['rows'][number])=>({card_settlement:'חיוב כרטיס מרוכז, לא פירוט רכישות',possible_transfer:'העברה אפשרית בין חשבונות',cash_withdrawal:'משיכת מזומן',bank_fee:'עמלת בנק, סוג ההוצאה לא ידוע',business:'אולי עסקי',personal:'אולי אישי',unclassified:'צריך לסווג'} as const)[row.reviewSuggestion?.kind||'unclassified'];
  return <div className="fn-surface fn-import-preview" role="status"><div className="fn-import-title"><FileCheck2 size={20}/><div><h2>{commit.isSuccess ? 'תנועות הדוח נשמרו לבדיקה' : 'דוח הבנק נקרא — שום דבר עוד לא נשמר'}</h2><p>{preview.file.name} · {preview.summary.rows} תנועות בטווח {dateLabel(preview.summary.from || undefined)}–{dateLabel(preview.summary.to || undefined)}{preview.summary.excludedOlder > 0 ? ` · ${preview.summary.excludedOlder} תנועות ישנות מחוץ לטווח` : ''}</p></div></div>
    <div className="fn-import-metrics"><div><span>יתרה בדוח · {dateLabel(preview.summary.latestBalanceDate || undefined)}</span><strong>{money(preview.summary.latestBalance)}</strong></div><div><span>כניסות בדוח</span><strong className="fn-income">{money(preview.summary.inflows)}</strong></div><div><span>יציאות בדוח</span><strong className="fn-expense">{money(preview.summary.outflows)}</strong></div><div><span>תנועות לבדיקה</span><strong>{preview.summary.rows}</strong></div></div>
    {preview.warnings.map(warning=><p className="fn-import-warning" key={`${warning.row}-${warning.code}`}><TriangleAlert size={16}/>{warning.message}</p>)}
    {preview.summary.wideDateRange && <p className="fn-import-warning"><TriangleAlert size={16}/>הדוח מכסה יותר משלושה חודשים ({dateLabel(preview.summary.from || undefined)}–{dateLabel(preview.summary.to || undefined)}). אישור הקליטה יחול על כל התנועות בדוח, גם הישנות.</p>}
    <p className="fn-muted">{suggested ? `${suggested} תנועות קיבלו הצעת סיווג לפי רישומים קיימים. ` : ''}{preview.summary.cardSettlements} חיובי כרטיס מרוכזים אינם פירוט הרכישות. ההצעות לא נשמרו.</p>
    {preview.summary.needsManualReview > 0 && <p className="fn-import-warning"><TriangleAlert size={16}/>{preview.summary.needsManualReview} תנועות דומות או שהשתנו לא יישמרו בלי בדיקה נוספת.</p>}
    {!!preview.summary.pairedTransfers && <p className="fn-import-warning"><TriangleAlert size={16}/>{preview.summary.pairedTransfers} תנועות בדוח נראות כמו צד אחד של העברה בין חשבונות. הן יישארו לבדיקה, לא יסווגו כהכנסה או כהוצאה.{preview.summary.existingPairReviewCount ? ` בנוסף, ${preview.summary.existingPairReviewCount} תנועות שכבר נבדקו בחשבון האחר ייפתחו לבדיקה מחודשת.` : ''}</p>}
    {commit.isSuccess ? <p className="fn-saved">נשמרו {commit.data?.imported ?? 0} תנועות בתור הבדיקה. לא נוצרו הכנסות או הוצאות חדשות ולא עודכנה יתרת העו״ש.</p> : <div className="fn-import-approval"><div><strong>{preview.summary.readyToImport} תנועות חדשות מוכנות לקליטה</strong><p className="fn-footnote">התנועות ימתינו לסיווג ולהתאמה. יתרת הדוח היא היסטורית, לא היתרה שלך היום. לא ייווצרו הכנסות או הוצאות ולא תשתנה יתרת חשבון.</p></div>{preview.importBlocked ? <p className="fn-import-warning"><TriangleAlert size={16}/>{preview.importBlockReason==='statement_gap'?'רצף התנועות או היתרות בדוח אינו מסתדר; לא ניתן לשמור אותו בבטחה.':'נתוני ג׳אנקי אינם זמינים כעת; אפשר לקרוא את הדוח אבל אי אפשר לשמור אותו בבטחה.'}</p> : preview.summary.readyToImport > 0 && <><label className="fn-checkbox"><input type="checkbox" checked={approved} onChange={event => setApproved(event.target.checked)}/>בדקתי את הסיכום ואני מאשר לקלוט את כל התנועות בטווח {dateLabel(preview.summary.from || undefined)}–{dateLabel(preview.summary.to || undefined)} לתור הבדיקה בלבד</label><button className="fn-primary" disabled={!approved || commit.isPending} onClick={() => commit.mutate({file,confirmationDigest:preview.confirmationDigest,period:preview.period})}>{commit.isPending ? 'שומר תנועות…' : `קליטת ${preview.summary.readyToImport} תנועות לבדיקה`}</button></>}</div>}
    <FinanceError error={commit.error}/>
    <details className="fn-details"><summary>כל התנועות בדוח ({ordered.length})</summary>{ordered.map(row=><div className="fn-list-row" key={row.id}><div><strong>{row.description}</strong><small>{dateLabel(row.date)} · {row.importStatus==='already_imported'?'כבר נקלטה · ':row.importStatus==='changed_existing'||row.importStatus==='possible_duplicate'?'לא תיקלט בלי בדיקה · ':''}{row.possibleTransferPairIds?.length ? 'נמצאה תנועה נגדית בחשבון אחר · לבדיקה' : reviewLabel(row)}{row.reviewSuggestion?.category ? ` (${row.reviewSuggestion.category})` : ''}</small></div><b className={row.direction==='out'?'fn-expense':'fn-income'}>{row.direction==='out'?'−':'+'}{money(row.amount)}</b></div>)}</details>
  </div>;
}

function SumitPreview({preview, file, commit}: {preview: SumitImportPreview; file: File; commit: ImportCommit}) {
  const [approved, setApproved] = useState(false);
  const ordered = [...preview.rows].sort((a,b) => b.date.localeCompare(a.date));
  const reviewNumbers = preview.rows.filter(row => row.importStatus === 'manual_review' || row.importStatus === 'changed_existing').map(row => row.number);
  return <div className="fn-surface fn-import-preview" role="status"><div className="fn-import-title"><FileCheck2 size={20}/><div><h2>{commit.isSuccess ? 'האסמכתאות נשמרו' : 'הדוח נקרא — שום דבר עוד לא נשמר'}</h2><p>{preview.file.name} · {preview.summary.rows} מסמכים · {dateLabel(preview.summary.from)}–{dateLabel(preview.summary.to)}</p></div></div>
    <div className="fn-import-metrics"><div><span>מסמכים חיוביים</span><strong>{money(preview.summary.grossPositive)}</strong></div><div><span>זיכויים / שליליים</span><strong className="fn-expense">{money(preview.summary.creditTotal)}</strong></div><div><span>נטו במסמכים</span><strong>{money(preview.summary.netDocuments)}</strong></div><div><span>התאמות אפשריות</span><strong>{preview.summary.possibleMatches}</strong></div></div>
    {preview.summary.needsManualReview > 0 && <p className="fn-import-warning"><TriangleAlert size={16}/>{preview.summary.needsManualReview} מסמכים לא יישמרו בלי בדיקה ידנית{reviewNumbers.length ? `: ${reviewNumbers.join(', ')}` : ''}.</p>}
    {preview.summary.ambiguousMatches > 0 && <p className="fn-import-warning"><TriangleAlert size={16}/>{preview.summary.ambiguousMatches} מסמכים מתאימים ליותר מעסקה אחת של אותו לקוח. המסמכים יישמרו כאסמכתאות, אבל העסקה הנכונה תיבחר רק אחרי בדיקה.</p>}
    {preview.warnings.map(warning => <p className="fn-import-warning" key={`${warning.row}-${warning.code}`}><TriangleAlert size={16}/>{warning.message}</p>)}
    {commit.isSuccess ? <p className="fn-saved">נשמרו {commit.data?.imported ?? 0} אסמכתאות לבדיקה ולהתאמה. עסקאות, סטטוס תשלום ויתרות לא השתנו.</p> : <div className="fn-import-approval"><div><strong>{preview.summary.readyToImport} אסמכתאות חדשות מוכנות לשמירה</strong><p className="fn-footnote">יישמרו כמסמכים לא מותאמים. לא תיווצר הכנסה חדשה, ולא יתעדכנו סכום, תאריך, סטטוס תשלום או יתרת בנק בעסקאות קיימות.</p></div>{preview.summary.readyToImport > 0 && <><label className="fn-checkbox"><input type="checkbox" checked={approved} onChange={event => setApproved(event.target.checked)}/>בדקתי את הסיכום ואני מאשר לשמור את האסמכתאות בלבד</label><button className="fn-primary" disabled={!approved || commit.isPending} onClick={() => commit.mutate({file, confirmationDigest: preview.confirmationDigest})}>{commit.isPending ? 'שומר אסמכתאות…' : `שמירת ${preview.summary.readyToImport} אסמכתאות`}</button></>}</div>}
    <FinanceError error={commit.error}/>
    <details className="fn-details"><summary>כל המסמכים בדוח ({ordered.length})</summary>{ordered.map(row => <div className="fn-list-row" key={row.id}><div><strong>{row.customerName || 'ללא שם'} · {row.number}</strong><small>{dateLabel(row.date)} · {row.description || row.cardName} · {row.importStatus === 'manual_review' || row.importStatus === 'changed_existing' ? 'לא יישמר — בדיקה ידנית' : row.importStatus === 'already_imported' ? 'כבר נשמר' : row.importStatus === 'ambiguous_match' ? 'כמה עסקאות אפשריות — לבחור ידנית' : row.importStatus === 'possible_match' ? 'נמצאה עסקה אפשרית בג׳אנקי' : row.kind === 'credit' ? 'זיכוי לבדיקה' : 'ממתין להתאמה'}</small></div><b className={row.amount < 0 ? 'fn-expense' : ''}>{money(row.amount,row.currency)}</b></div>)}</details>
  </div>;
}

export function TransactionReview({transaction, inbox, canMutate}: {transaction: BankTransaction; inbox: Inbox; canMutate:boolean}) {
  const [classification, setClassification] = useState(transaction.classification);
  const [category, setCategory] = useState(transaction.category || '');
  const [remember, setRemember] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const [confirmNotTransfer, setConfirmNotTransfer] = useState(transaction.transferReview === 'not_transfer');
  const [note, setNote] = useState(transaction.note || '');
  const save = useFinanceSave();
  const reverse = useFinanceSave();
  const matches = inbox.matches.filter(match => match.bankId === transaction.id);
  const assignedToDeals = matches.filter(match => match.transactionId).reduce((sum,match) => sum+(match.allocatedAmount || 0),0);
  const unassignedToDeals = Math.max(0,Math.round((transaction.amount-assignedToDeals)*100)/100);
  const protectedMovement = transaction.reviewHint === 'credit_card_settlement' || transaction.reviewHint === 'possible_own_transfer';
  const pairedCandidate = transaction.reviewHint === 'paired_transfer_candidate';
  return <fieldset disabled={!canMutate || save.isPending || reverse.isPending} style={{border:0,padding:0,margin:0,minWidth:0}}><div className="fn-detail-amount">{money(transaction.signedAmount,transaction.currency)}</div><h3>{transaction.description}</h3><p className="fn-muted">{dateLabel(transaction.date,true)} · {transaction.merchant}</p>
    {(protectedMovement || pairedCandidate) && <p className="fn-import-warning"><TriangleAlert size={16}/>{transaction.reviewHint === 'credit_card_settlement' ? 'Financy סימן את התנועה הזאת כקשורה לכרטיס. היא יכולה להיות רכישה שמופיעה גם בפירוט הכרטיס, או חיוב חודשי מרוכז. לא נספור את תנועת העו״ש שוב כהוצאה; אם פירוט הכרטיס חסר, ההוצאה נשארת לבדיקה.' : transaction.possibleTransferPairIds?.length ? `נמצאה ${transaction.possibleTransferPairIds.length === 1 ? 'תנועה נגדית' : 'יותר מתנועה נגדית אחת'} בסכום זהה בחשבון אחר, עד יומיים מהתנועה הזו. זו הצעה לבדיקה, לא קביעה.` : 'זו אולי העברה בין החשבונות שלך. כדאי לבדוק גם את הצד השני לפני שקובעים מה קרה.'}</p>}
    <form className="fn-form" onSubmit={e => {
      e.preventDefault();
      save.mutate({path: `/classification/${encodeURIComponent(transaction.id)}`, body: {classification,category,remember,confirmNew,confirmNotTransfer,note}});
    }}>
      <label>לאן זה שייך?<select value={classification} onChange={e => setClassification(e.target.value as Classification)}>
        {Object.entries(classNames).filter(([value]) => !protectedMovement || value === 'transfer' || value === 'unclassified').map(([value,label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      {pairedCandidate && ['business','personal'].includes(classification) && <label className="fn-checkbox"><input type="checkbox" checked={confirmNotTransfer} onChange={e => setConfirmNotTransfer(e.target.checked)}/>בדקתי את התנועה השנייה: זו לא העברה בין החשבונות שלי</label>}
      {!protectedMovement && <>
        <label>קטגוריה<input maxLength={100} value={category} onChange={e => setCategory(e.target.value)}/></label>
        <label>הערה לתנועה<textarea rows={2} maxLength={500} value={note} onChange={e => setNote(e.target.value)} placeholder="למשל: תוספת תקציב ל־API של סוכן אביגיל"/></label>
        <label className="fn-checkbox fn-review-choice"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}/><span><strong>לסווג כך אוטומטית גם בפעם הבאה</strong><small>רק תנועות עתידיות מאותו ספק ובאותו חשבון יקבלו את אותו סיווג וקטגוריה. הן עדיין יחכו לאישור לפני שייכנסו לסכומים.</small></span></label>
        {['business','personal'].includes(classification) && <label className="fn-checkbox fn-review-choice"><input type="checkbox" checked={confirmNew} onChange={e => setConfirmNew(e.target.checked)}/><span><strong>לאשר ולהכניס את התנועה לסכומי ההוצאות</strong><small>סמן רק אם ההוצאה הזאת לא הוזנה קודם ידנית בג׳אנקי. כך נמנעת ספירה כפולה.</small></span></label>}
      </>}
      {!protectedMovement && <p className="fn-footnote">אם זו הוצאה שכבר רשמת, משייכים אותה לרשומה הקיימת למטה. בלי האישור המפורש למעלה היא נשארת בתור הבדיקה ולא נכנסת לסכומים.</p>}
      <div><button className="fn-primary" disabled={save.isPending || (pairedCandidate && ['business','personal'].includes(classification) && !confirmNotTransfer && transaction.transferReview!=='not_transfer')}>{save.isPending ? 'שומר…' : 'שמירת הסיווג'}</button>{save.isSuccess && <span className="fn-saved" role="status">הסיווג נשמר</span>}</div>
      <FinanceError error={save.error}/>
    </form>
    {matches.map(match => <div className="fn-list-row" key={match.id}><span>התאמה קיימת · {match.targetType === 'document' ? 'מסמך' : 'רשומה בג׳אנקי'}{match.allocatedAmount != null ? ` · ${money(match.allocatedAmount,transaction.currency)}` : ''}</span><button className="fn-link" disabled={reverse.isPending} onClick={() => reverse.mutate({method:'post',path:`/matches/${encodeURIComponent(match.id)}/reverse`,body:{}})}>ביטול ההתאמה</button></div>)}
    {transaction.direction === 'in' && matches.some(match => match.transactionId || match.documentId) && unassignedToDeals > 0 && <p className="fn-match-difference">{money(unassignedToDeals,transaction.currency)} מהתקבול עדיין לא שויכו לעסקה בג׳אנקי. קבלה מאמתת את התקבול, אבל אינה סוגרת חיוב אחר בעצמה.</p>}
    <FinanceError error={reverse.error}/>
    {!protectedMovement && (!pairedCandidate || transaction.transferReview==='not_transfer') && <ManualMatch transaction={transaction} documents={inbox.documents}/>}
  </fieldset>;
}
function ManualMatch({transaction, documents}: {transaction: BankTransaction; documents: Inbox['documents']}) {
  const [type, setType] = useState<'transaction' | 'personal' | 'document'>('transaction');
  const [search, setSearch] = useState('');
  const [target, setTarget] = useState('');
  const [representation,setRepresentation] = useState('');
  const [allocation,setAllocation] = useState('');
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [documentOffset,setDocumentOffset] = useState(0);
  const documentPage = useFinance<Inbox>(`/inbox?review=all&offset=${documentOffset}&limit=50`,type === 'document');
  const records = useTransactions({tab:type === 'personal' ? 'personal' : 'business',search,limit:100});
  const save = useFinanceSave();
  const sourceReady = type === 'document'
    ? !!documentPage.data && !documentPage.error && !documentPage.isFetching
    : !!records.data && !records.error && !records.isFetching;
  const sourceError = type === 'document' ? documentPage.error : records.error;
  const options = !sourceReady ? [] : type === 'document' ? (documentPage.data?.documents || documents).map(d => ({id:d.id,label:`${d.customerName || d.description} · ${d.number} · ${money(d.amount,d.currency)}`})) : (records.data?.data || []).map(t => ({id:t.id,label:`${t.description} · ${dateLabel(t.date)} · ${money(Number(t.amount),t.currency || 'ILS')}`}));
  const allocationValue = allocation.trim() === '' ? transaction.amount : Number(allocation);
  const partial = type === 'transaction' && transaction.direction === 'in' && allocationValue < transaction.amount;
  const validAllocation = Number.isFinite(allocationValue) && allocationValue > 0 && allocationValue <= transaction.amount && (allocation.trim() === '' || /^\d+(?:\.\d{1,2})?$/.test(allocation.trim()));
  const canSubmit = sourceReady && options.some(option => option.id === target) && !save.isPending && (type !== 'transaction' || validAllocation && (!partial || representation === 'collection'));
  return <><details ref={detailsRef} className="fn-details"><summary>זו עסקה או קבלה שכבר קיימת?</summary>
    <form className="fn-form" onSubmit={e => {e.preventDefault();if(!canSubmit)return;save.mutate({method:'post',path:'/matches',body:{bankId:transaction.id,targetId:target,targetType:type,...(type === 'transaction' && representation ? {representation} : {}),...(type === 'transaction' && partial ? {allocatedAmount:allocationValue} : {})}},{onSuccess:()=>{if(detailsRef.current)detailsRef.current.open=false;}});}}>
      <label>סוג הרשומה<select value={type} onChange={e => {setType(e.target.value as typeof type);setTarget('');setRepresentation('');}}><option value="transaction">עסקה בג׳אנקי</option><option value="personal">הוצאה אישית</option><option value="document">קבלה מסאמיט</option></select></label>
      {type !== 'document' && <label>חיפוש ברשומות<input value={search} onChange={e => setSearch(e.target.value)} placeholder="שם או תיאור"/></label>}
      <label>בחירת הרשומה<select value={target} onChange={e => {setTarget(e.target.value);setRepresentation('');}} required><option value="">לבחור את אותה עסקה</option>{options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
      {type === 'document' && (documentPage.data?.documentCount || 0) > 50 && <div className="fn-pagination"><button type="button" className="fn-secondary" disabled={!documentOffset} onClick={() => {setDocumentOffset(Math.max(0,documentOffset - 50));setTarget('');}}>קבלות קודמות</button><button type="button" className="fn-secondary" disabled={documentOffset + 50 >= (documentPage.data?.documentCount || 0)} onClick={() => {setDocumentOffset(documentOffset + 50);setTarget('');}}>קבלות נוספות</button></div>}
      {type === 'transaction' && <MatchMode value={representation} onChange={setRepresentation} direction={transaction.direction}/>}
      {type === 'transaction' && transaction.direction === 'in' && <label>כמה מהתקבול שייך לעסקה הזאת?<input type="number" inputMode="decimal" min="0.01" max={transaction.amount} step="0.01" value={allocation} onChange={e => setAllocation(e.target.value)} placeholder={String(transaction.amount)}/><small>תנועת הבנק: {money(transaction.amount,transaction.currency)} · השאר ריק אם כל הסכום שייך לעסקה.</small></label>}
      {partial && validAllocation && <p className="fn-match-difference">{money(allocationValue,transaction.currency)} ישויכו לגביית העסקה. <strong>{money(Math.round((transaction.amount-allocationValue)*100)/100,transaction.currency)} יישארו לבירור</strong> — לא ייסגר איתם חיוב אחר. בחר ״תשלום חדש על יתרת הפרויקט״; שיוך חלקי דורש שקבלה סופית על מלוא התקבול כבר הותאמה לתנועת הבנק.</p>}
      <p className="fn-footnote">השרת בודק סכום, מטבע וכיוון כדי למנוע שיוך כפול. הרשומה המקורית לא נמחקת.</p>
      <button className="fn-secondary" disabled={!canSubmit}>{save.isPending ? 'שומר…' : 'אישור ההתאמה'}</button>
      <FinanceError error={save.error || sourceError}/>
    </form>
  </details>{save.isSuccess && <p role="status" className="fn-saved">ההתאמה נשמרה · הסכום שלא שויך מופיע למעלה</p>}</>;
}

function MatchMode({value,onChange,direction}: {value:string;onChange:(value:string)=>void;direction?:'in'|'out'}) {
  return <label className="fn-match-mode">מה התנועה מייצגת?
    <select value={value} onChange={e => onChange(e.target.value)}>
      <option value="">לפי הרישום הקיים — בלי להניח תשלום נוסף</option>
      <option value="existing_receipt">{direction === 'out' ? 'הוצאה שכבר נרשמה כשולמה' : 'תקבול שכבר נרשם'}</option>
      {direction !== 'out' && <option value="collection">תשלום חדש על יתרת הפרויקט</option>}
      {direction === 'out' && <option value="expense_payment">תשלום חדש על הוצאה שטרם שולמה</option>}
    </select>
    {value === 'collection' && <small>התנועה תקטין את יתרת הגבייה. בחר רק אם זה תשלום נוסף, לא אותה מקדמה שכבר רשמת.</small>}
    {value === 'expense_payment' && <small>מאשר שההוצאה שטרם שולמה אכן יצאה מהחשבון.</small>}
  </label>;
}

function DocumentList({count}: {count:number}) {
  const [open,setOpen] = useState(false);
  const [offset,setOffset] = useState(0);
  const query = useFinance<Inbox>(`/inbox?review=all&offset=${offset}&limit=50`,open);
  return <details className="fn-surface fn-details" onToggle={event => setOpen(event.currentTarget.open)}><summary>מסמכים מסאמיט <span>{count}</span></summary><p className="fn-muted">קבלה היא אסמכתה — לא הכנסה נוספת. קישור לעסקה ובדיקת תקבול בבנק הם שני דברים נפרדים.</p><FinanceError error={query.error} retry={() => void query.refetch()}/>{open && query.isPending && <Loading label="טוען מסמכים…"/>}{!query.error && query.data?.documents.map(d => <div className="fn-list-row" key={d.id}><div><strong>{d.customerName || d.description || 'מסמך'} · {d.number}</strong><small>{dateLabel(d.date)} · {d.businessTransactionId ? 'מקושר להכנסה בג׳אנקי' : 'טרם קושר לעסקה'} · {d.matchStatus === 'matched' ? 'תקבול בנק אומת' : 'לא אומת מול הבנק'}</small></div><b>{money(d.amount,d.currency)}</b></div>)}{query.data && !query.error && !query.isFetching && !query.data.documents.length && <p className="fn-muted">מסמכים יופיעו אחרי קליטה מאושרת של הדוח ההיסטורי.</p>}{count > 50 && !query.error && <div className="fn-pagination"><button className="fn-secondary" disabled={!offset || query.isFetching} onClick={() => setOffset(Math.max(0,offset - 50))}>הקודם</button><span>{offset + 1}–{Math.min(offset + 50,count)} מתוך {count}</span><button className="fn-secondary" disabled={offset + 50 >= count || query.isFetching} onClick={() => setOffset(offset + 50)}>הבא</button></div>}</details>;
}
