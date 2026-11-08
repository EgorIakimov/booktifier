# Security Policy

## Reporting a vulnerability

Report vulnerabilities privately through [GitHub security advisories](https://github.com/EgorIakimov/booktifier/security/advisories/new). Include reproduction steps with synthetic data. Keep passwords, tokens, and private documents out of public issues.

## Data handling

The app stores Gmail app passwords and email addresses in browser localStorage. The server receives the password during delivery, uses it in memory, and connects to Gmail over TLS. Uploaded EPUBs are processed in memory.

Deploy behind HTTPS. Caddy persists certificate material in its named volumes. The supplied configuration has no application access accounts, so the service is publicly reachable.
