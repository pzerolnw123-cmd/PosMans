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

Additional requirements for ambiguous, visual, or behavior-sensitive work:
- do not guess when the user has provided a concrete reference, screenshot, recording, or described target behavior
- treat the user-provided reference as the source of truth unless the user explicitly says otherwise
- if a change is meant to match an existing layout, flow, device behavior, or prior state, compare against that target directly instead of inferring intent from nearby code
- when a result cannot be verified locally, say so explicitly and describe what remains uncertain
- do not say a UI, layout, or responsive behavior "matches", "is fixed", or "is back to normal" unless the relevant state has been checked against the target reference
- when changing responsive behavior, identify which breakpoints, device classes, input modes, or layout containers are being changed, and verify that unrelated target layouts are not being unintentionally affected
- when the user says not to change a specific area, treat that as a hard constraint and describe how the change respected it
- do not expand a page-specific fix into shared shells, shared layout primitives, or other pages unless the user explicitly asked for that broader scope
- when restoring a previous UI or layout state, identify what baseline or reference is being restored instead of relying on memory or inference
- before calling a change isolated, check whether the edited file or layout primitive is reused by other pages

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
- present inferred behavior as confirmed behavior
- describe a visual result as matching a reference if that was not actually verified against the reference
- hide TODOs or incomplete work in code without saying so
- introduce speculative fixes outside the requested scope without explaining them
- claim "no impact", "same as before", "restored", or "matched" without verification or an explicit statement that this is only the expected outcome
- use runtime-generated utility class names or other build-time-undetectable styling patterns unless the build setup already supports them explicitly

AI agents must:
- summarize what changed
- mention verification performed
- call out blockers, assumptions, and known risks
- prefer asking for approval before high-impact or ambiguous changes
- separate confirmed facts from guesses, expectations, or likely outcomes
- explicitly call out when a response is based on code inspection only versus direct validation
- name the exact files changed when reporting UI, layout, or responsive fixes
- for visual or responsive work, separate the handoff into:
  - confirmed
  - expected after the code change
  - not yet verified

## 8A. UI And Responsive Work

For UI, layout, and responsive tasks:
- prefer the smallest local fix before changing shared shells or cross-page layout primitives
- identify whether the issue is coming from shell spacing, page-level layout, component-level layout, overflow, or scrollbar/browser behavior before editing
- do not change both overall page structure and component sizing in the same pass unless there is a stated reason
- do not change both left and right spacing when the user identified only one side as incorrect
- if using Tailwind or similar utility compilation, avoid dynamic arbitrary-value classes unless they are safelisted or already established in the codebase
- state the intended scope explicitly:
  - one page only
  - all pages sharing the shell
  - desktop only
  - tablet only
  - phone only
  - portrait only
  - landscape only
- if the issue was shown in a screenshot, fix that exact area first before making broader visual adjustments elsewhere
- if the user names a specific screen, device class, breakpoint range, orientation, or target viewport, treat that as a locked scope and do not change other screen classes, breakpoints, or orientations unless the user explicitly expands the scope
- when working on a single device target, report which other screen classes were intentionally left untouched

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

For UI, layout, responsive, and reference-matching tasks also verify:
- the final result is compared against the provided screenshot, mock, or described reference state
- the intended viewport or device class is checked explicitly instead of inferred from screen size names alone
- nearby layouts that must remain unchanged were sanity-checked after the edit
- if a shared shell or layout primitive was changed, the handoff states whether the impact is page-specific or cross-page
- if the user asked to preserve a specific area, the handoff states how that constraint was protected

## 12. Project Validation Commands

Use the narrowest relevant check while developing, and run broader checks before handoff when feasible.

Frontend:
- `npm --prefix frontend run lint`
- `npm --prefix frontend run build`
- `npm --prefix frontend run build:smoke`
- `npm --prefix frontend run theme:contrast`
- `npm --prefix frontend run e2e:visual`

Backend:
- `npm --prefix backend test`

Security and readiness:
- `node scripts/security-secrets.mjs`
- `node scripts/production-readiness.mjs`
- `npm --prefix backend audit --audit-level=high`
- `npm --prefix frontend audit --audit-level=high`

Full local validation:
- `npm run verify`

Authenticated owner e2e:
- Requires a local database reachable by `backend/.env` or the current shell `DATABASE_URL`.
- Seed non-production e2e data with `npm --prefix backend run seed:e2e`.
- Run with:
  - `E2E_RUN_OWNER_FLOWS=1`
  - `E2E_OWNER_USERNAME=e2e.owner`
  - `E2E_OWNER_PASSWORD=E2eOwnerPassword123!`
  - `E2E_OWNER_PIN=123456`
  - `npm --prefix frontend run e2e:owner`
- These credentials are for local/CI e2e seed data only. Never reuse them for real stores.
- Owner e2e intentionally runs with one worker because login and PIN flows share account-level rate limits.

## 13. Generated Build Output

- `frontend/.next-build/**` is generated by `npm --prefix frontend run build`.
- Do not manually edit files under `frontend/.next-build/**`.
- If generated build output changes during validation, report it separately from source changes.
- Frontend development output uses `frontend/.next/**`; production build output uses `frontend/.next-build/**`.

## 14. Frontend Responsive Scope

- When the user names an exact viewport such as Desktop HD+ `1600x900`, scope visual fixes to that viewport only unless explicitly asked otherwise.
- Prefer exact media queries and responsive patterns already used in the codebase for POS-specific layouts.
- Do not broaden a viewport-specific fix into shared layout primitives, shared shells, or other pages without approval.
- For visual changes, report which viewport or device class was intentionally changed and which screen classes were intentionally left untouched.

## 15. Next.js Version

- This project uses Next.js 16 with Turbopack.
- Before changing Next.js config, App Router APIs, metadata, route handlers, or build behavior, inspect local Next.js docs or existing project patterns first.
- Keep `frontend/AGENTS.md` in mind for frontend-specific Next.js guidance.

## 16. Owner Override

Repository owners may override these rules for a specific task. The override should be explicit, limited in scope, and documented in the task, pull request, or issue.
