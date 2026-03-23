import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ArrowLeftRight, Lightbulb, Users,
  TrendingUp, FileText, Repeat, Settings, X, Banknote, Users2, Target, Inbox, Sparkles,
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/',             icon: LayoutDashboard, label: 'לוח מחוונים',    accent: undefined },
  { to: '/transactions', icon: ArrowLeftRight,   label: 'עסקאות',        accent: undefined },
  { to: '/collections',  icon: Banknote,         label: 'גבייה',         accent: undefined },
  { to: '/receipts',     icon: Inbox,            label: 'תיבת קבלות',   accent: '#F59E0B' },
  { to: '/insights',     icon: Lightbulb,        label: 'תובנות AI',     accent: undefined },
  { to: '/clients',      icon: Users,            label: 'לקוחות',        accent: undefined },
  { to: '/retainers',    icon: Repeat,           label: 'ריטיינרים',     accent: undefined },
  { to: '/forecast',     icon: TrendingUp,       label: 'תחזית',         accent: undefined },
  { to: '/reports',      icon: FileText,         label: 'דוחות',         accent: undefined },
  { to: '/goals',        icon: Target,           label: 'יעדים',         accent: '#22c55e' },
  { to: '/settings',     icon: Settings,         label: 'הגדרות',        accent: undefined },
  { to: '/partnership',  icon: Users2,           label: 'השותפות שלך',   accent: '#7c3aed' },
];

const sidebarStyle = {
  background: '#0D1117',
  borderLeft: '1px solid rgba(255,255,255,0.12)',
};

function SidebarContent({ onClose, closeOnNav }: { onClose: () => void; closeOnNav: boolean }) {
  const navigate = useNavigate();
  return (
    <>
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-5 py-6 mb-3.5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg,#2563EB,#056dff)',
            boxShadow: '0 4px 16px rgba(37,99,235,0.4)',
          }}
        >
          💰
        </div>
        <div className="flex-1">
          <div className="text-lg font-extrabold text-white leading-tight">Junkie</div>
          <div className="text-xs" style={{ color: 'var(--t2)' }}>ניהול פיננסי — נדב</div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
          style={{ color: 'var(--t2)' }}
          aria-label="סגור תפריט"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-px overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label, accent }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={closeOnNav ? onClose : undefined}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={({ isActive }) =>
              isActive
                ? {
                    background: accent ? `${accent}20` : 'rgba(37,99,235,0.15)',
                    color: '#fff',
                    fontWeight: 600,
                  }
                : { color: 'var(--t2)' }
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className="h-4 w-4 flex-shrink-0"
                  style={{ color: isActive ? (accent ?? '#2563EB') : 'var(--t3)' }}
                />
                <span className="flex-1">{label}</span>
                {isActive && (
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: accent ?? '#2563EB',
                      boxShadow: `0 0 8px ${accent ?? 'rgba(37,99,235,0.6)'}`,
                    }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Onboarding Test Button */}
      <div className="px-3 mb-2">
        <button
          onClick={() => navigate('/onboarding')}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(37,99,235,0.15))',
            border: '1px solid rgba(139,92,246,0.3)',
            color: '#c4b5fd',
          }}
        >
          <Sparkles className="h-4 w-4 flex-shrink-0" style={{ color: '#a78bfa' }} />
          <span className="flex-1 text-start">AI Wizard Onboarding</span>
        </button>
      </div>

      {/* Footer */}
      <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <p className="text-xs text-center" style={{ color: 'var(--t3)' }}>Junkie v1.0</p>
      </div>
    </>
  );
}

export default function Sidebar() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);

  return (
    /* Desktop only — mobile uses BottomNav exclusively */
    <aside
      className={cn(
        'hidden lg:flex flex-col h-full flex-shrink-0 overflow-hidden transition-[width] duration-300',
        sidebarOpen ? 'w-60' : 'w-0'
      )}
      style={{ ...sidebarStyle, position: 'relative', zIndex: 2 }}
    >
      <div className="w-60 h-full flex flex-col">
        <SidebarContent onClose={() => setSidebarOpen(false)} closeOnNav={false} />
      </div>
    </aside>
  );
}
