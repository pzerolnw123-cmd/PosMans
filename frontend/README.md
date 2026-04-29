# POS MANS Frontend

This is the Next.js frontend for POS MANS.

## Commands

```bash
npm --prefix frontend run dev
npm --prefix frontend run lint
npm --prefix frontend run build
npm --prefix frontend run e2e
```

## Environment

Copy `frontend/.env.example` to `frontend/.env` for local development.

Production deployments must set:

- `BACKEND_URL`
- `NEXT_PUBLIC_BACKEND_URL`
- `NEXT_PUBLIC_SESSION_COOKIE_NAME`
- `NEXT_PUBLIC_CSRF_COOKIE_NAME`
- `NEXT_PUBLIC_R2_PUBLIC_BASE_URL` when serving uploaded images from R2

Run the repository-level release check before production:

```bash
npm run release:check
```
