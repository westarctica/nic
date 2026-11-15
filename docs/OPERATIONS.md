# Operations and launch gates

## State as of bootstrap

- `westarctica.net` is registered, and Cloudflare hosts its DNS.
- The repository has a `CLOUDFLARE_API_TOKEN` **secret** and `CLOUDFLARE_ACCOUNT_ID` **variable**, as supplied by the administrator.
- Only the narrowly scoped Krigsvold pilot workflow consumes the Cloudflare credentials, creating `krigsvold.westarctica.net` as an unproxied CNAME to `krigsvold.org` if absent. It cannot update, delete, or synchronize any other record.
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

## Krigsvold first-registration pilot

- File: `domains/krigsvold.json`; custodian `howardjp`.
- Desired record: `krigsvold.westarctica.net` CNAME `krigsvold.org`, `proxied: false`.
- `publish-krigsvold.yml` runs on approved changes to main; it validates the full registry and dry-runs before contacting Cloudflare.
- It requires Zone Read and DNS Write token permissions in the account identified by `CLOUDFLARE_ACCOUNT_ID`.
- Existing matching records are left unchanged; conflicts cause failure. No other record can be updated or deleted.
- Destination web routing and HTTPS are separate future work.
