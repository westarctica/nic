# Westarctica Network Information Center (WNIC)

The **Westarctica Network Information Center** is an emerging registry for names beneath **westarctica.net**. Its planned public home is **nic.westarctica.net**.

> **Prelaunch:** Public registrations are not yet being accepted. The first approved pilot registration is `krigsvold.westarctica.net`, with only that exact name eligible for automatic, non-destructive DNS publication.

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

## First ordinary registration

`domains/krigsvold.json` registers `krigsvold.westarctica.net` as a DNS-only CNAME pointing at `krigsvold.org`, with GitHub custodian `howardjp`.

A restricted pilot publisher validates the registry, refuses to change any pre-existing conflicting records, and creates only this hostname if absent. A matching CNAME is a no-op. Run `node scripts/publish-krigsvold.mjs --dry-run` to see the exact proposed DNS record without contacting Cloudflare.

DNS alone does not configure the origin server or HTTPS for the added hostname; that may follow separately.

## Safety before Cloudflare publication

Although GitHub repository secrets include `CLOUDFLARE_API_TOKEN` and the `CLOUDFLARE_ACCOUNT_ID` variable, **only the one-record Krigsvold pilot workflow consumes them**. General DNS publishing still requires a current zone inventory, explicit management boundaries, approval, protected branches, and a rollback plan. See [operations](docs/OPERATIONS.md).

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
