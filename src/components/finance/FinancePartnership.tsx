import { useState, type FormEvent } from 'react';
import { useFinance, useFinanceSave } from '@/hooks/useFinance';
import type { Partnership, PartnershipItem } from '@/types/finance';
import { Empty, FinanceError, FinanceSheet, Loading, TrustBadge } from './FinanceUI';
import { dateLabel, money } from '@/lib/financeFormatters';
import { FinanceDataIcon } from './FinanceVisuals';

function partnershipLabel(item: PartnershipItem) {
  // V1 generated August/September occurrences from a July retainer but kept
  // the original July title. Show the billing month without editing source data.
  if (item.description.trim() !== 'רטיינר יולי אביגיל' || !/^2026-(0[7-9])-\d{2}$/.test(item.date)) return item.description;
  const month = Number(item.date.slice(5, 7));
  return `ריטיינר אביגיל · ${['יולי', 'אוגוסט', 'ספטמבר'][month - 7]} 2026`;
}

export default function FinancePartnership() {
  const query = useFinance<Partnership>('/partnership');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = query.data?.items.find(item => item.id === selectedId);
  const finalBalanceKnown = query.data?.status === 'confirmed' && query.data.outstanding.amount !== null;
  const currentItems = query.data?.items.filter(item => item.includedInOutstanding !== false) || [];
  const historicalItems = query.data?.items.filter(item => item.includedInOutstanding === false) || [];
  const components = query.data?.components;
  const postAnchorRecorded = components?.newIncomeShare != null && components?.newBankCollections != null ? components.newIncomeShare - components.newBankCollections : null;
  return <section className="fn-page fn-page-partnership"><div className="fn-section-head fn-page-head"><div><span className="fn-page-kicker">חשבון אחד שאפשר להסביר</span><h1>דוד והשותפות</h1><p className="fn-muted">כל סכום, הכלל שלו ומה כבר נסגר.</p></div></div>
    <FinanceError error={query.error} retry={() => void query.refetch()}/>{query.isPending && <Loading/>}
    {query.data && <>
      <div className="fn-partner-total fn-surface"><div><span className="fn-eyebrow">כמה לשמור לדוד כרגע?</span><strong className="fn-big-number">{finalBalanceKnown ? money(query.data.outstanding.amount) : money(query.data.outstanding.amount)}</strong><TrustBadge status={query.data.status}/></div><div className="fn-partner-equation"><div><span>חוב ישן אחרי עוגן 30.6</span><b>{money(components?.oldBalance ?? null)}</b></div><div><span>עסקאות מאז העוגן</span><b>{money(postAnchorRecorded)}</b></div><div><span>מקדמת 11,800</span><b>{money(components?.newBankCollections ?? null)}</b></div><div><span>קיזוזי הוצאות משותפות</span><b>{money(components?.sharedExpenseOffsets ?? null)}</b></div><div><span>תשלומים אחרי העוגן</span><b>{money(components?.paymentsAfterAnchor ?? null)}</b></div><div className="fn-partner-subtotal"><span>{finalBalanceKnown ? 'סה״כ לתשלום' : 'סה״כ זמני לפי הרשומות'}</span><b>{money(query.data.outstanding.amount)}</b></div></div></div>
      <p className="fn-notice">ה־4,400 ₪ של 30.6 סוגרים את הדלי הישן. ה־1,100 ₪ מ־24.6 כנראה קשורים לדוד, אבל נמצאים בתוך אותו דלי היסטורי ולכן לא הופחתו שוב. חתונת יאיר נשארה לבירור ואינה חוסמת את השימוש היומיומי. הסכום עדיין מוצג כאומדן, לא כהוראת תשלום.</p>
      <div className="fn-surface fn-ledger-surface"><div className="fn-section-head"><div><span className="fn-page-kicker">מאז עוגן 30.6</span><h2>ממה הסכום הנוכחי מורכב</h2></div><span className="fn-count-pill">{currentItems.length} רשומות</span></div><div className="fn-transaction-list">{[...currentItems].sort((a,b) => b.date.localeCompare(a.date)).map(item => <button className="fn-list-row fn-row-button fn-ledger-row" key={item.id} onClick={() => setSelectedId(item.id)}><span className="fn-ledger-item-main"><FinanceDataIcon label={partnershipLabel(item)} kind={item.type === 'income' ? 'income' : 'expense'} tone={item.type === 'income' ? 'partner' : 'warning'}/><span><strong>{partnershipLabel(item)}</strong><small>{dateLabel(item.date, true)} · {item.origin === 'bank_collection' ? 'תקבול בנק חדש · ' : ''}{item.type === 'income' ? `חלק דוד ${item.davidPercent ?? '?'}%` : 'הוצאה משותפת'}</small></span></span><div className="fn-value-stack"><b>{money(item.delta)}</b><TrustBadge status={item.status}/></div></button>)}</div>{!currentItems.length && <Empty title="אין רכיבים פתוחים אחרי העוגן">ההיסטוריה נשמרה בנפרד ולא מחויבת שוב.</Empty>}</div>
      {!!query.data.unresolved?.length && <details className="fn-surface fn-details"><summary>שורות שעדיין לא השפיעו על החוב <span>{query.data.unresolved.length}</span></summary>{query.data.unresolved.map(item => <div className="fn-list-row" key={item.id}><div><strong>{item.reason || item.id}</strong><small>{item.date ? dateLabel(item.date,true) : 'ללא תאריך'} · לא נוסף ולא קוזז</small></div><b>{money(item.amount ?? null)}</b></div>)}</details>}
      {!!historicalItems.length && <details className="fn-surface fn-details"><summary>היסטוריה לפני עוגן 30.6 <span>{historicalItems.length}</span></summary><p className="fn-muted">הרשומות נשמרות להסבר ולביקורת, אבל אינן מחויבות שוב ביתרה הנוכחית.</p>{[...historicalItems].sort((a,b)=>b.date.localeCompare(a.date)).map(item => <button className="fn-list-row fn-row-button" key={item.id} onClick={() => setSelectedId(item.id)}><div><strong>{partnershipLabel(item)}</strong><small>{dateLabel(item.date,true)}</small></div><b>{money(item.delta)}</b></button>)}</details>}
      <details className="fn-surface fn-details"><summary>מה כבר שולם או קוזז <span>{query.data.settlements.length}</span></summary>{query.data.settlements.map(item => <div className="fn-list-row" key={item.id}><div><strong>{item.description}</strong><small>{dateLabel(item.date, true)} · {item.note}</small></div><b>{money(item.paid)}</b></div>)}</details>
      <FinanceSheet open={!!selectedId} onClose={() => setSelectedId(null)} title={selected ? partnershipLabel(selected) : 'בדיקת עסקה'}>{selected && <PartnershipDetail key={selected.id} item={selected} settlements={query.data.settlements}/>}</FinanceSheet>
    </>}
  </section>;
}
function PartnershipDetail({item, settlements}: {item: PartnershipItem; settlements: Partnership['settlements']}) {
  const review = useFinanceSave();
  const allocation = useFinanceSave();
  const [status, setStatus] = useState(item.review?.status || 'estimated');
  const [note, setNote] = useState(item.review?.note || '');
  const [settlementId, setSettlementId] = useState('');
  const [amount, setAmount] = useState('');
  const isExpense = item.type !== 'income' || item.settlementStatus === 'not_applicable';
  const isBankCollection = item.origin === 'bank_collection';
  function saveReview(e: FormEvent) {e.preventDefault();review.mutate({path: `/partnership/review/${encodeURIComponent(item.id)}`, body: {status, note}});}
  function allocate(e: FormEvent) {e.preventDefault();allocation.mutate({path: '/partnership/allocations', body: {partnershipId: item.id, settlementId, amount: Number(amount)}});}
  return <>
    <div className="fn-detail-amount">{money(item.david)} <span>{isExpense ? 'חלק דוד בהוצאה' : 'חלק דוד'}</span></div><TrustBadge status={item.status}/>
    {partnershipLabel(item) !== item.description && <p className="fn-muted">שם הרשומה המקורית בג׳אנקי: {item.description}</p>}
    <dl className="fn-definition">
      <div><dt>סכום {isExpense ? 'ההוצאה' : 'העסקה'}</dt><dd>{money(item.gross)}</dd></div>
      {!isExpense && <><div><dt>הוצאות מקושרות</dt><dd>{money(item.linkedExpenses)}</dd></div><div><dt>ניכוי לפני החלוקה {item.taxRate != null ? `(${item.taxRate}%)` : ''}</dt><dd>{money(item.tax)}</dd></div><div><dt>סכום לחלוקה</dt><dd>{money(item.net)}</dd></div></>}
      <div><dt>האחוז לחישוב הנוכחי</dt><dd>{item.davidPercent == null ? 'חסר כלל' : `${item.davidPercent}%`}</dd></div>
      {isExpense ? <div><dt>השפעה על החוב לדוד</dt><dd>{money(item.delta)}</dd></div> : <>{item.origin === 'recorded' && <div><dt>אומת כתקבול בבנק</dt><dd>{item.bankReceived == null ? 'טרם הותאם' : `${money(item.bankReceived)} · ${item.bankReceipts?.length || 0} תנועות`}</dd></div>}<div><dt>שולם לדוד מתוך העסקה</dt><dd>{money(item.settledAmount)}</dd></div><div><dt>עוד לשלם לדוד בגין העסקה</dt><dd>{money(item.outstanding)}</dd></div><div><dt>מצב ההתחשבנות עם דוד</dt><dd>{{unknown:'תשלומי העבר לא שויכו לעסקה',open:'טרם שולם',partial:'שולם חלקית',settled:'הוסדר',not_applicable:'קיזוז הוצאה — לא תשלום'}[item.settlementStatus || 'unknown']}</dd></div></>}
    </dl>
    {!!item.bankReceipts?.length && <details className="fn-details"><summary>תנועות הבנק ששויכו ({item.bankReceipts.length})</summary>{item.bankReceipts.map(receipt => <div className="fn-list-row" key={receipt.source}><span>{receipt.date ? dateLabel(receipt.date, true) : 'תאריך לא ידוע'}</span><b>{money(receipt.amount)}</b></div>)}</details>}
    <p className="fn-muted">{item.settlementNote}</p>{item.review?.note && <p className="fn-notice">מה כבר נבדק: {item.review.note}</p>}{item.issues.length > 0 && <div className="fn-error">{item.issues.map(issue => <p key={issue}>{issue}</p>)}</div>}
    {item.recorded && <p className="fn-notice">לפני התיקון, נרשמה עסקה של {money(item.recorded.gross)} וחלק דוד של {money(item.recorded.david)}{item.recorded.davidPercent != null ? ` לפי ${item.recorded.davidPercent}%` : ''}. התיקון משפיע על החישוב כאן בלבד; רישום V1 נשאר ללא שינוי.{item.ruleNote ? ` הערת הבדיקה: ${item.ruleNote}` : ''}</p>}
    {isBankCollection ? <p className="fn-notice">החלק הזה חושב מתקבול בנק ששויך לעסקה, לפי כלל השותפות שלה. לא נוספה רשומת שותפות היסטורית נוספת. בודקים או מבטלים את ההתאמה באזור החיבורים.</p> : <form onSubmit={saveReview} className="fn-form"><h3>תוצאת הבדיקה שלך</h3><label>מצב<select value={status} onChange={e => setStatus(e.target.value)}><option value="estimated">עדיין בבדיקה</option><option value="confirmed">בדקתי — הרישום נכון</option><option value="disputed">יש פער שצריך לפתור</option></select></label><label>מה בדקת או מה לא מסתדר?<textarea rows={2} value={note} onChange={e => setNote(e.target.value)} maxLength={1000}/></label><div><button className="fn-primary" disabled={review.isPending}>{review.isPending ? 'שומר…' : 'שמירת הבדיקה'}</button>{review.isSuccess && <span role="status" className="fn-saved">הבדיקה נשמרה</span>}</div><FinanceError error={review.error}/></form>}
    {!isExpense && !isBankCollection && <details className="fn-details"><summary>שיוך התחשבנות קיימת לעסקה</summary><p className="fn-muted">לא רושם תשלום נוסף ולא משנה את סך החוב. רק מסביר איזו עסקה התשלום מכסה. סכום 0 מסיר את השיוך.</p><form className="fn-form" onSubmit={allocate}><label>איזו התחשבנות?<select value={settlementId} onChange={e => setSettlementId(e.target.value)} required><option value="">בחירת תשלום קיים</option>{settlements.map(s => <option key={s.id} value={s.id}>{s.description} · {money(s.paid)}</option>)}</select></label><label>כמה מתוכה שייך לעסקה הזאת?<input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} required/></label><div><button className="fn-secondary" disabled={allocation.isPending}>{allocation.isPending ? 'שומר…' : 'שמירת השיוך'}</button>{allocation.isSuccess && <span className="fn-saved" role="status">השיוך נשמר</span>}</div><FinanceError error={allocation.error}/></form></details>}
    {((isBankCollection && item.transactionId) || (!isBankCollection && !isExpense)) && <PartnershipRuleEditor item={item}/>}
  </>;
}

