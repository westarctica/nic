const form = document.querySelector('#lookup-form');
const input = document.querySelector('#requested-name');
const result = document.querySelector('#lookup-result');
let ledger = null;
fetch('./registry.json', { cache: 'no-store' })
  .then((response) => {
    if (!response.ok) throw new Error('ledger unavailable');
    return response.json();
  })
  .then((data) => { ledger = data; })
  .catch(() => { ledger = null; });

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = input.value.trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(name) || name.includes('--')) {
    result.textContent = 'Please enter a valid name using letters, numbers, and single hyphens.';
    return;
  }
  if (!ledger) {
    result.textContent = 'The development ledger is not currently available. No availability statement can be made.';
    return;
  }
  if (ledger.reserved.includes(name)) {
    result.textContent = name + '.westarctica.net is reserved for institutional or infrastructure use.';
  } else if (ledger.registered.includes(name)) {
    result.textContent = name + '.westarctica.net is assigned in the development ledger.';
  } else {
    result.textContent = name + '.westarctica.net is not listed in the development ledger. Registrations are not yet open; this is not confirmation of DNS or registration availability.';
  }
});
