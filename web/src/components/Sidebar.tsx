import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CheckSquare, Calendar, Zap, Globe,
  Target, LogOut, Brain, PanelLeftClose, PanelLeftOpen,
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

const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };
  const initial = (user?.name || user?.email || 'U')[0].toUpperCase();

  return (
    <aside
      style={{ width: collapsed ? 60 : 232, transition: `width 0.22s ${EASE}` }}
      className="flex flex-col h-screen bg-[#111113] border-r border-white/[0.06] flex-shrink-0 overflow-hidden"
    >
      {/* ── Brand ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-3 h-[60px] border-b border-white/[0.06] flex-shrink-0">
        <div className="relative flex-shrink-0">
          <div className="w-8 h-8 rounded-xl gradient-accent flex items-center justify-center shadow-lg shadow-[#7C3AED]/25">
            <Brain size={15} className="text-white" />
          </div>
          <div className="absolute -top-[2px] -right-[2px] w-[9px] h-[9px] rounded-full bg-[#10B981] border-[2px] border-[#111113]" />
        </div>

        <div style={{
          opacity: collapsed ? 0 : 1,
          maxWidth: collapsed ? 0 : 200,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          transition: `opacity 0.16s, max-width 0.22s ${EASE}`,
        }}>
          <p className="text-[13px] font-bold text-[#F2F2F2] tracking-tight leading-none">
            AI Life Planner
          </p>
          <p className="text-[10px] text-[#52525B] mt-[2px]">Your intelligent companion</p>
        </div>

        <button
          onClick={() => setCollapsed(c => !c)}
          style={{ marginLeft: collapsed ? 0 : 'auto' }}
          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white/[0.05] text-[#52525B] hover:text-[#A1A1A8] transition-colors duration-150"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed
            ? <PanelLeftOpen size={15} />
            : <PanelLeftClose size={15} />
          }
        </button>
      </div>

      {/* ── Nav ───────────────────────────────────────────── */}
      <nav className="flex-1 py-2 overflow-y-auto overflow-x-hidden">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `relative flex items-center gap-3 mx-2 my-[1px] px-3 py-[9px] rounded-xl text-[13px] font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-[#7C3AED]/[0.10] text-[#F2F2F2]'
                  : 'text-[#88888E] hover:text-[#D4D4D8] hover:bg-white/[0.04]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {/* Left accent bar */}
                <span
                  className="absolute left-0 top-[6px] bottom-[6px] w-[2px] rounded-r-full bg-[#7C3AED]"
                  style={{
                    opacity: isActive ? 1 : 0,
                    transform: `scaleY(${isActive ? 1 : 0.4})`,
                    transition: 'opacity 0.15s, transform 0.15s',
                    transformOrigin: 'center',
                  }}
                />
                <Icon
                  size={16}
                  className={`flex-shrink-0 transition-colors duration-150 ${isActive ? 'text-[#7C3AED]' : ''}`}
                />
                <span style={{
                  opacity: collapsed ? 0 : 1,
                  maxWidth: collapsed ? 0 : 160,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  transition: `opacity 0.14s, max-width 0.22s ${EASE}`,
                }}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── User + Logout ─────────────────────────────────── */}
      <div className="border-t border-white/[0.06] p-2 flex-shrink-0">
        <div style={{
          opacity: collapsed ? 0 : 1,
          maxHeight: collapsed ? 0 : 56,
          overflow: 'hidden',
          transition: `opacity 0.15s, max-height 0.22s ${EASE}`,
        }}>
          <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
            <div className="w-7 h-7 rounded-full gradient-accent flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 shadow-md shadow-[#7C3AED]/20">
              {initial}
            </div>
            <div className="overflow-hidden min-w-0">
              <p className="text-[12px] font-semibold text-[#D4D4D8] truncate leading-tight">
                {user?.name || user?.email?.split('@')[0]}
              </p>
              <p className="text-[10px] text-[#52525B] truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          title={collapsed ? 'Logout' : undefined}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-[13px] text-[#88888E] hover:text-[#EF4444] hover:bg-[#EF4444]/[0.08] transition-all duration-150"
        >
          <LogOut size={15} className="flex-shrink-0" />
          <span style={{
            opacity: collapsed ? 0 : 1,
            maxWidth: collapsed ? 0 : 120,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            transition: `opacity 0.14s, max-width 0.22s ${EASE}`,
          }}>
            Logout
          </span>
        </button>
      </div>
    </aside>
  );
}
