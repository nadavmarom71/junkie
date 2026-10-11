import type { Obligation } from '@/types/finance';
import { dateLabel, money } from '@/lib/financeFormatters';

export default function ObligationEvidence({obligation}: {obligation: Obligation}) {
  if (!obligation.items?.length) return obligation.note ? <p className="fn-muted">{obligation.note}</p> : null;
  return <details className="fn-details"><summary>העסקאות שמרכיבות את הסכום ({obligation.items.length})</summary>
    <p className="fn-muted">{obligation.note}</p>
    {obligation.boundary && <p className="fn-muted">גבול החישוב: {dateLabel(obligation.boundary.date,true)} · {obligation.boundary.source ? 'פירעון מותאם לכרטיס' : 'חלון 35 יום בלבד — פירעון הכרטיס לא אומת'}</p>}
    {obligation.items.map(item => <details className="fn-details" key={item.id}>
      <summary>{item.merchant} · {dateLabel(item.transactionDate)} · {money(item.direction === 'out' ? -item.amount : item.amount)}</summary>
      <dl className="fn-definition"><div><dt>מועד חיוב</dt><dd>{item.valueDate ? dateLabel(item.valueDate,true) : 'לא התקבל'}</dd></div><div><dt>סטטוס אצל הספק</dt><dd>{item.providerStatus || 'לא נשמר בייבוא המקורי — אינו מוכח'}</dd></div><div><dt>למה נכלל</dt><dd>{item.reason === 'future_value_date' ? 'תאריך ערך עתידי בכרטיס' : item.reason === 'unsettled_since_bank_snapshot' ? 'מועד החיוב הגיע; צילום הבנק קודם לו ופירעון עדיין לא הוכח' : 'רזרבה זהירה ללא מועד; לא חוב נוסף מאומת'}</dd></div></dl>
      {obligation.overlap?.some(x=>x.source===item.source) && <p className="fn-notice">ייתכן שכבר כלול בחיוב הסופי. לא אוחד בלי ראיית זהות.</p>}
      <code className="fn-source">{item.providerTransactionId || item.id}</code>
      {!!item.supersedes.length && <small>גרסאות קודמות: {item.supersedes.map(id=>id.split(':').at(-1)).join(', ')}</small>}
    </details>)}
    {!!obligation.excluded?.length && <details className="fn-details"><summary>גרסאות מוחלפות שלא נספרו ({obligation.excluded.length})</summary>{obligation.excluded.map(item=><p className="fn-muted" key={item.source}><code>{item.source.split(':').at(-1)}</code> · {money(item.amount)} · הוחלף ב־<code>{item.replacedBy.split(':').at(-1)}</code></p>)}</details>}
  </details>;
}
