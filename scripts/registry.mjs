import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isIP } from 'node:net';

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const zoneName = 'westarctica.net';
const label = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const login = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
const allowed = new Set(['A', 'AAAA', 'CAA', 'CNAME', 'DS', 'MX', 'NS', 'TXT']);

export function validateForwarding(service, name) {
  const errors = [];
  const invalid = (msg) => errors.push(name + ': ' + msg);
  if (!isObject(service) ||
      Object.keys(service).some(key => !['type','target','status','preservePath','preserveQuery'].includes(key)) ||
      service.type !== 'redirect') {
    invalid('unsupported forwarding service');
    return errors;
  }
  if (![301,302,307,308].includes(service.status)) invalid('invalid forwarding status');
  if (service.preservePath !== true && service.preservePath !== false) invalid('preservePath must be boolean');
  if (service.preserveQuery !== true && service.preserveQuery !== false) invalid('preserveQuery must be boolean');
  if (typeof service.target !== 'string' || service.target.length > 2048 ||
      !service.target.startsWith('https://')) {
    invalid('redirect target must be an HTTPS URL, 2048 characters or fewer');
    return errors;
  }
  let url;
  try { url = new URL(service.target); }
  catch { invalid('invalid redirect target'); return errors; }
  if (url.protocol !== 'https:' || url.username || url.password ||
      url.port || url.hash || !hostname(url.hostname) ||
       isIP(url.hostname) !== 0 || url.hostname === zoneName || url.hostname.endsWith('.' + zoneName) ||
      url.hostname.endsWith('.localhost') || url.hostname.endsWith('.internal') ||
      url.hostname.endsWith('.local') || url.hostname.endsWith('.test')) {
    invalid('target must be an external, public HTTPS hostname without credentials, custom ports or fragments');
  }
  if (url.search && service.preserveQuery) invalid('fixed target query is incompatible with preserveQuery');
  return errors;
}

const isObject = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const validName = (s) => typeof s === 'string' && s.length <= 253 && s.split('.').every((part) => label.test(part) && !part.includes('--'));
const hostname = (s) => typeof s === 'string' && s.length <= 253 && s.split('.').length >= 2 && validName(s.replace(/\.$/, ''));
const list = (x) => Array.isArray(x) && x.length > 0;
const number = (n, max = 65535) => Number.isInteger(n) && n >= 0 && n <= max;

export function validateRegistration(name, entry, reserved = []) {
  const errors = [];
  const fail = (message) => errors.push(name + ': ' + message);
  if (!validName(name) || name !== name.toLowerCase()) fail('invalid subdomain filename');
  const firstLevel = name.split('.').at(-1);
  if (reserved.includes(firstLevel)) fail('reserved institutional name');
  if (!isObject(entry)) return [...errors, name + ': expected an object'];
  if (!isObject(entry.owner) || !login.test(entry.owner.username ?? '')) fail('owner.username must be a GitHub username');
  if (Object.keys(entry).some((key) => !['owner', 'records', 'holder', 'service'].includes(key))) fail('unsupported top-level field');
  if (entry.holder !== undefined) {
    if (!isObject(entry.holder) || !['individual', 'institution'].includes(entry.holder.kind) ||
        typeof entry.holder.name !== 'string' || entry.holder.name.trim().length === 0 ||
        entry.holder.name.length > 120) fail('holder must contain kind (individual/institution) and name (1-120 characters)');
  }
  if (entry.service !== undefined) {
    if (entry.records !== undefined) fail('registration cannot specify both DNS records and a forwarding service');
    errors.push(...validateForwarding(entry.service, name));
    return errors;
  }
  if (!isObject(entry.records) || Object.keys(entry.records).length === 0) {
    fail('records must be a nonempty object');
    return errors;
  }
  const records = entry.records;
  const types = Object.keys(records);
  for (const type of types) if (!allowed.has(type)) fail('unsupported DNS type ' + type);
  if (records.CNAME !== undefined && types.length !== 1) fail('CNAME must be the only record type');
  if (records.NS !== undefined && types.some((x) => x !== 'NS' && x !== 'DS')) fail('NS delegation may contain only NS and DS');
  if (records.DS !== undefined && records.NS === undefined) fail('DS requires NS delegation');
  for (const type of types) {
    const value = records[type];
    if (type === 'A' || type === 'AAAA') {
      if (!list(value) || value.some((x) => isIP(x) !== (type === 'A' ? 4 : 6))) fail(type + ' must be a nonempty array of valid addresses');
    } else if (type === 'CNAME') {
      if (!hostname(value) || value.toLowerCase() === name + '.' + zoneName) fail('invalid or self-referential CNAME');
    } else if (type === 'NS') {
      if (!Array.isArray(value) || value.length < 2 || value.some((x) => !hostname(x))) fail('NS must contain at least two valid nameservers');
    } else if (type === 'TXT') {
      const values = Array.isArray(value) ? value : [value];
      if (!values.length || values.some((x) => typeof x !== 'string' || x.length === 0 || x.length > 255)) fail('TXT must contain strings between 1 and 255 characters');
    } else if (type === 'MX') {
      if (!list(value) || value.some((x) => !isObject(x) || !number(x.priority) || !hostname(x.target))) fail('MX must contain priority and target objects');
    } else if (type === 'CAA') {
      if (!list(value) || value.some((x) => !isObject(x) || !['issue', 'issuewild', 'iodef'].includes(x.tag) || typeof x.value !== 'string' || !x.value.length)) fail('CAA must contain tag and value objects');
    } else if (type === 'DS') {
      if (!list(value) || value.some((x) => !isObject(x) || !number(x.key_tag) || !number(x.algorithm, 255) ||
          !number(x.digest_type, 255) || !/^(?:[0-9a-f]{2})+$/i.test(x.digest ?? ''))) fail('DS must contain valid key_tag, algorithm, digest_type and hexadecimal digest');
    }
  }
  return errors;
}

