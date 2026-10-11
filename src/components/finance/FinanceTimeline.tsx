import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useFinance } from '@/hooks/useFinance';
import type { CashEvent, Forecast } from '@/types/finance';
import { Empty, FinanceError, FinanceSheet, Loading, TrustBadge } from './FinanceUI';
import { dateLabel, money } from '@/lib/financeFormatters';
import { FinanceDataIcon } from './FinanceVisuals';

export function TimelineRows({events, limit}: {events: CashEvent[]; limit?: number}) {
  const [selected, setSelected] = useState<CashEvent | null>(null);
  return <><ol className="fn-timeline">{events.slice(0, limit).map((event, i) => <li key={event.id}>
    {(i === 0 || events[i - 1].date !== event.date) && <div className="fn-day">{dateLabel(event.date)}</div>}
    <button className="fn-event" onClick={() => setSelected(event)}><FinanceDataIcon label={event.label || 'תנועה'} kind={event.direction === 'in' ? 'income' : 'expense'} tone={event.direction === 'in' ? 'income' : 'warning'}/><span className="fn-event-copy"><strong>{event.label || 'תנועה'}</strong><span>{event.paymentTiming === 'card_charge' ? 'חיוב בכרטיס · העו״ש עדיין לא זז' : event.direction === 'in' ? 'צפוי להיכנס' : 'צפוי לצאת'} · {event.status === 'confirmed' ? 'לפי הרישום' : 'הערכה'}</span></span><span className="fn-event-value"><strong className={event.direction === 'in' ? 'fn-income' : 'fn-expense'}>{event.amount > 0 ? '+' : ''}{money(event.amount)}</strong><span>עו״ש צפוי אחריו: <b>{money(event.bankAfter)}</b></span>{event.availableAfter !== null && <span>פנוי אחריו: <b>{money(event.availableAfter)}</b></span>}</span></button>
  </li>)}</ol>
    <FinanceSheet open={!!selected} onClose={() => setSelected(null)} title={selected?.label || 'פרטי תנועה'}>{selected && <><div className="fn-detail-amount">{money(selected.amount)}</div><TrustBadge status={selected.status}/><dl className="fn-definition"><div><dt>מועד</dt><dd>{dateLabel(selected.date, true)}</dd></div><div><dt>בעו״ש אחרי התנועה</dt><dd>{money(selected.bankAfter)}</dd></div><div><dt>פנוי אחרי ההתחייבויות</dt><dd>{money(selected.availableAfter)}</dd></div><div><dt>בלי הכנסות שעדיין לא נכנסו</dt><dd>{money(selected.withoutExpectedIncomeAfter)}</dd></div></dl>{selected.note && <p className="fn-muted">{selected.note}</p>}<details><summary>מקור החישוב</summary><code className="fn-source">{selected.source}</code></details></>}</FinanceSheet>
  </>;
}
function LivingBreakdown({average}: {average:NonNullable<Forecast['livingAverage']>}) {
  return <details className="fn-living-breakdown fn-surface">
    <summary><span><span className="fn-muted">מחיה לפי מה שנקלט{average.coverage?.partial ? ' · חלקי' : ''}</span><strong>{money(average.monthly)} לחודש</strong></span><span>איך חושב? · {average.sampleCount} הוצאות <ChevronDown size={16} className="fn-living-chevron" aria-hidden/></span></summary>
    <div className="fn-living-explanation">
      <p>{dateLabel(average.window.from,true)} — {dateLabel(average.window.to,true)} · {average.window.days} ימים</p>
      <p><strong>{money(average.total)}</strong> הוצאות שסווגו כאישי ÷ {average.window.days} ימים × חודש ממוצע של 30.4375 ימים (<bdi dir="ltr">365.25 ÷ 12</bdi>){average.monthly !== null ? <> = <strong>{money(average.monthly)}</strong> לחודש.</> : '. עדיין אין מדגם בנק מספק להצגת ממוצע.'}</p>
      <p>זה ממוצע של כל ההוצאות האישיות שנקלטו — גם קניות חד־פעמיות, לא רק מזון וחשבונות. הוצאות עסקיות, פירעונות אשראי והעתקים שהוחרגו אינם במדגם. אם משהו סווג לא נכון, הוא יופיע כאן כדי שתוכל לזהות אותו.</p>
      {average.forecastBasis && <p>לציר התחזית: {money(average.forecastBasis.namedRecurringTotal)} מהמדגם משויכים לחיובים קבועים שמוצגים בנפרד. הבסיס לאומדן השבועי הוא {money(average.forecastBasis.total)} ÷ {average.window.days} ימים — בלי לספור אותם שוב.</p>}
      <p className="fn-footnote">{average.note} מספר גדול של תנועות אינו מבטיח שכל התקופה נקלטה או שכל סיווג נכון.</p>
    </div>
    {average.items && average.categories ? <div className="fn-living-categories">{average.categories.map(category => <details key={category.category} className="fn-living-category">
      <summary><span>{category.category}<small>{category.count === 1 ? 'הוצאה אחת' : `${category.count} הוצאות`}</small></span><b>{money(category.amount)} <ChevronDown size={16} className="fn-living-chevron" aria-hidden/></b></summary>
      <ul>{average.items!.filter(item=>item.category===category.category).map(item=><li key={item.source}><span><strong>{item.description}</strong><small>{dateLabel(item.date,true)} · {item.origin==='personal_expenses' ? 'רישום בג׳אנקי' : item.accountName ? `כרטיס / חשבון ${item.accountName}` : 'ייבוא דוח / בנק'}{average.forecastBasis?.excludedSources.includes(item.source) ? ' · קבוע, מופיע בנפרד בציר' : ''}</small>{item.note && <small>{item.note}</small>}</span><b>{money(item.amount)}</b></li>)}</ul>
    </details>)}</div> : <p className="fn-footnote">פירוט ההוצאות לא זמין בגרסת השרת הנוכחית.</p>}
  </details>;
}
export default function FinanceTimeline() {
  const [days, setDays] = useState(30);
  const query = useFinance<Forecast>(`/forecast?days=${days}`);
  const endPoint = query.data?.checkpoints.find(point => point.days === days);
  return <section className="fn-page fn-page-flow"><div className="fn-section-head fn-page-head"><div><span className="fn-page-kicker">החשבון שלך, קדימה בזמן</span><h1>מה זז בדרך?</h1><p className="fn-muted">כל כניסה ויציאה — והיתרה שאחריה.</p></div><div className="fn-segments fn-range-switch" aria-label="טווח התחזית">{[30,60,90].map(n => <button key={n} aria-pressed={n === days} onClick={() => setDays(n)}>{n} יום</button>)}</div></div>
    <FinanceError error={query.error} retry={() => void query.refetch()}/>{query.isPending && <Loading/>}
    {query.data && <>
      {query.data.reliability?.status === 'incomplete' && <div className="fn-notice" role="status"><strong>תחזית חלקית — לא סכום פנוי מאומת</strong><details className="fn-details"><summary>מה עדיין לא הושלם?</summary><ul>{query.data.reliability.issues.map((issue,i)=><li key={i}>{issue}</li>)}</ul></details></div>}
      <div className="fn-flow-opening fn-surface fn-flow-hero" aria-live="polite"><span>בעוד {days} יום · {dateLabel(query.data.end,true)}</span><strong>{money(endPoint?.available ?? query.data.closingAvailable)}</strong><span>פנוי צפוי אחרי התחייבויות · אומדן, כולל הכנסות צפויות</span><span className="fn-flow-available">עו״ש צפוי: <b>{money(endPoint?.bank)}</b></span><span>בלי הכנסות צפויות: <b>{money(endPoint?.withoutExpectedIncome)}</b> · הנקודה הנמוכה בדרך: <b>{money(query.data.minimum)}</b></span></div>
      <div className="fn-run-rate"><div><span>נקודת ההתחלה · יתרות בנק עד {dateLabel(query.data.openingAsOf || query.data.asOf)}</span><strong>{money(query.data.state.bank.amount ?? query.data.state.lastKnownBank?.amount)}</strong></div><p>פנוי בתחילת התחזית: <b>{money(query.data.state.available.amount ?? query.data.state.lastKnownAvailable?.amount)}</b>. {query.data.openingBasis === 'last_known_snapshot' ? 'צילום בנק ישן, לא יתרת היום. חיובים שמועדיהם הגיעו ולא הוכח שנפרעו נשארים ברזרבה.' : 'לפי יתרות הבנק שנקלטו.'}</p></div>
      {query.data.livingAverage && <LivingBreakdown average={query.data.livingAverage}/>}
      {query.data.openingBasis === 'last_known_snapshot' && <p className="fn-notice">היתרה אחרי כל אירוע מחושבת מצילום הבנק האחרון ומסומנת כאומדן, עד ש־Financy יחזיר יתרה של היום.</p>}
      <div className="fn-surface">{query.data.events.length ? <TimelineRows events={query.data.events}/> : <Empty title="אין אירועים עם תאריך בטווח הזה">יכול להיות שיש גבייה או התחייבויות שטרם נקבע להן מועד. הן מופיעות בנפרד למטה.</Empty>}</div>
      <div className="fn-checkpoints">{query.data.checkpoints.map(point => <div key={point.days}><span>עו״ש צפוי בעוד {point.days} יום</span><strong>{money(point.bank)}</strong><small>פנוי אחרי התחייבויות: {money(point.available)}</small>{point.available !== null && <><small>שינוי בפנוי: {money(point.change)}</small><small>בלי הכנסות צפויות: {money(point.withoutExpectedIncome)}</small></>}</div>)}</div>
      {query.data.undated.length > 0 && <details className="fn-surface fn-details"><summary>בלי תאריך סגור <span>{query.data.undated.length}</span></summary><p className="fn-muted">לא הוכנסו לציר הזמן, כדי לא להמציא מתי הכסף יזוז.</p>{query.data.undated.map(item => <div className="fn-list-row" key={item.id}><div><strong>{item.label}</strong><small>{item.reason}</small></div><b>{money(item.amount)}</b></div>)}</details>}
      <p className="fn-footnote">{query.data.note}</p>
    </>}
  </section>;
}
