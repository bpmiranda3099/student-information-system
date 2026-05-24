import { type NextRequest, NextResponse } from 'next/server';

const API_TARGET = (process.env.API_PROXY_TARGET ?? 'http://localhost:4000').replace(/\/$/, '');
const ACCESS_TOKEN_COOKIE = 'sis_access_token';
const AUTH_TOKEN_PATHS = new Set(['auth/login', 'auth/register', 'auth/refresh']);

export const dynamic = 'force-dynamic';

type CookieOptions = NonNullable<Parameters<NextResponse['cookies']['set']>[2]>;

function applySetCookie(response: NextResponse, header: string): void {
  const parts = header.split(';').map((part) => part.trim());
  const nameValue = parts[0];
  if (!nameValue) return;

  const eqIdx = nameValue.indexOf('=');
  if (eqIdx === -1) return;

  const name = nameValue.slice(0, eqIdx);
  const value = nameValue.slice(eqIdx + 1);
  const options: CookieOptions = { path: '/' };

  for (const attr of parts.slice(1)) {
    const lower = attr.toLowerCase();
    if (lower === 'httponly') {
      options.httpOnly = true;
    } else if (lower === 'secure') {
      options.secure = true;
    } else if (lower.startsWith('path=')) {
      options.path = attr.slice(5);
    } else if (lower.startsWith('max-age=')) {
      options.maxAge = Number.parseInt(attr.slice(8), 10);
    } else if (lower.startsWith('samesite=')) {
      const sameSite = attr.slice(9).toLowerCase();
      if (sameSite === 'lax' || sameSite === 'strict' || sameSite === 'none') {
        options.sameSite = sameSite;
      }
    } else if (lower.startsWith('expires=')) {
      options.expires = new Date(attr.slice(8));
    }
  }

  response.cookies.set(name, value, options);
}

function readAccessTokenFromCookies(setCookies: string[]): string | null {
  for (const raw of setCookies) {
    if (!raw.startsWith(`${ACCESS_TOKEN_COOKIE}=`)) continue;
    const value = raw.slice(ACCESS_TOKEN_COOKIE.length + 1).split(';')[0];
    return value || null;
  }
  return null;
}

function injectAccessToken(
  pathKey: string,
  upstream: Response,
  body: ArrayBuffer,
): ArrayBuffer {
  if (!AUTH_TOKEN_PATHS.has(pathKey) || upstream.status < 200 || upstream.status >= 300) {
    return body;
  }

  const accessToken = readAccessTokenFromCookies(upstream.headers.getSetCookie());
  if (!accessToken) return body;

  try {
    const json = JSON.parse(new TextDecoder().decode(body)) as Record<string, unknown>;
    if (typeof json.accessToken === 'string') return body;
    json.accessToken = accessToken;
    const bytes = new TextEncoder().encode(JSON.stringify(json));
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  } catch {
    return body;
  }
}

const HOP_BY_HOP_HEADERS = new Set([
  'transfer-encoding',
  'connection',
  'content-encoding',
  'content-length',
  'keep-alive',
]);

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<NextResponse> {
  const { path } = await context.params;
  const targetUrl = `${API_TARGET}/${path.join('/')}${request.nextUrl.search}`;

  const headers = new Headers();
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  const authorization = request.headers.get('authorization');
  if (authorization) headers.set('authorization', authorization);
  const cookie = request.headers.get('cookie');
  if (cookie) headers.set('cookie', cookie);

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: 'no-store',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, init);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: 'API unavailable', details: message },
      { status: 502 },
    );
  }

  const pathKey = path.join('/');
  const upstreamBody = await upstream.arrayBuffer();
  const body = injectAccessToken(pathKey, upstream, upstreamBody);
  const responseHeaders = new Headers();

  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower !== 'set-cookie' && !HOP_BY_HOP_HEADERS.has(lower)) {
      responseHeaders.set(key, value);
    }
  });

  const response = new NextResponse(body, {
    status: upstream.status,
    headers: responseHeaders,
  });

  for (const setCookie of upstream.headers.getSetCookie()) {
    applySetCookie(response, setCookie);
  }

  return response;
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
