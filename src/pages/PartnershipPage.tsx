import { useState } from 'react';
import { LayoutDashboard, PlusCircle, ScrollText, Settings, Loader2 } from 'lucide-react';
import { PartnershipProvider, usePartnership } from '@/modules/partnership/PartnershipContext';
import Dashboard from '@/modules/partnership/Dashboard';
import AddTransaction from '@/modules/partnership/AddTransaction';
import History from '@/modules/partnership/History';
import SettingsView from '@/modules/partnership/Settings';
import { Link } from 'react-router-dom';

// ── Internal tab definition ───────────────────────────────────────────────────

type Tab = 'dashboard' | 'add' | 'history' | 'settings';

const TABS: { id: Tab; label: string; icon: React.FC<{ size: number }> }[] = [
  { id: 'dashboard', label: 'סיכום',    icon: LayoutDashboard },
  { id: 'add',       label: 'הוסף',     icon: PlusCircle },
  { id: 'history',   label: 'היסטוריה', icon: ScrollText },
  { id: 'settings',  label: 'הגדרות',   icon: Settings },
];

// ── Tab Navigation Bar ────────────────────────────────────────────────────────

function TabBar({
  active,
  onChange,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
}) {
  return (
    <div
      className="flex rounded-2xl p-1 gap-0.5 mb-5"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {TABS.map(({ id, label, icon: Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-semibold transition-all"
            style={
              isActive
                ? {
                    background: 'linear-gradient(135deg,rgba(124,58,237,0.35),rgba(37,99,235,0.25))',
                    color: '#c4b5fd',
                    border: '1px solid rgba(124,58,237,0.3)',
                    boxShadow: '0 2px 12px rgba(124,58,237,0.2)',
                  }
                : {
                    color: 'rgba(255,255,255,0.55)',
                    border: '1px solid transparent',
                  }
            }
          >
            <Icon size={17} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────

function Header() {
  return (
    <div
      className="rounded-2xl p-4 mb-4 flex items-center gap-3"
      style={{
        background: 'linear-gradient(135deg,rgba(37,99,235,0.15),rgba(124,58,237,0.15))',
        border: '1px solid rgba(124,58,237,0.2)',
      }}
    >
      {/* Avatar pair */}
      <div className="flex -space-x-2 flex-shrink-0">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black border-2 z-10"
          style={{ background: 'linear-gradient(135deg,#1d4ed8,#2563EB)', borderColor: '#080B14', color: '#fff' }}
        >
          נ
        </div>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black border-2"
          style={{ background: 'linear-gradient(135deg,#6d28d9,#7c3aed)', borderColor: '#080B14', color: '#fff' }}
        >
          ד
        </div>
      </div>
      <div>
        <div className="text-lg font-extrabold text-white leading-tight">השותפות שלך</div>
        <div className="text-sm text-white/60 mt-0.5">החלוקה לפי הכלל שנשמר בכל עסקה</div>
      </div>
      {/* Live indicator */}
      <div className="ms-auto flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-sm text-green-400/70 font-semibold">פעיל</span>
      </div>
    </div>
  );
}

// ── Inner Content (uses context) ──────────────────────────────────────────────

function PartnershipContent() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const { isLoading, loadError, saveError, pendingRecurring, approveRecurring } = usePartnership();

  function handleNavigate(tab: string) {
    setActiveTab(tab as Tab);
  }

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'rgba(255,255,255,0.3)' }} />
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>טוען נתוני שותפות...</p>
        </div>
      </>
    );
  }

  if (loadError) {
    return <><Header /><div role="alert" className="rounded-2xl border border-red-400/30 bg-red-400/10 p-5 text-red-100"><h2 className="font-bold">נתוני השותפות לא נטענו</h2><p className="mt-2">{loadError}</p><p className="mt-2">העריכה נעולה כדי שלא נדרוס את המידע הקיים.</p><button className="mt-4 rounded-xl bg-white/10 px-4 py-2" onClick={() => window.location.reload()}>לנסות לטעון שוב</button></div></>;
  }

  return (
    <>
      <Header />
      <Link to="/finance?view=partnership" className="mb-4 block rounded-xl border border-emerald-300/20 bg-emerald-300/10 p-3 text-sm text-emerald-100">פירוט החוב לדוד, בדיקת כללים ושיוך תשלומים ←</Link>
      {saveError && <div role="alert" className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-100">{saveError} השינוי לא אושר כשמור בשרת.</div>}
      {pendingRecurring.length > 0 && <details className="mb-4 rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm"><summary className="cursor-pointer font-semibold text-amber-100">{pendingRecurring.length} חיובים חוזרים מחכים לבדיקה</summary><p className="mt-3 text-white/70">המועד הגיע, אבל זה לא אומר ששולם. רק לאחר בדיקה אפשר לרשום את התשלום בשותפות.</p>{pendingRecurring.map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 py-3"><span>{item.description}<small className="block text-white/60">{item.date} · {new Intl.NumberFormat('he-IL', {style:'currency',currency:'ILS'}).format(item.amount)}</small></span><button className="rounded-lg bg-white/10 px-3 py-2 font-semibold" onClick={() => {if(window.confirm(`בדקת שהתשלום ״${item.description}״ אכן בוצע ושלא נרשם כבר? האישור יוסיף רשומה אמיתית לשותפות.`)) approveRecurring(item.id);}}>בדקתי ושולם — לרשום</button></div>)}</details>}
      <TabBar active={activeTab} onChange={setActiveTab} />

      <div key={activeTab}>
        {activeTab === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
        {activeTab === 'add'       && <AddTransaction onSaved={() => setActiveTab('history')} />}
        {activeTab === 'history'   && <History />}
        {activeTab === 'settings'  && <SettingsView />}
      </div>
    </>
  );
}

// ── Page (wraps Provider) — ISOLATED ─────────────────────────────────────────

export default function PartnershipPage() {
  return (
    <PartnershipProvider>
      <PartnershipContent />
    </PartnershipProvider>
  );
}
