import { useMemo, useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useClients, useCreateClient } from '@/hooks/useClients';
import {
  useCategories,
  useCreatePersonalExpense,
  useCreateTransaction,
  useUpdatePersonalExpense,
  useUpdateTransaction,
} from '@/hooks/useTransactions';
import { israelToday, money } from '@/lib/financeFormatters';
import type { BusinessTransaction, CreateBusinessTransactionInput, CreatePersonalExpenseInput, PersonalExpense } from '@/types';
import { FinanceError } from './FinanceUI';

const businessDefaults = ['פרויקטים', 'ריטיינרים', 'כלים ותוכנות', 'שיווק ופרסום', 'משרד ושכירות', 'נסיעות ותחבורה', 'ייעוץ ושירותים', 'ציוד וחומרה', 'משכורות ושכר', 'ביטוח', 'אחר'];
const personalDefaults = ['מזון ומשקאות', 'קניות ובגדים', 'בריאות ורפואה', 'בידור ופנאי', 'תחבורה', 'חשבונות ושירותים', 'חינוך', 'נסיעות', 'אחר'];
type ScheduleDraft = { id: string; amount: string; date: string; unknown: boolean };
type BusinessKind = 'income' | 'expense' | 'collection';

const numeric = (value: string) => Number(value);
const cents = (value: number) => Math.round(value * 100);
const validUrl = (value: string) => !value || /^https?:\/\//i.test(value) && (() => { try { new URL(value); return true; } catch { return false; } })();
const optionList = (defaults: string[], existing: string[], current: string) => [...new Set([...defaults, ...existing, current].filter(Boolean))];

