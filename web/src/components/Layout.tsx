import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { Toaster } from 'react-hot-toast';

export default function Layout() {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#09090B]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#27272A', color: '#F4F4F5', fontSize: 14, border: '1px solid rgba(255,255,255,0.08)' },
          success: { iconTheme: { primary: '#10B981', secondary: '#09090B' } },
          error: { iconTheme: { primary: '#EF4444', secondary: '#09090B' } },
        }}
      />
    </div>
  );
}
