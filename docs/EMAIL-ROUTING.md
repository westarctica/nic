# WNIC Email Forwarding — Proposed Service

**Status: design only. No mail exchange (MX) records have been changed and no aliases are active.**

## Purpose

WNIC could offer receiving-only aliases such as `krigsvold@westarctica.net` or `example@westarctica.net`, forwarded to an independently owned, verified mailbox. Unlike the web registry, these are addresses at the **apex domain**, not DNS names beneath it.

A website assignment such as `smith.westarctica.net` does **not** automatically grant `smith@westarctica.net`. Alias eligibility, collisions and transfers need their own approval policy.

## Cloudflare backend

Use [Cloudflare Email Routing](https://developers.cloudflare.com/email-service/configuration/email-routing-addresses/):

1. Review the live `westarctica.net` MX, SPF, DKIM and DMARC records and any existing mailbox services. Enabling Email Routing can require exclusive use of the root MX records; do **not** change mail delivery until this inventory is complete.
2. Activate Email Routing for `westarctica.net` only after confirming no existing mail service will be disrupted.
3. Obtain a prospective destination address privately. Cloudflare emails a verification link to that recipient; the holder must confirm it.
4. Create an alias routing rule only after destination verification, owner approval, and an abuse review.
5. Use exact-address rules; leave catch-all disabled initially to avoid spam and accidental disclosure.
6. Validate actual delivery, forwarding headers, spam behavior, and the process for revoking or changing the destination.

Cloudflare's October 2026 limits include **200 routing rules per domain** and **200 destination addresses per account**; check its current limits before scaling.

## Proposed public ledger

The GitHub ledger could record a claim in `email/aliases/<local-part>.json` with only non-sensitive fields such as:

```json
{
  "alias": "example",
  "custodian": "example-user",
  "type": "individual",
  "status": "pending"
}
```

The destination mailbox, private identity evidence, verification token, and Cloudflare destination identifier should be managed in a restricted administrative system, **not committed to the public repository or printed in CI logs**. A production implementation must check the actual Cloudflare-verified destination state before enabling a rule.

This schema is illustrative; it is not implemented yet.

## Administration and safety

- Reserve names such as `postmaster`, `abuse`, `security`, `hostmaster`, `admin`, `nic`, `ellsworth`, `government`, and `mail` for institutional administration.
- An official alias belongs to its **office or institution**, not to an incumbent; handoff requires verified authorization and a new destination verification.
- Do not promise mailboxes, SMTP sending, replies **from** the alias, storage, or S/MIME certificates. Those are distinct products and require separate engineering and policies.
- Cloudflare requires verified forwarding destinations. For applicant privacy, verification evidence should be handled in a protected administrative workflow.
- Route changes and deletion must have audit logs and an abuse-response procedure.
- Email Routing must use a **separately scoped** Cloudflare API token with Email Routing Rules permissions, rather than broadening the DNS/web-forwarding publisher's token unnecessarily.
- Start with manual onboarding of a few institutional aliases. A public alias-registration interface can follow if the service proves useful.

## Launch checklist

- [ ] Confirm MX/SPF/DKIM/DMARC records and existing mail services.
- [ ] Approve email alias eligibility, reserved names, identity verification, abuse, and handoff policies.
- [ ] Set up Cloudflare Email Routing for the root domain.
- [ ] Create and verify the first forwarding destination privately.
- [ ] Test a single alias, message delivery, and revocation.
- [ ] Build a private-destination-aware integration and registrar workflow.
- [ ] Open email alias registration only after these checks succeed.
