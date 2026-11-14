import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from '../scripts/registry.mjs';

const html = readFileSync(join(repoRoot, 'site/index.html'), 'utf8');
const css = readFileSync(join(repoRoot, 'site/styles.css'), 'utf8');
const badge = readFileSync(join(repoRoot, 'site/images/waq-coa-badge.svg'), 'utf8');

test('NIC is presented as a service of the College', () => {
  assert.match(html, /Westarctican College of Arms/);
  assert.match(html, /A service of the Westarctican College of Arms/);
  assert.match(html, /nic\.westarctica\.net/);
});

test('College footer has all four columns and source-linked destinations', () => {
  assert.match(html, /<footer class="site-footer">/);
  for (const text of ['The College', 'Armorial &amp; Reference', 'Westarctica',
    'History &amp; Purpose', 'Ellsworth King of Arms', 'The Armorial',
    'Heraldry Guides', 'Heraldic Glossary', 'Sources &amp; Credits',
    'National Website', 'Encyclopedia Westarctica', 'Artwork Attribution &amp; Sources']) {
    assert.ok(html.includes(text), text);
  }
  for (const route of ['/college/', '/ellsworth/', '/armorial/', '/heraldry/',
    '/heraldry/glossary/', '/sources/']) {
    assert.ok(html.includes('href="https://ellsworth.westarctica.net' + route + '"'), route);
  }
});

test('Heraldic badge asset and College design colors exist locally', () => {
  assert.match(badge, /<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(html, /href="\/images\/waq-coa-badge\.svg"/);
  assert.match(css, /--ink:\s*#102c46/);
  assert.match(css, /--gold:\s*#b49342/);
  assert.match(css, /\.footer-inner\s*\{/);
  assert.match(css, /\.college-service-identity\s*\{/);
});

test('Lookup remains available in the refreshed design', () => {
  for (const id of ['lookup-form', 'requested-name', 'lookup-result']) {
    assert.ok(html.includes('id="' + id + '"'), id);
  }
});
