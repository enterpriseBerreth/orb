import test from 'node:test';
import assert from 'node:assert/strict';
import { NullPersistence } from '../src/analytics/persistence.js';
test('null persistence keeps local development storage optional', async () => {
  const store = new NullPersistence(); await store.initialize(); await store.upsertOpeningRange('2026-07-14', 'AAPL', 200);
  assert.equal(await store.getOpeningRange('2026-07-14', 'AAPL'), null);
});
