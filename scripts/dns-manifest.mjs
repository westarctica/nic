import { loadRegistry, zoneName } from './registry.mjs';

const { entries, institutions, errors } = loadRegistry();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  const registrations = [...entries].sort(([a], [b]) => a.localeCompare(b)).map(([name, entry]) => ({
    hostname: name + '.' + zoneName,
    custodian: entry.owner.username,
    holder: entry.holder ?? null,
    records: entry.records
  }));
  // This is a proposed-state export only. It does not read or change live DNS.
  console.log(JSON.stringify({ zone: zoneName, mode: 'dry-run-only', registrations, institutionalAssignmentsWithoutDNS: [...institutions.keys()].sort() }, null, 2));
}
