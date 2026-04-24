import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CheckSquare, Calendar, Zap, Globe,
  Target, LogOut, Brain, Menu, X,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/schedule', icon: Calendar, label: 'Schedule' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/events', icon: Zap, label: 'Events' },
  { to: '/goals', icon: Target, label: 'Goals' },
  { to: '/insights', icon: Brain, label: 'AI Insights' },
  { to: '/resources', icon: Globe, label: 'Web Resources' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside
      style={{ width: collapsed ? 64 : 220, transition: 'width 0.2s' }}
      className="flex flex-col h-screen bg-[#18181B] border-r border-white/8 flex-shrink-0"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-white/8">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="p-1.5 rounded-lg hover:bg-white/5 text-[#71717A] hover:text-[#F4F4F5] transition-colors flex-shrink-0"
        >
          {collapsed ? <Menu size={18} /> : <X size={18} />}
        </button>
        {!collapsed && (
          <span className="font-bold text-sm text-[#F4F4F5] truncate tracking-tight">
            AI Life Planner
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 mx-2 my-0.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#7C3AED]/15 text-[#7C3AED]'
                  : 'text-[#71717A] hover:text-[#F4F4F5] hover:bg-white/5'
              }`
            }
          >
            <Icon size={17} className="flex-shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="border-t border-white/8 p-3">
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
            <div className="w-7 h-7 rounded-full gradient-accent flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {(user?.name || user?.email || 'U')[0].toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-medium text-[#F4F4F5] truncate">
                {user?.name || user?.email}
              </p>
              <p className="text-[10px] text-[#71717A] truncate">{user?.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-2 py-2 rounded-lg text-sm text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
        >
          <LogOut size={16} className="flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
