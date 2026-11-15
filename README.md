# Westarctica Network Information Center (WNIC)

The **Westarctica Network Information Center** is an emerging registry for names beneath **westarctica.net**. Its planned public home is **nic.westarctica.net**.

> **Prelaunch:** Public registrations are not yet being accepted. The first pilot is `krigsvold.westarctica.net`, now transitioning from DNS-only CNAME to a Cloudflare-managed HTTPS forwarding service.

## Design

This project follows the *architecture* of [is-a.dev/register](https://github.com/is-a-dev/register): a public, reviewable JSON ledger; automated checks; and, later, publication into Cloudflare DNS. This is a small independent implementation, not a copy of is-a.dev's registrations.

- A request is a file such as `domains/smith.json`.
- Institutional allocations live in `data/institutions.json` and are protected in `data/reserved.json`. Their existence does not create a DNS record.
- GitHub pull requests provide review, ownership history, and an audit trail.
- The first release supports `A`, `AAAA`, `CNAME`, `CAA`, `MX`, `TXT`, `NS`, and `DS` records.
- Delegation via `NS` is a first-class registration option.
- Institutional identifiers (including `nic`, `ellsworth`, and `ca`) are protected.
- The registry can later move to a web portal/database without changing issued hostnames.

## Repository

| Location | Purpose |
| --- | --- |
| `domains/` | Approved registrations (one JSON file per name) |
| `data/institutions.json` | Office-held assignments independent of the incumbent |
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

## First ordinary registration and forwarding

`domains/krigsvold.json` holds the first ordinary registration, managed by `howardjp`. The registration uses the new `service.type = "redirect"` schema to forward:

```text
https://krigsvold.westarctica.net/some/path?query=1
  → HTTP 301 →
https://krigsvold.org/some/path?query=1
```

This is **HTTP forwarding**, not a DNS CNAME alias. The destination's hosting provider does not need to accept `krigsvold.westarctica.net`.

Cloudflare Bulk Redirects is the forwarding backend. `scripts/publish-forwarding.mjs` compiles all approved forwarding registrations into a dedicated `wnic_forwarding` redirect list and a shared account-level redirect rule. Each forwarding hostname receives a proxied Cloudflare DNS placeholder record. Before creating any record, the publisher inventories the current zone and rejects name conflicts. The one reviewed legacy CNAME migration is in `data/dns-migrations.json`.

Review the proposed configuration without calling Cloudflare:

```sh
npm run preview:forwarding
```

**Publisher access:** GitHub organization-level `CLOUDFLARE_API_TOKEN` secret and `CLOUDFLARE_ACCOUNT_ID` variable, scoped to this repository. The token needs Zone Read, Zone DNS Edit, Account Bulk URL Redirects Edit, and Account Filter Lists Edit. Publication only runs from approved changes to `main`, and the publisher never updates the NIC or Ellsworth Worker Custom Domains.

Cloudflare's redirect list API has distinct create and full-list replacement operations. Our initial publisher can append new entries but deliberately refuses to modify existing entries when the ledger differs until a separate update/rollback workflow is reviewed.

## Planned email forwarding

WNIC may also offer receiving-only `@westarctica.net` aliases through Cloudflare Email Routing. This is a **separate** registration service with verified private destinations, independent from subdomain DNS and HTTP forwarding. See [Email Routing plan](docs/EMAIL-ROUTING.md).

## Safety before Cloudflare publication

Although GitHub repository secrets include `CLOUDFLARE_API_TOKEN` and the `CLOUDFLARE_ACCOUNT_ID` variable, **only the purpose-built forwarding publisher currently consumes them**. General DNS synchronization and email routing require separate review. A successful redirect publication does not authorize modifications to unrelated account lists, Worker Custom Domains, or Mail Exchange (MX) records. See [operations](docs/OPERATIONS.md).

## Institutional continuity

Registrants receive a revocable use assignment beneath `westarctica.net`, not ownership of the parent domain. Institutional names must remain with their office or institution when a custodian changes. The first assignment is `ellsworth.westarctica.net`, held by the **Office of the Ellsworth King of Arms**, with `westarctica` currently named as administrative custodian. Its DNS and website are **not yet configured**.

## Acknowledgment

The concept and JSON-ledger approach were informed by [is-a.dev/register](https://github.com/is-a-dev/register) (MIT-licensed). This initial scaffold is separately implemented for Westarctica.


## College of Arms affiliation and visual identity

WNIC is a service of the **Westarctican College of Arms**. The static website adopts the College's colors, Georgia-based typography, centered national masthead, gold rules, heraldic badge, and the same revised three-column footer structure and footer link labels.

The footer and core visual conventions are adapted from the private `westarctica/college-of-arms` repository (main commit `31246942afedd4d001eaf81884e6516a680e9672`), specifically `src/components/Footer.astro`, `src/layouts/SiteLayout.astro`, and `src/styles/global.css`. The shared heraldic badge comes from `public/images/waq-coa-badge.svg`.

College footer links have been made absolute to their respective sites (`https://ellsworth.westarctica.net/` and `https://nic.westarctica.net`), so the NIC does not silently point to routes it does not serve. The service colophon identifies the local website as `nic.westarctica.net`. The revised College footer has two link columns alongside the College identity.


### Masthead artwork

The NIC masthead uses the full `waq-coa-arms.svg` heraldic achievement from the College of Arms source repository, matching the College's masthead treatment. The small square `waq-coa-badge.svg` remains in use for the favicon, footer service identity, and institutional panel. Both assets are stored locally so the NIC does not rely on the College website for rendering.
