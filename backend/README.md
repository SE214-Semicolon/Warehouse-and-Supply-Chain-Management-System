# Backend — Warehouse & Supply Chain Management System 🧭

Backend service for the Warehouse & Supply Chain Management System (NestJS + TypeScript, Prisma + PostgreSQL, MongoDB for operational data).

---

## Contents

- [Overview](#overview)
- [Quick links](#quick-links)
- [Prerequisites](#prerequisites)
- [Environment variables](#environment-variables)
- [Local setup](#local-setup)
- [Database migrations & seeding](#database-migrations--seeding)
- [Run (dev / prod / docker)](#run-dev--prod--docker)
- [Testing](#testing)
- [Health, metrics & logging](#health-metrics--logging)
- [CI / GitHub Actions notes](#ci--github-actions-notes)
- [Troubleshooting & tips](#troubleshooting--tips)
- [Contributing / Contacts](#contributing--contacts)
- [License](#license)

---

## Overview

This folder contains the NestJS backend application, Prisma schema and migrations, tests, linter and formatting configs, and deployment Dockerfiles & entrypoint scripts.

Primary responsibilities:

- Business logic for Inventory, Orders, Procurement, Logistics, Reporting, User/Auth
- Expose REST APIs and Prometheus-style metrics
- Background jobs and scheduled tasks (via NestJS scheduler)

---

## Quick links

- Root README: `../README.md`
- Architecture: `../docs/ARCHITECTURE.md`
- Database doc: `../docs/DATABASE.md`
- Runbook: `../docs/RUNBOOK.md`
- RBAC: `../docs/RBAC.md`
- Prisma schema: `prisma/schema.prisma`
- Migrations: `prisma/migrations`

---

## Prerequisites

- Node.js 20 LTS
- npm (or pnpm/yarn)
- PostgreSQL (or Testcontainers for tests)
- MongoDB (for operational data / audit logs)
- Docker (optional, for local compose or building images)

---

## Environment variables

Create `.env` in `/backend` for local development or rely on CI / platform env vars.

Key variables (examples):

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/warehouse_dev
MONGO_URL=mongodb://localhost:27017/warehouse_dev
JWT_ACCESS_SECRET=changeme
JWT_REFRESH_SECRET=changeme
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
RUN_MIGRATIONS=false
# Testcontainers (CI only)
TESTCONTAINERS_HOST_OVERRIDE=localhost
TESTCONTAINERS_RYUK_DISABLED=true
```

> Keep secrets out of source control. Use Azure Key Vault / GitHub Secrets in CI/CD.

---

## Local setup

1. Install dependencies and generate Prisma client

```bash
cd backend
npm ci
npx prisma generate
```

2. Run database migrations (development)

```bash
npm run db:migrate
# or
npx prisma migrate dev --name init
```

3. Start dev server

```bash
npm run start:dev
# default: http://localhost:3000
```

4. Format & lint

```bash
npm run format
npm run lint
```

---

## Database migrations & seeding

- Generate client: `npx prisma generate` (or `npm run prisma:generate`)
- Apply migrations (dev): `npx prisma migrate dev --name <name>`
- Apply migrations (prod): `npx prisma migrate deploy` or `npm run db:migrate:prod`
- Run seed script: `npx tsx prisma/seed.ts` (or via `npm run prisma:seed` if configured)

Important: Keep Prisma client in sync with `schema.prisma` after migration.

---

## Run (dev / prod / docker)

Development:

```bash
npm run start:dev
```

Production (build + run):

```bash
npm run build
npm run start:prod
```

Docker (build & run):

- Production image: `backend/Dockerfile.prod`
- Dev-friendly Dockerfile: `backend/Dockerfile.dev`

Example build & run:

```bash
docker build -f backend/Dockerfile.prod -t backend:latest ./backend
docker run -e DATABASE_URL="$DATABASE_URL" -p 3000:3000 backend:latest
```

Entrypoint script ensures migrations are run if `RUN_MIGRATIONS=true` and performs pre-checks.

---

## Testing

Available scripts in `package.json`:

- `npm run test:unit` — unit tests
- `npm run test:integration` — integration tests (uses Testcontainers for Postgres & MongoDB)
- `npm run test:smoke` — smoke tests
- `npm run test:full` — combination

Integration tests require Docker (Testcontainers) and may need these environment variables in CI:

```bash
TESTCONTAINERS_HOST_OVERRIDE=localhost
TESTCONTAINERS_RYUK_DISABLED=true
JWT_ACCESS_SECRET=ci-access-secret
JWT_REFRESH_SECRET=ci-refresh-secret
```

Run tests locally:

```bash
# unit
npm run test:unit
# integration
npm run test:integration
```

---

## Health, metrics & logging

- Health endpoint: `GET /health` (should return 200 when healthy)
- Metrics endpoint: `GET /metrics` (Prometheus format)
- Logging: Winston is used via `nest-winston`. Logs are structured JSON in production.
- Traces / APM: Application Insights integration exists for production deployments.

---

## CI / GitHub Actions notes

- Workflows reference backend steps in `.github/workflows/deploy-apps.yml` and `test-matrix.yml`.
- CI uses `npx prisma generate` before tests and runs integration tests inside GitHub Actions using Testcontainers.
- Coverage: currently a placeholder — we can add Codecov upload step to CI to enable the `coverage` badge.

---

## Troubleshooting & tips

- Prisma client errors after migration: run `npx prisma generate` and restart the app.
- DB connection refused: verify `DATABASE_URL` and that Postgres is accessible from the app container/host.
- Testcontainers failing in CI: ensure Docker or runner supports testcontainers in GitHub Actions (set `TESTCONTAINERS_HOST_OVERRIDE=localhost` and `TESTCONTAINERS_RYUK_DISABLED=true`).
- Slow startup: check migrations or external services (DB, Mongo) connectivity.

---

## Contributing / Contacts

- Open a PR with tests and update `docs/` for any behavior changes.
- For infra changes (Terraform): notify the DevOps owner and include runbook updates.
- Backend maintainers: see `docs/RUNBOOK.md` for contact and roles.

---

## License

This backend code follows the repository license: **MIT**. See [../LICENSE](../LICENSE).

---

If you'd like, I can also:

- Add a short `CONTRIBUTING.md` snippet specifically for backend PRs and reviewers
- Add VS Code launch configurations or a `.env.example` file to the `backend/` folder

---
