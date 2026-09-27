import { useState } from 'react';
import { useFinance, useFinanceSave } from '@/hooks/useFinance';
import type { RecurringItem, RecurringResponse } from '@/types/finance';
import { dateLabel, money } from '@/lib/financeFormatters';
import { Empty, FinanceError, FinanceSheet, Loading } from './FinanceUI';
import { FinanceDataIcon } from './FinanceVisuals';

const decisionText: Record<RecurringItem['decision'], string> = {
  detected: 'נראה קבוע', recurring: 'אושר כקבוע', not_recurring: 'לא קבוע', uncertain: 'צריך לבדוק',
};

export default function FinanceRecurring() {
  const query=useFinance<RecurringResponse>('/recurring');
  const [selected,setSelected]=useState<RecurringItem|null>(null);
  const [scope,setScope]=useState<'business'|'personal'>('business');
  const visible=query.data?.items.filter(item=>item.scope===scope) || [];
  const visibleTotal=visible.reduce((sum,item)=>sum+Number(item.amount||0),0);
  return <section className={`fn-surface fn-recurring-panel fn-expense-${scope}`}>
    <div className="fn-expense-head"><div><span className="fn-page-kicker">דברים שיורדים שוב</span><h2>הוצאות שחוזרות</h2><p>זוהו מתנועות הבנק. הסכום הוא אומדן למחזור הבא, לא חיוב שכבר ירד.</p></div><div className="fn-scope-switch fn-expense-switch" role="group" aria-label="בחירת סוג חיובים חוזרים"><button aria-pressed={scope==='business'} onClick={()=>setScope('business')}>עסקי</button><button aria-pressed={scope==='personal'} onClick={()=>setScope('personal')}>אישי</button></div></div>
    <FinanceError error={query.error} retry={() => void query.refetch()}/>
    {query.isPending && <Loading label="בודק חיובים חוזרים…"/>}
    {query.data && <div className="fn-recurring-total"><span>{scope==='business'?'עסקי':'אישי'} · חיובים שחוזרים</span><strong>{money(visibleTotal)}</strong><small>{visible.length} חיובים שזוהו</small></div>}
    {query.data && !visible.length && <Empty title={`עוד אין רצף ${scope==='business'?'עסקי':'אישי'} ברור`}>חיוב חדש או שירות בלי רצף מספיק לא יופיע כאן כניחוש.</Empty>}
    <div className="fn-data-list">{visible.map(item => <div className="fn-data-row fn-recurring-row" key={item.id}>
      <FinanceDataIcon label={item.name} scope={scope} kind="recurring"/>
      <div><strong>{item.name}</strong><small>{decisionText[item.decision]} · {item.accountType === 'credit_card' ? 'כרטיס' : 'עו״ש'}</small><small>{item.nextDate ? `הבא, בערך: ${dateLabel(item.nextDate,true)}` : 'אין תאריך לחיזוי'} · {item.reason}</small></div>
      <div className="fn-value-stack"><b>{money(item.amount,item.currency)}</b><button className="fn-link" onClick={() => setSelected(item)} aria-label={`בדיקת החיוב הקבוע של ${item.name}`}>בדיקה / תיקון</button></div>
    </div>)}</div>
    {query.data && <p className="fn-footnote">רק רצף ברור או חיוב שאישרת נכנסים ל״מה זז בדרך״, תמיד כאומדן. חיוב כרטיס לא נרשם שוב כהוצאה כשהוא יורד מהעו״ש.</p>}
    <FinanceSheet open={!!selected} onClose={() => setSelected(null)} title={selected ? `חיוב קבוע · ${selected.name}` : 'חיוב קבוע'}>{selected && <RecurringEditor key={selected.id} item={selected} onSaved={() => setSelected(null)}/>}</FinanceSheet>
  </section>;
}

function RecurringEditor({item,onSaved}: {item: RecurringItem; onSaved:()=>void}) {
  const [decision,setDecision]=useState<Exclude<RecurringItem['decision'],'detected'>>(item.decision==='detected'?'recurring':item.decision);
  const [amount,setAmount]=useState(String(item.amount));
  const [nextDate,setNextDate]=useState(item.nextDate||'');
  const save=useFinanceSave();
  return <form className="fn-form" onSubmit={async e=>{
    e.preventDefault();
    try{await save.mutateAsync({path:`/recurring/${encodeURIComponent(item.id)}`,body:{decision,amount:Number(amount),nextDate:nextDate||null}});onSaved();}catch{ /* The inline error explains what failed. */ }
  }}>
    <p className="fn-muted">{item.historyCount} חיובים נמצאו. {item.reason}. שינוי כאן משפיע על התחזית בלבד; הוא לא יוצר תשלום בבנק.</p>
    <label>מה זה?<select value={decision} onChange={e=>setDecision(e.target.value as typeof decision)}><option value="recurring">חיוב קבוע</option><option value="not_recurring">לא חיוב קבוע</option><option value="uncertain">עדיין לא בטוח</option></select></label>
    <div className="fn-form-grid"><label>סכום צפוי ₪<input type="number" min="0.01" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} required/></label><label>החיוב הבא, אם ידוע<input type="date" value={nextDate} onChange={e=>setNextDate(e.target.value)} required={decision==='recurring'}/></label></div>
    <button className="fn-primary" disabled={save.isPending}>{save.isPending?'שומר…':'שמירת התיקון'}</button><FinanceError error={save.error}/>
  </form>;
}
