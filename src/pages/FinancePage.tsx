import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpLeft, ChartNoAxesCombined, CheckCircle2, ChevronDown, CircleHelp, HandCoins, House, Link2, LogOut, MoreHorizontal, ReceiptText, RefreshCw, Repeat2, Sparkles, TriangleAlert, UserRound, Users2, Wallet } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { financeGet, useFinance, useFinanceSave } from '@/hooks/useFinance';
import type { Connections, FinancialState, Forecast, Obligation } from '@/types/finance';
import FinanceTimeline, { TimelineRows } from '@/components/finance/FinanceTimeline';
import FinanceScenario from '@/components/finance/FinanceScenario';
import FinancePartnership from '@/components/finance/FinancePartnership';
import FinanceActivity from '@/components/finance/FinanceActivity';
import FinanceConnections from '@/components/finance/FinanceConnections';
import FinanceScopePanel from '@/components/finance/FinanceScopePanel';
import { FinanceError, FinanceSheet, Loading } from '@/components/finance/FinanceUI';
import { FinanceBusinessEditor } from '@/components/finance/FinanceTransactionEditor';
import api from '@/lib/api';
import type { BusinessTransaction } from '@/types';
import { accountName, dateLabel, money, numericDateLabel } from '@/lib/financeFormatters';
import '@/components/finance/finance.css';

