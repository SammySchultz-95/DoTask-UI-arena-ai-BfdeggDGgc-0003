import type { AdminRole } from './storage';

/** readonlyadmin: no write/delete/expire/confirm/reject actions anywhere. */
export function isReadonly(role: AdminRole | null | undefined): boolean {
  return role === 'readonlyadmin';
}

/** superadmin + normaladmin may perform ordinary write actions. */
export function canWrite(role: AdminRole | null | undefined): boolean {
  return role === 'superadmin' || role === 'normaladmin';
}

/** Admins and Task Types create/edit/delete are superadmin-only. */
export function canManage(role: AdminRole | null | undefined): boolean {
  return role === 'superadmin';
}

export const ROLE_LABELS: Record<AdminRole, string> = {
  superadmin: 'Super admin',
  normaladmin: 'Admin',
  readonlyadmin: 'Read-only',
};

export const ROLE_OPTIONS: { value: AdminRole; label: string }[] = [
  { value: 'superadmin', label: 'superadmin' },
  { value: 'normaladmin', label: 'normaladmin' },
  { value: 'readonlyadmin', label: 'readonlyadmin' },
];
