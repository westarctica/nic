import { zoneName } from './registry.mjs';

export const redirectListName = 'wnic_forwarding';
export const redirectListDescription = 'WNIC-managed redirects for westarctica.net; source: westarctica/nic';
export const placeholderAddress = '192.0.2.0';

export function redirectsFromRegistry(entries) {
  return [...entries]
    .filter(([, entry]) => entry.service?.type === 'redirect')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, entry]) => {
      const host = name + '.' + zoneName;
      const service = entry.service;
      return {
        name,
        hostname: host,
        bulk: {
          redirect: {
            // No scheme deliberately matches both HTTP and HTTPS.
            source_url: host + '/',
            target_url: new URL(service.target).href,
            status_code: service.status,
            include_subdomains: false,
            subpath_matching: true,
            preserve_path_suffix: service.preservePath,
            preserve_query_string: service.preserveQuery
          },
          comment: 'WNIC-managed redirect: ' + name
        },
        dns: {
          type: 'A',
          name: host,
          content: placeholderAddress,
          proxied: true,
          ttl: 1,
          comment: 'WNIC forwarding endpoint: ' + name
        }
      };
    });
}

const normalized = (x) => JSON.stringify(x);
export function matchesRedirectItem(existing, desired) {
  const actual = existing?.redirect;
  const wanted = desired?.redirect;
  return actual?.source_url === wanted?.source_url &&
    actual?.target_url === wanted?.target_url &&
    (actual?.status_code ?? 301) === wanted?.status_code &&
    (actual?.include_subdomains ?? false) === wanted?.include_subdomains &&
    (actual?.subpath_matching ?? false) === wanted?.subpath_matching &&
    (actual?.preserve_path_suffix ?? true) === wanted?.preserve_path_suffix &&
    (actual?.preserve_query_string ?? false) === wanted?.preserve_query_string;
}

export function classifyDns(current, desired, migration) {
  if (!Array.isArray(current)) throw new Error('Invalid DNS inventory');
  const records = current.filter(rec => rec.name?.toLowerCase() === desired.name);
  if (!records.length) return 'create';
  if (records.length !== 1) throw new Error('Multiple DNS records at ' + desired.name);
  const rec = records[0];
  if (rec.type === desired.type && rec.content === desired.content && rec.proxied === true) return 'matched';
  if (migration &&
      rec.type === migration.type &&
      rec.content.toLowerCase().replace(/\.$/, '') === migration.content &&
      rec.proxied === migration.proxied) return 'migrate';
  throw new Error('Refusing to overwrite non-WNIC DNS at ' + desired.name);
}

export function verifyManagedListItem(item) {
  if (typeof item?.comment !== 'string' ||
      !item.comment.startsWith('WNIC-managed redirect: ') ||
      !item.redirect?.source_url?.endsWith('.' + zoneName + '/')) {
    throw new Error('Non-WNIC list item found; refusing to modify');
  }
}

export function isValidMigrationSpec(value) {
  return value && value.type === 'CNAME' && value.proxied === false &&
    typeof value.content === 'string' && value.content.length > 3 &&
    /^[a-z0-9.-]+$/.test(value.content);
}
