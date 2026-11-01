import { createLink, deleteLink, listLinks } from './links.js';
import { cleanHttpUrl } from './url.js';
import { publish, subscribe, LinkEventsObject } from './events.js';

export { LinkEventsObject };

type Env = {
  DB: D1Database;
  LINK_EVENTS: DurableObjectNamespace;
  LINKDROP_SECRET: string;
};

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

function jsonError(message: string, status: number): Response {
  return json({ error: message }, status);
}

async function matchesBearerToken(header: string | null, secret: string): Promise<boolean> {
  if (!header?.startsWith('Bearer ')) return false;

  const encoder = new TextEncoder();
  const [received, expected] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(header.slice(7))),
    crypto.subtle.digest('SHA-256', encoder.encode(secret)),
  ]);
  const receivedBytes = new Uint8Array(received);
  const expectedBytes = new Uint8Array(expected);
  let difference = 0;
  for (let index = 0; index < expectedBytes.length; index++) {
    difference |= receivedBytes[index]! ^ expectedBytes[index]!;
  }
  return difference === 0;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (!(await matchesBearerToken(request.headers.get('authorization'), env.LINKDROP_SECRET))) {
      return jsonError('Unauthorized', 401);
    }

    const requestUrl = new URL(request.url);
    if (request.method === 'POST' && requestUrl.pathname === '/links') {
      let body: unknown;
      try {
        body = await request.json();
      } catch (cause) {
        if (!(cause instanceof SyntaxError)) throw cause;
        return jsonError('Invalid JSON body', 400);
      }
      const rawUrl = (body as { url?: unknown } | null)?.url;
      if (typeof rawUrl !== 'string' || rawUrl.length > 2048) return jsonError('A valid HTTP(S) URL is required', 400);
      const cleanUrl = cleanHttpUrl(rawUrl);
      if (!cleanUrl) return jsonError('A valid HTTP(S) URL is required', 400);

      const result = await createLink(env.DB, cleanUrl);
      if (result.created) await publish(env, result.link);
      return json({ link: result.link }, result.created ? 201 : 200);
    }

    if (request.method === 'GET' && requestUrl.pathname === '/links') {
      return json({ links: await listLinks(env.DB) });
    }

    if (request.method === 'DELETE' && /^\/links\/[^/]+$/.test(requestUrl.pathname)) {
      let linkId: string;
      try {
        linkId = decodeURIComponent(requestUrl.pathname.slice('/links/'.length));
      } catch (cause) {
        if (!(cause instanceof URIError)) throw cause;
        return jsonError('Invalid link ID', 400);
      }
      return await deleteLink(env.DB, linkId) ? new Response(null, { status: 204 }) : jsonError('Link not found', 404);
    }

    if (request.method === 'GET' && requestUrl.pathname === '/events') return subscribe(env, request);
    return jsonError('Not found', 404);
  },
};
