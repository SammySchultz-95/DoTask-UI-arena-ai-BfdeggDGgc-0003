'use client';

/**
 * Settings pop-up opened from the sidebar account menu.
 *
 * Left sidebar: "General" (color theme) and "Profile". The Profile tab is
 * exactly the previous profile box — left: the logged-in admin's own info
 * (admins query, session fallback); right: change password.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Palette, UserRound } from 'lucide-react';
import { adminsApi } from '@/lib/api-client/endpoints';
import { useAuth } from '@/lib/auth/auth-context';
import { ROLE_LABELS } from '@/lib/auth/roles';
import { formatDateTime } from '@/lib/format';
import { Modal } from '@/components/ui/modal';
import { StatusBadge, NeutralBadge } from '@/components/ui/badge';
import { ThemeSwitcher } from '@/components/ui/theme-switcher';
import { ChangePasswordForm } from './change-password-modal';

type Tab = 'general' | 'profile';

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('general');

  return (
    <Modal open={open} title="Settings" onClose={onClose} wide>
      <div className="grid gap-4 sm:grid-cols-[150px_minmax(0,1fr)]">
        {/* Sidebar */}
        <nav className="flex gap-1.5 sm:flex-col">
          <SideTab
            label="General"
            icon={<Palette size={14} />}
            active={tab === 'general'}
            onClick={() => setTab('general')}
          />
          <SideTab
            label="Profile"
            icon={<UserRound size={14} />}
            active={tab === 'profile'}
            onClick={() => setTab('profile')}
          />
        </nav>

        {tab === 'general' ? <GeneralPanel /> : <ProfilePanel onClose={onClose} />}
      </div>
    </Modal>
  );
}

function SideTab({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs font-medium transition ${
        active
          ? 'bg-neon-500/10 text-neon-300'
          : 'text-fog-dim hover:bg-ink-750 hover:text-fog'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function GeneralPanel() {
  return (
    <div className="rounded-lg border border-ink-600 bg-ink-850/70 p-4">
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-neon-300">
        Color theme
      </h3>
      <p className="mb-4 text-xs leading-relaxed text-fog-dim">
        Choose the look of the whole panel. Your choice is saved on this device and applied
        instantly.
      </p>
      <ThemeSwitcher />
    </div>
  );
}

function ProfilePanel({ onClose }: { onClose: () => void }) {
  const { username, role } = useAuth();

  // Look up my own admin record; the query respects the role visibility rules.
  const me = useQuery({
    queryKey: ['admins', 'me', username],
    queryFn: async () => {
      const page = await adminsApi.query({ username: username ?? '', pageSize: 1 });
      return page.items?.[0] ?? null;
    },
    enabled: Boolean(username),
    staleTime: 30_000,
  });

  const record = me.data ?? null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Left box — my own admin info */}
      <div className="rounded-lg border border-ink-600 bg-ink-850/70 p-4">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-neon-500/40 bg-neon-500/10 text-neon-300">
            <UserRound size={16} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-fog">{username ?? 'Admin'}</p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-fog-faint">
              {role ? ROLE_LABELS[role] : ''}
            </p>
          </div>
        </div>

        {me.isLoading ? (
          <p className="py-6 text-center text-xs text-fog-faint">Loading account info…</p>
        ) : (
          <dl className="space-y-2.5 text-xs">
            <InfoRow
              label="Username"
              value={<span className="font-mono">{record?.username ?? username ?? '—'}</span>}
            />
            <InfoRow
              label="Role"
              value={
                <span className="font-mono text-neon-300">{record?.role ?? role ?? '—'}</span>
              }
            />
            <InfoRow
              label="Status"
              value={
                record ? (
                  <StatusBadge value={record.is_active ? 'active' : 'disabled'} />
                ) : (
                  <NeutralBadge>hidden by role rules</NeutralBadge>
                )
              }
            />
            <InfoRow
              label="Must change password"
              value={
                record ? (
                  record.must_change_password ? (
                    <NeutralBadge>yes</NeutralBadge>
                  ) : (
                    <span className="text-fog-dim">no</span>
                  )
                ) : (
                  <span className="text-fog-dim">—</span>
                )
              }
            />
            <InfoRow label="Created" value={record ? formatDateTime(record.creation_time) : '—'} />
          </dl>
        )}
      </div>

      {/* Right box — change password */}
      <div className="rounded-lg border border-ink-600 bg-ink-850/70 p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-neon-300">
          Change password
        </h3>
        <ChangePasswordForm onDone={onClose} />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-fog-faint">
        {label}
      </dt>
      <dd className="min-w-0 break-all text-right">{value}</dd>
    </div>
  );
}
