import { type NextRequest, NextResponse } from 'next/server';

const API_TARGET = (process.env.API_PROXY_TARGET ?? 'http://localhost:4000').replace(/\/$/, '');

export const dynamic = 'force-dynamic';

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

  // Forward each Set-Cookie separately so browsers store auth cookies correctly.
  for (const setCookie of upstream.headers.getSetCookie()) {
    response.headers.append('Set-Cookie', setCookie);
  }

  return response;
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
