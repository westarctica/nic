/**
 * WNIC Bulk Redirect publisher.
 * Scope: registered forwarding services under westarctica.net.
 * - Does not touch Worker Custom Domains or any unregistered DNS hostname.
 * - Appends/updates only the dedicated WNIC account list.
 * - Adds one WNIC rule without replacing other rules in the account ruleset.
 * - Converts an existing CNAME only when specifically approved in dns-migrations.json.
 *
 * Usage:
 *   node scripts/publish-forwarding.mjs --dry-run  (offline, no credentials)
 *   node scripts/publish-forwarding.mjs --apply    (GitHub Actions main only)
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadRegistry, repoRoot, zoneName } from './registry.mjs';
import {
  redirectsFromRegistry, redirectListName, redirectListDescription, placeholderAddress,
  matchesRedirectItem, classifyDns, verifyManagedListItem, isValidMigrationSpec
} from './forwarding-model.mjs';

const { entries, errors } = loadRegistry();
if (errors.length) throw new Error(errors.join('\n'));
const planned = redirectsFromRegistry(entries);
if (!planned.length) throw new Error('No forwarding registrations in ledger; refusing an empty publish');
const rawMigrations = JSON.parse(readFileSync(join(repoRoot, 'data/dns-migrations.json'), 'utf8'));
if (!rawMigrations || Array.isArray(rawMigrations) || typeof rawMigrations !== 'object') {
  throw new Error('Invalid DNS migration map');
}
for (const [label, spec] of Object.entries(rawMigrations)) {
  if (!planned.some(x => x.name === label) || !isValidMigrationSpec(spec)) {
    throw new Error('Unrecognized DNS migration approval: ' + label);
  }
}
const planSummary = {
  zone: zoneName,
  redirectList: redirectListName,
  mode: 'WNIC-only (no zone-wide reconciliation)',
  planned: planned.map(x => ({
    hostname: x.hostname, redirect: x.bulk.redirect,
    dns: x.dns, legacyMigration: rawMigrations[x.name] ?? null
  }))
};
const options = process.argv.slice(2);
if (options.length !== 1 || !['--dry-run', '--apply'].includes(options[0])) {
  throw new Error('Use exactly one of --dry-run or --apply');
}
if (options[0] === '--dry-run') {
  console.log(JSON.stringify({ ...planSummary, networkCalls: 0 }, null, 2));
  process.exit(0);
}

if (process.env.GITHUB_ACTIONS !== 'true' || process.env.GITHUB_REF !== 'refs/heads/main') {
  throw new Error('Live publishing requires GitHub Actions on the protected main branch');
}
const token = process.env.CLOUDFLARE_API_TOKEN;
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
if (!token || !/^[a-f0-9]{32}$/i.test(account ?? '')) {
  throw new Error('Cloudflare API token or account ID unavailable');
}

const api = 'https://api.cloudflare.com/client/v4';
async function cf(path, method = 'GET', body) {
  const response = await fetch(api + path, {
    method,
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {})
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  });
  if (!response.ok) throw new Error('Cloudflare ' + method + ' failed: HTTP ' + response.status + ' on ' + path.split('?')[0]);
  const json = await response.json();
  if (!json.success) throw new Error('Cloudflare API error codes: ' +
    (json.errors ?? []).map(e => e.code ?? '?').join(','));
  return json;
}
const accountPath = '/accounts/' + account;

// Preflight EVERYTHING that could conflict before writing account lists, rules, or DNS.
const zoneQuery = new URLSearchParams({ name: zoneName, 'account.id': account, per_page: '50' });
const [zones, currentLists, accountRulesets] = await Promise.all([
  cf('/zones?' + zoneQuery),
  cf(accountPath + '/rules/lists'),
  cf(accountPath + '/rulesets')
]);
const matches = (zones.result ?? []).filter(z =>
  z.name === zoneName && z.account?.id === account && z.status === 'active');
if (matches.length !== 1 || zones.result_info?.total_pages > 1) {
  throw new Error('Expected one active zone named westarctica.net in the configured account');
}
const zoneId = matches[0].id;
if (!/^[a-f0-9]{32}$/i.test(zoneId ?? '')) throw new Error('Malformed Cloudflare zone ID');
if (!Array.isArray(currentLists.result) || !Array.isArray(accountRulesets.result)) {
  throw new Error('Incomplete account inventory; no changes made');
}
const lists = currentLists.result.filter(l => l.name === redirectListName);
if (lists.length > 1) throw new Error('Duplicate WNIC account redirect lists');
let list = lists[0] ?? null;
if (list && (list.kind !== 'redirect' || list.description !== redirectListDescription)) {
  throw new Error('A non-WNIC list already uses the reserved name ' + redirectListName);
}
const roots = accountRulesets.result.filter(r => r.kind === 'root' && r.phase === 'http_request_redirect');
if (roots.length > 1) throw new Error('More than one account redirect entry-point ruleset');
let root = roots[0] ?? null;
let rootDetail = root ? (await cf(accountPath + '/rulesets/' + root.id)).result : null;
const wantedRule = {
  ref: 'wnic_bulk_forwarding',
  expression: 'http.request.full_uri in $' + redirectListName,
  description: 'WNIC forwarding for independently assigned westarctica.net names',
  action: 'redirect',
  enabled: true,
  action_parameters: { from_list: { name: redirectListName, key: 'http.request.full_uri' } }
};
function matchesRule(rule) {
  return rule?.action === 'redirect' && rule?.enabled !== false &&
    rule?.expression === wantedRule.expression &&
    rule?.action_parameters?.from_list?.name === redirectListName &&
    rule?.action_parameters?.from_list?.key === 'http.request.full_uri';
}
if (rootDetail) {
  const rules = rootDetail.rules ?? [];
  if (!Array.isArray(rules)) throw new Error('Unrecognized ruleset shape');
  const ownedRules = rules.filter(r => r.ref === wantedRule.ref ||
    r.action_parameters?.from_list?.name === redirectListName);
  if (ownedRules.length > 1 || (ownedRules.length && !matchesRule(ownedRules[0]))) {
    throw new Error('Existing WNIC rule conflicts with expected configuration');
  }
}
const inventory = [];
for (const item of planned) {
  const q = new URLSearchParams({ name: item.hostname, per_page: '100' });
  const result = await cf('/zones/' + zoneId + '/dns_records?' + q);
  if (result.result_info?.total_pages > 1 || result.result_info?.total_count > 100 ||
      !Array.isArray(result.result)) throw new Error('Incomplete DNS inventory for ' + item.hostname);
  const owned = result.result.filter(r => r.name.toLowerCase() === item.hostname);
  const action = classifyDns(owned, item.dns, rawMigrations[item.name]);
  inventory.push({ item, action, owned });
}

let listItems = [];
async function getListItems(listId) {
  const items = [];
  let cursor = null;
  for (let pages = 0; pages < 60; pages++) {
    const q = new URLSearchParams({ per_page: '500' });
    if (cursor) q.set('cursor', cursor);
    const payload = await cf(accountPath + '/rules/lists/' + listId + '/items?' + q);
    if (!Array.isArray(payload.result)) throw new Error('Invalid list-items response');
    items.push(...payload.result);
    const next = payload.result_info?.cursors?.after;
    if (!next) {
      if (payload.result_info?.total_count > items.length) {
        throw new Error('Incomplete redirect list pagination');
      }
      return items;
    }
    if (next === cursor) throw new Error('Redirect list pagination did not advance');
    cursor = next;
  }
  throw new Error('Redirect list exceeds safe pagination limits');
}
if (list) {
  listItems = await getListItems(list.id);
  const wantedSources = new Set(planned.map(i => i.bulk.redirect.source_url));
  for (const existing of listItems) {
    // The dedicated list is not a general-purpose account list.
    verifyManagedListItem(existing);
    if (!wantedSources.has(existing.redirect.source_url)) {
      throw new Error('Unrecognized/orphan WNIC redirect item: ' + existing.redirect.source_url +
        '; explicit removal review required');
    }
  }
}
console.log('Preflight OK: ' + planned.length + ' forwarding registration(s); ' +
  inventory.filter(x => x.action === 'migrate').length + ' approved legacy DNS migration(s).');

// A dedicated list is safe to create without changing account-wide rule behavior.
if (!list) {
  const response = await cf(accountPath + '/rules/lists', 'POST', {
    name: redirectListName, description: redirectListDescription, kind: 'redirect'
  });
  list = response.result;
  if (list?.name !== redirectListName || list?.kind !== 'redirect') {
    throw new Error('Unexpected Cloudflare list creation result; manual inspection required');
  }
  console.log('Created dedicated WNIC redirect list.');
}
const existingBySource = new Map(listItems.map(i => [i.redirect.source_url, i]));
const changes = [];
for (const item of planned) {
  const existing = existingBySource.get(item.bulk.redirect.source_url);
  if (!existing) changes.push(item.bulk);
  else if (!matchesRedirectItem(existing, item.bulk)) changes.push(item.bulk);
}
async function waitForBulkOperation(id) {
  if (!/^[a-f0-9]{32}$/i.test(id ?? '')) throw new Error('Invalid redirect list operation ID');
  for (let n = 0; n < 40; n++) {
    const status = await cf(accountPath + '/rules/lists/bulk_operations/' + id);
    if (status.result?.status === 'completed') return;
    if (status.result?.status === 'failed') throw new Error('Bulk redirect list operation failed');
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  throw new Error('Bulk redirect list update timed out; inspect Cloudflare before rerunning');
}
if (changes.length) {
  const op = await cf(accountPath + '/rules/lists/' + list.id + '/items', 'POST', changes);
  await waitForBulkOperation(op.result?.operation_id);
  console.log('Published ' + changes.length + ' WNIC forwarding-list item(s).');
}
listItems = await getListItems(list.id);
for (const item of planned) {
  const found = listItems.filter(x => x.redirect.source_url === item.bulk.redirect.source_url);
  if (found.length !== 1 || !matchesRedirectItem(found[0], item.bulk)) {
    throw new Error('Bulk redirect not verified: ' + item.hostname);
  }
}
// Activate after the redirect list items have been confirmed; never replace existing account rules.
if (!root) {
  const created = await cf(accountPath + '/rulesets', 'POST', {
    name: 'WNIC Bulk Redirects', kind: 'root', phase: 'http_request_redirect', rules: [wantedRule]
  });
  root = created.result;
  if (root?.kind !== 'root' || root?.phase !== 'http_request_redirect') {
    throw new Error('Unexpected account ruleset creation response');
  }
  console.log('Activated WNIC redirect list via new account redirect ruleset.');
} else {
  const rules = rootDetail.rules ?? [];
  if (!rules.some(matchesRule)) {
    await cf(accountPath + '/rulesets/' + root.id + '/rules', 'POST', wantedRule);
    console.log('Appended WNIC bulk redirect rule without altering existing rules.');
  }
}
rootDetail = (await cf(accountPath + '/rulesets/' + root.id)).result;
if (!(rootDetail?.rules ?? []).some(matchesRule)) {
  throw new Error('WNIC redirect rule was not verified active; DNS not changed');
}
console.log('WNIC Bulk Redirect rule is active. Beginning DNS provisioning.');

// A proxied placeholder reaches Cloudflare redirect processing without cross-account CNAME routing.
for (const { item, action, owned } of inventory) {
  const path = '/zones/' + zoneId + '/dns_records';
  // Recheck before a destructive migration in case another operator changed DNS during setup.
  const check = await cf(path + '?' + new URLSearchParams({ name: item.hostname, per_page:'100' }));
  const actual = (check.result ?? []).filter(r => r.name.toLowerCase() === item.hostname);
  if (classifyDns(actual, item.dns, rawMigrations[item.name]) !== action) {
    throw new Error('DNS changed during publish: ' + item.hostname + '; no change made');
  }
  if (action === 'matched') {
    console.log('DNS already matches: ' + item.hostname);
    continue;
  }
  if (action === 'migrate') {
    const old = actual[0];
    if (!/^[a-f0-9]{32}$/i.test(old.id ?? '')) throw new Error('Invalid legacy record ID');
    await cf(path + '/' + old.id, 'DELETE');
    try {
      const added = await cf(path, 'POST', item.dns);
      if (added.result?.type !== 'A' || added.result?.proxied !== true) {
        throw new Error('Unexpected DNS create result after migration');
      }
    } catch (error) {
      try {
        await cf(path, 'POST', {
          type: old.type, name: old.name, content: old.content,
          ttl: old.ttl ?? 1, proxied: old.proxied
        });
        throw new Error('DNS migration failed; legacy CNAME restored: ' + error.message);
      } catch (restoreError) {
        throw new Error('DNS migration failed and restoration needs inspection: ' +
          error.message + ' / ' + restoreError.message);
      }
    }
    console.log('Migrated ' + item.hostname + ' from legacy CNAME to proxied forwarding A record.');
  } else {
    const added = await cf(path, 'POST', item.dns);
    if (added.result?.type !== 'A' || added.result?.proxied !== true) {
      throw new Error('Unexpected DNS create result; inspect Cloudflare');
    }
    console.log('Created forwarding DNS placeholder: ' + item.hostname);
  }
}
console.log('WNIC forwarding publication complete: ' + planned.length + ' registration(s).');
