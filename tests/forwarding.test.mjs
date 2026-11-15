import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRegistry } from '../scripts/registry.mjs';
import { redirectsFromRegistry, classifyDns, matchesRedirectItem,
  redirectListName, verifyManagedListItem, isValidMigrationSpec } from '../scripts/forwarding-model.mjs';

const { entries, errors } = loadRegistry();
const plan = redirectsFromRegistry(entries);
const krigsvold = plan.find(x => x.name === 'krigsvold');

test('one first-class forwarding entry compiles to proxied DNS and Bulk Redirects', () => {
  assert.deepEqual(errors, []);
  assert.equal(plan.length, 1);
  assert.equal(redirectListName, 'wnic_forwarding');
  assert.equal(krigsvold.hostname, 'krigsvold.westarctica.net');
  assert.deepEqual(krigsvold.dns, {
    type: 'A', name: 'krigsvold.westarctica.net', content: '192.0.2.1',
    proxied: true, ttl: 1, comment: 'WNIC forwarding endpoint: krigsvold'
  });
  assert.deepEqual(krigsvold.bulk.redirect, {
    source_url: 'krigsvold.westarctica.net/',
    target_url: 'https://krigsvold.org/',
    status_code: 301, include_subdomains: false,
    subpath_matching: true, preserve_path_suffix: true, preserve_query_string: true
  });
});

test('compiler supports additional names without changing Krigsvold logic', () => {
  const more = new Map(entries);
  more.set('somebody', {
    owner: { username: 'other-user' },
    service: { type: 'redirect', target: 'https://example.org/home/', status: 302,
      preservePath: false, preserveQuery: false }
  });
  const output = redirectsFromRegistry(more);
  assert.equal(output.length, 2);
  assert.equal(output[1].hostname, 'somebody.westarctica.net');
  assert.equal(output[1].bulk.redirect.status_code, 302);
});

test('DNS conversion permits only exact reviewed legacy CNAME', () => {
  const current = [{ id:'123', name: 'krigsvold.westarctica.net', type: 'CNAME',
    content: 'krigsvold.org', proxied: false }];
  const legacy = { type: 'CNAME', content: 'krigsvold.org', proxied: false };
  assert.equal(classifyDns(current, krigsvold.dns, legacy), 'migrate');
  assert.equal(classifyDns([], krigsvold.dns, legacy), 'create');
  assert.equal(classifyDns([krigsvold.dns], krigsvold.dns, legacy), 'matched');
  assert.throws(() => classifyDns(current, krigsvold.dns), /Refusing/);
  assert.throws(() => classifyDns([{...current[0], content:'unknown.example'}], krigsvold.dns, legacy), /Refusing/);
  assert.throws(() => classifyDns([...current, ...current], krigsvold.dns, legacy), /Multiple/);
  assert.ok(isValidMigrationSpec(legacy));
  assert.ok(!isValidMigrationSpec({ type:'Worker', content:'nic', proxied:true }));
});

test('existing redirect items are compared with all significant flags', () => {
  assert.ok(matchesRedirectItem(krigsvold.bulk, krigsvold.bulk));
  assert.equal(matchesRedirectItem({
    redirect: {...krigsvold.bulk.redirect, target_url:'https://other.example/'}
  }, krigsvold.bulk), false);
  assert.doesNotThrow(() => verifyManagedListItem(krigsvold.bulk));
  assert.throws(() => verifyManagedListItem({ comment:'foreign', redirect:krigsvold.bulk.redirect }));
});
