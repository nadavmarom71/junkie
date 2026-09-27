import { useRef, useState } from 'react';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useFinance } from '@/hooks/useFinance';
import type { FinancialActivityRecord, FinancialActivityRecords, FinancialSummary } from '@/types/finance';
import { Empty, FinanceError, FinanceSheet, Loading } from './FinanceUI';
import { dateLabel, israelToday, money } from '@/lib/financeFormatters';
import FinanceRecords from './FinanceRecords';
import { FinanceClients, FinanceRetainers } from './FinanceRelationships';
import FinanceRecurring from './FinanceRecurring';
import { FinanceDataIcon, financeVisual } from './FinanceVisuals';
import FinanceCategoryDonut from './FinanceCategoryDonut';

const sections = ['activity','collections','clients','retainers','recurring'] as const;
type Section = typeof sections[number];
type Scope = 'business' | 'personal';
type ActivityType = 'all' | 'income' | 'received' | 'expense' | 'collection';

export default function FinanceActivity({initialSection = 'activity'}: {initialSection?: 'activity' | 'collections'}) {
  const today = israelToday();
  const [params, setParams] = useSearchParams();
  const requestedSection = params.get('section');
  const section: Section = sections.includes(requestedSection as Section) ? requestedSection as Section : initialSection;
  const scope: Scope = params.get('scope') === 'personal' ? 'personal' : 'business';
  const [range, setRange] = useState('month');
  const [from, setFrom] = useState(today.slice(0,7) + '-01');
  const [to, setTo] = useState(today);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [activityType, setActivityType] = useState<ActivityType>('all');
  const [selectedRecord, setSelectedRecord] = useState<FinancialActivityRecord | null>(null);
  const recordsRef = useRef<HTMLElement>(null);
  const start = range === 'all' ? '1900-01-01' : range === 'year' ? today.slice(0,4) + '-01-01' : range === 'month' ? today.slice(0,7) + '-01' : from;
  const end = range === 'custom' ? to : today;
  const valid = !!start && !!end && start <= end && end <= today;
  const summary = useFinance<FinancialSummary>(`/summary?from=${start}&to=${end}`, valid && section === 'activity');
  const activityPath = `/activity?from=${start}&to=${end}&scope=${scope}&type=${activityType}${selectedCategory ? `&category=${encodeURIComponent(selectedCategory)}` : ''}`;
  const activity = useFinance<FinancialActivityRecords>(activityPath, valid && section === 'activity');
  const result = summary.data;
  const scopedCategories = result?.categories.filter(category => category.scope === scope) || [];
  const scopedLargest = result?.largest.filter(item => item.scope === scope) || [];
  const scopedSpending = scope === 'business' ? result?.businessSpending.amount : result?.personalSpending.amount;
  const businessNet = result?.received.amount != null && result.businessSpending.amount != null ? result.received.amount - result.businessSpending.amount : null;
  const filterOptions: [ActivityType,string][] = scope === 'business' ? [['all','הכול'],['received','נכנס'],['expense','הוצאות'],['collection','גבייה']] : [['expense','הוצאות']];

  function setScope(nextScope: Scope) {
    const next = new URLSearchParams(params);
    if (nextScope === 'personal') next.set('scope','personal');
    else next.delete('scope');
    setParams(next,{replace:true});
    setSelectedCategory(null);
    setActivityType(nextScope === 'personal' ? 'expense' : 'all');
  }
  function reveal(type: ActivityType, category: string | null = null) {
    setActivityType(type);
    setSelectedCategory(category);
    window.requestAnimationFrame(() => recordsRef.current?.scrollIntoView({behavior:'smooth',block:'start'}));
  }
  function selectCategory(category: string | null) {
    setSelectedCategory(category);
    setActivityType('expense');
  }
  function openCollections() {
    const next = new URLSearchParams(params);
    next.set('section','collections');
    next.delete('focus');
    setParams(next);
    window.scrollTo({top:0,behavior:'smooth'});
  }

  if (section === 'collections') return <section className="fn-page"><PageHeading title="גבייה" description="כל מה שאמור להיכנס, מתי וממי."/><FinanceRecords key="collections" from="1900-01-01" to={today} enabled collectionOnly/></section>;
  if (section === 'clients') return <section className="fn-page"><FinanceClients/></section>;
  if (section === 'retainers') return <section className="fn-page"><FinanceRetainers/></section>;
  if (section === 'recurring') return <section className="fn-page"><FinanceRecurring/></section>;

  return <section className="fn-page fn-page-activity">
    <div className="fn-section-head fn-page-head fn-activity-heading"><div><span className="fn-page-kicker">הכסף שנכנס והכסף שיוצא</span><h1>העסק והיום־יום</h1><p className="fn-muted">בוחרים עסקי או אישי, ורואים רק את מה שרלוונטי.</p></div><div className="fn-scope-switch fn-expense-switch fn-main-scope-switch" role="group" aria-label="בחירת פעילות עסקית או אישית"><button aria-pressed={scope === 'business'} onClick={() => setScope('business')}>עסקי</button><button aria-pressed={scope === 'personal'} onClick={() => setScope('personal')}>אישי</button></div></div>
    <div className="fn-section-head fn-filter-row fn-filter-dock"><div className="fn-segments">{[['month','החודש'],['year','השנה'],['all','כל הזמן'],['custom','טווח אחר']].map(([value,label]) => <button key={value} aria-pressed={range === value} onClick={() => setRange(value)}>{label}</button>)}</div>{range === 'custom' && <div className="fn-date-range"><label>מ־<input type="date" max={to} value={from} onChange={event => setFrom(event.target.value)}/></label><label>עד<input type="date" min={from} max={today} value={to} onChange={event => setTo(event.target.value)}/></label></div>}</div>
    {!valid && <p className="fn-error">צריך טווח תאריכים תקין שמסתיים היום או קודם.</p>}
    <FinanceError error={summary.error} retry={() => void summary.refetch()}/>{summary.isPending && valid && <Loading/>}
    {result && valid && <>
      <section className={`fn-surface fn-money-map fn-expense-${scope}`} aria-labelledby="fn-money-map-title">
        <header className="fn-money-map-head"><div><span className="fn-page-kicker">{range === 'month' ? 'החודש במספרים' : 'התקופה במספרים'}</span><h2 id="fn-money-map-title">{scope === 'business' ? 'מה קרה בעסק?' : 'לאן הלך הכסף האישי?'}</h2><p>{range === 'all' ? 'כל ההיסטוריה שנקלטה' : `${dateLabel(result.from,true)} — ${dateLabel(result.to,true)}`}</p></div><span className="fn-not-bank-badge">לא יתרת עו״ש</span></header>

        {scope === 'business' ? <div className="fn-money-metrics" aria-label="סיכום עסקי">
          <Metric tone="business" label="מחזור עסקאות" value={result.grossTurnover?.amount} onClick={() => reveal('income')}/>
          <Metric tone="collection" label="עוד לגבייה" value={result.collections?.amount} onClick={openCollections}/>
          <Metric tone="income" label="נכנס בתקופה" value={result.received.amount} onClick={() => reveal('received')}/>
          <Metric tone="expense" label="הוצאות עסקיות" value={result.businessSpending.amount} onClick={() => reveal('expense')}/>
          <Metric tone="net" label="נשאר בעסק" value={businessNet} onClick={() => reveal('all')} note="לפי הרישומים"/>
        </div> : <div className="fn-personal-total"><FinanceDataIcon label="הוצאות אישיות" scope="personal"/><span><small>הוצאות אישיות בתקופה</small><strong>{money(result.personalSpending.amount)}</strong></span><button className="fn-link" onClick={() => reveal('expense')}>לכל התנועות<ArrowLeft size={15}/></button></div>}

        <div className="fn-money-map-body">
          <FinanceCategoryDonut categories={scopedCategories} total={scopedSpending} selected={selectedCategory} hovered={hoveredCategory} scope={scope} onSelect={selectCategory} onHover={setHoveredCategory}/>
          <div className="fn-category-list">{scopedCategories.length ? scopedCategories.map(category => {
            const accent = financeVisual(category.category,scope).accent;
            const percent = scopedSpending ? Math.round(category.amount / scopedSpending * 100) : 0;
            const width = Math.max(3,category.amount / Math.max(...scopedCategories.map(item => item.amount),1) * 100);
            const isSelected = selectedCategory === category.category;
            const isHovered = hoveredCategory === category.category;
            return <div className={`fn-category-item${isSelected ? ' is-active' : ''}${isHovered ? ' is-hovered' : ''}${hoveredCategory && !isHovered ? ' is-dimmed' : ''}`} key={`${scope}:${category.category}`} data-category-key={category.category} onMouseEnter={() => setHoveredCategory(category.category)} onMouseLeave={() => setHoveredCategory(null)}>
              <button className={`fn-category${isSelected ? ' is-active' : ''}${isHovered ? ' is-hovered' : ''}`} onFocus={() => setHoveredCategory(category.category)} onBlur={() => setHoveredCategory(null)} onClick={() => selectCategory(isSelected ? null : category.category)} aria-pressed={isSelected} aria-expanded={isSelected}>
                <span className="fn-category-line"><FinanceDataIcon label={category.category} scope={scope}/><span><strong>{category.category}</strong><small>{percent}% מההוצאות</small></span><b>{money(category.amount)}</b><ChevronDown className="fn-category-arrow" size={17}/></span>
                <span className="fn-category-track"><span className={`fn-accent-bg-${accent}`} style={{width:`${width}%`}}/></span>
              </button>
              {isSelected && <div className="fn-category-expansion" role="region" aria-label={`תנועות בקטגוריית ${category.category}`}>
                <div className="fn-category-expansion-head"><strong>התנועות בקטגוריה</strong>{activity.data && <span>{activity.data.total}</span>}</div>
                {activity.isPending && <Loading label="טוען תנועות…"/>}
                {activity.error && <FinanceError error={activity.error} retry={() => void activity.refetch()}/>} 
                {activity.data && !activity.error && (activity.data.items.length ? <div className="fn-category-transactions">{activity.data.items.slice(0,4).map(record => <button key={`${record.origin}:${record.id}`} onClick={() => setSelectedRecord(record)}><span><strong>{record.description}</strong><small>{dateLabel(record.date,true)}</small></span><b>{record.type === 'expense' ? '−' : '+'}{money(record.amount)}</b></button>)}</div> : <p className="fn-muted">אין תנועות להצגה בקטגוריה הזאת.</p>)}
                {activity.data && activity.data.total > 4 && <button className="fn-link fn-category-more" onClick={() => recordsRef.current?.scrollIntoView({behavior:'smooth',block:'start'})}>לכל {activity.data.total} התנועות<ArrowLeft size={15}/></button>}
              </div>}
            </div>;
          }) : <Empty title="לא נרשמו הוצאות בצד הזה">אפשר לשנות תקופה או לסווג תנועות באזור החיבורים.</Empty>}</div>
        </div>

        {!!scopedLargest.length && <div className="fn-expense-highlights"><h3>הוצאות בולטות</h3>{scopedLargest.slice(0,5).map(item => <button className="fn-data-row" key={`${item.scope}:${item.id}`} onClick={() => reveal('expense')}><FinanceDataIcon label={item.description} scope={scope}/><span><strong>{item.description}</strong><small>{dateLabel(item.date)} · {scope === 'business' ? 'עסקי' : 'אישי'}</small></span><b>{money(Number(item.amount))}</b></button>)}</div>}
      </section>

      {result.spendingCoverage?.status !== 'reviewed' && <p className="fn-notice" role="status">{result.spendingCoverage?.note || 'כיסוי הוצאות הבנק עדיין לא אומת.'} המספרים כוללים רק תנועות שסווגו.</p>}
      {!!result.revenueBasis?.invalidSources.length && scope === 'business' && <p className="fn-notice">יש תקבולים שטרם שויכו לעסקת המקור. הם מופיעים בתנועות, אבל לא נספרים כמחזור נוסף.</p>}

      <section ref={recordsRef} className="fn-unified-activity" aria-labelledby="fn-unified-title">
        <div className="fn-section-head"><div><span className="fn-page-kicker">הפירוט שמתחת למספרים</span><h2 id="fn-unified-title">{selectedCategory || activityTitle(activityType,scope)}</h2><p className="fn-muted">אותו מקור נתונים שמרכיב את הסיכום והפאי למעלה.</p></div><div className="fn-activity-filter-chips" aria-label="סינון תנועות">{filterOptions.map(([value,label]) => <button key={value} aria-pressed={activityType === value && !selectedCategory} onClick={() => reveal(value,null)}>{label}</button>)}</div></div>
        <FinanceError error={activity.error} retry={() => void activity.refetch()}/>{activity.isPending && <Loading label="טוען את התנועות…"/>}
        {activity.data && !activity.error && <div className="fn-surface fn-activity-list"><p className="fn-record-count">{activity.data.total} תנועות בטווח שנבחר{selectedCategory ? ` · ${selectedCategory}` : ''}</p>{activity.data.items.length ? activity.data.items.map(record => <button className="fn-record-row" key={`${record.origin}:${record.id}`} onClick={() => setSelectedRecord(record)}><span className="fn-record-main"><FinanceDataIcon label={`${record.description} ${record.category}`} scope={record.scope} kind={record.type}/><span className="fn-record-copy"><strong>{record.description}</strong><small>{dateLabel(record.date,true)} · {record.category} · {originLabel(record.origin)}</small></span></span><span className={`fn-record-value ${record.type === 'expense' ? 'fn-expense' : 'fn-income'}`}>{record.type === 'expense' ? '−' : '+'}{money(record.amount)}<ArrowLeft size={15}/></span></button>) : <Empty title="אין תנועות שמתאימות לבחירה">אפשר לבחור קטגוריה אחרת או להרחיב את טווח התאריכים.</Empty>}</div>}
      </section>

      <details className="fn-details fn-record-management"><summary>ניהול ועריכת רישומים <ChevronDown size={16}/></summary><p className="fn-footnote">הוספה, עריכה, מחיקה וייצוא נשארו זמינים כאן בלי להעמיס על התמונה הראשית.</p><FinanceRecords key={`${scope}:${start}:${end}`} from={start} to={end} enabled={valid} initialTab={scope} hideTabs/></details>
    </>}

    <FinanceSheet open={!!selectedRecord} onClose={() => setSelectedRecord(null)} title="פרטי התנועה">{selectedRecord && <RecordDetails record={selectedRecord}/>}</FinanceSheet>
  </section>;
}

