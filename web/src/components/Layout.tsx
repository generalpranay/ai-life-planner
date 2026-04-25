import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { Toaster } from 'react-hot-toast';

export default function Layout() {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ background: '#0a1a0f' }}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <Toaster
        position="top-right"
        gutter={8}
        toastOptions={{
          duration: 3500,
          style: {
            background: '#0f2314',
            color: '#e8e8e0',
            fontSize: 13,
            fontFamily: 'Inter, system-ui, sans-serif',
            border: '1px solid rgba(212,160,23,0.18)',
            borderRadius: 12,
            padding: '10px 14px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          },
          success: { iconTheme: { primary: '#4ade80', secondary: '#0a1a0f' } },
          error:   { iconTheme: { primary: '#f87171', secondary: '#0a1a0f' } },
          loading: { iconTheme: { primary: '#d4a017', secondary: '#0a1a0f' } },
        }}
      />
    </div>
  );
}
