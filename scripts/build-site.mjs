import { rmSync, mkdirSync, cpSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadRegistry, repoRoot, zoneName } from './registry.mjs';

const { entries, reserved, institutions, errors } = loadRegistry();
if (errors.length) throw new Error(errors.join('\n'));
const dest = join(repoRoot, 'dist');
rmSync(dest, { force: true, recursive: true });
mkdirSync(dest, { recursive: true });
cpSync(join(repoRoot, 'site'), dest, { recursive: true });
writeFileSync(join(dest, 'registry.json'), JSON.stringify({
  zone: zoneName,
  status: 'prelaunch',
  reserved: [...reserved].sort(),
  registered: [...entries.keys()].sort(),
  institutional: [...institutions.keys()].sort()
}, null, 2) + '\n');
console.log('Static prelaunch NIC site built in dist/.');
