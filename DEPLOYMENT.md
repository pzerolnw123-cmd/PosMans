# POS MANS Production Runbook

This runbook is the required release checklist before using POS MANS for real stores or real transactions.

## Release Gate

Run this from the repository root before a production release:

```bash
npm run release:check
```

The command intentionally fails until the production environment has been verified. Do not set acknowledgement variables to `true` unless the corresponding infrastructure item has actually been checked.

## Required Environment

Backend production environment:

- `NODE_ENV=production`
- `FRONTEND_URL=https://<frontend-domain>`
- `DATABASE_URL=postgresql://...?sslmode=require` or `sslmode=verify-full`
- `DIRECT_DATABASE_URL=postgresql://...?sslmode=require` or `sslmode=verify-full`
- `SESSION_SECRET=<unique random value with at least 32 characters>`
- `TRUST_PROXY=true` when running behind a proxy or load balancer
- `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT`, and `R2_PUBLIC_BASE_URL` when uploads are enabled

Frontend production environment:

- `BACKEND_URL=https://<backend-domain>`
- `NEXT_PUBLIC_BACKEND_URL=https://<backend-domain>`
- `NEXT_PUBLIC_SESSION_COOKIE_NAME` must match backend `SESSION_COOKIE_NAME`
- `NEXT_PUBLIC_CSRF_COOKIE_NAME` must match backend CSRF cookie naming
- `NEXT_PUBLIC_R2_PUBLIC_BASE_URL` should match the public upload origin when images are served from R2

## Operational Acknowledgements

Set these to `true` only after verification:

- `HTTPS_CERTIFICATE_CONFIRMED`: frontend and backend production domains serve valid HTTPS certificates.
- `R2_BUCKET_POLICY_CONFIRMED`: the R2 bucket blocks public writes; uploads go through short-lived signed URLs only; public reads are limited to intended uploaded objects.
- `DATABASE_BACKUP_CONFIRMED`: automated backups are enabled and at least one restore test has been completed.
- `MONITORING_ALERTS_CONFIRMED`: alerts cover login spikes, upload spikes, checkout errors, backend 5xx rates, database errors, and audit-log write failures.
- `SECRET_MANAGER_CONFIRMED`: production secrets are stored in the deployment platform secret manager or another protected secret store.

## Dependency Risk

Before release, run:

```bash
npm run security:audit
```

High severity findings block release. Moderate transitive findings without an available fix must be recorded in the release notes with their package path and advisory URL.


## Smoke Test

After deployment:

1. Open `/health` on the backend and confirm `{ "ok": true }`.
2. Log in as a store owner.
3. Create or edit a product.
4. Complete a sale and confirm inventory changes.
5. Open the receipt/PDF flow.
6. Upload a product image or store logo if uploads are enabled.
7. Confirm protected pages redirect to `/login` after logout.

## Rollback

Before release, confirm the rollback target and database restore point. If checkout, login, product updates, or upload signing fail after deployment, roll back the application first, then assess whether a database restore is required.
