# Westarctica Network Information Center (WNIC)

The **Westarctica Network Information Center** is an emerging registry for names beneath **westarctica.net**. Its planned public home is **nic.westarctica.net**.

> **Prelaunch:** No public registrations are being accepted yet. DNS is not being published from this repository. The live Cloudflare zone remains authoritative and untouched.

## Design

This project follows the *architecture* of [is-a.dev/register](https://github.com/is-a-dev/register): a public, reviewable JSON ledger; automated checks; and, later, publication into Cloudflare DNS. This is a small independent implementation, not a copy of is-a.dev's registrations.

- A request is a file such as `domains/smith.json`.
- GitHub pull requests provide review, ownership history, and an audit trail.
- The first release supports `A`, `AAAA`, `CNAME`, `CAA`, `MX`, `TXT`, `NS`, and `DS` records.
- Delegation via `NS` is a first-class registration option.
- Institutional identifiers (including `nic`, `ellsworth`, and `ca`) are protected.
- The registry can later move to a web portal/database without changing issued hostnames.

## Repository

| Location | Purpose |
| --- | --- |
| `domains/` | Approved registrations (one JSON file per name) |
| `data/reserved.json` | Protected names |
| `scripts/registry.mjs` | Registration and delegation validation |
| `scripts/dns-manifest.mjs` | Dry-run, provider-independent DNS manifest |
| `site/` | Static prelaunch NIC website |
| `POLICY.md` | Draft registration policy |
| `docs/OPERATIONS.md` | Deployment and DNS publication gates |

## Local commands

Requires Node.js 20 or later; no npm dependencies.

```sh
npm test
npm run validate
npm run preview:dns
npm run build:site
```

To register an eventual public domain, see [CONTRIBUTING.md](CONTRIBUTING.md). The examples use documentation-only hostnames; no live DNS assignments are implied.

## Safety before Cloudflare publication

Although GitHub repository secrets include `CLOUDFLARE_API_TOKEN` and the `CLOUDFLARE_ACCOUNT_ID` variable, **no workflow consumes them**. DNS publication must wait for a current zone inventory, explicit decisions about which existing records are externally managed, an approved diff, protected branches, and an operational rollback procedure. See [operations](docs/OPERATIONS.md).

## Institutional continuity

Registrants receive a revocable use assignment beneath `westarctica.net`, not ownership of the parent domain. Institutional names must remain with their office or institution when a custodian changes. This is particularly important for `ellsworth.westarctica.net`.

## Acknowledgment

The concept and JSON-ledger approach were informed by [is-a.dev/register](https://github.com/is-a-dev/register) (MIT-licensed). This initial scaffold is separately implemented for Westarctica.
