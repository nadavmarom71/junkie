import { Menu, Plus, TrendingUp, TrendingDown, ShoppingCart, FileBarChart2, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/store/uiStore';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function TopBar() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <header
      className="h-14 flex items-center justify-between px-4 flex-shrink-0"
      style={{
        background: 'rgba(255,255,255,0.03)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div className="flex items-center gap-1">
        {/* Hamburger — desktop only, mobile uses bottom nav */}
        <button
          onClick={toggleSidebar}
          className="hidden lg:flex p-2 rounded-lg transition-colors hover:bg-white/5"
          style={{ color: 'var(--t2)' }}
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <button
          onClick={logout}
          className="p-2 rounded-lg transition-colors hover:bg-white/5"
          style={{ color: 'var(--t2)' }}
          aria-label="התנתק"
          title="התנתק"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-white transition-all hover:-translate-y-0.5"
            style={{
              background: 'linear-gradient(135deg,#2563EB,#056dff)',
              boxShadow: '0 4px 16px rgba(37,99,235,0.35)',
              fontFamily: "'Discovery', sans-serif",
            }}
          >
            <Plus className="h-4 w-4" />
            פעולות מהירות
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>הוסף</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => navigate('/transactions?add=income')}>
            <TrendingUp className="h-4 w-4 text-green-500" /> הכנסה עסקית
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => navigate('/transactions?add=expense')}>
            <TrendingDown className="h-4 w-4 text-red-500" /> הוצאה עסקית
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => navigate('/transactions?tab=personal&add=personal')}>
            <ShoppingCart className="h-4 w-4 text-purple-400" /> הוצאה אישית
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => navigate('/reports')}>
            <FileBarChart2 className="h-4 w-4 text-blue-400" /> צור דוח
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
