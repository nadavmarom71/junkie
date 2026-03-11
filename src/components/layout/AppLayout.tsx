import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import SmartLoadingOverlay from '@/components/shared/SmartLoadingOverlay';
import { useDashboardStats } from '@/hooks/useDashboard';

export default function AppLayout() {
  // Show overlay only on first load per session (cold start scenario)
  const [hasLoadedOnce] = useState(() => sessionStorage.getItem('app-loaded') === '1');
  const { isLoading: dashLoading } = useDashboardStats();
  if (!hasLoadedOnce && !dashLoading) {
    sessionStorage.setItem('app-loaded', '1');
  }
  const showOverlay = !hasLoadedOnce && dashLoading;

  return (
    <div className="flex h-dvh overflow-hidden" style={{ background: 'var(--bg)', touchAction: 'pan-y', overscrollBehaviorX: 'none' }} dir="rtl">
      {/* Smart Loading Overlay — first load only */}
      <SmartLoadingOverlay isLoading={showOverlay} />

      {/* Sidebar — desktop only (mobile uses BottomNav) */}
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
