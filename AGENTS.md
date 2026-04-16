# AGENTS.md

This file defines the working rules for human contributors and AI coding agents in this repository.

The goals are:
- keep changes predictable and reviewable
- preserve security and maintainability
- prevent hidden shortcuts, silent behavior changes, and unverified code

These instructions apply unless a repository owner explicitly overrides them in writing.

## 1. Core Principles

- Make the smallest safe change that fully solves the problem.
- Prefer clarity over cleverness.
- Do not hide tradeoffs, risks, or incomplete work.
- Do not bypass validation, tests, review, or security controls to make code "seem done".
- Leave the codebase easier to understand than you found it.

## 2. Non-Negotiable Rules

- Never commit secrets, tokens, passwords, API keys, session data, private certificates, or production dumps.
- Never weaken authentication, authorization, validation, or audit logic without explicit approval.
- Never disable tests, linters, type checks, monitoring, or security checks just to make a change pass.
- Never add undocumented fallback behavior that changes business logic silently.
- Never use mock logic, hardcoded values, or temporary bypasses in production paths unless clearly marked, approved, and scoped.
- Never modify unrelated files unless the change is required for correctness.
- Never rewrite history or revert work you did not author unless explicitly instructed.

## 3. Required Way Of Working

For every meaningful change:
- understand the relevant code path before editing
- state assumptions when requirements are incomplete
- prefer existing patterns already used in the codebase
- keep diffs focused and easy to review
- add or update tests when behavior changes
- run the most relevant validation available
- document residual risks if full validation is not possible

## 4. Change Scope

Allowed:
- bug fixes
- focused refactors that reduce complexity without changing behavior
- tests
- docs that match the implemented behavior
- security hardening that does not break intended workflows

Needs explicit approval first:
- schema changes
- destructive data migrations
- dependency upgrades with behavioral impact
- auth or permission model changes
- public API changes
- large refactors across multiple modules
- disabling or loosening validation, rate limiting, logging, or security checks

## 5. Coding Standards

- Follow the existing project structure and naming patterns.
- Prefer explicit, readable code over dense abstractions.
- Keep functions small enough to reason about.
- Handle errors deliberately; do not swallow exceptions silently.
- Validate all external input at boundaries.
- Use parameterized queries and safe library APIs for database and shell interactions.
- Avoid global mutable state unless there is a strong documented reason.
- Add comments only where they explain intent or non-obvious constraints.

## 6. Security Expectations

All contributors and agents must:
- treat all input as untrusted
- validate and sanitize request data, file input, and external service responses where appropriate
- use least privilege for credentials and service access
- avoid logging secrets or sensitive personal data
- prefer allowlists over denylists for validation
- set safe defaults and fail closed when possible
- use maintained dependencies and pinned versions where practical

Read [SECURITY.md](./SECURITY.md) before making changes that affect authentication, authorization, secrets, dependencies, file handling, or external integrations.

## 7. Tests And Verification

Minimum expectations:
- add tests for bug fixes when a test can reproduce the issue
- add tests for new behavior
- update snapshots or fixtures only when behavior changes intentionally
- run the narrowest relevant checks during development
- run broader project validation before handing off when feasible

If you cannot run tests or checks:
- say exactly what was not run
- explain why
- describe the likely risk

## 8. Transparency Rules For AI Agents

AI agents must not:
- claim to have run tests they did not run
- claim code is secure without noting assumptions and limits
- fabricate logs, results, metrics, or user scenarios
- hide TODOs or incomplete work in code without saying so
- introduce speculative fixes outside the requested scope without explaining them

AI agents must:
- summarize what changed
- mention verification performed
- call out blockers, assumptions, and known risks
- prefer asking for approval before high-impact or ambiguous changes

## 9. File And Dependency Hygiene

- Keep files focused; avoid large mixed-purpose modules.
- Do not add new dependencies if the standard library or current stack can solve the problem reasonably.
- Any new dependency should have a clear purpose, active maintenance, and compatible licensing.
- Remove dead code only when you understand its usage and impact.
- Avoid adding generated files unless the repository intentionally tracks them.

## 10. Git And Review Hygiene

- Use clear, narrowly scoped commits.
- Keep pull requests reviewable.
- Do not mix refactors with behavior changes unless necessary.
- Include notes for migrations, breaking changes, new environment variables, or operational follow-up.

## 11. Recommended Delivery Checklist

Before considering work complete, verify:
- requirements were addressed
- no unrelated behavior was changed
- security-sensitive paths were considered
- tests were added or updated as needed
- relevant checks were run where possible
- documentation was updated if behavior or setup changed
- assumptions and residual risks are clearly stated

## 12. Owner Override

Repository owners may override these rules for a specific task. The override should be explicit, limited in scope, and documented in the task, pull request, or issue.
