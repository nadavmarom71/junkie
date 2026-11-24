import { useState } from 'react';
import { CreditCard } from 'lucide-react';
import type { FinancialState, Obligation } from '@/types/finance';
import { accountName, dateLabel, money } from '@/lib/financeFormatters';
import { groupCardCategories, groupCardObligations, itemPurpose, purposeLabels, purposeTotals, type CardPurpose } from '@/lib/financeObligations';
import ObligationEvidence from './ObligationEvidence';

function CardBill({obligation}: {obligation:Obligation}) {
  const [filter,setFilter]=useState<CardPurpose|'all'>('all');
  const items=obligation.items||[],totals=purposeTotals(items);
  const filtered=items.filter(item=>filter==='all'||itemPurpose(item)===filter);
  const categories=groupCardCategories(filtered);
  const undated=!obligation.date;
  return <section className={`fn-card-bill ${undated?'fn-card-bill-pending':''}`}>
    <div className="fn-card-bill-heading"><div><strong>{undated?'רזרבה ללא מועד':`חיוב צפוי · ${dateLabel(obligation.date,true)}`}</strong><small>{undated?'לא חיוב נוסף מאומת; ייתכן שכבר כלול בחיוב הסופי':obligation.status==='confirmed'?'לפי הרישום':'לפי עסקאות שנקלטו · לא דוח סופי מחברת האשראי'}</small></div><b><bdi>{money(obligation.amount,obligation.currency)}</bdi></b></div>
    {!!items.length && <><dl className="fn-card-purpose-totals">{(Object.keys(purposeLabels) as CardPurpose[]).filter(key=>items.some(item=>itemPurpose(item)===key)).map(key=><div key={key}><dt>{purposeLabels[key]}</dt><dd><bdi>{money(totals[key],obligation.currency)}</bdi></dd></div>)}</dl>
      {items.some(item=>itemPurpose(item)==='david_payment')&&<p className="fn-footnote">תשלום עבור דוד הוא חיוב של הכרטיס, לא הוצאה אישית שלך ולא קיזוז חדש מהחוב שלו.</p>}
      {!!obligation.overlap?.length&&<p className="fn-card-overlap" role="note">{obligation.overlap.length} שורות עשויות לחפוף לחיוב סופי. הן נשארו ברזרבה עד לאימות, ולא אוחדו לפי דמיון בלבד.</p>}
      <section className="fn-card-transactions" aria-label="פירוט החיוב לפי קטגוריות" dir="rtl"><h4>על מה החיוב הזה?</h4>
        <div className="fn-card-filters" role="group" aria-label="סינון עסקאות הכרטיס">{(['all',...Object.keys(purposeLabels)] as ('all'|CardPurpose)[]).map(key=><button key={key} type="button" aria-pressed={filter===key} onClick={()=>setFilter(key)}>{key==='all'?'הכול':purposeLabels[key]}</button>)}</div>
        <p className="fn-footnote">{filtered.length} מתוך {items.length} עסקאות · סינון הפירוט לא משנה את סכום החיוב.</p>
        {categories.map(group=><details className="fn-card-category" key={group.key}>
          <summary><span className="fn-card-category-label"><span aria-hidden="true">{group.icon}</span><span><strong>{group.label}</strong><small>{group.items.length===1?'תנועה אחת':`${group.items.length} תנועות`}{group.credits>0?' · כולל זיכוי שהופחת מהחיוב':''}</small></span></span><b><bdi>{money(group.amount,obligation.currency)}</bdi><span className="fn-card-category-toggle" aria-hidden="true">⌄</span></b></summary>
          {group.credits>0&&<p className="fn-footnote">רכישות <bdi>{money(group.charges,obligation.currency)}</bdi> פחות זיכויים <bdi>{money(group.credits,obligation.currency)}</bdi>.</p>}
          {group.items.map(item=><div className={`fn-card-purchase ${item.direction==='in'?'fn-card-purchase-credit':''}`} key={item.id}><div><strong><bdi>{item.merchant}</bdi></strong><small>{dateLabel(item.transactionDate||item.date)}{item.direction==='in'?' · זיכוי שמקטין את החיוב':''}{item.reviewStatus&&item.reviewStatus!=='confirmed'?' · עדיין בבדיקה':''}</small>{item.note&&<details className="fn-card-source"><summary>הערה לתנועה</summary><p className="fn-footnote">{item.note}</p></details>}</div><b><bdi>{money(item.direction==='in'?-item.amount:item.amount,obligation.currency)}</bdi></b></div>)}
        </details>)}
        {!filtered.length&&<p className="fn-muted">אין עסקאות בסינון הזה.</p>}
      </section></>}
    <details className="fn-card-source"><summary>מקור החישוב וההתאמות</summary><ObligationEvidence obligation={obligation}/></details>
  </section>;
}
export default function FinanceObligations({state,onEdit,onEditBusiness}: {state:FinancialState;onEdit:(obligation:Obligation)=>void;onEditBusiness:(id:string)=>void}) {
  const {cards,other}=groupCardObligations(state);
  return <div className="fn-obligations-detail">
    <div className="fn-obligations-equation"><span>עו״ש שנקלט <bdi>{money(state.bank.amount??state.lastKnownBank?.amount,state.currency)}</bdi></span><span>נשמר להתחייבויות <bdi>{money(state.reserved.amount,state.currency)}</bdi></span><strong>פנוי משוער <bdi>{money(state.available.amount??state.lastKnownAvailable?.amount,state.currency)}</bdi></strong></div>
    <p className="fn-footnote">הסכומים שנשמרו כבר נוכו מהפנוי — לא צריך להפחית אותם שוב. הרזרבות אינן כולן חיובים סופיים; סכום הפנוי נשאר אומדן.</p>
    {!!cards.length&&<h3 className="fn-obligations-label">הכרטיסים שלך</h3>}
    {cards.map(card=><article className="fn-obligation-card" key={card.id}>
      <header className="fn-obligation-card-header"><span className="fn-card-icon" aria-hidden="true"><CreditCard size={22}/></span><div><h3>{card.name}</h3><small>{card.checkingAccount?`עו״ש צפוי לחיוב: ${accountName(card.checkingAccount.name,card.checkingAccount.providerId)} · שיוך משוער לפי הבנק`:'חשבון העו״ש לחיוב לא אומת'}</small></div></header>
      {card.obligations.map(obligation=><CardBill key={obligation.id} obligation={obligation}/>)}
    </article>)}
    {!!other.length&&<h3 className="fn-obligations-label">התחייבויות נוספות</h3>}
    {other.map(obligation=><div key={obligation.id}><div className="fn-list-row"><div><strong>{obligation.label}</strong><small>{obligation.date?dateLabel(obligation.date,true):'המועד לא נקבע'} · {obligation.reserved?'כבר נוכה מהפנוי':'ינוכה במועד התשלום'}</small></div><div className="fn-value-stack"><b><bdi>{money(obligation.amount,obligation.currency)}</bdi></b>{(obligation.source==='tax_obligation'||obligation.source.startsWith('obligation:'))&&<button className="fn-link" onClick={()=>onEdit(obligation)}>עריכה</button>}{obligation.source.startsWith('business_transactions:')&&<button className="fn-link" onClick={()=>onEditBusiness(obligation.source.slice('business_transactions:'.length))}>עריכת ההוצאה המקורית</button>}</div></div><ObligationEvidence obligation={obligation}/></div>)}
  </div>;
}