function PartnershipRuleEditor({item}: {item: PartnershipItem}) {
  const historical = item.origin !== 'bank_collection';
  const ruleId = historical ? item.id : item.transactionId!;
  const [grossAmount,setGrossAmount] = useState(item.gross == null ? '' : String(item.gross));
  const [percent,setPercent] = useState(item.davidPercent == null ? '' : String(item.davidPercent));
  const [taxTreatment,setTaxTreatment] = useState(item.taxRate == null ? '' : item.taxRate > 0 ? 'percentage' : 'none');
  const [taxRate,setTaxRate] = useState(item.taxRate == null ? '' : String(item.taxRate));
  const [status,setStatus] = useState<string>(item.ruleStatus || (item.status === 'confirmed' ? 'confirmed' : 'estimated'));
  const [note,setNote] = useState(item.ruleNote || '');
  const save = useFinanceSave();
  return <details className="fn-details">
    <summary>{historical ? 'תיקון כלל החלוקה ההיסטורי' : 'כלל החלוקה לעסקה המקושרת'}</summary>
    <p className="fn-muted">{historical ? 'מחשב מחדש את חלק דוד ברשומה הזאת בלבד, בלי לשנות את רישום V1 ובלי להוסיף תשלום חדש.' : 'משפיע על תקבולי הבנק שמשויכים לעסקה הזאת ועל הצפי שלה. לא משנה את החלוקות ההיסטוריות בשותפות.'}</p>
    <form className="fn-form" onSubmit={e => {
      e.preventDefault();
      save.mutate({path:`/partnership/rules/${encodeURIComponent(ruleId)}`,body:{
        davidPercent:Number(percent),
        ...(historical ? {grossAmount:Number(grossAmount)} : {}),
        taxTreatment,...(taxTreatment === 'percentage' ? {taxRate:Number(taxRate)} : {}),status,note
      }});
    }}>
      {historical && <label>סכום העסקה הנכון<input type="number" min="0.01" step="0.01" value={grossAmount} onChange={e => setGrossAmount(e.target.value)} required/></label>}
      <label>איזה אחוז שייך לדוד?<input type="number" min="0" max="100" step="0.01" value={percent} onChange={e => setPercent(e.target.value)} required/></label>
      <label>ניכוי מוסכם לפני החלוקה<select value={taxTreatment} onChange={e => setTaxTreatment(e.target.value)} required><option value="">לבחור את הכלל שסוכם</option><option value="none">ללא ניכוי</option><option value="percentage">ניכוי לפי אחוז מוסכם</option></select></label>
      {taxTreatment === 'percentage' && <label>אחוז הניכוי<input type="number" min="0" max="100" step="0.01" value={taxRate} onChange={e => setTaxRate(e.target.value)} required/></label>}
      <label>עד כמה הכלל בדוק?<select value={status} onChange={e => setStatus(e.target.value)}><option value="estimated">עדיין בבדיקה</option><option value="confirmed">בדקתי את ההסכמה</option></select></label>
      <label>מקור הכלל או הערה<textarea rows={2} value={note} onChange={e => setNote(e.target.value)} maxLength={1000}/></label>
      <p className="fn-footnote">ניכוי לפני חלוקה הוא כלל שותפות, לא חישוב של חוב המס האמיתי שלך.</p>
      <button className="fn-primary" disabled={save.isPending}>{save.isPending ? 'שומר…' : 'שמירת כלל החלוקה'}</button>
      <FinanceError error={save.error}/>{save.isSuccess && <p className="fn-saved" role="status">הכלל נשמר והחישוב מתעדכן</p>}
    </form>
  </details>;
}
