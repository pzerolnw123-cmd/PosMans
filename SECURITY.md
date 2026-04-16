# SECURITY.md

This document defines the minimum security expectations for this repository.

It is written to be practical for day-to-day engineering work, code review, and AI-assisted development.

## 1. Scope

This policy applies to:
- application code
- scripts and automation
- infrastructure-related code in this repository
- test fixtures and local development data
- human contributors and AI agents making changes here

## 2. Security Principles

- Least privilege: give users, services, and tokens only the access they need.
- Defense in depth: do not rely on a single control.
- Secure by default: default settings should be the safest reasonable behavior.
- Fail closed: deny access or reject unsafe input when validation is uncertain.
- Traceability: security-relevant changes should be understandable and reviewable.

## 3. Secrets Management

Rules:
- Do not commit secrets to the repository.
- Do not place secrets in source files, test files, example configs, logs, screenshots, or documentation.
- Use environment variables or an approved secret manager for credentials.
- Provide a redacted example config when documentation needs to show required variables.
- Rotate any credential immediately if it may have been exposed.

Examples of secrets:
- API keys
- database passwords
- JWT signing keys
- OAuth client secrets
- private certificates and private keys
- cloud access tokens
- session cookies

If a secret is committed accidentally:
1. Remove it from current code immediately.
2. Rotate or revoke it.
3. Assess whether history cleanup is required.
4. Document the incident to the repository owner.

## 4. Authentication And Authorization

- Centralize auth logic where possible.
- Do not trust client-side authorization checks alone.
- Enforce authorization on the server or trusted backend boundary.
- Validate identity, role, tenant, and resource ownership explicitly.
- Prefer deny-by-default behavior for protected resources.
- Any auth or permission model change requires explicit review.

## 5. Input Validation And Output Handling

Treat all external input as untrusted, including:
- HTTP requests
- form fields
- query parameters
- headers
- uploaded files
- webhook payloads
- CLI arguments
- environment variables
- third-party API responses

Requirements:
- validate input at system boundaries
- enforce type, format, size, and allowed-value constraints
- reject unexpected fields where practical
- encode output appropriately for its destination
- avoid dynamic evaluation of untrusted input

Specific concerns:
- prevent SQL injection by using parameterized queries
- prevent command injection by avoiding shell composition with untrusted values
- prevent path traversal by normalizing and constraining file paths
- prevent XSS by escaping or sanitizing rendered content appropriately
- prevent SSRF by restricting outbound network targets where relevant

## 6. File Uploads And File Processing

If the project accepts or processes files:
- validate content type and extension
- enforce file size limits
- generate safe server-side filenames where possible
- store uploads outside directly executable locations when practical
- scan or inspect high-risk file types if the stack supports it
- never trust client-provided filenames or MIME types alone

## 7. Logging And Sensitive Data

- Do not log secrets, tokens, passwords, full payment data, or private personal data.
- Log only the minimum data needed for debugging and auditability.
- Redact sensitive values before writing logs.
- Avoid returning internal errors or stack traces to end users in production.

## 8. Dependencies And Supply Chain

- Prefer mature, maintained libraries from reputable sources.
- Pin versions using the package manager's lockfile or equivalent.
- Remove unused dependencies.
- Review new dependencies for maintenance, license fit, and security history.
- Run dependency vulnerability checks as part of CI when supported by the stack.

Recommended controls:
- lockfiles committed to the repo
- automated dependency update tooling
- vulnerability scanning in CI

## 9. Secure Configuration

- Keep production and development configuration separate.
- Do not enable debug mode in production.
- Use secure cookie settings where applicable.
- Use HTTPS in production for all authenticated or sensitive traffic.
- Set timeouts, size limits, and rate limits for externally reachable interfaces where applicable.

## 10. Data Protection

- Collect only the data required for the feature.
- Avoid storing sensitive data unless it is necessary.
- Apply retention limits where feasible.
- Mask or tokenize sensitive identifiers when full values are not needed.
- Use encryption in transit and at rest when handling sensitive data.

## 11. Security Testing Expectations

At minimum, contributors should:
- run relevant tests for changed code
- add regression tests for security-sensitive bugs when feasible
- review changed code for input validation, auth, secrets handling, and unsafe deserialization or execution paths

For higher-risk changes, also consider:
- dependency audit
- static analysis
- permission boundary review
- manual abuse-case testing

## 12. Vulnerability Reporting

If you discover a suspected vulnerability:
- do not publish exploit details in public issues
- report it privately to the repository owner or designated security contact
- include affected area, impact, reproduction steps, and any suggested mitigation

If this repository will be public or team-shared, add a maintained contact here, for example:
- Security contact: `security@your-domain.example`

## 13. High-Risk Changes Requiring Extra Review

Require explicit review for:
- authentication changes
- authorization changes
- cryptography changes
- file upload or parsing features
- deserialization logic
- external webhook processing
- payment flows
- multi-tenant data access
- infrastructure or deployment permission changes

## 14. AI Agent Security Rules

AI agents working in this repository must:
- follow [AGENTS.md](./AGENTS.md)
- avoid inventing security guarantees
- clearly state when security validation was not performed
- not introduce debug backdoors, default credentials, or hidden bypasses
- not disable security checks to make tests pass

## 15. Suggested CI Security Baseline

When the repository adds CI, the baseline should include:
- lint
- tests
- type checking where supported
- dependency vulnerability scan
- secret scanning

Examples:
- `npm audit` or equivalent
- `pip-audit`
- `osv-scanner`
- secret scanning such as Gitleaks or GitHub Advanced Security features

## 16. Review Checklist

Before merging a security-relevant change, check:
- no secrets were added
- inputs are validated at the boundary
- auth and authorization still hold
- logs do not expose sensitive data
- dependencies are justified
- tests cover the changed behavior
- risky assumptions are documented
