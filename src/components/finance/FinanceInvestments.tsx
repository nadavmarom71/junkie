import { useState } from 'react';
import { useFinanceSave } from '@/hooks/useFinance';
import type { FinancialState } from '@/types/finance';
import { dateLabel, israelToday, money } from '@/lib/financeFormatters';
import { FinanceError } from './FinanceUI';
import { investmentStale } from '@/lib/investmentFreshness';

type Investment=NonNullable<FinancialState['investments']>[number];
export function InvestmentRow({asset}: {asset:Investment}){
  const [editing,setEditing]=useState(false),[value,setValue]=useState(asset.currentValue?.toString()||''),[asOf,setAsOf]=useState(israelToday());
  const save=useFinanceSave();
  const valid=value.trim()!==''&&Number.isFinite(Number(value))&&Number(value)>=0&&!!asOf&&asOf<=israelToday();
  return <div className="fn-investment-entry"><div className="fn-list-row"><span><strong>{asset.name}</strong>
    <small>נכון ל־{asset.asOf?dateLabel(asset.asOf,true):'תאריך לא ידוע'} · שווי ידני {investmentStale(asset.asOf,israelToday())&&<span className="fn-trust fn-trust-estimated">לא מעודכן · נדרש עדכון שווי או תאריך</span>}</small>
    {asset.currentValue===null&&<small>הפקדות מזוהות: {money(asset.deposits)} · שווי התיק לא מחובר</small>}
    {asset.historicalReference!=null&&<small>סכום עבר שציינת: {money(asset.historicalReference,asset.currency)} · לא שווי נוכחי</small>}
    </span><span className="fn-investment-actions"><b><bdi>{asset.currentValue===null?'לא ידוע':money(asset.currentValue,asset.currency)}</bdi></b><button type="button" className="fn-link" aria-expanded={editing} onClick={()=>{setEditing(!editing);save.reset();}}>עדכון שווי</button></span></div>
    {editing&&<form className="fn-form fn-investment-form" aria-label={`עדכון שווי ${asset.name}`} onSubmit={event=>{
      event.preventDefault();if(!valid||save.isPending)return;
      save.mutate({path:`/investments/${encodeURIComponent(asset.id)}/valuation`,method:'put',body:{currentValue:Number(value),asOf}},{onSuccess:()=>setEditing(false)});
    }}><label>שווי נוכחי ב־<bdi>{asset.currency}</bdi><input type="number" inputMode="decimal" min="0" step="0.01" required value={value} onChange={e=>setValue(e.target.value)}/></label>
      <label>תאריך השווי<input type="date" required max={israelToday()} value={asOf} onChange={e=>setAsOf(e.target.value)}/></label>
      <p className="fn-footnote">מעדכן הערכת שווי בלבד. לא נרשמת הכנסה, הוצאה או הפקדה.</p>
      <button className="fn-secondary" disabled={!valid||save.isPending}>{save.isPending?'שומר…':'שמירת השווי'}</button><FinanceError error={save.error}/></form>}
    {save.isSuccess&&<p className="fn-saved" role="status">השווי נשמר</p>}
  </div>;
}
export default function FinanceInvestments({assets}: {assets:Investment[]}){
  if(!assets.length)return null;
  return <section className="fn-surface fn-investments"><div className="fn-section-head"><h2>השקעות בצד</h2><span className="fn-muted">לא בכסף הפנוי</span></div>
    {assets.map(asset=><InvestmentRow key={`${asset.id}:${asset.asOf}:${asset.currentValue}`} asset={asset}/>)}
    <p className="fn-footnote">השקעות אינן יתרת עו״ש. זה שווי ידני שמסרת, לא מחיר חי ולא הכנסה צפויה.</p></section>;
}
