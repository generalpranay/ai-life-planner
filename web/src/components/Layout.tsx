import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../hooks/useAuth';
import { Toaster } from 'react-hot-toast';

export default function Layout() {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ background: '#09090B' }}>
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
            background: '#18181B',
            color: '#F4F4F5',
            fontSize: 13,
            fontFamily: 'Inter, system-ui, sans-serif',
            border: '1px solid rgba(124,58,237,0.20)',
            borderRadius: 12,
            padding: '10px 14px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          },
          success: { iconTheme: { primary: '#10B981', secondary: '#09090B' } },
          error:   { iconTheme: { primary: '#EF4444', secondary: '#09090B' } },
          loading: { iconTheme: { primary: '#7C3AED', secondary: '#09090B' } },
        }}
      />
    </div>
  );
}
