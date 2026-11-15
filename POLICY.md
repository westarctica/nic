# WNIC Registration Policy — DRAFT

**Not yet in effect. Public registration is not open.**

## Purpose
WNIC proposes to assign names below `westarctica.net` to approved people, institutions, and services associated with Westarctica. Assignments remain subordinate to the operator's control of the parent domain; they are **not** ICANN-accredited registrations or property interests.

## Names
- Reserved operational names such as `nic`, `ca`, and `www` cannot be claimed through ordinary applications.
- Institutional identifiers such as `ellsworth` belong to the institution or office, not the current officeholder. `data/institutions.json` is the explicit assignment ledger; an administrative custodian can change without transferring the assignment. A GitHub username is not proof of personal ownership.
- `ellsworth.westarctica.net` is the first institutional allocation (Office of the Ellsworth King of Arms); it is pending DNS/website configuration.
- Names may be refused or reassigned for impersonation, abuse, confusion, conflict, or operational necessity, following a documented decision.
- Nested names require control of the parent registration and may not be created beneath a delegated NS zone.

## Records
The registry schema supports A, AAAA, CNAME, CAA, MX, TXT, NS and DS records. DNS delegation and its trust consequences are the registrant's responsibility. Records are subject to technical validation and manual review.

### Web forwarding
A registrant may request an explicit `service.type = "redirect"` instead of DNS records. WNIC handles HTTPS on the assigned hostname and returns an HTTP redirect to the approved target, with specified status and path/query behavior. Redirect registrations do not confer an entitlement to proxy content, impersonate another website, or use internal/private destinations. Existing forwarding changes and transfers require approval.

### Email forwarding (not yet operational)
Mailbox aliases such as `example@westarctica.net` are separate from subdomain registrations and require destination mailbox verification and explicit consent. Destinations must be kept confidential. No email addresses are operational until the Email Routing policy and MX configuration are approved.

## Conduct and changes
No phishing, malware, impersonation, or illegal exploitation of the namespace. Names must be maintained by a reachable custodian. Transfers, revocations, and institutional succession will be recorded through a reviewable administrative process.

## Data minimization
Approved registration files and pull requests are public. Applicants should not publish private email addresses, identity documents, personal addresses, passwords or tokens. Eligibility evidence should be exchanged using an appropriately private channel.

## Status
This draft requires explicit adoption, an abuse contact, an appeals process, and publication of eligibility rules before public registration begins.
