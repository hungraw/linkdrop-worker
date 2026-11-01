import type { Link } from './links.js';

type Env = { LINK_EVENTS: DurableObjectNamespace };

function inboxEventsObject(env: Env): DurableObjectStub {
  return env.LINK_EVENTS.get(env.LINK_EVENTS.idFromName('inbox'));
}

export function subscribe(env: Env, request: Request): Promise<Response> {
  return inboxEventsObject(env).fetch(new Request('https://events.internal/subscribe', {
    method: 'GET',
    signal: request.signal,
  }));
}

export async function publish(env: Env, link: Link): Promise<void> {
  await inboxEventsObject(env).fetch('https://events.internal/publish', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(link),
  });
}

export class LinkEventsObject implements DurableObject {
  private subscribers = new Set<ReadableStreamDefaultController<Uint8Array>>();

  constructor(_state: DurableObjectState) {}

  async fetch(request: Request): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (request.method === 'GET' && path === '/subscribe') return this.openStream(request);
    if (request.method === 'POST' && path === '/publish') {
      const link = await request.json() as Link;
      this.broadcastToSubscribers(`event: link.created\ndata: ${JSON.stringify(link)}\n\n`);
      return new Response(null, { status: 204 });
    }
    return new Response('Not found', { status: 404 });
  }

  private openStream(request: Request): Response {
    const encoder = new TextEncoder();
    let controller: ReadableStreamDefaultController<Uint8Array>;
    const stream = new ReadableStream<Uint8Array>({
      start: (streamController) => {
        controller = streamController;
        this.subscribers.add(controller);
        controller.enqueue(encoder.encode('event: ready\ndata: {}\n\n'));
      },
      cancel: () => {
        this.subscribers.delete(controller);
      },
    });

    request.signal.addEventListener('abort', () => {
      this.subscribers.delete(controller);
      try {
        controller.close();
      } catch (cause) {
        if (!(cause instanceof TypeError)) throw cause;
      }
    }, { once: true });

    return new Response(stream, {
      headers: {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache, no-transform',
      },
    });
  }

  private broadcastToSubscribers(frame: string): void {
    const bytes = new TextEncoder().encode(frame);
    for (const controller of this.subscribers) {
      try {
        controller.enqueue(bytes);
      } catch (cause) {
        this.subscribers.delete(controller);
        if (!(cause instanceof TypeError)) throw cause;
      }
    }
  }
}
