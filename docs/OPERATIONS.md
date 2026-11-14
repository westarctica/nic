# Operations and launch gates

## State as of bootstrap

- `westarctica.net` is registered, and Cloudflare hosts its DNS.
- The repository has a `CLOUDFLARE_API_TOKEN` **secret** and `CLOUDFLARE_ACCOUNT_ID` **variable**, as supplied by the administrator.
- **No GitHub workflow uses those values.** This repository does not currently create, alter, or delete Cloudflare records.
- `nic.westarctica.net` is the intended public service; `ellsworth.westarctica.net` is separately reserved for the office of the Ellsworth King of Arms.

## Stage 1: publishing the website

The `site/` directory is a simple static website. Deploy with Cloudflare Pages using:
- Build command: `npm run build:site`
- Output directory: `dist`
- Root directory: repository root
- Custom hostname: `nic.westarctica.net` (configure explicitly in Cloudflare)

Deployment only hosts the website; it does not publish registrations or manipulate the DNS zone.

## Stage 2: enabling registration

Before accepting requests:
1. Adopt the draft policy and identify the authority entitled to approve institutional registrations.
2. Establish a maintainer/approver team and protect `main` with required CI, code review, and no direct pushes.
3. Confirm that reserved names match existing Cloudflare DNS and anticipated infrastructure.
4. Document identity/custodianship proof for institutional applicants.
5. Announce registration availability on the website and publish request instructions.

## Stage 3: enabling DNS changes (NOT YET IMPLEMENTED)

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
