# Backend Development Flows

This document outlines the two main development workflows for working with the backend:

1. Backend Developer Flow (Local Databases)
2. Frontend/QA Flow (Online Databases)

## 1. Backend Developer Flow 🛠️

For backend developers working on database schema, migrations, or core backend features.

### Setup Steps

```bash
# 1. Clone the repository
git clone <repo-url>
cd Warehouse-and-Supply-Chain-Management-System

# 2. Set up local environment
cp backend/.env.example backend/.env

# 3. Start all services with Docker Compose
docker compose up -d

# 4. Check services
curl http://localhost:3000/health     # Backend
curl http://localhost:5432           # PostgreSQL
curl http://localhost:27017          # MongoDB
```

### Available Development Tools

- PostgreSQL Admin: http://localhost:5050
  - Login: admin@admin.com / admin
  - Add Server: Host=db, User=warehouse_user, Pass=warehouse_pass
- Mongo Express: http://localhost:8081
  - Login: admin / pass

### Common Tasks

```bash
# Watch logs
docker compose logs -f backend

# Restart backend only
docker compose restart backend

# Run migrations
docker compose exec backend npx prisma migrate deploy

# Generate Prisma client
docker compose exec backend npx prisma generate

# Run tests
docker compose exec backend npm test

# Access databases directly
docker compose exec db psql -U warehouse_user -d warehouse_db
docker compose exec mongodb mongosh -u mongo_user -p mongo_pass
```

## 2. Frontend/QA Flow 🎨

For frontend developers and QA engineers who need a local backend connected to stable online databases.

### Setup Steps

```bash
# 1. Clone the repository
git clone <repo-url>
cd Warehouse-and-Supply-Chain-Management-System

# 2. Install backend dependencies
cd backend
npm install

# 3. Set up environment for online DBs
cp .env.online.example .env
# Edit .env with actual connection strings from secure storage

# 4. Generate Prisma client
npx prisma generate

# 5. Start backend only
npm run start:dev
```

### Verification Steps

```bash
# 1. Check backend health
curl http://localhost:3000/health

# 2. Check Swagger API docs
open http://localhost:3000/api

# 3. Verify database connections
curl http://localhost:3000/health/readiness
```

### Key Points

- Uses online Neon (PostgreSQL) and MongoDB Atlas
- No need to run Docker or local databases
- Perfect for frontend development and testing
- Migrations are handled by the backend team

### Troubleshooting

If you encounter connection issues:

1. Check VPN/network connectivity
2. Verify connection strings in `.env`
3. Ensure your IP is whitelisted in Neon/Atlas
4. Contact backend team for database access

## Health Check Endpoints 🏥

Both flows use the same health check endpoints:

```bash
# Basic health check
GET /health
Response: { "status": "ok", "timestamp": "...", "uptime": "..." }

# Database connectivity
GET /health/readiness
Response: { "status": "ready", "database": "connected", ... }

# Service liveness
GET /health/liveness
Response: { "status": "alive", "timestamp": "..." }
```

## Environment Files 📁

The project uses different .env files for different purposes:

- `.env.example` - Template for local development with Docker
- `.env.online.example` - Template for online database connections
- `.env` - Your actual configuration (git-ignored)
- `.env.production` - Production configuration (managed separately)

## Security Notes 🔐

1. Never commit real connection strings or credentials
2. Keep sensitive data in secure team storage
3. Use environment variables for all secrets
4. Update CORS_ORIGIN for your frontend URL
5. Generate strong JWT secrets for auth

## Need Help? 🆘

- Backend issues: Contact backend team
- Database access: Request from team lead
- Connection problems: Check VPN and IP whitelist
