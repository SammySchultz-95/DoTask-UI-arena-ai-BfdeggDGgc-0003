/**
 * Session persistence for the admin panel.
 *
 * The JWT, role and must_change_password flag are stored in localStorage.
 * This is acceptable for an internal admin tool, but note the XSS trade-off:
 * any script running in this origin can read the token. The alternative
 * (httpOnly cookie) would require backend support the API does not provide.
 */
const TOKEN_KEY = 'dotask.token';
const ROLE_KEY = 'dotask.role';
const MUST_CHANGE_KEY = 'dotask.must_change_password';

export type AdminRole = 'superadmin' | 'normaladmin' | 'readonlyadmin';

export interface StoredSession {
  token: string;
  role: AdminRole;
  mustChangePassword: boolean;
}

const isBrowser = typeof window !== 'undefined';

export function getSessionToken(): string | null {
  if (!isBrowser) return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function loadSession(): StoredSession | null {
  if (!isBrowser) return null;
  const token = window.localStorage.getItem(TOKEN_KEY);
  const role = window.localStorage.getItem(ROLE_KEY) as AdminRole | null;
  if (!token || !role) return null;
  const mustChangePassword =
    window.localStorage.getItem(MUST_CHANGE_KEY) === '1';
  return { token, role, mustChangePassword };
}

export function saveSession(session: StoredSession): void {
  if (!isBrowser) return;
  window.localStorage.setItem(TOKEN_KEY, session.token);
  window.localStorage.setItem(ROLE_KEY, session.role);
  window.localStorage.setItem(
    MUST_CHANGE_KEY,
    session.mustChangePassword ? '1' : '0',
  );
}

export function markPasswordChanged(): void {
  if (!isBrowser) return;
  window.localStorage.setItem(MUST_CHANGE_KEY, '0');
}

export function clearAuthSession(): void {
  if (!isBrowser) return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(ROLE_KEY);
  window.localStorage.removeItem(MUST_CHANGE_KEY);
}
