import { loadRegistry, zoneName } from './registry.mjs';

// One-record pilot: deliberately no general-purpose publication logic.
const host = 'krigsvold.westarctica.net';
const target = 'krigsvold.org';
const { entries, errors } = loadRegistry();
if (errors.length) throw new Error('Registry validation failed: ' + errors.join('; '));
const reg = entries.get('krigsvold');
if (zoneName !== 'westarctica.net' || entries.size !== 1 ||
    !reg || reg.owner?.username !== 'howardjp' ||
    Object.keys(reg.records ?? {}).length !== 1 ||
    reg.records.CNAME !== target) {
  throw new Error('Pilot only allows the reviewed Krigsvold CNAME registration');
}
const record = {
  type: 'CNAME',
  name: host,
  content: target,
  proxied: false,
  ttl: 1,
  comment: 'WNIC pilot: domains/krigsvold.json'
};
if (process.argv.includes('--dry-run')) {
  console.log(JSON.stringify({ mode: 'create-if-absent', record, otherChanges: 0, networkCalls: 0 }, null, 2));
} else {
  if (process.argv.length !== 2 || process.env.GITHUB_ACTIONS !== 'true' ||
      process.env.GITHUB_REF !== 'refs/heads/main') {
    throw new Error('Live changes permitted only by GitHub Actions on main');
  }
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !/^[a-f0-9]{32}$/i.test(account ?? '')) {
    throw new Error('Missing Cloudflare token or valid account ID');
  }
  const apiBase = 'https://api.cloudflare.com/client/v4';
  async function cf(path, body) {
    const res = await fetch(apiBase + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });
    if (!res.ok) throw new Error('Cloudflare HTTP ' + res.status + ' (no successful write confirmed)');
    const json = await res.json();
    if (!json.success) throw new Error('Cloudflare API error: ' + (json.errors ?? []).map(e => e.code).join(','));
    return json;
  }
  const params = new URLSearchParams({ name: zoneName, 'account.id': account, per_page: '50' });
  const zones = await cf('/zones?' + params);
  const matching = (zones.result ?? []).filter(z => z.name === zoneName &&
    z.account?.id === account && z.status === 'active');
  if (matching.length !== 1 || zones.result_info?.total_pages > 1) {
    throw new Error('Expected exactly one active westarctica.net zone in intended account');
  }
  const id = matching[0].id;
  if (!/^[a-f0-9]{32}$/i.test(id ?? '')) throw new Error('Invalid Cloudflare zone identifier');
  const listing = await cf('/zones/' + id + '/dns_records?' +
    new URLSearchParams({ name: host, per_page: '100' }));
  if (listing.result_info?.total_pages > 1 || listing.result_info?.total_count > 100) {
    throw new Error('Unexpected number of existing DNS records');
  }
  const found = (listing.result ?? []).filter(r => r.name.toLowerCase() === host);
  if (found.length) {
    if (found.length === 1 && found[0].type === 'CNAME' &&
        found[0].content.toLowerCase().replace(/\.$/, '') === target &&
        found[0].proxied === false) {
      console.log('Already present: ' + host + ' CNAME ' + target + ' (DNS only); no change.');
    } else {
      throw new Error('Conflicting DNS record already exists: ' + host + '. No overwrite performed.');
    }
  } else {
    const created = await cf('/zones/' + id + '/dns_records', record);
    if (created.result?.name?.toLowerCase() !== host ||
        created.result?.type !== 'CNAME' ||
        created.result?.content?.toLowerCase().replace(/\.$/, '') !== target ||
        created.result?.proxied !== false) {
      throw new Error('Unexpected create response; manually inspect Cloudflare');
    }
    console.log('Created: ' + host + ' CNAME ' + target + ' (DNS only).');
  }
}