const views = [
  {id:'overview',label:'מצב',fullLabel:'תמונת מצב',icon:House}, {id:'activity',label:'העסק',fullLabel:'העסק והיום־יום',icon:Wallet},
  {id:'partnership',label:'דוד',fullLabel:'דוד והשותפות',icon:Users2}, {id:'flow',label:'תזרים',fullLabel:'מה זז בדרך',icon:ChartNoAxesCombined},
  {id:'connections',label:'חיבורים',fullLabel:'חיבורים והתאמות',icon:Link2},
];
const legacy = [['/legacy','לוח המחוונים'],['/transactions','עסקאות'],['/collections','גבייה'],['/accounts','חשבונות ונכסים'],['/insights','תובנות'],['/clients','לקוחות'],['/retainers','ריטיינרים'],['/forecast','תחזית'],['/reports','דוחות'],['/goals','יעדים'],['/receipts','תיבת קבלות'],['/partnership','ניהול שותפות'],['/settings','הגדרות']];
const activitySections = [
  {id:'activity',label:'תנועות',description:'הכנסות והוצאות',icon:ReceiptText},
  {id:'collections',label:'גבייה',description:'מה עוד צריך להיכנס',icon:HandCoins},
  {id:'clients',label:'לקוחות',description:'הכסף לפי לקוח',icon:UserRound},
  {id:'retainers',label:'ריטיינרים',description:'הכנסות חודשיות',icon:Repeat2},
  {id:'recurring',label:'קבועות',description:'חיובים שחוזרים',icon:RefreshCw},
] as const;
export default function FinancePage() {
  const [params,setParams] = useSearchParams();
  const view = views.some(v => v.id === params.get('view')) ? params.get('view')! : 'overview';
  const [menu,setMenu] = useState(false);
  const [scenario,setScenario] = useState<string | null>(null);
  const [help,setHelp] = useState(false);
  const [refreshNotice,setRefreshNotice] = useState<{kind:'success'|'error';text:string} | null>(null);
  const client = useQueryClient();
  const openFinanceSync = useFinanceSave();
  const {logout,localAccess} = useAuth();
  useEffect(() => {
    if (!refreshNotice) return;
    const timer = window.setTimeout(() => setRefreshNotice(null),8000);
    return () => window.clearTimeout(timer);
  },[refreshNotice]);
  async function refreshFromOpenFinance() {
    if (openFinanceSync.isPending) return;
    setRefreshNotice(null);
    try {
      await openFinanceSync.mutateAsync({method:'post',path:'/sync/open_finance',body:{}});
      await client.refetchQueries({queryKey:['finance'],type:'active'});
      const connections = await financeGet<Connections>('/connections');
      client.setQueryData(['finance','/connections'],connections);
      const openFinance = connections.open_finance;
      const providerDates = [
        ...(openFinance.checkingAccounts || []).map(account => account.connectionDataDate),
        ...(openFinance.bankConnections || []).map(connection => connection.lastFetchedDataDate),
      ].filter((value): value is string => Boolean(value)).sort();
      const balanceDates = (openFinance.checkingAccounts || []).map(account => account.balanceAt).filter((value): value is string => Boolean(value)).sort();
      const providerDate = providerDates.at(-1);
      const balanceDate = balanceDates.at(-1);
      const freshness = [
        providerDate ? `נתוני הספק עד ${numericDateLabel(providerDate)}` : null,
        balanceDate && balanceDate !== providerDate ? `יתרות עד ${numericDateLabel(balanceDate)}` : null,
      ].filter(Boolean).join(' · ');
      setRefreshNotice({kind:'success',text:freshness ? `הסנכרון הושלם. ${freshness}.` : 'הסנכרון הושלם, אך Open Finance לא מסרה תאריך מידע חדש.'});
    } catch (error) {
      setRefreshNotice({kind:'error',text:error instanceof Error ? `הסנכרון לא הושלם: ${error.message}` : 'הסנכרון מול Open Finance לא הושלם.'});
    }
  }
  function navigate(next: string, focus?: 'collections') {setParams(next === 'overview' ? {} : {view:next,...(focus ? {focus} : {})});setMenu(false);window.scrollTo({top:0});}
  const activitySection = params.get('section') || (params.get('focus') === 'collections' ? 'collections' : 'activity');
  function chooseActivitySection(section: string) {
    const next = new URLSearchParams(params);
    next.set('view','activity');
    next.delete('focus');
    if (section === 'activity') next.delete('section');
    else next.set('section',section);
    setParams(next);
    window.scrollTo({top:0,behavior:'smooth'});
  }
  return <div className="fn-app fn-theme" dir="rtl"><a href="#finance-content" className="fn-skip-link">לתוכן המרכזי</a>
    <div className="fn-workspace"><header className="fn-mini-chrome" aria-label="כלי Junkie"><span className="fn-mini-brand" dir="ltr" aria-label="Junkie">j<span>.</span></span><div className="fn-mini-actions"><button className={`fn-icon fn-open-finance-refresh${openFinanceSync.isPending ? ' is-syncing' : ''}`} title="משיכת נתונים עכשיו מ־Open Finance" aria-label={openFinanceSync.isPending ? 'מסנכרן עכשיו מול Open Finance' : 'משיכת נתונים עכשיו מ־Open Finance'} aria-busy={openFinanceSync.isPending} disabled={openFinanceSync.isPending} onClick={() => void refreshFromOpenFinance()}><RefreshCw className="fn-refresh-glyph" size={18}/></button><button className="fn-icon" aria-label="על הנתונים והחישובים" onClick={() => setHelp(true)}><CircleHelp size={19}/></button><button className="fn-icon" aria-label="כלים נוספים" onClick={() => setMenu(true)}><MoreHorizontal size={21}/></button></div></header>
      {refreshNotice && <div className={`fn-refresh-status is-${refreshNotice.kind}`} role="status" aria-live="polite">{refreshNotice.kind === 'success' ? <CheckCircle2 size={18}/> : <TriangleAlert size={18}/>}<span>{refreshNotice.text}</span><button type="button" aria-label="סגירת הודעת הסנכרון" onClick={() => setRefreshNotice(null)}>סגור</button></div>}
      <main id="finance-content" className="fn-main">{view === 'overview' && <Overview navigate={navigate} openScenario={setScenario}/>} {view === 'activity' && <FinanceActivity key={params.get('focus') === 'collections' ? 'collections' : 'activity'} initialSection={params.get('focus') === 'collections' ? 'collections' : 'activity'}/>}{view === 'partnership' && <FinancePartnership/>}{view === 'flow' && <FinanceTimeline/>}{view === 'connections' && <FinanceConnections/>}</main>
      <FinanceDock view={view} activitySection={activitySection} navigate={navigate} chooseActivitySection={chooseActivitySection} openScenario={() => setScenario('')}/>
    </div>
    {scenario !== null && <FinanceScenario key={scenario} open onClose={() => setScenario(null)} initialAmount={scenario}/>}
    <FinanceSheet open={menu} onClose={() => setMenu(false)} title="עוד ב־Junkie"><div className="fn-more-intro"><span className="fn-topbar-brand" dir="ltr">j<span>.</span></span><div><strong>המרחב של נדב</strong><small>{localAccess ? 'המחשב הזה מחובר מקומית' : 'הסשן שלך נשמר ל־30 יום'}</small></div></div><details className="fn-details fn-legacy-menu"><summary>כלים מהמערכת הקודמת <ChevronDown size={15}/></summary><nav aria-label="הכלים המקוריים של ג׳אנקי">{legacy.map(([to,label]) => <Link key={to} to={to}>{label}<ArrowUpLeft size={13}/></Link>)}</nav></details>{!localAccess && <button className="fn-link fn-danger-link" onClick={() => void logout()}><LogOut size={16}/> יציאה מהחשבון</button>}</FinanceSheet>
    <FinanceSheet open={help} onClose={() => setHelp(false)} title="מספרים שאפשר להבין"><p>זאת סביבת העבודה האמיתית של ג׳אנקי, לא נתוני דוגמה. התמונה מחושבת בשרת מתוך הרשומות שלך.</p><dl className="fn-definition"><div><dt>לפי הרישום</dt><dd>הנתון קיים במקור שמצוין. לא בהכרח נבדק מול הבנק.</dd></div><div><dt>אומדן</dt><dd>יש חישוב, אבל יש הנחות או חלקים שטרם אומתו.</dd></div><div><dt>חסר מידע</dt><dd>לא מציגים 0 במקום סכום שלא ידוע.</dd></div></dl><p>סיווגים והתאמות נשמרים רק אחרי פעולה מפורשת שלך. תרחישים לא יוצרים עסקאות.</p></FinanceSheet>
  </div>;
}

