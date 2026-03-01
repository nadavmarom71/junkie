import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import { useUIStore } from '@/store/uiStore';
import SmartLoadingOverlay from '@/components/shared/SmartLoadingOverlay';
import { useDashboardStats } from '@/hooks/useDashboard';

export default function AppLayout() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);

  // Show overlay only on first load per session (cold start scenario)
  const [hasLoadedOnce] = useState(() => sessionStorage.getItem('app-loaded') === '1');
  const { isLoading: dashLoading } = useDashboardStats();
  if (!hasLoadedOnce && !dashLoading) {
    sessionStorage.setItem('app-loaded', '1');
  }
  const showOverlay = !hasLoadedOnce && dashLoading;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }} dir="rtl">
      {/* Smart Loading Overlay — first load only */}
      <SmartLoadingOverlay isLoading={showOverlay} />

      {/* Mobile: tap-to-close backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — handles both mobile (fixed overlay) and desktop (in-flow, animated width) */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0" style={{ zIndex: 1, position: 'relative' }}>
        <TopBar />
        <main className="flex-1 overflow-y-auto p-5 md:p-6 pb-24 lg:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <BottomNav />
    </div>
  );
}
