# Development Guide

This document covers everything you need to set up, run, and contribute to the Marketplace project.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Running Locally](#running-locally)
- [Database Setup and Migrations](#database-setup-and-migrations)
- [Running Tests](#running-tests)
- [Code Style and Linting](#code-style-and-linting)
- [Git Workflow](#git-workflow)
- [Environment Variables Reference](#environment-variables-reference)

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20+ LTS | Use [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm) to manage versions |
| pnpm | 9+ | Install globally: `npm install -g pnpm` |
| Docker | 24+ | [Install Docker](https://docs.docker.com/get-docker/) |
| Docker Compose | v2+ | Included with Docker Desktop; verify with `docker compose version` |
| Git | 2.40+ | Any recent version |

Optional but recommended:

- **VS Code** with extensions: ESLint, Prettier, Tailwind CSS IntelliSense, Prisma
- **Postman** or **Bruno** for API testing
- **pgAdmin** or **DBeaver** for database inspection

---

## Environment Setup

### 1. Clone and install

```bash
git clone <repository-url>
cd marketplace
pnpm install
```

The project uses a pnpm workspace. Running `pnpm install` at the root installs dependencies for all packages and apps.

### 2. Environment files

Copy the example environment files and fill in the required values:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

See [Environment Variables Reference](#environment-variables-reference) below for a full list.

### 3. Start infrastructure services

```bash
docker compose up -d
```

This starts:

- **PostgreSQL** (with PostGIS) on port `5432`
- **Redis** on port `6379`
- **MinIO** (S3-compatible storage) on port `9000` (API) / `9001` (console)

Verify services are running:

```bash
docker compose ps
```

### 4. Initialize the database

```bash
# Run migrations to create the schema
pnpm --filter api db:migrate

# Seed with categories, test users, and sample data
pnpm --filter api db:seed
```

---

## Running Locally

### Start the API

```bash
pnpm --filter api dev
```

The API starts on `http://localhost:3001` with hot reload enabled. Swagger documentation (when configured) is available at `http://localhost:3001/api/docs`.

### Start the web app

```bash
pnpm --filter web dev
```

The Next.js frontend starts on `http://localhost:3000` with hot reload.

### Start everything together

```bash
# Infrastructure + all apps
docker compose up -d
pnpm dev
```

The root `pnpm dev` command runs both the API and web app concurrently.

### Useful commands

| Command | Description |
|---|---|
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Build all apps for production |
| `pnpm lint` | Run ESLint across all packages |
| `pnpm test` | Run all test suites |
| `pnpm --filter api dev` | Start only the API |
| `pnpm --filter web dev` | Start only the web app |
| `pnpm --filter api db:migrate` | Run database migrations |
| `pnpm --filter api db:seed` | Seed the database |
| `pnpm --filter api db:reset` | Drop, recreate, migrate, and seed |
| `pnpm --filter api db:studio` | Open Prisma Studio (database GUI) |
| `docker compose up -d` | Start infrastructure services |
| `docker compose down` | Stop infrastructure services |
| `docker compose down -v` | Stop and remove volumes (full reset) |

---

## Database Setup and Migrations

The project uses **Prisma** as the ORM with **PostgreSQL + PostGIS**.

### Creating a migration

After modifying the Prisma schema:

```bash
pnpm --filter api db:migrate:create --name describe_the_change
```

This generates a migration file in `apps/api/prisma/migrations/`.

### Applying migrations

```bash
# Apply pending migrations (development)
pnpm --filter api db:migrate

# Apply migrations (production -- no interactive prompts)
pnpm --filter api db:migrate:deploy
```

### Resetting the database

```bash
# Full reset: drop all tables, re-run migrations, re-seed
pnpm --filter api db:reset
```

**Warning:** This destroys all data. Use only in development.

### PostGIS

The PostgreSQL Docker image includes PostGIS. Migrations should enable the extension:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

Geographic columns use the `geography(Point, 4326)` type for accurate distance calculations.

---

## Running Tests

### Unit tests

```bash
# All unit tests
pnpm test

# Specific package
pnpm --filter api test
pnpm --filter web test

# Watch mode
pnpm --filter api test:watch
```

### Integration tests

Integration tests run against a test database. The test setup creates a separate database and runs migrations automatically.

```bash
pnpm --filter api test:integration
```

### End-to-end tests

```bash
# Ensure the full stack is running first
pnpm --filter web test:e2e
```

### Coverage

```bash
pnpm --filter api test:coverage
```

---

## Code Style and Linting

### TypeScript

- **Strict mode** enabled (`strict: true` in `tsconfig.json`)
- Prefer `interface` over `type` for object shapes
- Use explicit return types on exported functions
- Avoid `any`; use `unknown` and narrow with type guards

### ESLint + Prettier

```bash
# Lint all packages
pnpm lint

# Auto-fix
pnpm lint:fix

# Format with Prettier
pnpm format
```

Configuration files:

- `.eslintrc.js` at the workspace root (shared rules)
- `.prettierrc` at the workspace root

### Tailwind CSS (Frontend)

- Use Tailwind utility classes; avoid custom CSS except for complex animations
- Follow the design system tokens defined in `tailwind.config.ts`
- Component-level styles go in the component file, not in global CSS

### Naming conventions

| Item | Convention | Example |
|---|---|---|
| Files (components) | PascalCase | `ListingCard.tsx` |
| Files (utilities) | camelCase | `formatPrice.ts` |
| Files (NestJS) | kebab-case with suffix | `listings.controller.ts` |
| Variables / functions | camelCase | `getUserById` |
| Types / interfaces | PascalCase | `ListingStatus` |
| Constants | UPPER_SNAKE_CASE | `MAX_UPLOAD_SIZE` |
| Database tables | snake_case (plural) | `listing_media` |
| API endpoints | kebab-case (plural nouns) | `/api/v1/listings` |
| Environment variables | UPPER_SNAKE_CASE | `DATABASE_URL` |

---

## Git Workflow

### Branch naming

```
<type>/<short-description>

Examples:
  feat/radius-search
  fix/chat-message-ordering
  refactor/auth-module
  docs/api-endpoints
  chore/upgrade-dependencies
```

Allowed types: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `perf`, `ci`

### Commit messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <short summary>

<optional body>

<optional footer>
```

Examples:

```
feat(listings): add image upload with EXIF stripping
fix(search): correct radius calculation for edge cases
docs(api): update authentication endpoint examples
chore(deps): upgrade NestJS to v10.4
```

Scopes correspond to modules: `auth`, `listings`, `search`, `chat`, `payments`, `ratings`, `admin`, `moderation`, `shared`

### Pull request process

1. Create a feature branch from `main`.
2. Make focused, atomic commits.
3. Push and open a pull request.
4. Fill in the PR template: summary, changes, testing done, screenshots (if UI).
5. Request review from at least one team member.
6. All CI checks must pass (lint, tests, build).
7. Squash-merge into `main` after approval.

### Protected branches

- `main` -- production-ready code. All merges via PR only.

---

## Environment Variables Reference

### API (`apps/api/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | No | `development` | Environment: `development`, `test`, `production` |
| `PORT` | No | `3001` | API server port |
| `DATABASE_URL` | Yes | -- | PostgreSQL connection string with PostGIS |
| `REDIS_URL` | Yes | -- | Redis connection string |
| `JWT_SECRET` | Yes | -- | Secret for signing JWT access tokens |
| `JWT_REFRESH_SECRET` | Yes | -- | Secret for signing JWT refresh tokens |
| `JWT_ACCESS_EXPIRY` | No | `15m` | Access token TTL |
| `JWT_REFRESH_EXPIRY` | No | `7d` | Refresh token TTL |
| `OTP_EXPIRY_MINUTES` | No | `10` | OTP code validity period |
| `S3_ENDPOINT` | Yes | -- | S3-compatible storage endpoint |
| `S3_BUCKET` | Yes | -- | Bucket name for media uploads |
| `S3_ACCESS_KEY` | Yes | -- | S3 access key |
| `S3_SECRET_KEY` | Yes | -- | S3 secret key |
| `S3_REGION` | No | `us-east-1` | S3 region |
| `STRIPE_SECRET_KEY` | Yes | -- | Stripe API secret key |
| `STRIPE_WEBHOOK_SECRET` | Yes | -- | Stripe webhook signing secret |
| `STRIPE_IDENTITY_ENABLED` | No | `false` | Enable Stripe Identity verification |
| `GOOGLE_MAPS_API_KEY` | No | -- | Google Maps API key (geocoding, places) |
| `CORS_ORIGINS` | No | `http://localhost:3000` | Comma-separated allowed origins |
| `LOG_LEVEL` | No | `debug` | Logging level: `debug`, `info`, `warn`, `error` |
| `RATE_LIMIT_TTL` | No | `60` | Rate limit window in seconds |
| `RATE_LIMIT_MAX` | No | `100` | Max requests per rate limit window |

### Web (`apps/web/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | -- | Backend API base URL |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | No | -- | Google Maps JavaScript API key |
| `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` | No | -- | Stripe publishable key |
| `NEXT_PUBLIC_WS_URL` | No | -- | WebSocket server URL for real-time chat |

### Docker Compose defaults

The `docker-compose.yml` provides these defaults for local development:

| Service | Credentials | Port |
|---|---|---|
| PostgreSQL | `marketplace` / `marketplace` | `5432` |
| Redis | (no auth) | `6379` |
| MinIO | `minioadmin` / `minioadmin` | `9000` / `9001` |
