import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanHttpUrl } from '../src/url.js';

test('removes fragments and common tracking parameters', () => {
  assert.equal(
    cleanHttpUrl('https://example.com/path?keep=1&utm_source=news&fbclid=abc#section'),
    'https://example.com/path?keep=1',
  );
});

test('keeps ordinary query parameters and normalizes whitespace', () => {
  assert.equal(cleanHttpUrl(' https://example.com?a=1&b=2 '), 'https://example.com/?a=1&b=2');
});

test('rejects malformed and non-http URLs', () => {
  assert.equal(cleanHttpUrl('not a url'), null);
  assert.equal(cleanHttpUrl('javascript:alert(1)'), null);
  assert.equal(cleanHttpUrl('ftp://example.com/file'), null);
});