export function FinanceBusinessEditor({transaction, linkedTo, collectionDraft = false, onSaved}: {transaction?: BusinessTransaction; linkedTo?: BusinessTransaction; collectionDraft?: boolean; onSaved: () => void}) {
  const fixedCollection = transaction?.type === 'collection';
  const [type, setType] = useState<BusinessKind>(transaction?.type || (linkedTo ? 'expense' : 'income'));
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : '');
  const [description, setDescription] = useState(transaction?.description || '');
  const [category, setCategory] = useState(transaction?.category || (linkedTo?.category || (collectionDraft ? 'ייעוץ ושירותים' : '')));
  const [date, setDate] = useState(transaction?.date || israelToday());
  const [clientId, setClientId] = useState(transaction?.client_id || linkedTo?.client_id || '');
  const [newClientName, setNewClientName] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending' | 'overdue'>(transaction?.payment_status || 'pending');
  const [projectTotal, setProjectTotal] = useState(transaction?.project_total == null ? '' : String(transaction.project_total));
  const [expectedDate, setExpectedDate] = useState(transaction?.expected_payment_date || '');
  const [schedule, setSchedule] = useState<ScheduleDraft[]>((transaction?.payment_schedule || []).map(item => ({id: item.id || crypto.randomUUID(), amount: String(item.amount), date: item.date || '', unknown: item.unknown})));
  const [partnerPct, setPartnerPct] = useState(transaction?.partner_split_pct == null ? (collectionDraft ? '0' : '') : String(transaction.partner_split_pct));
  const [notes, setNotes] = useState(transaction?.notes || '');
  const [documentLink, setDocumentLink] = useState(transaction?.document_link || '');
  const [advancedOpen, setAdvancedOpen] = useState(!!transaction && !!(transaction.project_total || transaction.payment_schedule?.length || transaction.partner_split_pct));
  const [notesOpen, setNotesOpen] = useState(!!transaction?.notes || !!transaction?.document_link);
  const [error, setError] = useState('');
  const clients = useClients();
  const categories = useCategories('business');
  const createClient = useCreateClient();
  const create = useCreateTransaction();
  const update = useUpdateTransaction();
  const isIncome = type === 'income';
  const total = projectTotal ? numeric(projectTotal) : numeric(amount);
  const remaining = isIncome && Number.isFinite(total) ? Math.max(0, total - (paymentStatus === 'paid' ? numeric(amount) || 0 : 0)) : 0;
  const scheduled = schedule.reduce((sum, item) => sum + (numeric(item.amount) || 0), 0);
  const choices = useMemo(() => optionList(businessDefaults, categories.data || [], category), [categories.data, category]);
  const busy = create.isPending || update.isPending || createClient.isPending;

  const addSchedule = () => setSchedule(previous => [...previous, {id: crypto.randomUUID(), amount: String(Math.max(0, Math.round((remaining - scheduled) * 100) / 100) || ''), date: '', unknown: true}]);
  const patchSchedule = (id: string, patch: Partial<ScheduleDraft>) => setSchedule(previous => previous.map(item => item.id === id ? {...item, ...patch} : item));
  const preset = (percent: 25 | 50) => {
    if (!Number.isFinite(total) || total <= 0) { setError('קודם צריך להזין את שווי העסקה.'); return; }
    const first = Math.round(total * percent) / 100;
    setSchedule([
      {id: crypto.randomUUID(), amount: String(first), date: expectedDate, unknown: !expectedDate},
      {id: crypto.randomUUID(), amount: String(Math.round((total - first) * 100) / 100), date: '', unknown: true},
    ]);
    setError('');
  };

  async function addClient() {
    if (!newClientName.trim()) return;
    try {
      const client = await createClient.mutateAsync({name: newClientName.trim()});
      setClientId(client.id);
      setNewClientName('');
      setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'לא הצלחנו ליצור את הלקוח.'); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = numeric(amount);
    if (!Number.isFinite(value) || value <= 0 || !description.trim() || !category || !/^\d{4}-\d{2}-\d{2}$/.test(date)) { setError('צריך סכום חיובי, תיאור, קטגוריה ותאריך תקינים.'); return; }
    if (!validUrl(documentLink.trim())) { setError('קישור למסמך צריך להתחיל ב־https:// או http://.'); return; }
    if (isIncome && (projectTotal && (!Number.isFinite(total) || total < value))) { setError('שווי הפרויקט לא יכול להיות קטן מהסכום שרשמת.'); return; }
    if (isIncome && partnerPct && (!Number.isFinite(numeric(partnerPct)) || numeric(partnerPct) < 0 || numeric(partnerPct) > 100)) { setError('חלק השותף צריך להיות בין 0% ל־100%.'); return; }
    if (isIncome && schedule.length && (schedule.some(item => !Number.isFinite(numeric(item.amount)) || numeric(item.amount) <= 0 || (!item.unknown && !item.date)) || Math.abs(cents(scheduled) - cents(remaining)) > 1)) { setError(`פעימות התשלום צריכות להסתכם ביתרה של ${money(remaining)}, עם תאריך או סימון ״לא ידוע״ לכל פעימה.`); return; }
    const normalizedSchedule = isIncome && schedule.length ? schedule.map(item => ({id: item.id, amount: numeric(item.amount), date: item.unknown ? null : item.date, unknown: item.unknown})) : null;
    const payload: CreateBusinessTransactionInput = {
      type, amount: value, description: description.trim(), category, date, currency: transaction?.currency || 'ILS',
      client_id: clientId || null, notes: notes.trim() || null, document_link: documentLink.trim() || null,
      is_recurring: transaction?.is_recurring || false,
      ...(isIncome ? {
        payment_status: paymentStatus,
        project_total: projectTotal ? total : null,
        expected_payment_date: expectedDate || (normalizedSchedule?.find(item => !item.unknown)?.date || null),
        expected_date_unknown: !expectedDate && (!normalizedSchedule || normalizedSchedule.every(item => item.unknown)),
        payment_schedule: normalizedSchedule,
        partner_split_pct: partnerPct === '' ? null : numeric(partnerPct),
      } : {payment_status: 'paid' as const}),
      ...(linkedTo ? {linked_transaction_id: linkedTo.id} : {}),
    };
    try {
      if (transaction) await update.mutateAsync({id: transaction.id, data: payload});
      else await create.mutateAsync(payload);
      onSaved();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'לא הצלחנו לשמור את הרישום.'); }
  }

  return <form className="fn-form" onSubmit={submit}>
    {collectionDraft && !transaction && <p className="fn-notice"><strong>רושמים כאן כסף שעוד צריך להיכנס.</strong> הוא יופיע בגבייה ובתזרים, אבל לא ייחשב כסף שהתקבל עד שתדווח על תקבול או שתימצא התאמה בבנק.</p>}
    {linkedTo && <p className="fn-notice">ההוצאה תקושר לעסקה: <strong>{linkedTo.description}</strong></p>}
    <div className="fn-form-grid">
      <label>סוג רישום<select value={type} disabled={!!transaction || !!linkedTo} onChange={event => {setType(event.target.value as BusinessKind); setCategory('');}}><option value="income">עסקה / הכנסה</option><option value="expense">הוצאה עסקית</option>{fixedCollection && <option value="collection">תקבול על עסקה</option>}</select></label>
      <label>{isIncome ? paymentStatus === 'pending' ? (collectionDraft ? 'כמה צריך לגבות' : 'שווי העסקה') : 'הסכום שדיווחת שהתקבל' : 'סכום'}<input type="number" min="0.01" step="0.01" required value={amount} onChange={event => setAmount(event.target.value)}/></label>
    </div>
    <label>{collectionDraft ? 'על מה הגבייה?' : 'מה העסקה?'} <input required maxLength={500} value={description} onChange={event => setDescription(event.target.value)} placeholder={collectionDraft ? 'למשל: עבודה שעתית למירי' : 'שם הפרויקט או הספק'}/></label>
    <div className="fn-form-grid"><label>קטגוריה<select required value={category} onChange={event => setCategory(event.target.value)}><option value="">בחירת קטגוריה</option>{choices.map(choice => <option key={choice} value={choice}>{choice}</option>)}</select></label><label>{isIncome ? 'תאריך סגירת העסקה' : 'תאריך הרישום'}<input type="date" required value={date} onChange={event => setDate(event.target.value)}/></label></div>
    <label>לקוח<select value={clientId} onChange={event => setClientId(event.target.value)}><option value="">ללא לקוח</option>{clients.data?.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
    <div className="fn-inline-entry"><input aria-label="שם לקוח חדש" value={newClientName} onChange={event => setNewClientName(event.target.value)} placeholder="לקוח חדש"/><button type="button" className="fn-secondary" disabled={!newClientName.trim() || busy} onClick={() => void addClient()}><Plus size={15}/> יצירת לקוח</button></div>
    {isIncome && <><fieldset className="fn-radio-field"><legend>הכסף כבר נכנס?</legend><label><input type="radio" name="finance-paid" checked={paymentStatus !== 'paid'} onChange={() => setPaymentStatus('pending')}/> {paymentStatus === 'overdue' ? 'עדיין לא · באיחור' : 'עדיין לא'}</label><label><input type="radio" name="finance-paid" checked={paymentStatus === 'paid'} onChange={() => setPaymentStatus('paid')}/> כן, דיווחתי שהתקבל</label></fieldset><p className="fn-footnote">סגירת עסקה אינה תקבול. גם ״התקבל״ הוא דיווח שלך עד התאמה לתנועת הבנק.</p></>}
    {isIncome && <details className="fn-details fn-editor-advanced" open={advancedOpen} onToggle={event => setAdvancedOpen(event.currentTarget.open)}><summary>פרויקט, שותף ולוח גבייה</summary>
      <div className="fn-form-grid"><label>שווי מלא של הפרויקט<input type="number" min="0" step="0.01" value={projectTotal} onChange={event => setProjectTotal(event.target.value)} placeholder={amount || 'לפי שווי העסקה'}/></label><label>חלק השותף באחוזים<input type="number" min="0" max="100" step="0.01" value={partnerPct} onChange={event => setPartnerPct(event.target.value)} placeholder="אם יש שותף"/></label></div>
      <label>מועד גבייה צפוי<input type="date" value={expectedDate} onChange={event => setExpectedDate(event.target.value)}/></label>
      {remaining > 0 && <div className="fn-schedule"><div className="fn-section-head"><strong>יתרה לגבייה: {money(remaining)}</strong><span className="fn-muted">מתוכם תוזמנו {money(scheduled)}</span></div>{!schedule.length && paymentStatus !== 'paid' && <div className="fn-inline-entry"><button type="button" className="fn-secondary" onClick={() => preset(25)}>25% / 75%</button><button type="button" className="fn-secondary" onClick={() => preset(50)}>50% / 50%</button></div>}
        {schedule.map(item => <div className="fn-schedule-row" key={item.id}><label>סכום<input type="number" min="0.01" step="0.01" value={item.amount} onChange={event => patchSchedule(item.id,{amount:event.target.value})}/></label><label>תאריך<input type="date" disabled={item.unknown} value={item.date} onChange={event => patchSchedule(item.id,{date:event.target.value})}/></label><label className="fn-checkbox"><input type="checkbox" checked={item.unknown} onChange={event => patchSchedule(item.id,{unknown:event.target.checked})}/>לא ידוע</label><button type="button" className="fn-icon" aria-label="הסרת פעימה" onClick={() => setSchedule(previous => previous.filter(entry => entry.id !== item.id))}><Trash2 size={17}/></button></div>)}
        <button type="button" className="fn-link" onClick={addSchedule}><Plus size={15}/> הוספת פעימה</button></div>}
    </details>}
    <details className="fn-details fn-editor-advanced" open={notesOpen} onToggle={event => setNotesOpen(event.currentTarget.open)}><summary>הערה ומסמך</summary><label>הערה<textarea rows={3} value={notes} onChange={event => setNotes(event.target.value)}/></label><label>קישור לקבלה או למסמך<input type="url" value={documentLink} onChange={event => setDocumentLink(event.target.value)} placeholder="https://"/></label></details>
    {error && <p role="alert" className="fn-error">{error}</p>}<FinanceError error={clients.error || categories.error}/>
    <button type="submit" className="fn-primary" disabled={busy}>{busy ? 'שומר…' : transaction ? 'שמירת השינויים' : 'שמירת הרישום'}</button>
  </form>;
}