function PageHeading({title,description}: {title:string;description:string}) {
  return <div className="fn-section-head fn-page-head"><div><span className="fn-page-kicker">העסק והחיים עצמם</span><h1>{title}</h1><p className="fn-muted">{description}</p></div></div>;
}

function Metric({label,value,tone,onClick,note}: {label:string;value:number|null|undefined;tone:string;onClick:()=>void;note?:string}) {
  return <button className={`fn-money-metric fn-money-metric-${tone}`} onClick={onClick}><span>{label}</span><strong>{money(value)}</strong><small>{note || 'לחץ לפירוט'}</small><ArrowLeft size={16}/></button>;
}

function activityTitle(type: ActivityType, scope: Scope) {
  if (type === 'received') return 'מה נכנס בתקופה';
  if (type === 'income') return 'עסקאות שנפתחו בתקופה';
  if (type === 'collection') return 'תנועות גבייה';
  if (type === 'expense') return `הוצאות ${scope === 'business' ? 'עסקיות' : 'אישיות'}`;
  return scope === 'business' ? 'כל הפעילות העסקית' : 'כל ההוצאות האישיות';
}

function originLabel(origin: FinancialActivityRecord['origin']) {
  return origin === 'bank_transactions' ? 'Financy / הבנק' : origin === 'personal_expenses' ? 'Junkie · אישי' : 'Junkie · עסקי';
}

function RecordDetails({record}: {record: FinancialActivityRecord}) {
  return <div className="fn-record-detail"><FinanceDataIcon label={`${record.description} ${record.category}`} scope={record.scope} kind={record.type} size={23}/><strong className={`fn-detail-amount ${record.type === 'expense' ? 'fn-expense' : 'fn-income'}`}>{record.type === 'expense' ? '−' : '+'}{money(record.amount,record.currency)}</strong><h3>{record.description}</h3><dl className="fn-definition"><div><dt>תאריך</dt><dd>{dateLabel(record.date,true)}</dd></div><div><dt>קטגוריה</dt><dd>{record.category}</dd></div><div><dt>צד</dt><dd>{record.scope === 'business' ? 'עסקי' : 'אישי'}</dd></div><div><dt>מקור</dt><dd>{originLabel(record.origin)}</dd></div>{record.merchant && <div><dt>בית עסק</dt><dd>{record.merchant}</dd></div>}{record.paymentStatus && <div><dt>סטטוס</dt><dd>{record.paymentStatus}</dd></div>}</dl></div>;
}
