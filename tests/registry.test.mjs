import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRegistration, loadRegistry } from '../scripts/registry.mjs';

const entry = (records) => ({ owner: { username: 'example-user' }, records });

test('empty bootstrap ledger is valid', () => {
  const result = loadRegistry();
  assert.deepEqual(result.errors, []);
  assert.ok(result.reserved.includes('nic'));
  assert.ok(result.reserved.includes('ellsworth'));
});

test('ordinary CNAME registration is valid', () => {
  assert.deepEqual(validateRegistration('sample', entry({ CNAME: 'example.org' })), []);
});

test('NS delegation is valid, with optional DS', () => {
  assert.deepEqual(validateRegistration('sample', entry({ NS: ['ns1.example.org', 'ns2.example.org'] })), []);
  assert.deepEqual(validateRegistration('sample', entry({
    NS: ['ns1.example.org', 'ns2.example.org'],
    DS: [{ key_tag: 1234, algorithm: 13, digest_type: 2, digest: 'ABCD' }]
  })), []);
});

test('NS cannot coexist with ordinary host records', () => {
  assert.notDeepEqual(validateRegistration('sample', entry({
    NS: ['ns1.example.org', 'ns2.example.org'], A: ['198.51.100.7']
  })), []);
});

test('institutional names stay reserved', () => {
  assert.notDeepEqual(validateRegistration('ellsworth', entry({ CNAME: 'example.org' }), ['ellsworth']), []);
  assert.notDeepEqual(validateRegistration('x.nic', entry({ CNAME: 'example.org' }), ['nic']), []);
});

test('invalid and deceptive names are rejected', () => {
  assert.notDeepEqual(validateRegistration('-bad', entry({ CNAME: 'example.org' })), []);
  assert.notDeepEqual(validateRegistration('some--bad', entry({ CNAME: 'example.org' }), ['unused']), []); // adjust if consecutive hyphens become permissible
});

test('CNAME cannot coexist with TXT or redirect URL', () => {
  assert.notDeepEqual(validateRegistration('sample', entry({ CNAME: 'example.org', TXT: 'hello' })), []);
  assert.notDeepEqual(validateRegistration('sample', entry({ URL: 'https://example.org' })), []);
});

test('IPv4/IPv6 and MX validation', () => {
  assert.deepEqual(validateRegistration('sample', entry({
    A: ['198.51.100.7'], AAAA: ['2001:db8::1'],
    MX: [{ priority: 10, target: 'mail.example.org' }]
  })), []);
  assert.notDeepEqual(validateRegistration('sample', entry({ A: ['999.9.9.9'] })), []);
});

test('institutional holder metadata is accepted', () => {
  assert.deepEqual(validateRegistration('sample', {
    owner: { username: 'westarctica' },
    holder: { kind: 'institution', name: 'Example Office' },
    records: { CNAME: 'example.org' }
  }), []);
});