function FinanceDock({view,activitySection,navigate,chooseActivitySection,openScenario}: {view:string;activitySection:string;navigate:(next:string)=>void;chooseActivitySection:(section:string)=>void;openScenario:()=>void}) {
  const [businessMenu,setBusinessMenu] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const businessItem = useRef<HTMLDivElement>(null);
  const cancelClose = () => {if (closeTimer.current) {clearTimeout(closeTimer.current);closeTimer.current=null;}};
  const scheduleClose = () => {cancelClose();closeTimer.current=setTimeout(() => setBusinessMenu(false),180);};
  const selectBusinessSection = (section:string) => {chooseActivitySection(section);setBusinessMenu(false);};

  useEffect(() => {
    const closeOnOutside = (event:PointerEvent) => {
      if (businessMenu && !businessItem.current?.contains(event.target as Node)) setBusinessMenu(false);
    };
    const closeOnEscape = (event:KeyboardEvent) => {if (event.key === 'Escape') setBusinessMenu(false);};
    document.addEventListener('pointerdown',closeOnOutside);
    document.addEventListener('keydown',closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown',closeOnOutside);
      document.removeEventListener('keydown',closeOnEscape);
      cancelClose();
    };
  },[businessMenu]);

  return <nav className="fn-app-dock" aria-label="ניווט ראשי"><div className="fn-app-dock-nav">{views.map(({id,label,fullLabel,icon:Icon}) => id === 'activity' ? <div className="fn-dock-item" key={id} ref={businessItem} onPointerEnter={event => {if (event.pointerType === 'mouse') cancelClose();}} onPointerLeave={event => {if (event.pointerType === 'mouse') scheduleClose();}}>
      <button className={view === id ? 'fn-dock-active' : ''} aria-current={view === id ? 'page' : undefined} aria-label={`${fullLabel} — פתיחת תפריט`} aria-haspopup="menu" aria-expanded={businessMenu} onPointerEnter={event => {if (event.pointerType === 'mouse') setBusinessMenu(true);}} onFocus={() => setBusinessMenu(true)} onClick={() => setBusinessMenu(true)}><Icon size={20}/><span>{label}</span><ChevronDown className="fn-dock-chevron" size={13}/></button>
      <div className={`fn-dock-bubble${businessMenu ? ' is-open' : ''}`} role="menu" aria-label="אזורי העסק והיום־יום" aria-hidden={!businessMenu} onPointerEnter={event => {if (event.pointerType === 'mouse') cancelClose();}} onPointerLeave={event => {if (event.pointerType === 'mouse') scheduleClose();}}>{activitySections.map(({id:section,label:sectionLabel,description,icon:SectionIcon}) => <button key={section} role="menuitem" tabIndex={businessMenu ? 0 : -1} aria-current={view === 'activity' && activitySection === section ? 'page' : undefined} onClick={() => selectBusinessSection(section)}><span className="fn-dock-bubble-icon"><SectionIcon size={18}/></span><span><strong>{sectionLabel}</strong><small>{description}</small></span>{view === 'activity' && activitySection === section && <i aria-hidden="true"/>}</button>)}</div>
    </div> : <div className="fn-dock-item" key={id}><button className={view === id ? 'fn-dock-active' : ''} aria-current={view === id ? 'page' : undefined} aria-label={fullLabel} onClick={() => {setBusinessMenu(false);navigate(id);}}><Icon size={20}/><span>{label}</span></button></div>)}</div><button className="fn-app-dock-ask" onClick={openScenario}><Sparkles size={20}/><span><strong>מה אם?</strong><small>בודקים לפני שמוציאים</small></span></button></nav>;
}

