import { type NextRequest, NextResponse } from 'next/server';

const API_TARGET = (process.env.API_PROXY_TARGET ?? 'http://localhost:4000').replace(/\/$/, '');

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
  const options: CookieOptions = {};

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

  const body = await upstream.arrayBuffer();
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

  // Must set each cookie individually — comma-joined Set-Cookie breaks browsers.
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
