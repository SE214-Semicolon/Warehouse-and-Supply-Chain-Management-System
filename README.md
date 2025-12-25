# Warehouse & Supply Chain Management System 🚚📦

[![Code Check](https://img.shields.io/github/actions/workflow/status/ataraxia1630/Warehouse-and-Supply-Chain-Management-System/code-check.yml?branch=main&label=code%20check&logo=github)](https://github.com/ataraxia1630/Warehouse-and-Supply-Chain-Management-System/actions)
[![Run Tests](https://img.shields.io/github/actions/workflow/status/ataraxia1630/Warehouse-and-Supply-Chain-Management-System/test-matrix.yml?branch=main&label=tests&logo=github)](https://github.com/ataraxia1630/Warehouse-and-Supply-Chain-Management-System/actions)
[![Deploy Apps](https://img.shields.io/github/actions/workflow/status/ataraxia1630/Warehouse-and-Supply-Chain-Management-System/deploy-apps.yml?branch=main&label=deploy%20apps&logo=github)](https://github.com/ataraxia1630/Warehouse-and-Supply-Chain-Management-System/actions)
[![Deploy Infra](https://img.shields.io/github/actions/workflow/status/ataraxia1630/Warehouse-and-Supply-Chain-Management-System/deploy-infrastructure.yml?branch=main&label=deploy%20infra&logo=github)](https://github.com/ataraxia1630/Warehouse-and-Supply-Chain-Management-System/actions)

[![Backend Image](https://img.shields.io/ghcr/v/se214-semicolon/warehouse-and-supply-chain-management-system/backend?label=backend%20image&logo=docker)](https://ghcr.io/se214-semicolon/warehouse-and-supply-chain-management-system/backend)
[![Frontend Image](https://img.shields.io/ghcr/v/se214-semicolon/warehouse-and-supply-chain-management-system/frontend?label=frontend%20image&logo=docker)](https://ghcr.io/se214-semicolon/warehouse-and-supply-chain-management-system/frontend)

[![Coverage](https://img.shields.io/codecov/c/gh/ataraxia1630/Warehouse-and-Supply-Chain-Management-System?label=coverage&logo=codecov)](https://codecov.io/gh/ataraxia1630/Warehouse-and-Supply-Chain-Management-System)
[![Releases](https://img.shields.io/github/v/release/ataraxia1630/Warehouse-and-Supply-Chain-Management-System?label=release&logo=github)](https://github.com/ataraxia1630/Warehouse-and-Supply-Chain-Management-System/releases)
[![Issues](https://img.shields.io/github/issues/ataraxia1630/Warehouse-and-Supply-Chain-Management-System?logo=github)](https://github.com/ataraxia1630/Warehouse-and-Supply-Chain-Management-System/issues)
[![PRs](https://img.shields.io/github/issues-pr/ataraxia1630/Warehouse-and-Supply-Chain-Management-System?logo=github)](https://github.com/ataraxia1630/Warehouse-and-Supply-Chain-Management-System/pulls)
[![Last Commit](https://img.shields.io/github/last-commit/ataraxia1630/Warehouse-and-Supply-Chain-Management-System?logo=github)](https://github.com/ataraxia1630/Warehouse-and-Supply-Chain-Management-System/commits/main)
[![License](https://img.shields.io/github/license/ataraxia1630/Warehouse-and-Supply-Chain-Management-System?logo=github)](https://github.com/ataraxia1630/Warehouse-and-Supply-Chain-Management-System/blob/main/LICENSE)

---

### Tech & Tooling

[![TypeScript](https://img.shields.io/badge/TypeScript-%233178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Node](https://img.shields.io/badge/node-v20-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![NestJS](https://img.shields.io/badge/NestJS-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com)
[![Prisma](https://img.shields.io/badge/Prisma-0EA5E9?logo=prisma&logoColor=white)](https://www.prisma.io)
[![React](https://img.shields.io/badge/React-%2320232a?logo=react&logoColor=%2361DAFB)](https://reactjs.org)
[![Vite](https://img.shields.io/badge/Vite-%2366C89D?logo=vite&logoColor=white)](https://vitejs.dev)
[![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)](https://www.docker.com)
[![Terraform](https://img.shields.io/badge/Terraform-623CE4?logo=terraform&logoColor=white)](https://www.terraform.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com)
[![ESLint](https://img.shields.io/badge/ESLint-4B32C3?logo=eslint&logoColor=white)](https://eslint.org)
[![Prettier](https://img.shields.io/badge/Prettier-F7B93E?logo=prettier&logoColor=white)](https://prettier.io)
[![Playwright](https://img.shields.io/badge/Playwright-000000?logo=playwright&logoColor=white)](https://playwright.dev)
[![Testcontainers](https://img.shields.io/badge/Testcontainers-3C873A?logo=testcontainers&logoColor=white)](https://www.testcontainers.org)

---

**Modular Monolith** warehouse and supply-chain management platform (Backend: NestJS + Prisma, Frontend: React) with a full DevOps lifecycle (CI/CD, IaC, Monitoring, Runbook). This repo contains source code, CI workflows, Terraform IaC, and operational documentation.

---

## Table of contents

- [Project Status](#project-status)
- [Key features](#key-features)
- [Architecture & modules](#architecture--modules)
- [Tech stack](#tech-stack)
- [Repository layout](#repository-layout)
- [Quickstart (Local development)](#quickstart-local-development)
  - [Prerequisites](#prerequisites)
  - [Backend (dev)](#backend-dev)
  - [Frontend (dev)](#frontend-dev)
  - [Database & Migrations](#database--migrations)
  - [Docker & compose (local)](#docker--compose-local)
- [Testing](#testing)
- [CI / CD](#ci--cd)
- [Infrastructure & Deployment](#infrastructure--deployment)
- [Monitoring & Observability](#monitoring--observability)
- [Security & RBAC](#security--rbac)
- [Useful scripts & commands](#useful-scripts--commands)
- [Contributing & contacts](#contributing--contacts)
- [References & docs](#references--docs)

---

## Project status ✅

**Near-complete / final development phase.** Core modules (Product, Warehouse, Inventory, Procurement, Sales, Logistics, Reporting, User/Auth, Audit) are implemented. CI pipelines, IaC and monitoring are in place; remaining tasks are final hardening and docs completion before final demo.

---

## Key features ✨

- Modular monolith architecture (bounded contexts) with layered controllers/services/repositories
- Transactional data in PostgreSQL (Prisma ORM) and operational data (audit/alerts) in MongoDB
- JWT-based auth + RBAC
- Test matrix: unit, smoke, integration tests (Testcontainers for DBs), frontend e2e (Playwright)
- CI/CD via GitHub Actions with Blue-Green deployment pattern for production
- IaC with Terraform targeting Azure (App Services, DBs, Grafana, monitoring)
- Monitoring: Prometheus metrics, Grafana dashboards, Application Insights

---

## Architecture & modules 🏗️

- Pattern: **Modular Monolith** (NestJS) applying DDD concepts and 3-layered module structure (Controller → Service → Repository)
- Key bounded contexts: Product, Warehouse, Inventory, Procurement (Supplier), Sales (Orders), Logistics (Shipments), Demand Planning, Reporting, Alerts, User Management, Audit/Compliance

See `docs/ARCHITECTURE.md` for detailed diagrams and rationale.

---

## Tech stack 🔧

- Backend: Node.js 20 + NestJS (TypeScript)
- ORM: Prisma (Postgres)
- Databases: PostgreSQL (Neon DB), MongoDB (Atlas)
- Frontend: React (Vite)
- Containerization: Docker, Docker Compose
- CI/CD: GitHub Actions
- IaC: Terraform
- Monitoring: Azure Managed Grafana, Azure Monitor (Prometheus), Application Insights

---

## Repository layout 📁

- `/backend` — NestJS app, Prisma schema, scripts, tests
- `/frontend` — React app (Vite), Playwright e2e tests
- `/iac` — Terraform modules & envs (production, staging)
- `/docs` — Architecture, Runbook, Monitoring, DB, RBAC, Rollback Playbook
- `docker-compose.yml`, `Dockerfile.prod`, `nginx.conf` — deployment artifacts
- `.github/workflows` — CI/CD pipelines

---

## Quickstart (Local development) ⚡

### Prerequisites

- Node.js 20 LTS
- npm (or pnpm/yarn)
- Docker (for running DBs or compose)
- Terraform (only if working with `iac/`)

### Backend (dev)

1. Install deps and generate Prisma client

```bash
cd backend
npm ci
npx prisma generate
```

2. Copy or create `.env` (example environment variables)

```env
DATABASE_URL=postgresql://localhost:5432/warehouse_dev
MONGO_URL=mongodb://localhost:27017/warehouse_dev
JWT_ACCESS_SECRET=changeme
JWT_REFRESH_SECRET=changeme
NODE_ENV=development
PORT=3000
```

3. Run migrations (development)

```bash
npm run db:migrate
# or use prisma directly
npx prisma migrate dev --name init
```

4. Start dev server

```bash
npm run start:dev
# Backend default: http://localhost:3000
```

> Health check: `GET /health` (returns 200 when healthy)

### Frontend (dev)

```bash
cd frontend
npm ci
npm run dev
# Frontend default: Vite (e.g., http://localhost:5173)
```

### Database & Migrations

- Migrations are managed by Prisma. Use `npm run prisma:generate`, `npm run db:migrate`, and `npx prisma studio` to inspect the DB.
- Seed: `npx tsx prisma/seed.ts` (configured in backend `prisma.seed`)

### Docker & compose (local)

Quick start using Docker Compose (builds/proxies frontend + backend)

```bash
# at repo root
docker-compose up --build
```

Images are also published to GitHub Container Registry under the naming convention: `ghcr.io/se214-semicolon/warehouse-and-supply-chain-management-system/{backend,frontend}`.

---

## Testing 🧪

- Backend unit tests: `npm run test:unit` (in `/backend`)
- Integration tests (Testcontainers): `./scripts/run-tests-by-type.sh integration`
- Smoke & sanity tests available under `scripts/`
- Frontend unit: `npm run test` (in `/frontend`)
- Frontend e2e: `npm run test:e2e` (Playwright)

CI runs a test matrix (`.github/workflows/test-matrix.yml`) and integration tests using Testcontainers in GitHub Actions.

---

## CI / CD 🔁

- GitHub Actions workflows:
  - `code-check.yml` — lint, type-check, format
  - `test-matrix.yml` — unit/integration/smoke tests
  - `deploy-apps.yml` — build images, push to GHCR, deploy to Azure (staging/production)
  - `deploy-infrastructure.yml` — Terraform applies
- Production uses a **Blue-Green** deployment via Azure App Service slots (staging → swap → production)

See `.github/workflows/deploy-apps.yml` for details.

---

## Infrastructure & Deployment ☁️

- IaC (Terraform) in `iac/` (modules for `app-service`, `database`, `monitoring`, `networking`)
- Deploy to Azure using GitHub Actions with credentials stored in `AZURE_CREDENTIALS` secret
- Recommended secrets / env vars are documented in `docs/RUNBOOK.md` (Azure & GitHub Secrets)

---

## Monitoring & Observability 📈

- Metrics: Prometheus-compatible metrics exposed from the backend (`prom-client`) and scraped by Azure Monitor
- Dashboards: Azure Managed Grafana; dashboards live under `iac/modules/monitoring/dashboards`
- Alerts & runbook procedures: See `docs/MONITORING.md` and `docs/RUNBOOK.md`

---

## Security & RBAC 🔒

- Authentication: JWT access & refresh tokens
- Authorization: Role-Based Access Control (RBAC) — roles and permission matrix described in `docs/RBAC.md`
- Audit logs: Stored in MongoDB (`audit_logs` collection) with TTL

---

## Useful scripts & commands 🧰

- Run unit tests: `cd backend && npm run test:unit`
- Run integration tests: `cd backend && ./scripts/run-tests-by-type.sh integration`
- Run frontend e2e: `cd frontend && npm run test:e2e`
- Apply Terraform (example):

```bash
cd iac/environments/staging
terraform init
terraform plan
terraform apply
```

- Run DB migrations: `cd backend && npm run db:migrate`

---

## Contributing & contacts 🤝

- Please open issues / PRs against this repository; follow the established branching/PR conventions and ensure CI checks pass.
- For operational changes (Terraform, infra): open PRs with clear runbook updates and notify the DevOps owner.
- Project leads & role contacts are documented in `docs/RUNBOOK.md`.

---

## References & docs 📚

- Architecture: `docs/ARCHITECTURE.md`
- Runbook: `docs/RUNBOOK.md` (deployment, rollback, health checks)
- Monitoring: `docs/MONITORING.md`
- Database: `docs/DATABASE.md`
- RBAC: `docs/RBAC.md`
- Rollback playbook: `docs/ROLLBACK_PLAYBOOK.md`
- IaC: `iac/README.md`

---

## License 🧾

This project is licensed under the **MIT License** — see [LICENSE](./LICENSE) for details.

---

> Notes: This README summarizes the current state of the project (final development phase). Please review the sections and update the repo-specific secrets, contact owners, and any missing runbook steps before the final demo.

---

© SE214 — Warehouse & Supply Chain Management System
