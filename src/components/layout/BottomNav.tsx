import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ArrowLeftRight, Banknote, Plus, TrendingUp,
  TrendingDown, ShoppingCart, MoreHorizontal, Lightbulb, Users,
  Repeat, FileText, Settings, Users2, X, TrendingUp as ForecastIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── Quick actions (FAB) ─── */
const QUICK_ACTIONS = [
  { label: 'הכנסה עסקית', icon: TrendingUp,   color: '#34d399', path: '/transactions?add=income' },
  { label: 'הוצאה עסקית', icon: TrendingDown, color: '#f87171', path: '/transactions?add=expense' },
  { label: 'הוצאה אישית', icon: ShoppingCart, color: '#a78bfa', path: '/transactions?tab=personal&add=personal' },
];

/* ─── "More" sheet items ─── */
const MORE_ITEMS = [
  { to: '/insights',    icon: Lightbulb,    label: 'תובנות AI',    accent: undefined },
  { to: '/clients',     icon: Users,        label: 'לקוחות',       accent: undefined },
  { to: '/retainers',   icon: Repeat,       label: 'ריטיינרים',    accent: undefined },
  { to: '/forecast',    icon: ForecastIcon, label: 'תחזית',        accent: undefined },
  { to: '/reports',     icon: FileText,     label: 'דוחות',        accent: undefined },
  { to: '/settings',    icon: Settings,     label: 'הגדרות',       accent: undefined },
  { to: '/partnership', icon: Users2,       label: 'השותפות שלך',  accent: '#7c3aed' },
];

const MORE_PATHS = MORE_ITEMS.map(i => i.to);

export default function BottomNav() {
  const [fabOpen, setFabOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Close sheets on route change
  useEffect(() => {
    setFabOpen(false);
    setMoreOpen(false);
  }, [location.pathname]);

  const isMoreActive = MORE_PATHS.some(p => location.pathname.startsWith(p));

  return (
    <>
      {/* ── FAB Quick Actions Sheet ── */}
      {fabOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" onClick={() => setFabOpen(false)}>
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          />
          <div
            className="absolute bottom-24 left-1/2 -translate-x-1/2 rounded-2xl py-2 min-w-56 animate-slide-up"
            style={{
              background: 'rgba(21,29,46,0.98)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
              backdropFilter: 'blur(20px)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {QUICK_ACTIONS.map(({ label, icon: Icon, color, path }) => (
              <button
                key={label}
                onClick={() => { navigate(path); setFabOpen(false); }}
                className="flex items-center gap-3 w-full px-5 py-3.5 text-sm font-semibold transition-colors active:bg-white/5"
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: `${color}15` }}
                >
                  <Icon className="h-4 w-4" style={{ color }} />
                </div>
                <span className="text-white">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── "More" Bottom Sheet ── */}
      {moreOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" onClick={() => setMoreOpen(false)}>
          <div
            className="absolute inset-0 transition-opacity duration-200"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-3xl animate-slide-up"
            style={{
              background: '#0D1117',
              border: '1px solid rgba(255,255,255,0.08)',
              borderBottom: 'none',
              boxShadow: '0 -12px 48px rgba(0,0,0,0.5)',
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3">
              <h3 className="text-base font-bold text-white">כל הדפים</h3>
              <button
                onClick={() => setMoreOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.4)' }} />
              </button>
            </div>

            {/* Grid of nav items */}
            <div className="grid grid-cols-4 gap-1 px-4 pb-4" dir="rtl">
              {MORE_ITEMS.map(({ to, icon: Icon, label, accent }) => {
                const isActive = location.pathname.startsWith(to);
                const activeColor = accent || '#2563EB';
                return (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setMoreOpen(false)}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-colors active:bg-white/5"
                    style={isActive ? { background: `${activeColor}15` } : undefined}
                  >
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center"
                      style={{
                        background: isActive ? `${activeColor}20` : 'rgba(255,255,255,0.05)',
                      }}
                    >
                      <Icon
                        className="h-5 w-5"
                        style={{ color: isActive ? activeColor : 'rgba(255,255,255,0.45)' }}
                      />
                    </div>
                    <span
                      className="text-[11px] font-medium leading-tight text-center"
                      style={{ color: isActive ? activeColor : 'rgba(255,255,255,0.5)' }}
                    >
                      {label}
                    </span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom Tab Bar ── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
        style={{
          background: 'rgba(13,17,23,0.95)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
          {/* Tab: Dashboard */}
          <TabItem to="/" icon={LayoutDashboard} label="ראשי" exact />

          {/* Tab: Transactions */}
          <TabItem to="/transactions" icon={ArrowLeftRight} label="עסקאות" />

          {/* FAB */}
          <button
            onClick={() => { setFabOpen(o => !o); setMoreOpen(false); }}
            className="relative -top-4 flex items-center justify-center w-14 h-14 rounded-2xl transition-all active:scale-95 flex-shrink-0"
            style={{
              background: fabOpen
                ? 'linear-gradient(135deg,#1d4ed8,#044dcc)'
                : 'linear-gradient(135deg,#2563EB,#056dff)',
              boxShadow: '0 4px 24px rgba(37,99,235,0.5)',
            }}
            aria-label="פעולות מהירות"
          >
            <Plus
              className={cn(
                'h-6 w-6 text-white transition-transform duration-200',
                fabOpen && 'rotate-45'
              )}
            />
          </button>

          {/* Tab: Collections */}
          <TabItem to="/collections" icon={Banknote} label="גבייה" />

          {/* Tab: More */}
          <button
            onClick={() => { setMoreOpen(o => !o); setFabOpen(false); }}
            className="flex flex-col items-center gap-0.5 px-2 py-1.5 min-w-[48px] relative"
          >
            <MoreHorizontal
              className="h-5 w-5"
              style={{ color: moreOpen || isMoreActive ? '#2563EB' : 'rgba(255,255,255,0.35)' }}
            />
            <span
              className="text-[10px] font-medium"
              style={{ color: moreOpen || isMoreActive ? '#2563EB' : 'rgba(255,255,255,0.35)' }}
            >
              עוד
            </span>
            {isMoreActive && !moreOpen && (
              <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-blue-500" />
            )}
          </button>
        </div>
      </nav>
    </>
  );
}

/* ─── Reusable tab item ─── */
function TabItem({
  to, icon: Icon, label, exact,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  exact?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={exact}
      className="flex flex-col items-center gap-0.5 px-2 py-1.5 min-w-[48px] relative"
    >
      {({ isActive }) => (
        <>
          <Icon
            className="h-5 w-5"
            style={{ color: isActive ? '#2563EB' : 'rgba(255,255,255,0.35)' }}
          />
          <span
            className="text-[10px] font-medium"
            style={{ color: isActive ? '#2563EB' : 'rgba(255,255,255,0.35)' }}
          >
            {label}
          </span>
          {isActive && (
            <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-blue-500" />
          )}
        </>
      )}
    </NavLink>
  );
}
