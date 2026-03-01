import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ArrowLeftRight, Banknote, Users, Plus, TrendingUp, TrendingDown, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_LEFT = [
  { to: '/',             icon: LayoutDashboard, label: 'ראשי' },
  { to: '/transactions', icon: ArrowLeftRight,   label: 'עסקאות' },
];
const NAV_RIGHT = [
  { to: '/collections',  icon: Banknote, label: 'גבייה' },
  { to: '/clients',      icon: Users,    label: 'לקוחות' },
];

const QUICK_ACTIONS = [
  { label: 'הכנסה עסקית', icon: TrendingUp,    color: 'text-green-400',  path: '/transactions?add=income' },
  { label: 'הוצאה עסקית', icon: TrendingDown,  color: 'text-red-400',    path: '/transactions?add=expense' },
  { label: 'הוצאה אישית', icon: ShoppingCart,  color: 'text-purple-400', path: '/transactions?tab=personal&add=personal' },
];

export default function BottomNav() {
  const [fabOpen, setFabOpen] = useState(false);
  const navigate = useNavigate();

  const navLinkClass = 'flex flex-col items-center gap-0.5 px-3 py-1.5 min-w-[52px]';

  return (
    <>
      {/* FAB action sheet */}
      {fabOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setFabOpen(false)}
        >
          <div
            className="absolute bottom-20 left-1/2 -translate-x-1/2 rounded-2xl py-2 min-w-52"
            style={{ background: '#151d2e', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 -8px 40px rgba(0,0,0,0.5)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {QUICK_ACTIONS.map(({ label, icon: Icon, color, path }) => (
              <button
                key={label}
                onClick={() => { navigate(path); setFabOpen(false); }}
                className={cn('flex items-center gap-3 w-full px-5 py-3 text-sm font-semibold hover:bg-white/5 transition-colors', color)}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
        style={{
          background: '#0D1117',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
        dir="ltr"
      >
        <div className="flex items-center justify-around h-16 px-1">
          {/* Left items */}
          {NAV_LEFT.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'} className={navLinkClass}>
              {({ isActive }) => (
                <>
                  <Icon className="h-5 w-5" style={{ color: isActive ? '#2563EB' : 'rgba(255,255,255,0.35)' }} />
                  <span className="text-[10px] font-medium" style={{ color: isActive ? '#2563EB' : 'rgba(255,255,255,0.35)' }}>
                    {label}
                  </span>
                  {isActive && (
                    <span className="absolute bottom-1 w-1 h-1 rounded-full bg-blue-500" />
                  )}
                </>
              )}
            </NavLink>
          ))}

          {/* FAB */}
          <button
            onClick={() => setFabOpen((o) => !o)}
            className="relative -top-5 flex items-center justify-center w-14 h-14 rounded-2xl transition-all active:scale-95 flex-shrink-0"
            style={{
              background: fabOpen
                ? 'linear-gradient(135deg,#1d4ed8,#044dcc)'
                : 'linear-gradient(135deg,#2563EB,#056dff)',
              boxShadow: '0 4px 20px rgba(37,99,235,0.55)',
            }}
            aria-label="פעולות מהירות"
          >
            <Plus
              className={cn('h-6 w-6 text-white transition-transform duration-200', fabOpen ? 'rotate-45' : '')}
            />
          </button>

          {/* Right items */}
          {NAV_RIGHT.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={navLinkClass}>
              {({ isActive }) => (
                <>
                  <Icon className="h-5 w-5" style={{ color: isActive ? '#2563EB' : 'rgba(255,255,255,0.35)' }} />
                  <span className="text-[10px] font-medium" style={{ color: isActive ? '#2563EB' : 'rgba(255,255,255,0.35)' }}>
                    {label}
                  </span>
                  {isActive && (
                    <span className="absolute bottom-1 w-1 h-1 rounded-full bg-blue-500" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
