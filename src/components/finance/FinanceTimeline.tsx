import { useState } from 'react';
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
export default function FinanceTimeline() {
  const [days, setDays] = useState(30);
  const query = useFinance<Forecast>(`/forecast?days=${days}`);
  return <section className="fn-page fn-page-flow"><div className="fn-section-head fn-page-head"><div><span className="fn-page-kicker">החשבון שלך, קדימה בזמן</span><h1>מה זז בדרך?</h1><p className="fn-muted">כל כניסה ויציאה — והיתרה שאחריה.</p></div><div className="fn-segments fn-range-switch" aria-label="טווח התחזית">{[30,60,90].map(n => <button key={n} aria-pressed={n === days} onClick={() => setDays(n)}>{n} יום</button>)}</div></div>
    <FinanceError error={query.error} retry={() => void query.refetch()}/>{query.isPending && <Loading/>}
    {query.data && <>
      <div className="fn-flow-opening fn-surface fn-flow-hero"><span>נקודת ההתחלה · {dateLabel(query.data.openingAsOf || query.data.asOf)}</span><strong>{money(query.data.state.bank.amount ?? query.data.state.lastKnownBank?.amount)}</strong><span>{query.data.openingBasis === 'last_known_snapshot' ? 'צילום הבנק האחרון · התחזית ממנו היא אומדן' : 'עו״ש לפי יתרות הבנק העדכניות'}</span><span className="fn-flow-available">פנוי אחרי התחייבויות: <b>{money(query.data.state.available.amount ?? query.data.state.lastKnownAvailable?.amount)}</b></span>{query.data.openingBasis === 'last_known_snapshot' && <span>תנועות מאז {dateLabel(query.data.openingAsOf,true)} עשויות לשנות את היתרה בפועל.</span>}</div>
      {query.data.livingAverage && <div className="fn-run-rate"><div><span>מחיה לפי מה שנקלט{query.data.livingAverage.coverage?.partial ? ' · חלקי' : ''}</span><strong>{money(query.data.livingAverage.monthly)} לחודש</strong></div><p>{query.data.livingAverage.status === 'unknown' ? query.data.livingAverage.note : `${query.data.livingAverage.sampleCount} הוצאות ב־${query.data.livingAverage.window.days} ימים (${query.data.livingAverage.coverage?.legacyCount ?? '?'} בג׳אנקי, ${query.data.livingAverage.coverage?.bankCount ?? '?'} מהבנק). נכנס לציר כאומדן שבועי.${query.data.livingAverage.coverage?.warnings.length ? ` עדיין חסר: ${query.data.livingAverage.coverage.warnings.join('; ')}.` : ''}`}</p></div>}
      {query.data.openingBasis === 'last_known_snapshot' && <p className="fn-notice">היתרה אחרי כל אירוע מחושבת מצילום הבנק האחרון ומסומנת כאומדן, עד ש־Financy יחזיר יתרה של היום.</p>}
      <div className="fn-surface">{query.data.events.length ? <TimelineRows events={query.data.events}/> : <Empty title="אין אירועים עם תאריך בטווח הזה">יכול להיות שיש גבייה או התחייבויות שטרם נקבע להן מועד. הן מופיעות בנפרד למטה.</Empty>}</div>
      <div className="fn-checkpoints">{query.data.checkpoints.map(point => <div key={point.days}><span>עו״ש צפוי בעוד {point.days} יום</span><strong>{money(point.bank)}</strong><small>פנוי אחרי התחייבויות: {money(point.available)}</small>{point.available !== null && <><small>שינוי בפנוי: {money(point.change)}</small><small>בלי הכנסות צפויות: {money(point.withoutExpectedIncome)}</small></>}</div>)}</div>
      {query.data.undated.length > 0 && <details className="fn-surface fn-details"><summary>בלי תאריך סגור <span>{query.data.undated.length}</span></summary><p className="fn-muted">לא הוכנסו לציר הזמן, כדי לא להמציא מתי הכסף יזוז.</p>{query.data.undated.map(item => <div className="fn-list-row" key={item.id}><div><strong>{item.label}</strong><small>{item.reason}</small></div><b>{money(item.amount)}</b></div>)}</details>}
      <p className="fn-footnote">{query.data.note}</p>
    </>}
  </section>;
}
