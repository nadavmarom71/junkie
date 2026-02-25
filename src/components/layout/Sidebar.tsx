import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, ArrowLeftRight, Lightbulb, Users,
  TrendingUp, FileText, Repeat, Settings, X, Banknote,
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/',             icon: LayoutDashboard, label: 'לוח מחוונים' },
  { to: '/transactions', icon: ArrowLeftRight,   label: 'עסקאות' },
  { to: '/collections',  icon: Banknote,         label: 'גבייה' },
  { to: '/insights',     icon: Lightbulb,        label: 'תובנות AI' },
  { to: '/clients',      icon: Users,            label: 'לקוחות' },
  { to: '/retainers',    icon: Repeat,           label: 'ריטיינרים' },
  { to: '/forecast',     icon: TrendingUp,       label: 'תחזית' },
  { to: '/reports',      icon: FileText,         label: 'דוחות' },
  { to: '/settings',     icon: Settings,         label: 'הגדרות' },
];

export default function Sidebar() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);

  return (
    <aside
      className={cn(
        'fixed right-0 top-0 h-full z-40 transition-transform duration-300 w-60 flex flex-col',
        sidebarOpen ? 'translate-x-0' : 'translate-x-full'
      )}
      style={{
        background: '#0D1117',
        borderLeft: '1px solid rgba(255,255,255,0.07)',
      }}
    >
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
          onClick={() => setSidebarOpen(false)}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
          style={{ color: 'var(--t2)' }}
          aria-label="סגור תפריט"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-px overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={({ isActive }) =>
              isActive
                ? { background: 'rgba(37,99,235,0.15)', color: '#fff', fontWeight: 600 }
                : { color: 'var(--t2)' }
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className="h-4 w-4 flex-shrink-0"
                  style={{ color: isActive ? '#2563EB' : 'var(--t3)' }}
                />
                <span className="flex-1">{label}</span>
                {isActive && (
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: '#2563EB', boxShadow: '0 0 8px rgba(37,99,235,0.6)' }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <p className="text-xs text-center" style={{ color: 'var(--t3)' }}>Junkie v1.0</p>
      </div>
    </aside>
  );
}
