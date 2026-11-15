# Operations and launch gates

## State as of bootstrap

- `westarctica.net` is registered, and Cloudflare hosts its DNS.
- The repository has a `CLOUDFLARE_API_TOKEN` **secret** and `CLOUDFLARE_ACCOUNT_ID` **variable**, as supplied by the administrator.
- Only the purpose-built WNIC forwarding workflow consumes the Cloudflare credentials. It manages approved redirect-list entries and exact forwarding-host DNS records, not general zone synchronization. A one-time migration from the previous Krigsvold CNAME is separately approved.
- `nic.westarctica.net` is the intended public service; `ellsworth.westarctica.net` is separately reserved for the office of the Ellsworth King of Arms.

## Stage 1: publishing the website

The `site/` directory is a static website served as a Cloudflare Worker with static assets. The repository includes `wrangler.jsonc`.

Cloudflare Workers Builds settings:
- Production branch: `main`
- Root directory: repository root
- Build command: `npm run build:site`
- Deploy command: `npx wrangler deploy`
- Preview command: `npx wrangler preview` (requires Wrangler 4.135.0 or later)
- Custom hostname: `nic.westarctica.net` (attach in Cloudflare after deploying)

Use a recent Wrangler release in the build environment. Preview builds should be configured with their own host and cannot change live production DNS.

Deployment hosts the website only; it does not publish registrations or alter registrant DNS records.

## Stage 2: enabling registration

Before accepting requests:
1. Adopt the draft policy and identify the authority entitled to approve institutional registrations.
2. Establish a maintainer/approver team and protect `main` with required CI, code review, and no direct pushes.
3. Confirm that reserved names match existing Cloudflare DNS and anticipated infrastructure.
4. Document identity/custodianship proof for institutional applicants.
5. Announce registration availability on the website and publish request instructions.

## Web forwarding publication (pilot)

- The first ordinary entry is now `domains/krigsvold.json` with `service.type = "redirect"`.
- `npm run preview:forwarding` prints the compiled Cloudflare redirect-list and proxied DNS placeholder, without using credentials.
- On merge to main, `.github/workflows/publish-forwarding.yml` validates, previews, then attempts to update the WNIC-owned account redirect list and apply the exact forwarding-host DNS changes.
- An account-level redirect rule is required. Cloudflare API token permissions must include **Zone Read**, **DNS Edit**, **Account Bulk URL Redirects Edit**, and **Account Filter Lists Edit**. Lack of permission must cause a fail-closed build.
- The dedicated list is named `wnic_forwarding`. No other account lists or rules are to be edited. Existing list-entry changes need a separately reviewed update mechanism.
- The reviewed Krigsvold migration is a one-time conversion from DNS-only CNAME to a proxied Cloudflare placeholder A record. The publisher installs and verifies redirect rules before the DNS change, and attempts to restore the legacy CNAME if creating the A record fails.
- Neither `nic.westarctica.net` nor `ellsworth.westarctica.net` Worker Custom Domains are in the public registry ledger. Their routing is owned and managed separately.
- Verify a test redirect with `curl -I https://krigsvold.westarctica.net/` after successful publication. Confirm nested paths and query-string preservation separately.
- New or updated registrant forwarding entries require human review and are not automatically accepted from untrusted pull requests.

## Stage 3: general DNS publication (NOT YET IMPLEMENTED)

**Never run a wholesale zone-reconciliation push against an uninventoried zone.**
1. Export or inventory all current Cloudflare records, including DNSSEC, email, website, verification, and special-purpose records.
2. Select a management boundary for `domains/` registrations; preserve all externally managed labels.
3. Implement and test a DNSControl configuration or constrained Cloudflare API publisher with no accidental record deletion.
4. Verify NS delegation including glue requirements and DS rollover scenarios.
5. Require explicit dry-run diff review and a protected GitHub Environment for production updates.
6. Rehearse rollback on a nonproduction zone.
7. Only then add a publisher workflow, with production credentials withheld from untrusted pull requests.

The read-only `npm run preview:dns` command exports desired registrations but does not compare them to or change the live Cloudflare zone.

## Trust and privacy

The public repository is an audit ledger, not a confidential enrollment database. No private addresses, identification documents, or credentials belong in JSON registrations or pull requests. A future eligibility-verification process should store sensitive evidence outside the public repository.

