/**
 * Proxy HTTPS → HTTP(S) para listas HLS (.m3u8 y .ts) sin mixed content en el navegador.
 * URL: GET /functions/hlsHttpProxy?url=<encodeURIComponent(upstream)>
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Range, Content-Type, Accept, Origin',
  'Access-Control-Max-Age': '86400',
} as const;

Deno.serve(async (req) => {
  const h = new Headers(corsHeaders);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: h });
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405, headers: h });
  }

  const url = new URL(req.url);
  const raw = url.searchParams.get('url') ?? url.searchParams.get('u');
  if (!raw) {
    return new Response('Missing query: url=', { status: 400, headers: h });
  }

  let target: string;
  try {
    target = decodeURIComponent(raw);
  } catch {
    target = raw;
  }

  let upstreamUrl: URL;
  try {
    upstreamUrl = new URL(target);
  } catch {
    return new Response('Invalid url', { status: 400, headers: h });
  }

  if (upstreamUrl.protocol !== 'http:' && upstreamUrl.protocol !== 'https:') {
    return new Response('Only http(s) URLs', { status: 400, headers: h });
  }

  const range = req.headers.get('Range') ?? undefined;
  const upstream = await fetch(target, {
    method: req.method,
    headers: {
      ...(range ? { Range: range } : {}),
    },
    redirect: 'follow',
  });

  const out = new Headers(upstream.headers);
  for (const [k, v] of Object.entries(corsHeaders)) {
    out.set(k, v);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: out,
  });
});
