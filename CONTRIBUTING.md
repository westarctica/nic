# Preparing a WNIC registration request

Public applications are **not open yet**. HTTPS website forwarding is operational in a limited, manually reviewed pilot. Prepare a request using these instructions, but wait for the opening announcement before submitting a public application. The [draft policy](POLICY.md) still requires adoption.

## Choose a service

| Service | What it does | Current status |
| --- | --- | --- |
| Website forwarding | Redirects an assigned hostname to an existing public HTTPS website; the browser shows the destination URL | Operational pilot |
| DNS records | Publishes records for a host that accepts the assigned hostname and provides HTTPS | Schema validation supported; general publication under development |
| NS delegation | Delegates DNS administration of an assigned subdomain to another provider | Schema validation supported; general publication under development |
| Email forwarding | Forwards incoming mail to a privately verified mailbox | Not yet available |

A CNAME is not a website redirect. Your hosting provider must accept the custom hostname and provide HTTPS if you want the Westarctican address to remain visible.

## Website-forwarding requests

1. Check your proposed name at https://nic.westarctica.net/#names. Use only the label before `.westarctica.net`: 1–63 lowercase letters, digits, or single hyphens, with a letter or digit at each end. Consecutive hyphens are not accepted. A name absent from the ledger is not guaranteed to be available or approved.
2. Choose the full public HTTPS URL of a website you control or are authorized to represent.
3. Fork https://github.com/westarctica/nic and add `domains/yourname.json`, replacing `yourname` with the requested name. Replace the username and target in this example:

```json
{
  "owner": { "username": "YOUR-GITHUB-USERNAME" },
  "service": {
    "type": "redirect",
    "target": "https://example.org",
    "status": 301,
    "preservePath": true,
    "preserveQuery": true
  }
}
```

4. If using a local checkout with Node.js 20 or later, run `npm test` and `npm run validate`. GitHub also runs checks on pull requests.
5. When applications open, review the policy and submit a pull request to `westarctica/nic`. Explain whom the name represents and confirm authority to use the destination. Checks validate the file; maintainers decide approval.
6. After approval and merge, wait for successful forwarding publication, then test your address over HTTPS. Merge alone does not confirm activation.

This example requests a permanent 301 redirect, which browsers may cache. With preservation enabled, `yourname.westarctica.net/news?year=2026` forwards to `https://example.org/news?year=2026`. Set either preservation option to `false` if unwanted. Do not combine `service` with `records`.

## DNS and delegation requests

These examples document supported registration formats, not a promise of live provisioning. Coordinate activation with a maintainer while general DNS publication remains under development.

CNAME example:

```json
{
  "owner": { "username": "example-user" },
  "records": { "CNAME": "site.example.org" }
}
```

Delegation example:

```json
{
  "owner": { "username": "example-user" },
  "records": { "NS": ["ns1.example.org", "ns2.example.org"] }
}
```

NS records may include validated DS records for DNSSEC. NS cannot be mixed with other hosted records at the delegated owner name, except DS. A DNS provider must support delegation of your assigned subdomain.

## Review and privacy

GitHub usernames identify administrative custodians. Institutional assignments require separate approval and remain with their office or institution when the administrator changes. Names are reviewed for eligibility, reservation, confusion, impersonation, and abuse.

Registration files, pull requests, and their history are public. Never submit private email addresses, identity documents, passwords, tokens, or confidential evidence. Do not publish sensitive information in issues.

## Changes, transfers, and withdrawal

During the pilot, open an issue at https://github.com/westarctica/nic/issues/new describing the requested change. A maintainer must review and arrange publication. Existing redirect changes and removals require an explicit migration: modifying or deleting a registration file alone does not update or remove the live service.

## Email requests

Email forwarding is not yet available. Domain registration does not create a mailbox or alias. Future aliases will require verification of a reachable destination; private recipient addresses must not enter the public ledger. See [the email plan](docs/EMAIL-ROUTING.md).