export function loadRegistry(root = repoRoot) {
  const reserved = JSON.parse(readFileSync(join(root, 'data/reserved.json'), 'utf8'));
  if (!Array.isArray(reserved) || !reserved.every((name) => label.test(name))) throw new Error('Invalid reserved-name list');
  if (new Set(reserved).size !== reserved.length) throw new Error('Duplicate reserved name');
  const entries = new Map();
  const errors = [];
  const files = readdirSync(join(root, 'domains')).filter((p) => p.endsWith('.json'));
  for (const file of files) {
    const name = file.slice(0, -5);
    let data;
    try { data = JSON.parse(readFileSync(join(root, 'domains', file), 'utf8')); }
    catch (error) { errors.push(file + ': invalid JSON: ' + error.message); continue; }
    errors.push(...validateRegistration(name, data, reserved));
    entries.set(name, data);
  }
  const institutions = new Map();
  let institutionData;
  try {
    institutionData = JSON.parse(readFileSync(join(root, 'data/institutions.json'), 'utf8'));
  } catch (error) {
    errors.push('data/institutions.json: ' + error.message);
    institutionData = {};
  }
  if (!isObject(institutionData)) {
    errors.push('data/institutions.json: expected a map of institutional assignments');
    institutionData = {};
  }
  for (const [name, assignment] of Object.entries(institutionData)) {
    if (!validName(name) || name.includes('.')) errors.push(name + ': institutional assignment must be a valid single-label name');
    if (!reserved.includes(name)) errors.push(name + ': institutional name must also be protected in reserved.json');
    if (entries.has(name)) errors.push(name + ': institutional name cannot also have a public registration');
    if (!isObject(assignment) ||
        Object.keys(assignment).some((key) => !['holder', 'custodian', 'status', 'dns'].includes(key)) ||
        typeof assignment.holder !== 'string' || !assignment.holder.trim() || assignment.holder.length > 120 ||
        !login.test(assignment.custodian ?? '') ||
        assignment.status !== 'assigned' ||
        assignment.dns !== 'pending') {
      errors.push(name + ': invalid institutional assignment metadata');
    }
    institutions.set(name, assignment);
  }
  for (const [name, entry] of entries) {
    const bits = name.split('.');
    for (let i = 1; i < bits.length; i++) {
      const parentName = bits.slice(i).join('.');
      const parent = entries.get(parentName);
      if (!parent) { errors.push(name + ': missing parent registration ' + parentName); continue; }
      if (parent.records?.NS) errors.push(name + ': parent delegates DNS via NS: ' + parentName);
      if (parent.owner?.username?.toLowerCase() !== entry.owner?.username?.toLowerCase())
        errors.push(name + ': nested registration must retain parent custodian');
    }
  }
  return { entries, reserved, institutions, errors };
}
