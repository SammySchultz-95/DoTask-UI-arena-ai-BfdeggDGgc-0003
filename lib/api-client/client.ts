/**
 * Thin typed fetch wrapper around the DoTask API v1.
 *
 * Every request/response type comes from `schema.ts`, generated from
 * swagger.json via openapi-typescript — no hand-written, untyped fetch calls
 * exist outside this module + `endpoints.ts`.
 *
 * All traffic goes to same-origin `/api/v1/*` by default. In development the
 * Next server proxies those paths to the real backend (see next.config.mjs),
 * so the browser never needs to know the backend origin and CORS never
 * applies. Set NEXT_PUBLIC_API_URL only when calling the API cross-origin.
 */
import { clearAuthSession, getSessionToken } from '@/lib/auth/storage';

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '');

export type QueryParams = Record<
  string,
  string | number | boolean | null | undefined
>;

export interface RequestOptions {
  /** Query-string parameters. `undefined`/`null`/'' values are omitted. */
  params?: QueryParams;
  /** JSON body (Content-Type: application/json). */
  body?: unknown;
  /** Multipart body — takes precedence over `body`. */
  formData?: FormData;
  /** Send the Authorization header (default true). */
  auth?: boolean;
}

function buildQueryString(params?: QueryParams): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Full request URL for an API path — honors NEXT_PUBLIC_API_URL (empty by
 * default, i.e. same-origin). Every request, including binary downloads,
 * must go through this so cross-origin deployments resolve consistently.
 */
export function buildApiUrl(path: string, params?: QueryParams): string {
  return `${API_BASE}${path}${buildQueryString(params)}`;
}

/**
 * Perform an API request. Resolves with the parsed JSON body, or `undefined`
 * for 204/no-content responses. Rejects with `ApiError` on non-2xx.
 *
 * On 401 (except the login call itself) the local session is cleared and the
 * browser is redirected to /login — the API has no refresh-token endpoint.
 */
export async function apiFetch<T>(
  method: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { params, body, formData, auth = true } = options;

  const headers: Record<string, string> = {};
  if (auth) {
    const token = getSessionToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let bodyInit: BodyInit | undefined;
  if (formData) {
    bodyInit = formData; // browser sets the multipart boundary
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    bodyInit = JSON.stringify(body);
  }

  const isLogin = path.endsWith('/auth/login');
  const url = buildApiUrl(path, params);

  let response: Response;
  try {
    response = await fetch(url, { method, headers, body: bodyInit });
  } catch {
    throw new ApiError(0, 'Cannot reach the DoTask API. Check that the server is running and reachable.');
  }

  if (response.status === 401 && auth && !isLogin) {
    // Token expired/revoked and there is no refresh flow — force re-login.
    clearAuthSession();
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    throw new ApiError(401, 'Session expired. Please sign in again.');
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}.`;
    let code: string | undefined;
    try {
      const payload = (await response.json()) as {
        error?: { code?: string; message?: string };
      };
      if (payload?.error?.message) message = payload.error.message;
      code = payload?.error?.code;
    } catch {
      /* non-JSON error body — keep generic message */
    }
    throw new ApiError(response.status, message, code);
  }

  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }
  return undefined as T;
}
