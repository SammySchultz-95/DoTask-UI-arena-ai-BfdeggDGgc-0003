'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock4,
  Download,
  LayoutDashboard,
  ListTodo,
  LogOut,
  MonitorSmartphone,
  ScrollText,
  ShieldCheck,
  Tags,
  Upload,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { ROLE_LABELS } from '@/lib/auth/roles';
import { ChangePasswordModal } from '@/features/auth/change-password-modal';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clients', label: 'Clients', icon: MonitorSmartphone },
  { href: '/pending-clients', label: 'Pending Clients', icon: Clock4 },
  { href: '/task-types', label: 'Task Types', icon: Tags },
  { href: '/client-tasks', label: 'Client Tasks', icon: ListTodo },
  { href: '/downloads', label: 'Downloads', icon: Download },
  { href: '/uploads', label: 'Uploads', icon: Upload },
  { href: '/admins', label: 'Admins', icon: ShieldCheck },
  { href: '/logs', label: 'Logs', icon: ScrollText },
];

const SIDEBAR_KEY = 'dotask.sidebar.collapsed';

export function Sidebar() {
  const pathname = usePathname();
  const { role, username, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(SIDEBAR_KEY) === '1');
    setHydrated(true);
  }, []);

  const toggle = () => {
    setCollapsed((value) => {
      window.localStorage.setItem(SIDEBAR_KEY, value ? '0' : '1');
      return !value;
    });
  };

  const width = !hydrated ? 'w-60' : collapsed ? 'w-[68px]' : 'w-60';

  return (
    <aside
      className={`relative flex h-screen shrink-0 flex-col border-r border-ink-600 bg-ink-900/90 transition-[width] duration-200 ${width}`}
    >
      {/* Wordmark + collapse toggle */}
      <div className="flex h-14 items-center justify-between border-b border-ink-600 px-3">
        <Link
          href="/dashboard"
          className={`flex items-center gap-2.5 overflow-hidden ${collapsed ? 'justify-center' : ''}`}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neon-gradient text-ink-950 shadow-glow-sm">
            <CheckCheck size={17} strokeWidth={2.6} />
          </span>
          {!collapsed && (
            <span className="text-[17px] font-bold tracking-tight text-fog">
              Do<span className="text-neon-400">Task</span>
            </span>
          )}
        </Link>
        <button
          onClick={toggle}
          className={`rounded-md p-1.5 text-fog-faint transition hover:bg-ink-700 hover:text-neon-300 ${collapsed ? 'absolute -right-3 top-4 z-20 border border-ink-500 bg-ink-800 shadow-panel' : ''}`}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2.5 py-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition ${
                collapsed ? 'justify-center px-0' : ''
              } ${
                active
                  ? 'bg-neon-500/10 text-neon-300 shadow-[inset_0_0_0_1px_rgba(0,245,139,0.25)]'
                  : 'text-fog-dim hover:bg-ink-750 hover:text-fog'
              }`}
            >
              <item.icon
                size={17}
                className={active ? 'text-neon-400 drop-shadow-[0_0_6px_rgba(0,245,139,0.6)]' : ''}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && active ? (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-neon-400 shadow-glow-sm" />
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-ink-600 p-2.5">
        <div
          className={`flex items-center gap-2.5 rounded-lg bg-ink-800 px-2.5 py-2 ${collapsed ? 'justify-center px-0' : ''}`}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-neon-500/40 bg-neon-500/10 text-[11px] font-bold uppercase text-neon-300">
            {(username ?? 'A').slice(0, 1)}
          </span>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-fog">{username ?? 'Admin'}</p>
              <p className="truncate text-[10px] uppercase tracking-wider text-fog-faint">
                {role ? ROLE_LABELS[role] : ''}
              </p>
            </div>
          )}
        </div>
        <div className={`mt-1.5 flex gap-1 ${collapsed ? 'flex-col' : ''}`}>
          <button
            onClick={() => setShowChangePassword(true)}
            title="Change password"
            className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-fog-dim transition hover:bg-ink-750 hover:text-fog ${collapsed ? 'justify-center px-0' : 'flex-1'}`}
          >
            <KeyRound size={13} />
            {!collapsed && 'Change password'}
          </button>
          <button
            onClick={() => void logout()}
            title="Sign out"
            className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-fog-dim transition hover:bg-red-500/10 hover:text-red-300 ${collapsed ? 'justify-center px-0' : 'flex-1'}`}
          >
            <LogOut size={13} />
            {!collapsed && 'Sign out'}
          </button>
        </div>
      </div>

      <ChangePasswordModal
        open={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </aside>
  );
}