function Overview({navigate,openScenario}: {navigate:(view:string,focus?:'collections')=>void;openScenario:(amount:string)=>void}) {
  const query = useFinance<FinancialState>('/state');
  const flow = useFinance<Forecast>('/forecast?days=30');
  const [detail,setDetail] = useState<'missing'|'accounts'|'obligations'|'collections'|null>(null);
  const [editObligation,setEditObligation] = useState<Obligation | 'new' | 'tax' | null>(null);
  const [editBusinessSourceId,setEditBusinessSourceId] = useState<string | null>(null);
  const s = query.data;
  const financialMissing = s?.missing.filter(item => item.blocking !== false) || [];
  const accountSourcesUnavailable = s && (s.coverage.accounts?.status !== 'ok' || s.coverage.app_settings?.status !== 'ok');
  const accountNotice = s?.missing.find(item => ['missing_account_balance','ambiguous_account_balance','bank_connection_unavailable','bank_data_stale','stale_balance'].includes(item.code));
  const accountGap = s?.missing.find(item => item.blocking !== false && ['missing_account_balance','ambiguous_account_balance','bank_connection_unavailable','bank_data_stale','stale_balance'].includes(item.code));
  const missingGroups: {key:string; items:FinancialState['missing']}[] = [];
  for (const item of financialMissing) {
    const key = ['missing_account_balance','ambiguous_account_balance','bank_connection_unavailable','bank_data_stale','opening_balance','stale_balance'].includes(item.code) ? 'bank' : item.code === 'card_due_unknown' ? 'cards' : item.code;
    const group = missingGroups.find(entry => entry.key === key);
    if (group) group.items.push(item);
    else missingGroups.push({key,items:[item]});
  }
  const importedChecking = s?.accounts.filter(account => account.type === 'checking' && account.source === 'open_finance' && account.currency === s.currency) || [];
  const checkingAccounts = s?.accounts.filter(account => account.type === 'checking') || [];
  const otherAccounts = s?.accounts.filter(account => account.type !== 'checking') || [];
  const activeButStale = !!accountNotice && importedChecking.length > 0 && importedChecking.every(account => account.listedInLatestSync && ['ACTIVE','CONNECTED','COMPLETED'].includes(account.connectionStatus || '')) && importedChecking.some(account => !account.asOf || account.asOf < s!.asOf);
  const accountGapTitle = activeButStale || ['bank_data_stale','stale_balance'].includes(accountNotice?.code || '') ? 'יתרות הבנק לא מהיום' : accountNotice?.code === 'bank_connection_unavailable' ? 'חיבור בנק לא מעודכן' : 'חסר חשבון לסיכום';
  const displayBank = s?.bank.amount ?? s?.lastKnownBank?.amount ?? null;
  const isLastKnown = !!s && s.bank.amount === null && !!s.lastKnownBank;
  const displayAvailable = s?.available.amount ?? s?.lastKnownAvailable?.amount ?? null;
  const isEstimatedAvailable = !!s && s.available.amount === null && s.lastKnownAvailable?.amount != null;
  const ringAccounts = checkingAccounts.filter(account => account.currency === s?.currency && account.balance != null && account.balance > 0);
  const ringSum = ringAccounts.reduce((sum, account) => sum + Number(account.balance), 0);
  const ringColors = ['#8cc8b1','#6f8fb9','#d1ad75','#aa93bd'];
  let ringProgress = 0;
  const ringParts = ringAccounts.map((account, index) => {
    const start = ringProgress;
    ringProgress += Number(account.balance) / ringSum * 100;
    return `${ringColors[index % ringColors.length]} ${start}% ${ringProgress}%`;
  });
  const ringBackground = displayBank !== null && ringSum > 0 && Math.abs(ringSum - displayBank) < 0.02
    ? `conic-gradient(${ringParts.join(',')})`
    : 'var(--fn-line)';
  const davidNeedsReview = financialMissing.some(item => item.code === 'david_review');
  const nextAction = accountGap ? {title:'לבדוק את יתרות הבנק', detail:accountGapTitle, button:'לחשבונות', run:() => setDetail('accounts')}
    : davidNeedsReview ? {title:'לסגור את ההתחשבנות עם דוד', detail:'הסכום עדיין דורש אימות', button:'לשותפות', run:() => navigate('partnership')}
    : missingGroups.length ? {title:'להשלים נתון חסר', detail:`יש ${missingGroups.length} נושאים שמשפיעים על התמונה`, button:'מה חסר?', run:() => setDetail('missing')}
    : {title:'לראות מה מגיע בהמשך', detail:'התמונה הנוכחית נטענה', button:'לתזרים', run:() => navigate('flow')};
  return <><div className="fn-section-head fn-overview-heading"><div><h1>תמונת מצב</h1><p className="fn-muted">הכסף, התנועות והצעד הבא.</p></div>{s && <span className="fn-asof">{dateLabel(s.asOf,true)}</span>}</div>
    <FinanceError error={query.error} retry={() => void query.refetch()}/>{query.isPending && <Loading/>}
    {s && <>
      <div className="fn-overview-grid"><section className="fn-balance fn-surface"><div className="fn-balance-top"><h2>מה יש בעו״ש?</h2><span className={`fn-balance-state ${isLastKnown ? 'fn-balance-state-stale' : ''}`}>{isLastKnown ? 'צילום אחרון' : s.bank.amount === null ? 'חסרה יתרה' : 'יתרה שנקלטה'}</span></div>
        <div className="fn-balance-content"><div className="fn-donut" style={{background:ringBackground}} role="img" aria-label={displayBank === null ? 'אין יתרה זמינה' : `יתרת עו״ש ${money(displayBank)}${isLastKnown ? `, צילום אחרון מ־${dateLabel(s.lastKnownBank?.asOf,true)}` : ''}`}><div className="fn-donut-center"><small>{isLastKnown ? 'צילום אחרון' : 'עו״ש שנקלט'}</small><strong>{displayBank === null ? 'לא ידוע' : money(displayBank)}</strong><span>{isLastKnown ? dateLabel(s.lastKnownBank?.asOf,true) : dateLabel(s.asOf,true)}</span></div></div>
          <div className="fn-bank-list"><div className="fn-bank-list-title">חשבונות הבנק</div>{checkingAccounts.length ? checkingAccounts.map((account,index) => <div className="fn-bank-item" key={account.id}><span className="fn-bank-dot" style={{background:ringColors[index % ringColors.length]}} aria-hidden="true"/><div><strong>{accountName(account.name,account.providerId)}</strong><small>{account.purpose === 'business' ? 'בעיקר עסקי' : account.purpose === 'personal' ? 'בעיקר אישי' : 'ייעוד בבדיקה'} · {dateLabel(account.asOf)}</small></div><b>{money(account.balance,account.currency)}</b></div>) : <p className="fn-muted">עוד אין יתרות חשבון מאומתות.</p>}{accountNotice && <button className="fn-link" onClick={() => setDetail('accounts')}>למה היתרה לא מעודכנת? <ArrowLeft size={15}/></button>}</div></div>
        <div className="fn-balance-bottom"><div><span>{isEstimatedAvailable ? `כסף פנוי משוער לפי יתרות הבנק עד ${numericDateLabel(s.lastKnownAvailable?.asOf)}` : 'פנוי אחרי התחייבויות'}</span><strong>{money(displayAvailable)}</strong>{isEstimatedAvailable && <small>אומדן לאחר ההתחייבויות שנקלטו; תנועות מאוחרות יותר עשויות לשנות אותו.</small>}</div><button className="fn-link" onClick={() => setDetail('obligations')}>פירוט התחייבויות<ArrowLeft size={15}/></button></div></section>
        <section className="fn-next fn-surface"><span className="fn-next-kicker">מה חשוב עכשיו</span><h2>{nextAction.title}</h2><p>{nextAction.detail}</p><button className="fn-primary" onClick={nextAction.run}>{nextAction.button}<ArrowLeft size={16}/></button><button className="fn-link" onClick={() => setDetail('missing')}>{missingGroups.length ? `עוד ${missingGroups.length} נושאים לבדיקה` : 'מקורות הנתונים'}<ArrowLeft size={15}/></button></section></div>
      <div className="fn-obligation-strip"><button onClick={() => navigate('partnership')}><span>לדוד</span><strong className="fn-partner-color">{money(s.partnership?.outstanding.amount)}</strong><small>{s.partnership?.status === 'confirmed' ? 'נבדק' : 'לפי הרישום · דורש אימות'}</small></button><button onClick={() => setDetail('collections')}><span>עוד לגבייה</span><strong className="fn-collection-color">{money(s.collections.status === 'unknown' ? null : s.collections.amount)}</strong><small>לא בעו״ש עדיין</small></button></div>
      <FinanceScopePanel state={s} compact/>
      <div className="fn-overview-lower"><section className="fn-surface"><div className="fn-section-head"><h2>מה זז בדרך?</h2><button className="fn-link" onClick={() => navigate('flow')}>לכל החודש<ArrowLeft size={15}/></button></div><FinanceError error={flow.error} retry={() => void flow.refetch()}/>{flow.isPending && <Loading label="מחשב את האירועים הקרובים…"/>}{flow.data && (flow.data.events.length ? <TimelineRows events={flow.data.events} limit={4}/> : <p className="fn-muted">אין כרגע תנועות עם מועד סגור בחודש הקרוב.{flow.data.undated.length ? ` יש ${flow.data.undated.length} רשומות שמחכות לתאריך.` : ''}</p>)}</section><section className="fn-surface fn-decision-card"><span className="fn-eyebrow">קנייה קטנה. תמונה מלאה.</span><h2>אפשר לקנות את זה?</h2><p>כמה יישאר מיד, מתי יכול להיות חוסר, ומה צריך להיכנס כדי שזה יעבוד.</p><div className="fn-scenario-examples"><button onClick={() => openScenario('330')}>סטנדאפ <b>330 ₪</b></button><button onClick={() => openScenario('480')}>אימונים <b>480 ₪</b></button></div><button className="fn-link" onClick={() => openScenario('')}>סכום אחר או שאלה<ArrowUpLeft size={16}/></button></section></div>
      <p className="fn-footnote">יתרות הבנקים מוצגות לפי תאריך המקור שלהן. סכומים שעדיין לגבייה אינם נכללים בעו״ש.</p>
      <FinanceSheet open={!!detail} onClose={() => setDetail(null)} title={{missing:'מה עוד צריך להשלים?',accounts:'החשבונות שלי',obligations:'מה עוד צריך לשלם?',collections:'מה לקוחות חייבים לי?'}[detail || 'missing']}>
        {detail === 'missing' && <><ul className="fn-missing-list">{missingGroups.map(group => {
          const primary = group.key === 'bank' ? accountGap || group.items[0] : group.items[0];
          const details = group.key === 'cards' ? group.items : group.items.filter(item => item !== primary);
          return <li key={group.key}><p>{group.key === 'cards' ? `${group.items.length} כרטיסים — סכום החיוב המלא עדיין לא אומת` : primary.message}</p>{details.length > 0 && <details className="fn-details"><summary>לפירוט</summary><ul>{details.map((item,i) => <li key={`${item.code}-${i}`}>{item.message}</li>)}</ul></details>}{group.key === 'bank' && <button className="fn-link" onClick={() => {setDetail(null);navigate('connections');}}>לבדיקת חשבונות הבנק</button>}{group.key === 'cards' && <button className="fn-link" onClick={() => {setDetail(null);navigate('connections');}}>לפרטי הכרטיסים</button>}{group.key === 'tax_obligation' && <button className="fn-link" onClick={() => {setDetail(null);setEditObligation('tax');}}>הזנת סכום המס שנותר</button>}{group.key === 'david_review' && <button className="fn-link" onClick={() => {setDetail(null);navigate('partnership');}}>לבדיקת החוב לדוד</button>}</li>;
        })}</ul><details className="fn-details"><summary>המקורות שנבדקו</summary>{Object.entries(s.coverage).map(([name,coverage]) => <div className="fn-list-row" key={name}><code>{name}</code><span>{coverage.status === 'ok' ? `${coverage.count ?? '✓'} רשומות` : 'לא זמין'}</span></div>)}</details></>}
        {detail === 'accounts' && <>
          <p className="fn-footnote">Pepper משמש בעיקר לעסק ולאומי בעיקר לאישי. זה לא קובע אוטומטית את סוג התנועה: התקבול מלידור בלאומי הוא עסקי, בלי חלק לדוד.</p>
          {accountNotice && <p className={accountNotice.blocking === false ? 'fn-notice' : 'fn-error'} role={accountNotice.blocking === false ? 'status' : 'alert'}>{accountNotice.message}</p>}
          {accountSourcesUnavailable && <p className="fn-error" role="alert">לא כל מקורות החשבונות נטענו. אי אפשר להסיק מכאן שאין חשבונות או יתרות.</p>}
          <p className="fn-eyebrow fn-accounts-group">חשבונות העו״ש</p>
          {checkingAccounts.length ? checkingAccounts.map(account => <AccountBalanceRow key={account.id} account={account}/>) : !accountSourcesUnavailable && <p className="fn-muted">לא נקלטו יתרות עו״ש. בדוק את חיבור Financy לפני שמסיקים כמה כסף יש בחשבון.</p>}
          {!!otherAccounts.length && <details className="fn-details"><summary>כרטיסים וחשבונות נוספים <span>{otherAccounts.length}</span></summary>{otherAccounts.map(account => <AccountBalanceRow key={account.id} account={account}/>)}</details>}
          <nav className="fn-shortcuts"><button className="fn-link" onClick={() => {setDetail(null);navigate('connections');}}>חיבור הבנק והתנועות<ArrowLeft size={15}/></button></nav>
        </>}
        {detail === 'obligations' && <>{s.obligations.map(obligation => <div className="fn-list-row" key={obligation.id}><div><strong>{obligation.label}</strong><small>{obligation.date ? dateLabel(obligation.date,true) : 'המועד לא נקבע'} · {obligation.reserved ? 'כבר נוכה מהפנוי' : 'ינוכה במועד התשלום'}</small></div><div className="fn-value-stack"><b>{money(obligation.amount)}</b>{(obligation.source === 'tax_obligation' || obligation.source.startsWith('obligation:')) && <button className="fn-link" onClick={() => {setDetail(null);setEditObligation(obligation);}}>עריכה</button>}{obligation.source.startsWith('business_transactions:') && <button className="fn-link" onClick={() => {setDetail(null);setEditBusinessSourceId(obligation.source.slice('business_transactions:'.length));}}>עריכת ההוצאה המקורית</button>}</div></div>)}<div className="fn-shortcuts"><button className="fn-secondary" onClick={() => {setDetail(null);setEditObligation('new');}}>הוספת התחייבות</button><button className="fn-link" onClick={() => {setDetail(null);setEditObligation('tax');}}>הזנת מס שנותר לתשלום</button></div></>}
        {detail === 'collections' && <>{s.collections.status === 'unknown' && <p className="fn-error" role="alert">תמונת הגבייה אינה מלאה: מקור לא נטען או שיש רישום שדורש בדיקה. זה לא אומר שאין חובות פתוחים.</p>}{s.collections.items.map(item => <div className="fn-list-row" key={item.id}><div><strong>{item.description}</strong><small>צפוי: {dateLabel(item.date,true)}</small></div><b>{money(item.amount)}</b></div>)}{s.collections.status !== 'unknown' && !s.collections.items.length && <p className="fn-muted">לא נמצאו חובות פתוחים במקור שנטען.</p>}<button className="fn-link" onClick={() => {setDetail(null);navigate('activity','collections');}}>לניהול הגבייה כאן<ArrowLeft size={15}/></button></>}
      </FinanceSheet>
      <FinanceSheet open={!!editObligation} onClose={() => setEditObligation(null)} title="התחייבות לתשלום">{editObligation && <ObligationEditor key={typeof editObligation === 'string' ? editObligation : editObligation.id} obligation={editObligation}/>}</FinanceSheet>
      <FinanceSheet open={!!editBusinessSourceId} onClose={() => setEditBusinessSourceId(null)} title="עריכת ההוצאה המקורית">{editBusinessSourceId && <BusinessSourceEditor id={editBusinessSourceId} onSaved={() => setEditBusinessSourceId(null)}/>}</FinanceSheet>
    </>}
  </>;
}

