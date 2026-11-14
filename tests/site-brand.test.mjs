import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from '../scripts/registry.mjs';

const html = readFileSync(join(repoRoot, 'site/index.html'), 'utf8');
const css = readFileSync(join(repoRoot, 'site/styles.css'), 'utf8');
const badge = readFileSync(join(repoRoot, 'site/images/waq-coa-badge.svg'), 'utf8');
const arms = readFileSync(join(repoRoot, 'site/images/waq-coa-arms.svg'), 'utf8');

test('NIC is presented as a service of the College', () => {
  assert.match(html, /Westarctican College of Arms/);
  assert.match(html, /A service of the Westarctican College of Arms/);
  assert.match(html, /nic\.westarctica\.net/);
});

test('NIC uses the revised three-column College footer and links', () => {
  const footer = html.slice(html.indexOf('<footer class="site-footer">'));
  assert.match(footer, /<footer class="site-footer">/);
  assert.equal((footer.match(/class="footer-column"/g) ?? []).length, 2);
  for (const text of [
    'The College', 'Ellsworth King of Arms', 'WestarcticaNIC',
    'Westarctica', 'National Website', 'Encyclopedia Westarctica',
    'Artwork Attribution &amp; Sources', 'A service of the Westarctican College of Arms'
  ]) {
    assert.ok(footer.includes(text), text);
  }
  assert.ok(!footer.includes('Armorial &amp; Reference'), 'old reference column must not remain');
  assert.ok(!footer.includes('History &amp; Purpose'), 'old college link must not remain');
  for (const [text, href] of [
    ['Ellsworth King of Arms', 'https://ellsworth.westarctica.net/ellsworth/'],
    ['WestarcticaNIC', 'https://nic.westarctica.net'],
    ['National Website', 'https://www.westarctica.info/'],
    ['Encyclopedia Westarctica', 'https://www.westarctica.wiki/']
  ]) {
    assert.ok(footer.includes('href="' + href + '">' + text + '</a>'), text);
  }
  assert.match(css, /grid-template-columns:\s*1\.3fr 1fr 1fr/);
  assert.match(css, /\.footer-identity\s*\{\s*grid-column:\s*1\/-1/);
});

test('Full College of Arms achievement is used in masthead; badge remains favicon and footer', () => {
  const header = html.slice(html.indexOf('<header class="masthead">'), html.indexOf('</header>'));
  const footer = html.slice(html.indexOf('<footer class="site-footer">'));
  assert.match(arms, /<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(header, /src="\/images\/waq-coa-arms\.svg"[^>]*width="94" height="110"/);
  assert.doesNotMatch(header, /src="\/images\/waq-coa-badge\.svg"/);
  assert.match(html, /rel="icon"[^>]*href="\/images\/waq-coa-badge\.svg"/);
  assert.match(footer, /src="\/images\/waq-coa-badge\.svg"/);
  assert.match(css, /\.college-brand img\s*\{\s*width:\s*90px;\s*height:\s*106px/);
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
