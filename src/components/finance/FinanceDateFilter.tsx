import { useId, useRef, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { he } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { displayDate, monthRange, parseDisplayDate, recentMonths, type FinanceRange } from '@/lib/financeDateRanges';

type Props = {today:string;range:FinanceRange;from:string;to:string;start:string;end:string;onPreset:(range:FinanceRange)=>void;onDates:(from:string,to:string)=>void};

export default function FinanceDateFilter(props: Props & {compact?:boolean}) {
  if (props.compact) return <details className="fn-period-details"><summary><CalendarDays size={16}/><span>{props.range === 'all' ? 'כל הזמן' : <><bdi dir="ltr">{displayDate(props.start)}</bdi><span> עד </span><bdi dir="ltr">{displayDate(props.end)}</bdi></>}</span><ChevronDown size={16}/></summary><div className="fn-period-inline"><DateControls {...props}/></div></details>;
  return <section className="fn-period-filter" aria-label="סינון לפי תקופה" dir="rtl"><DateControls {...props}/></section>;
}
function DateControls({today,range,from,to,start,end,onPreset,onDates}:Props) {
  const months = recentMonths(today);
  const strip = useRef<HTMLDivElement>(null);
  return <>
    <div className="fn-period-top"><span className="fn-period-label"><CalendarDays size={17}/> תקופה</span><div className="fn-segments" role="group" aria-label="טווח תאריכים">{([['month','החודש'],['year','השנה'],['all','כל הזמן'],['custom','טווח מותאם']] as const).map(([value,label])=><button key={value} type="button" aria-pressed={range===value} onClick={()=>onPreset(value)}>{label}</button>)}</div><span className="fn-period-current">{range==='all'?'כל ההיסטוריה':<><bdi dir="ltr">{displayDate(start)}</bdi><span> עד </span><bdi dir="ltr">{displayDate(end)}</bdi></>}</span></div>
    <div className="fn-month-picker"><button type="button" className="fn-icon" aria-label="גלילה לחודשים חדשים יותר" onClick={()=>strip.current?.scrollBy({left:280,behavior:'smooth'})}><ChevronRight size={17}/></button><div ref={strip} className="fn-month-strip" role="group" aria-label="בחירת חודש">{months.map(month=>{
      const dates=monthRange(month.id,today),active=range!=='all'&&range!=='year'&&start===dates.from&&end===dates.to;
      return <button key={month.id} type="button" aria-label={`${month.label} ${month.year}`} aria-pressed={active} onClick={()=>onDates(dates.from,dates.to)}><strong>{month.label}</strong><small>{month.year}</small></button>;
    })}</div><button type="button" className="fn-icon" aria-label="גלילה לחודשים קודמים" onClick={()=>strip.current?.scrollBy({left:-280,behavior:'smooth'})}><ChevronLeft size={17}/></button></div>
    {range==='custom'&&<div className="fn-period-custom"><DateField key={`from:${from}`} label="מתאריך" value={from} min="1900-01-01" max={to<today?to:today} onChange={value=>onDates(value,to)}/><span className="fn-period-to">עד</span><DateField key={`to:${to}`} label="עד תאריך" value={to} min={from} max={today} onChange={value=>onDates(from,value)}/><small>יום.חודש.שנה · חודש מלא עד סוף החודש, והחודש הנוכחי עד היום.</small></div>}
  </>;
}
function DateField({label,value,min,max,onChange}:{label:string;value:string;min:string;max:string;onChange:(value:string)=>void}) {
  const id=useId();
  const [draft,setDraft]=useState(displayDate(value));
  const [error,setError]=useState('');
  const [open,setOpen]=useState(false);
  const calendarLabels={labelNav:()=> 'ניווט חודשים',labelPrevious:()=> 'לחודש הקודם',labelNext:()=> 'לחודש הבא'};
  function commit(){
    const date=parseDisplayDate(draft);
    if(!date||date<min||date>max){setError('תאריך לא תקין או מחוץ לטווח');return;}
    setError('');setDraft(displayDate(date));onChange(date);
  }
  return <div className="fn-period-field"><label htmlFor={id}>{label}</label><div className="fn-period-input"><input id={id} lang="he" dir="ltr" inputMode="numeric" autoComplete="off" placeholder="יום.חודש.שנה" value={draft} aria-invalid={!!error} aria-describedby={error?`${id}-error`:undefined} onChange={event=>{setDraft(event.target.value);setError('');}} onBlur={commit} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();commit();}}}/><Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><button type="button" aria-label={`בחירת ${label} בלוח שנה`}><CalendarDays size={18}/></button></PopoverTrigger><PopoverContent className="fn-period-calendar" align="start" dir="rtl"><Calendar mode="single" locale={he} labels={calendarLabels} dir="rtl" selected={new Date(`${value}T12:00:00`)} defaultMonth={new Date(`${value}T12:00:00`)} disabled={[{before:new Date(`${min}T00:00:00`)},{after:new Date(`${max}T23:59:59`)}]} onSelect={date=>{if(date){const iso=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;onChange(iso);setOpen(false);}}}/></PopoverContent></Popover></div>{error&&<small id={`${id}-error`} role="alert">{error}</small>}</div>;
}