function AccountBalanceRow({account}: {account: FinancialState['accounts'][number]}) {
  const creditLine = account.type === 'loan' && account.loanType === 'CREDIT_LIMIT';
  const debitCard = account.type === 'credit_card' && account.product === 'כרטיס דביט';
  return <div className="fn-list-row"><div><strong>{accountName(account.name,account.providerId)}</strong><small>{creditLine ? 'מסגרת עו״ש · לא הלוואה בתשלומים · לא מתווספת לכסף בבנק' : debitCard ? 'דביט · חיובים יורדים מהעו״ש · אין חשבון אשראי נפרד' : `יתרה ל־${dateLabel(account.asOf,true)} · ${account.source === 'open_finance' ? 'Financy' : 'רישום בג׳אנקי'} · ${account.purpose === 'business' ? 'בעיקר עסקי' : account.purpose === 'personal' ? 'בעיקר אישי' : account.purpose === 'mixed' ? 'מעורב' : 'ייעוד טרם נשמר'}`}</small></div><b>{creditLine ? 'מסגרת בלבד' : debitCard ? 'כרטיס דביט' : money(account.balance,account.currency)}</b></div>;
}

function BusinessSourceEditor({id,onSaved}: {id:string;onSaved:()=>void}) {
  const query=useQuery<BusinessTransaction>({queryKey:['finance','business-source',id],queryFn:()=>api.get(`/transactions/${encodeURIComponent(id)}`)});
  if(query.isPending)return <Loading label="טוען את ההוצאה המקורית…"/>;
  if(query.error)return <FinanceError error={query.error} retry={() => void query.refetch()}/>;
  if(!query.data || query.data.type!=='expense')return <p className="fn-error" role="alert">הרישום המקושר אינו הוצאה עסקית שאפשר לערוך כאן.</p>;
  return <FinanceBusinessEditor key={query.data.id} transaction={query.data} onSaved={onSaved}/>;
}

