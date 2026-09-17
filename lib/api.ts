import type { paths } from './api-types';

/** Typed transport for the DoTask OpenAPI contract. JWT auth is kept in localStorage
 * for this internal panel; move it to an httpOnly cookie when the API supports it. */
export async function apiFetch<Path extends keyof paths, Method extends keyof paths[Path]>(
  path: Path, method: Method, init: RequestInit = {}
): Promise<unknown> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('dotask_token') : null;
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`/api/v1${String(path)}`, { ...init, method: String(method).toUpperCase(), headers });
  if (response.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('dotask_token'); localStorage.removeItem('dotask_role'); window.location.href = '/login';
  }
  if (!response.ok) throw new Error(await response.text());
  return response.status === 204 ? undefined : response.json();
}
