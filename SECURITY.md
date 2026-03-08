# Security Policy

## Supported Versions

We actively maintain the latest released version of Talkient.Extension.

| Version | Supported |
|---------|-----------|
| latest  | ✅        |
| older   | ❌        |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub Issues.**

To report a vulnerability, open a [GitHub Security Advisory](https://github.com/Talkient/Talkient.Extension/security/advisories/new) (private disclosure). This lets us triage and patch the issue before any public disclosure.

Please include:
- A description of the vulnerability and its potential impact.
- Steps to reproduce or a proof-of-concept.
- Affected versions (if known).

We aim to acknowledge reports within **72 hours** and to provide a resolution timeline within **14 days**.

## Scope

This policy covers the source code in this repository. Out-of-scope items include:
- Third-party services (Google OAuth, Chrome Web Store, etc.).
- Vulnerabilities in browser engine internals that are not caused by extension code.

## Notes on the OAuth2 `client_id`

The `client_id` field in `manifest.json` is a **public identifier** required by the Chrome Identity API. It is intentionally exposed in Chrome extension manifests (including on the Chrome Web Store) and is **not a secret**. The security of the OAuth2 flow is guaranteed by the protocol itself, not by keeping the client ID confidential.