function ObligationEditor({obligation}: {obligation: Obligation | 'new' | 'tax'}) {
  const existing = typeof obligation === 'object' ? obligation : null;
  const [id] = useState(existing?.id || (obligation === 'tax' ? 'tax' : crypto.randomUUID()));
  const [label,setLabel] = useState(existing?.label || (obligation === 'tax' ? 'מסים שטרם שולמו' : ''));
  const [amount,setAmount] = useState(existing?.amount == null ? '' : String(existing.amount));
  const [date,setDate] = useState(existing?.date || '');
  const [status,setStatus] = useState<string>(existing?.status === 'unknown' ? 'estimated' : existing?.status || 'estimated');
  const [reserve,setReserve] = useState(existing?.reserved ?? true);
  const [paid,setPaid] = useState(false);
  const [note,setNote] = useState(existing?.note || '');
  const save = useFinanceSave();
  return <form className="fn-form" onSubmit={e => {e.preventDefault();save.mutate({path:`/obligations/${encodeURIComponent(id)}`,body:{label,amount:Number(amount),currency:'ILS',status,date:date || null,reserveNow:reserve,paid,note}});}}>
    <p className="fn-muted">מוסיפים רק חוב שלא כבר נכלל בדוד, באשראי או בהוצאה אחרת. אם הסכום לא סופי, משאירים אותו כאומדן.</p>
    <label>על מה התשלום?<input value={label} onChange={e => setLabel(e.target.value)} maxLength={150} required/></label>
    <div className="fn-form-grid"><label>כמה נשאר לשלם? ₪<input type="number" min="0" max="10000000000" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required/></label><label>מועד, אם ידוע<input type="date" value={date} onChange={e => setDate(e.target.value)}/></label></div>
    <label>עד כמה הסכום בדוק?<select value={status} onChange={e => setStatus(e.target.value)}><option value="confirmed">בדקתי את הסכום</option><option value="estimated">אומדן</option><option value="assumed">הנחת עבודה</option></select></label>
    <label className="fn-checkbox"><input type="checkbox" checked={reserve} disabled={id === 'tax'} onChange={e => setReserve(e.target.checked)}/>להוריד כבר עכשיו מהכסף הפנוי</label>
    {(existing || id === 'tax') && <label className="fn-checkbox"><input type="checkbox" checked={paid} onChange={e => setPaid(e.target.checked)}/>התשלום הזה כבר הוסדר</label>}
    <label>הערה או מקור הסכום<textarea rows={2} value={note} maxLength={1000} onChange={e => setNote(e.target.value)}/></label>
    <button className="fn-primary" disabled={save.isPending}>{save.isPending ? 'שומר…' : 'שמירת ההתחייבות'}</button><FinanceError error={save.error}/>{save.isSuccess && <p role="status" className="fn-saved">נשמר. התמונה והתזרים מתעדכנים לפי הסכום שהזנת.</p>}
  </form>;
}
