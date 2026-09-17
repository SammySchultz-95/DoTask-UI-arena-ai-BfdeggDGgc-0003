'use client';

/**
 * React auth context backed by localStorage (see lib/auth/storage.ts for the
 * XSS trade-off note). The API returns the role at login — there is no /me
 * endpoint — so `role` is stored from the login response.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { authApi, type LoginResponse } from '@/lib/api-client/endpoints';
import {
  clearAuthSession,
  loadSession,
  markPasswordChanged,
  saveSession,
  type AdminRole,
} from './storage';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

export interface AuthContextValue {
  status: AuthStatus;
  role: AdminRole | null;
  mustChangePassword: boolean;
  /** Current admin username — not returned by the API; decoded from the JWT. */
  username: string | null;
  login: (username: string, password: string) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  passwordChanged: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Best-effort JWT payload decode (signature is never verified client-side). */
function usernameFromToken(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const claims = JSON.parse(json) as Record<string, unknown>;
    const name =
      claims['unique_name'] ??
      claims['sub'] ??
      claims['username'] ??
      claims['name'];
    return typeof name === 'string' ? name : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [role, setRole] = useState<AdminRole | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const session = loadSession();
    if (session) {
      setRole(session.role);
      setMustChangePassword(session.mustChangePassword);
      setUsername(usernameFromToken(session.token));
      setStatus('signedIn');
    } else {
      setStatus('signedOut');
    }
  }, []);

  const login = useCallback(async (user: string, password: string) => {
    const response = await authApi.login({ username: user, password });
    if (!response.token || !response.role) {
      throw new Error('Login response was missing token or role.');
    }
    const adminRole = response.role as AdminRole;
    saveSession({
      token: response.token,
      role: adminRole,
      mustChangePassword: Boolean(response.must_change_password),
    });
    setRole(adminRole);
    setMustChangePassword(Boolean(response.must_change_password));
    setUsername(usernameFromToken(response.token));
    setStatus('signedIn');
    return response;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* even if the server call fails, the local session must end */
    }
    clearAuthSession();
    setRole(null);
    setUsername(null);
    setMustChangePassword(false);
    setStatus('signedOut');
    router.push('/login');
  }, [router]);

  const passwordChanged = useCallback(() => {
    markPasswordChanged();
    setMustChangePassword(false);
  }, []);

  const value = useMemo(
    () => ({
      status,
      role,
      mustChangePassword,
      username,
      login,
      logout,
      passwordChanged,
    }),
    [status, role, mustChangePassword, username, login, logout, passwordChanged],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>.');
  return ctx;
}