export function FinancePersonalEditor({expense, onSaved}: {expense?: PersonalExpense; onSaved: () => void}) {
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '');
  const [description, setDescription] = useState(expense?.description || '');
  const [category, setCategory] = useState(expense?.category || '');
  const [date, setDate] = useState(expense?.date || israelToday());
  const [notes, setNotes] = useState(expense?.notes || '');
  const [documentLink, setDocumentLink] = useState(expense?.document_link || '');
  const [notesOpen, setNotesOpen] = useState(!!expense?.notes || !!expense?.document_link);
  const [error, setError] = useState('');
  const categories = useCategories('personal');
  const create = useCreatePersonalExpense();
  const update = useUpdatePersonalExpense();
  const choices = useMemo(() => optionList(personalDefaults, categories.data || [], category), [categories.data, category]);
  const busy = create.isPending || update.isPending;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!Number.isFinite(numeric(amount)) || numeric(amount) <= 0 || !description.trim() || !category || !date) {setError('צריך סכום חיובי, תיאור, קטגוריה ותאריך.'); return;}
    if (!validUrl(documentLink.trim())) {setError('קישור למסמך צריך להתחיל ב־https:// או http://.'); return;}
    const payload: CreatePersonalExpenseInput = {amount:numeric(amount),description:description.trim(),category,date,notes:notes.trim() || null,document_link:documentLink.trim() || null,currency:expense?.currency || 'ILS'};
    try {if (expense) await update.mutateAsync({id:expense.id,data:payload}); else await create.mutateAsync(payload);onSaved();}
    catch(cause) {setError(cause instanceof Error ? cause.message : 'לא הצלחנו לשמור את ההוצאה.');}
  }
  return <form className="fn-form" onSubmit={submit}><div className="fn-form-grid"><label>סכום<input type="number" min="0.01" step="0.01" required value={amount} onChange={event => setAmount(event.target.value)}/></label><label>תאריך<input type="date" required value={date} onChange={event => setDate(event.target.value)}/></label></div><label>על מה ההוצאה?<input required maxLength={500} value={description} onChange={event => setDescription(event.target.value)}/></label><label>קטגוריה<select required value={category} onChange={event => setCategory(event.target.value)}><option value="">בחירת קטגוריה</option>{choices.map(choice=><option key={choice} value={choice}>{choice}</option>)}</select></label><details className="fn-details fn-editor-advanced" open={notesOpen} onToggle={event => setNotesOpen(event.currentTarget.open)}><summary>הערה ומסמך</summary><label>הערה<textarea rows={3} value={notes} onChange={event=>setNotes(event.target.value)}/></label><label>קישור למסמך<input type="url" value={documentLink} onChange={event=>setDocumentLink(event.target.value)} placeholder="https://"/></label></details>{error && <p role="alert" className="fn-error">{error}</p>}<FinanceError error={categories.error}/><button className="fn-primary" disabled={busy}>{busy ? 'שומר…' : expense ? 'שמירת השינויים' : 'שמירת ההוצאה'}</button></form>;
}
