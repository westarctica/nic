/**
 * Read-only Cloudflare authorization diagnostics.
 * Do not print tokens, authorization headers, full API payloads, or IDs.
 * All requests are GET. Never modifies DNS, account settings, lists or rules.
 */
const token = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
if (!token || !/^[0-9a-f]{32}$/i.test(accountId ?? '')) {
  throw new Error('GitHub Actions credential bindings are missing or malformed');
}
const base = 'https://api.cloudflare.com/client/v4';

async function diagnose(label, path) {
  const response = await fetch(base + path, {
    method: 'GET',
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' }
  });
  let payload = {};
  try { payload = await response.json(); } catch {}
  const errors = (payload.errors ?? []).slice(0, 5).map(error => ({
    code: error.code ?? 'unknown',
    message: String(error.message ?? '').slice(0, 200),
    documentation: /^https:\/\/developers\.cloudflare\.com\//.test(error.documentation_url ?? '')
      ? error.documentation_url : null
  }));
  const summary = {
    check: label,
    http: response.status,
    apiSuccess: payload.success === true,
    errors
  };
  if ((label === 'User token verification' || label === 'Account token verification') && payload.result) {
    summary.tokenStatus = payload.result.status ?? 'unknown';
  }
  if (label === 'Target zone discovery' && Array.isArray(payload.result)) {
    summary.zoneCount = payload.result.length;
    summary.accountMatches = payload.result
      .filter(zone => zone.name === 'westarctica.net')
      .map(zone => ({ zoneName: zone.name, accountMatches: zone.account?.id === accountId,
        accountName: zone.account?.name ?? 'not included' }));
  }
  console.log(JSON.stringify(summary, null, 2));
  return response.ok && payload.success === true;
}

console.log(JSON.stringify({ tokenFormat: token.startsWith('cfat_') ? 'account-owned (cfat_)' :
  token.startsWith('cfut_') ? 'user-owned (cfut_)' : 'legacy or other' }));
const userVerified = await diagnose('User token verification', '/user/tokens/verify');
const accountVerified = await diagnose('Account token verification', '/accounts/' + accountId + '/tokens/verify');
const results = [];
results.push(await diagnose('Target zone discovery',
  '/zones?' + new URLSearchParams({ name: 'westarctica.net', 'account.id': accountId, per_page: '20' })));
results.push(await diagnose('Account redirect rulesets',
  '/accounts/' + accountId + '/rulesets'));
results.push(await diagnose('Account filter lists',
  '/accounts/' + accountId + '/rules/lists'));
if ((!userVerified && !accountVerified) || !results.every(Boolean)) {
  console.error('One or more read-only Cloudflare authorization checks failed. No write attempted.');
  process.exitCode = 1;
} else {
  console.log('Token verification and all three resource checks passed. No write attempted.');
}
