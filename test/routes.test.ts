import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';

type Row = { id: string; url: string; created_at: string };

class MemoryDb {
  rows: Row[] = [];

  prepare(sql: string) {
    return {
      all: async <T>() => ({ results: this.rows.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)) as T[] }),
      bind: (...values: string[]) => ({
        first: async <T>() => {
          if (sql.includes('WHERE id = ?')) return (this.rows.find((row) => row.id === values[0]) ?? null) as T | null;
          const row = this.rows.filter((item) => item.url === values[0] && item.created_at >= values[1]!)
            .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
          return (row ?? null) as T | null;
        },
        run: async () => {
          if (sql.startsWith('INSERT')) {
            if (this.rows.some((row) => row.url === values[3] && row.created_at >= values[4]!)) {
              return { meta: { changes: 0 } };
            }
            this.rows.push({ id: values[0]!, url: values[1]!, created_at: values[2]! });
            return { meta: { changes: 1 } };
          }
          const before = this.rows.length;
          this.rows = this.rows.filter((row) => row.id !== values[0]);
          return { meta: { changes: before - this.rows.length } };
        },
      }),
    };
  }
}

test('routes create, deduplicate, list, delete, and reject a bad body', async () => {
  const db = new MemoryDb();
  let published = 0;
  const env = {
    DB: db,
    LINKDROP_SECRET: 'private-secret',
    LINK_EVENTS: {
      idFromName: () => 'inbox',
      get: () => ({
        fetch: async () => {
          published++;
          return new Response(null, { status: 204 });
        },
      }),
    },
  } as never;
  const request = (method: string, path: string, body?: string) => worker.fetch(
    new Request(`https://linkdrop.test${path}`, {
      method,
      headers: { authorization: 'Bearer private-secret', ...(body ? { 'content-type': 'application/json' } : {}) },
      body,
    }),
    env,
  );

  const created = await request('POST', '/links', JSON.stringify({ url: 'https://example.com/path' }));
  assert.equal(created.status, 201);
  const first = await created.json() as { link: { id: string; url: string } };
  assert.equal(first.link.url, 'https://example.com/path');

  const duplicate = await request('POST', '/links', JSON.stringify({ url: 'https://example.com/path' }));
  assert.equal(duplicate.status, 200);
  assert.deepEqual(await duplicate.json(), { link: { ...first.link, createdAt: db.rows[0]!.created_at } });
  assert.equal(published, 1);

  const listed = await request('GET', '/links');
  assert.equal(listed.status, 200);
  assert.equal((await listed.json() as { links: unknown[] }).links.length, 1);

  assert.equal((await request('DELETE', `/links/${first.link.id}`)).status, 204);
  assert.equal((await request('DELETE', `/links/${first.link.id}`)).status, 404);
  assert.equal((await request('POST', '/links', '{')).status, 400);
});
