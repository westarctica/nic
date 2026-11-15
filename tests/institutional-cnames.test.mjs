import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRegistry } from '../scripts/registry.mjs';
import { planAliases, classifyAlias } from '../scripts/publish-institutional-cnames.mjs';

const registry = loadRegistry();
const [desired] = planAliases({ collegeofarms: 'ellsworth' }, registry);

test('institutional alias can be created and rerun without changing existing DNS', () => {
  assert.equal(desired.content, 'ellsworth.westarctica.net');
  assert.equal(classifyAlias([], desired), 'create');
  assert.equal(classifyAlias([{ ...desired, content: 'ELLSWORTH.WESTARCTICA.NET.' }], desired), 'matched');
});

test('alias publisher refuses replacements, multiple records, and incomplete inventories', () => {
  for (const records of [null, [{ ...desired, type: 'AAAA', content: '100::' }],
    [{ ...desired, content: 'other.example.org' }], [{ ...desired, proxied: false }], [desired, desired]]) {
    assert.throws(() => classifyAlias(records, desired));
  }
});

test('ordinary names, assigned institutions, and external targets cannot enter alias publisher', () => {
  for (const aliases of [{ smith: 'ellsworth' }, { ellsworth: 'ellsworth' },
    { collegeofarms: 'example.org' }, { collegeofarms: 'nic' }, {}, null]) {
    assert.throws(() => planAliases(aliases, registry));
  }
});
