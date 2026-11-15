import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadRegistry, repoRoot, zoneName } from './registry.mjs';

// Institutional aliases only. Never reconcile the zone, update records, or delete.
export function planAliases(aliases, registry) {
  if (registry.errors.length) throw new Error(registry.errors.join('\n'));
  if (!aliases || Array.isArray(aliases) || typeof aliases !== 'object' || !Object.keys(aliases).length) {
    throw new Error('Expected a nonempty institutional alias map');
  }
  return Object.entries(aliases).map(([name, target]) => {
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(name) || name.includes('--') ||
        !registry.reserved.includes(name) || registry.entries.has(name) || registry.institutions.has(name) ||
        !registry.institutions.has(target) || name === target) {
      throw new Error('Alias must be a reserved, unused label targeting an assigned institution: ' + name);
    }
    return { type: 'CNAME', name: name + '.' + zoneName, content: target + '.' + zoneName,
      proxied: true, ttl: 1, comment: 'WNIC institutional alias: ' + name };
  });
}

export function classifyAlias(records, desired) {
  if (!Array.isArray(records)) throw new Error('Incomplete DNS inventory');
  const exact = records.filter(r => r.name?.toLowerCase() === desired.name);
  if (!exact.length) return 'create';
  if (exact.length === 1 && exact[0].type === 'CNAME' &&
      exact[0].content?.toLowerCase().replace(/\.$/, '') === desired.content && exact[0].proxied === true) return 'matched';
  throw new Error('Conflicting DNS at ' + desired.name + '; no record overwritten');
}

async function main() {
  const mode = process.argv.slice(2);
  if (mode.length !== 1 || !['--dry-run', '--apply'].includes(mode[0])) throw new Error('Use --dry-run or --apply');
  const planned = planAliases(JSON.parse(readFileSync(join(repoRoot, 'data/institutional-cnames.json'), 'utf8')), loadRegistry());
  console.log(JSON.stringify({ zone: zoneName, records: planned, mode: mode[0], deletes: 0, updates: 0 }, null, 2));
  if (mode[0] === '--dry-run') return;
  if (process.env.GITHUB_ACTIONS !== 'true' || process.env.GITHUB_REF !== 'refs/heads/main') {
    throw new Error('Live publication requires GitHub Actions on main');
  }
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !/^[a-f0-9]{32}$/i.test(account ?? '')) throw new Error('Missing Cloudflare credentials');
  async function cf(path, method = 'GET', body) {
    const res = await fetch('https://api.cloudflare.com/client/v4' + path, {
      method, headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    if (!res.ok) throw new Error('Cloudflare HTTP ' + res.status + ' on ' + path.split('?')[0]);
    const payload = await res.json();
    if (!payload.success) throw new Error('Cloudflare API rejected request');
    return payload;
  }
  const zones = await cf('/zones?' + new URLSearchParams({ name: zoneName, 'account.id': account, per_page: '50' }));
  const matching = (zones.result ?? []).filter(z => z.name === zoneName && z.account?.id === account && z.status === 'active');
  if (matching.length !== 1 || zones.result_info?.total_pages > 1 || !/^[a-f0-9]{32}$/i.test(matching[0]?.id ?? '')) {
    throw new Error('Expected exactly one active westarctica.net zone in the configured account');
  }
  const base = '/zones/' + matching[0].id + '/dns_records';
  async function inventory(record) {
    const result = await cf(base + '?' + new URLSearchParams({ name: record.name, per_page: '100' }));
    if (result.result_info?.total_pages > 1 || result.result_info?.total_count > 100) throw new Error('Incomplete DNS inventory');
    return classifyAlias(result.result, record);
  }
  // Complete all conflict checks before creating any records.
  for (const record of planned) await inventory(record);
  for (const record of planned) {
    if (await inventory(record) === 'matched') {
      console.log('Already matches: ' + record.name);
      continue;
    }
    const result = await cf(base, 'POST', record);
    if (classifyAlias([result.result], record) !== 'matched' || await inventory(record) !== 'matched') {
      throw new Error('New alias could not be verified; inspect Cloudflare');
    }
    console.log('Created institutional CNAME: ' + record.name + ' -> ' + record.content + ' (proxied).');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
