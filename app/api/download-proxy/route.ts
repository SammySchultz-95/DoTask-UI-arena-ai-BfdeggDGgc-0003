import { NextRequest } from 'next/server';

/**
 * Same-origin binary-download proxy.
 *
 * Why this exists: browsers hide `Content-Disposition` from page
 * JavaScript on **cross-origin** responses (it is not a CORS-safelisted
 * header). When the panel talks to the API cross-origin
 * (`NEXT_PUBLIC_API_URL`), the page can read the backup bytes but not the
 * file name the server chose. Routing the download through this
 * same-origin route solves that: the server side fetches the API (no CORS
 * there), streams the bytes back with the original `Content-Disposition`
 * and `Content-Type`, and the browser saves the file under the exact name
 * the API sent — in same-origin and cross-origin deployments alike.
 *
 * Auth: the browser sends the normal `Authorization: Bearer <token>`
 * header; the token never appears in a URL.
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Only these API paths may be proxied (keeps it from becoming an open proxy). */
const ALLOWED_PREFIXES = [
  '/api/v1/admin/backup/',
  '/api/v1/admin/logs/backup',
  '/api/v1/admin/files/uploadable/',
  '/api/v1/admin/files/downloadable/',
];

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get('target');
  if (!target || !target.startsWith('/api/v1/')) {
    return Response.json(
      { error: { code: 'BAD_REQUEST', message: 'Missing or invalid target.' } },
      { status: 400 },
    );
  }
  if (!ALLOWED_PREFIXES.some((p) => target.startsWith(p))) {
    return Response.json(
      { error: { code: 'FORBIDDEN', message: 'This path cannot be proxied.' } },
      { status: 403 },
    );
  }

  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';

  // Pick the upstream origin, server-side (no CORS applies there):
  //  - cross-origin panel (NEXT_PUBLIC_API_URL set) → that API origin;
  //  - proxy panel (API_PROXY_TARGET set) → the backend directly;
  //  - otherwise → our own origin (lets /api/v1 rewrites handle it).
  const publicBase = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
  const proxyBase = (process.env.API_PROXY_TARGET ?? '').replace(/\/+$/, '');
  const upstreamUrl = publicBase
    ? `${publicBase}${target}`
    : proxyBase
      ? `${proxyBase}${target}`
      : new URL(target, req.url).toString();

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: 'no-store',
      redirect: 'follow',
    });
  } catch {
    return Response.json(
      { error: { code: 'UPSTREAM_ERROR', message: 'Could not reach the DoTask API.' } },
      { status: 502 },
    );
  }

  const headers = new Headers();
  const contentDisposition = upstream.headers.get('content-disposition');
  const contentType = upstream.headers.get('content-type');
  if (contentDisposition) headers.set('content-disposition', contentDisposition);
  if (contentType) headers.set('content-type', contentType);
  headers.set('cache-control', 'no-store');

  // Stream the body straight through — no in-memory buffering of big backups.
  return new Response(upstream.body, { status: upstream.status, headers });
}
