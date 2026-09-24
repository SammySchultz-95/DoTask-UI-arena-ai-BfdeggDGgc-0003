'use client';

import { useEffect, useRef, useState } from 'react';
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
  ServerCog,
  Settings2,
  ShieldCheck,
  Tags,
  Upload,
} from 'lucide-react';
import { adminsApi, dashboardApi } from '@/lib/api-client/endpoints';
import { useAuth } from '@/lib/auth/auth-context';
import { isReadonly, ROLE_LABELS } from '@/lib/auth/roles';
import { useLiveQuery } from '@/lib/hooks/use-live-query';
import { SettingsModal } from '@/features/auth/settings-modal';

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  /** Roles that can see the item; default: everyone. */
  hiddenForReadonly?: boolean;
  badge?: number;
  badgeTitle?: string;
}

const SIDEBAR_KEY = 'dotask.sidebar.collapsed';
const SIDEBAR_WIDTH_KEY = 'dotask.sidebar.width';
const SIDEBAR_MIN_WIDTH = 200;
const SIDEBAR_MAX_WIDTH = 420;
const SIDEBAR_DEFAULT_WIDTH = 240;

export function Sidebar() {
  const pathname = usePathname();
  const { role, username, logout } = useAuth();
  const readonly = isReadonly(role);
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [width, setWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const [showSettings, setShowSettings] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(SIDEBAR_KEY) === '1');
    const stored = Number(window.localStorage.getItem(SIDEBAR_WIDTH_KEY));
    if (Number.isFinite(stored) && stored >= SIDEBAR_MIN_WIDTH && stored <= SIDEBAR_MAX_WIDTH) {
      setWidth(stored);
    }
    setHydrated(true);
  }, []);

  // Close the user menu on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  /* ------------------------ live counts for nav badges ------------------------ */
  // Shared with the Dashboard page query cache (same key) — one poll for both.
  const summary = useLiveQuery({
    queryKey: ['dashboard-summary'],
    queryFn: dashboardApi.summary,
  });
  const onlineClients = summary.data?.online_clients ?? 0;
  const pendingClients = summary.data?.pending_clients ?? 0;

  // "Online" admins = active admins visible to the current role (API-enforced).
  const activeAdmins = useLiveQuery({
    queryKey: ['admins', 'active-count'],
    queryFn: () => adminsApi.query({ is_active: true, pageSize: 1 }),
    enabled: !readonly,
  });
  const onlineAdmins = activeAdmins.data?.totalCount ?? 0;

  const toggle = () => {
    setCollapsed((value) => {
      window.localStorage.setItem(SIDEBAR_KEY, value ? '0' : '1');
      return !value;
    });
  };

  // Drag the right edge to resize the sidebar (persisted).
  const startResize = (event: React.PointerEvent) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = width;
    const onMove = (ev: PointerEvent) => {
      const next = Math.min(
        SIDEBAR_MAX_WIDTH,
        Math.max(SIDEBAR_MIN_WIDTH, startWidth + (ev.clientX - startX)),
      );
      setWidth(next);
    };
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      const next = Math.min(
        SIDEBAR_MAX_WIDTH,
        Math.max(SIDEBAR_MIN_WIDTH, startWidth + (ev.clientX - startX)),
      );
      window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(next));
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const items: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
      href: '/clients',
      label: 'Clients',
      icon: MonitorSmartphone,
      badge: onlineClients,
      badgeTitle: `${onlineClients} online client(s)`,
    },
    {
      href: '/pending-clients',
      label: 'Pending Clients',
      icon: Clock4,
      badge: pendingClients,
      badgeTitle: `${pendingClients} pending client(s)`,
    },
    { href: '/task-types', label: 'Task Types', icon: Tags },
    { href: '/client-tasks', label: 'Client Tasks', icon: ListTodo },
    { href: '/downloads', label: 'Downloads', icon: Download },
    { href: '/uploads', label: 'Uploads', icon: Upload },
    {
      href: '/admins',
      label: 'Admins',
      icon: ShieldCheck,
      hiddenForReadonly: true,
      badge: readonly ? undefined : onlineAdmins,
      badgeTitle: `${onlineAdmins} active/online admin(s)`,
    },
    { href: '/server-config', label: 'Server Config', icon: Settings2 },
    { href: '/logs', label: 'Logs', icon: ScrollText },
  ];

  return (
    <aside
      className="relative flex h-screen shrink-0 flex-col border-r border-ink-600 bg-ink-900/90"
      style={{ width: collapsed ? 68 : hydrated ? width : SIDEBAR_DEFAULT_WIDTH }}
    >
      {/* Resize handle (expanded mode only) */}
      {!collapsed ? (
        <div
          onPointerDown={startResize}
          role="separator"
          aria-orientation="vertical"
          title="Drag to resize"
          className="absolute -right-1 top-0 z-20 h-full w-2 cursor-col-resize"
        >
          <div className="mx-auto h-full w-px bg-transparent transition hover:bg-neon-500/50" />
        </div>
      ) : null}
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
        {items
          .filter((item) => !(item.hiddenForReadonly && readonly))
          .map((item) => {
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
                    ? 'bg-neon-500/10 text-neon-300 shadow-[inset_0_0_0_1px_rgb(var(--neon-500)/0.25)]'
                    : 'text-fog-dim hover:bg-ink-750 hover:text-fog'
                }`}
              >
                <item.icon
                  size={17}
                  className={active ? 'text-neon-400 drop-shadow-[0_0_6px_rgb(var(--neon-500)/0.6)]' : ''}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
                {!collapsed && item.badge !== undefined && item.badge > 0 ? (
                  <span
                    title={item.badgeTitle}
                    className={`ml-auto rounded-full px-1.5 py-0.5 font-mono text-[10px] leading-none tabular-nums ${
                      active
                        ? 'bg-neon-500/20 text-neon-200 shadow-glow-sm'
                        : 'bg-ink-600 text-fog-dim group-hover:text-fog'
                    }`}
                  >
                    {item.badge}
                  </span>
                ) : null}
                {!collapsed && active && !(item.badge && item.badge > 0) ? (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-neon-400 shadow-glow-sm" />
                ) : null}
                {collapsed && item.badge !== undefined && item.badge > 0 ? (
                  <span
                    title={item.badgeTitle}
                    className="absolute right-1.5 top-1 h-1.5 w-1.5 rounded-full bg-neon-400 shadow-glow-sm"
                  />
                ) : null}
              </Link>
            );
          })}
      </nav>

      {/* User footer — click for the drop-up menu */}
      <div className="relative border-t border-ink-600 p-2.5" ref={menuRef}>
        {menuOpen ? (
          <div className="absolute bottom-full left-2.5 right-2.5 z-30 mb-2 overflow-hidden rounded-lg border border-ink-500 bg-ink-800 shadow-panel">
            <button
              onClick={() => {
                setMenuOpen(false);
                setShowSettings(true);
              }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-xs font-medium text-fog transition hover:bg-neon-500/10 hover:text-neon-300"
            >
              <Settings2 size={14} />
              Setting
            </button>
            <button
              onClick={() => {
                setMenuOpen(false);
                void logout();
              }}
              className="flex w-full items-center gap-2.5 border-t border-ink-600 px-3.5 py-2.5 text-left text-xs font-medium text-fog transition hover:bg-red-500/10 hover:text-red-300"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>
        ) : null}

        <button
          onClick={() => setMenuOpen((value) => !value)}
          className={`flex w-full items-center gap-2.5 rounded-lg bg-ink-800 px-2.5 py-2 transition hover:bg-ink-750 ${collapsed ? 'justify-center px-0' : ''}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          title="Account menu"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-neon-500/40 bg-neon-500/10 text-[11px] font-bold uppercase text-neon-300">
            {(username ?? 'A').slice(0, 1)}
          </span>
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-xs font-medium text-fog">
                  {username ?? 'Admin'}
                </span>
                <span className="block truncate text-[10px] uppercase tracking-wider text-fog-faint">
                  {role ? ROLE_LABELS[role] : ''}
                </span>
              </span>
              <ServerCog size={13} className="shrink-0 text-fog-faint" />
            </>
          )}
        </button>
      </div>

      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
    </aside>
  );
}
