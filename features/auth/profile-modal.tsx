'use client';

/**
 * Profile pop-up opened from the sidebar user menu.
 * Left box: the logged-in admin's own info (fetched from the admins query —
 * falls back to the session data when the API hides the row, e.g. for
 * readonly admins). Right box: change password.
 */
import { useQuery } from '@tanstack/react-query';
import { UserRound } from 'lucide-react';
import { adminsApi } from '@/lib/api-client/endpoints';
import { useAuth } from '@/lib/auth/auth-context';
import { ROLE_LABELS } from '@/lib/auth/roles';
import type { AdminRole } from '@/lib/auth/storage';
import { formatDateTime } from '@/lib/format';
import { Modal } from '@/components/ui/modal';
import { StatusBadge, NeutralBadge } from '@/components/ui/badge';
import { ChangePasswordForm } from './change-password-modal';

export function ProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { username, role } = useAuth();

  // Look up my own admin record; the query respects the role visibility rules.
  const me = useQuery({
    queryKey: ['admins', 'me', username],
    queryFn: async () => {
      const page = await adminsApi.query({ username: username ?? '', pageSize: 1 });
      return page.items?.[0] ?? null;
    },
    enabled: open && Boolean(username),
    staleTime: 30_000,
  });

  const record = me.data ?? null;

  return (
    <Modal open={open} title="Profile" onClose={onClose} wide>
      <div className="grid gap-4 sm:grid-cols-2">
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
              <InfoRow label="Username" value={<span className="font-mono">{record?.username ?? username ?? '—'}</span>} />
              <InfoRow
                label="Role"
                value={
                  <span className="font-mono text-neon-300">
                    {record?.role ?? role ?? '—'}
                  </span>
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
    </Modal>
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
