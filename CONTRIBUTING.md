# Registration requests — prelaunch documentation

Public applications are **not open yet**. This document describes the planned GitHub-based process.

1. Choose an unreserved single-label name such as `smith`.
2. Add a file named `domains/smith.json` with a GitHub custodian and the intended DNS records.
3. Run `npm test` and `npm run validate`.
4. Submit a pull request for review after the registry has announced that it is accepting applications.
5. Once DNS publication is enabled, approved registrations will be published separately from the pull-request validation workflow.

An illustrative CNAME registration (replace the examples with actual information):

```json
{
  "owner": { "username": "example-user" },
  "holder": { "kind": "individual", "name": "Example Registrant" },
  "records": { "CNAME": "site.example.org" }
}
```

An illustrative **delegation**:

```json
{
  "owner": { "username": "example-user" },
  "records": {
    "NS": ["ns1.example.org", "ns2.example.org"]
  }
}
```

NS records may be accompanied by validated DS records for DNSSEC. NS cannot be mixed with A, MX, TXT, or other hosted records at the same delegated owner name.

GitHub usernames identify the person managing a registration. Institutional assignments must be approved separately and remain with the institution when the administrator changes. Never submit sensitive identity documents or passwords in a public pull request.
