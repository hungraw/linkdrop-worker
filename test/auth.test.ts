import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';

test('requires the configured bearer token', async () => {
  const env = { LINKDROP_SECRET: 'private-secret' } as never;

  const accepted = await worker.fetch(
    new Request('https://linkdrop.test/unknown', {
      headers: { authorization: 'Bearer private-secret' },
    }),
    env,
  );
  assert.equal(accepted.status, 404);

  const rejected = await worker.fetch(
    new Request('https://linkdrop.test/unknown', {
      headers: { authorization: 'Bearer private-secreu' },
    }),
    env,
  );
  assert.equal(rejected.status, 401);
});
