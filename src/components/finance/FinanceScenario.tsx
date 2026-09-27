import { useState, type FormEvent } from 'react';
import { ArrowUp, Sparkles } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { financePost } from '@/hooks/useFinance';
import type { ChatMessage, FinancialAnswer, Simulation } from '@/types/finance';
import { FinanceError, FinanceSheet } from './FinanceUI';
import { dateLabel, israelToday, money } from '@/lib/financeFormatters';

export default function FinanceScenario({open, onClose, initialAmount = ''}: {open: boolean; onClose: () => void; initialAmount?: string}) {
  const [mode, setMode] = useState<'scenario' | 'ask'>('scenario');
  const [amount, setAmount] = useState(initialAmount);
  const [date, setDate] = useState(israelToday);
  const [frequency, setFrequency] = useState<'once' | 'monthly'>('once');
  const [description, setDescription] = useState('');
  const [days, setDays] = useState(90);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const simulation = useMutation<Simulation, Error, void>({mutationFn: () => financePost('/simulate', {amount: Number(amount), date, description, days, frequency})});
  const ask = useMutation<FinancialAnswer, Error, {question: string; history: ChatMessage[]}>({
    mutationFn: input => financePost('/ask', input),
    onSuccess: (result, input) => setMessages(previous => [...previous, {role: 'user', content: input.question}, {role: 'assistant', content: result.answer}]),
  });
  function submitAsk(e: FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    ask.mutate({question: question.trim(), history: messages.slice(-6)});
    setQuestion('');
  }
  const result = simulation.data;
  const financialMissing = result?.missing.filter(item => item.blocking !== false) || [];
  return <FinanceSheet open={open} onClose={onClose} title="לפני שמחליטים">
    <div className="fn-segments"><button onClick={() => setMode('scenario')} aria-pressed={mode === 'scenario'}>אפשר לקנות את זה?</button><button onClick={() => setMode('ask')} aria-pressed={mode === 'ask'}><Sparkles size={15}/> לשאול את ג׳אנקי</button></div>
    {mode === 'scenario' ? <>
      <p className="fn-muted">מוסיפים הוצאה לחישוב בלבד — שום עסקה לא נשמרת.</p>
      <form className="fn-form" onSubmit={e => {e.preventDefault(); simulation.mutate();}}>
        <div className="fn-form-grid"><label>כמה זה עולה? <span className="fn-muted">בשקלים</span><input name="amount" type="number" inputMode="decimal" min="0.01" max="1000000000" step="0.01" value={amount} onChange={e => {setAmount(e.target.value); simulation.reset();}} placeholder="למשל 480" required/></label><label>מתי משלמים בפעם הראשונה?<input type="date" min={israelToday()} value={date} onChange={e => {setDate(e.target.value); simulation.reset();}} required/></label></div>
        <label>כל כמה זמן?<select value={frequency} onChange={e => {setFrequency(e.target.value as 'once' | 'monthly'); simulation.reset();}}><option value="once">פעם אחת</option><option value="monthly">כל חודש, מאותו יום בחודש</option></select></label>
        <label>על מה? <span className="fn-muted">לא חובה</span><input value={description} maxLength={200} onChange={e => setDescription(e.target.value)} placeholder="מחשב, סטנדאפ, תוכנית אימונים…"/></label>
        <div className="fn-section-head"><label className="fn-inline-label">בודקים קדימה<select value={days} onChange={e => {setDays(Number(e.target.value)); simulation.reset();}}><option value={30}>חודש</option><option value={60}>חודשיים</option><option value={90}>שלושה חודשים</option></select></label><button className="fn-primary" disabled={simulation.isPending}>{simulation.isPending ? 'מחשב…' : 'לבדוק מה יישאר'}</button></div>
      </form>
      <FinanceError error={simulation.error}/>
      {result && <section className={`fn-simulation-result fn-result-${result.answer}`} aria-live="polite">
        <span className="fn-eyebrow">התשובה לפי מה שידוע כרגע</span>
        <p className="fn-muted">{result.frequency === 'monthly' ? `${money(result.amount)} בכל חודש · ${result.occurrences.length} תשלומים בטווח שנבחר` : `${money(result.amount)} פעם אחת`}</p>
        <h3>{{unknown: result.forecast.state.bank.amount === null ? 'חסרה יתרת פתיחה כדי לתת תשובה.' : 'חסר מידע כדי לחשב את כל הדרך קדימה.', shortfall: 'זה יוצר חוסר בכסף.', conditional: 'נראה אפשרי — אבל יש דברים שצריך להשלים.', fits: 'זה נכנס בתכנון.'}[result.answer]}</h3>
        <p className="fn-muted">לפני התשלום הראשון ב־{dateLabel(result.date)}: {money(result.before.amount)}</p>
        <div className="fn-result-numbers"><div><span>אחרי התשלום</span><strong>{money(result.after.amount)}</strong></div><div><span>הכי מעט שיישאר בדרך</span><strong>{money(result.minimum)}</strong></div></div>
        {result.requiredNet != null && result.requiredNet > 0 && <p>כדי לא להיכנס למינוס, צריך עוד <strong>{money(result.requiredNet)} נטו</strong> עד {dateLabel(result.firstShortfall)}. זה כסף שצריך להיכנס בפועל, אחרי חלקי שותף והוצאות.</p>}
        {result.recovery && <p>לפי הכסף שצפוי להיכנס, חוזרים לפלוס ב־{dateLabel(result.recovery)}. ייתכן חוסר נוסף אחר כך, במיוחד בתשלום חודשי; ההכנסות עדיין לא מובטחות.</p>}
        {result.answer === 'unknown' && <p>ההשפעה של התרחיש ידועה: {result.frequency === 'monthly' ? `${money(result.amount)} בכל אחד מ־${result.occurrences.length} תשלומים` : `פחות ${money(result.amount)} פעם אחת`}. כדי לקבוע כמה יישאר לאורך כל התקופה, צריך להשלים את היתרות, ההתחייבויות או פרטי האירועים שחסרים בחישוב.</p>}
        {result.forecast.checkpoints.length > 0 && <div className="fn-checkpoints">{result.forecast.checkpoints.map(point => <div key={point.days}><span>בעוד {point.days} יום</span><strong>{money(point.available)}</strong><small>בלי הכנסות צפויות: {money(point.withoutExpectedIncome)}</small></div>)}</div>}
        {result.frequency === 'monthly' && <details className="fn-details"><summary>כל תשלום חודשי ומה יישאר אחריו</summary>{result.forecast.events.filter(event => event.source === 'simulation_only').map(event => <div className="fn-list-row" key={event.id}><span>{dateLabel(event.date,true)} · −{money(result.amount)}</span><strong>{money(event.availableAfter)}</strong></div>)}</details>}
        {financialMissing.length > 0 && <details><summary>מה עדיין חסר לחישוב?</summary><ul className="fn-plain-list">{financialMissing.map((missing, index) => <li key={`${missing.code}-${index}`}>{missing.message}</li>)}</ul></details>}
        <p className="fn-footnote">{result.frequency === 'monthly' ? 'החישוב חוזר בכל חודש בטווח שנבחר. תשלומי כניסה, פיקדון, ארנונה או הוצאות מעבר אינם כלולים אלא אם נרשמו בנפרד.' : 'הוצאה חד־פעמית בלבד. לשכירות ולחיובים חודשיים בוחרים ״כל חודש״.'} זה תרחיש בלבד, לא אישור להתחייבות.</p>
      </section>}
    </> : <>
      <p className="fn-muted">אותם נתונים ואותם חישובים שמשמשים את המערכת. אפשר לשאול גם בטלגרם.</p>
      {!messages.length && <div className="fn-quick-questions">{['כמה כסף פנוי לי עכשיו?', 'כמה אני חייב לדוד ולמה?', 'מה צפוי להיכנס החודש?'].map(q => <button key={q} onClick={() => setQuestion(q)}>{q}</button>)}</div>}
      <div className="fn-conversation" aria-live="polite">{messages.map((message, i) => <div className={`fn-message fn-message-${message.role}`} key={i}><span>{message.role === 'user' ? 'אתה' : 'ג׳אנקי'}</span><p>{message.content}</p></div>)}{ask.isPending && <p role="status">בודק את הרשומות ומחשב…</p>}</div>
      <FinanceError error={ask.error}/>
      <form className="fn-ask-form" onSubmit={submitAsk}><label className="fn-sr-only" htmlFor="finance-question">השאלה שלך</label><textarea id="finance-question" value={question} onChange={e => setQuestion(e.target.value)} maxLength={3000} rows={2} placeholder="מה היית רוצה לדעת על הכסף שלך?" required/><button className="fn-primary" disabled={ask.isPending || !question.trim()} aria-label="שליחת השאלה"><ArrowUp size={20}/></button></form>
    </>}
  </FinanceSheet>;
}
