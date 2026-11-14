import { loadRegistry } from './registry.mjs';

const { entries, reserved, errors } = loadRegistry();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('WNIC validated: ' + entries.size + ' registrations, ' + reserved.length + ' reserved names.');
}
