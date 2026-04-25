import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CheckSquare, Zap, Globe,
  Target, LogOut, Brain, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/events', icon: Zap, label: 'Events' },
  { to: '/goals', icon: Target, label: 'Goals' },
  { to: '/insights', icon: Brain, label: 'AI Insights' },
  { to: '/resources', icon: Globe, label: 'Resources' },
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
      style={{
        width: collapsed ? 58 : 228,
        transition: `width 0.22s ${EASE}`,
        background: '#091508',
        borderRight: '1px solid rgba(212,160,23,0.10)',
      }}
      className="flex flex-col h-screen flex-shrink-0 overflow-hidden"
    >
      {/* ── Brand ─────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-3 h-[60px] flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(212,160,23,0.08)' }}
      >
        <div className="relative flex-shrink-0">
          <div
            className="w-8 h-8 rounded-xl gradient-accent flex items-center justify-center animate-gold-glow"
          >
            <Brain size={15} className="text-[#0a1a0f]" />
          </div>
          <div className="absolute -top-[2px] -right-[2px] w-[9px] h-[9px] rounded-full bg-[#4ade80] border-[2px] border-[#091508]" />
        </div>

        <div style={{
          opacity: collapsed ? 0 : 1,
          maxWidth: collapsed ? 0 : 200,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          transition: `opacity 0.16s, max-width 0.22s ${EASE}`,
        }}>
          <p className="text-[11px] font-bold text-[#d4a017] tracking-[0.12em] uppercase leading-none">
            AI Life Planner
          </p>
          <p className="text-[9px] text-[#4a5e4e] mt-[3px] tracking-widest uppercase">Your sanctuary</p>
        </div>

        <button
          onClick={() => setCollapsed(c => !c)}
          style={{ marginLeft: collapsed ? 0 : 'auto' }}
          className="flex-shrink-0 p-1.5 rounded-lg text-[#4a5e4e] hover:text-[#d4a017] transition-colors duration-150"
          style2={{ background: 'transparent' }}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed
            ? <PanelLeftOpen size={14} />
            : <PanelLeftClose size={14} />
          }
        </button>
      </div>

      {/* ── Nav ───────────────────────────────────────────── */}
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `relative flex items-center gap-3 mx-2 my-[2px] px-3 py-[9px] rounded-xl text-[12.5px] font-medium transition-all duration-150 ${
                isActive
                  ? 'text-[#d4a017]'
                  : 'text-[#4a5e4e] hover:text-[#8a9a8d]'
              }`
            }
            style={({ isActive }) => isActive
              ? { background: 'rgba(212,160,23,0.09)' }
              : {}
            }
          >
            {({ isActive }) => (
              <>
                {/* Left gold accent bar */}
                <span
                  className="absolute left-0 top-[7px] bottom-[7px] w-[2px] rounded-r-full"
                  style={{
                    background: '#d4a017',
                    opacity: isActive ? 1 : 0,
                    transform: `scaleY(${isActive ? 1 : 0.3})`,
                    transition: 'opacity 0.15s, transform 0.15s',
                    transformOrigin: 'center',
                  }}
                />
                <Icon
                  size={15}
                  className="flex-shrink-0 transition-colors duration-150"
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
      <div className="p-2 flex-shrink-0" style={{ borderTop: '1px solid rgba(212,160,23,0.08)' }}>
        <div style={{
          opacity: collapsed ? 0 : 1,
          maxHeight: collapsed ? 0 : 56,
          overflow: 'hidden',
          transition: `opacity 0.15s, max-height 0.22s ${EASE}`,
        }}>
          <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
            <div
              className="w-7 h-7 rounded-full gradient-accent flex items-center justify-center text-[11px] font-bold text-[#0a1a0f] flex-shrink-0"
              style={{ boxShadow: '0 2px 8px rgba(212,160,23,0.25)' }}
            >
              {initial}
            </div>
            <div className="overflow-hidden min-w-0">
              <p className="text-[11.5px] font-semibold text-[#c8d4c0] truncate leading-tight">
                {user?.name || user?.email?.split('@')[0]}
              </p>
              <p className="text-[10px] text-[#4a5e4e] truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          title={collapsed ? 'Logout' : undefined}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-[12.5px] text-[#4a5e4e] hover:text-[#f87171] transition-all duration-150"
          style={{ background: 'transparent' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.07)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <LogOut size={14} className="flex-shrink-0" />
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
