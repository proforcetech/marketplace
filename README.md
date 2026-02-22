# Marketplace

**A modern, location-based marketplace for local buying, selling, and services.**

Marketplace connects people in their community through radius-based search, in-app messaging, and a trust-first design. Whether you are selling a car, listing a rental, offering a service, or looking for a deal nearby, Marketplace makes local commerce simple, safe, and fast.

---

## Key Features

- **Radius-based search** -- Find listings within a configurable distance from any location using PostGIS-powered geospatial queries.
- **Structured categories** -- Purpose-built fields for Automotive, Housing, Real Estate, Services, and General items ensure high-quality, searchable listings.
- **In-app messaging** -- Secure, per-listing chat with safety prompts, anti-spam controls, and contextual warnings.
- **Promoted listings** -- Sellers can boost visibility with self-serve promoted placements, powered by Stripe.
- **Two-sided ratings** -- Buyers and sellers rate each other after qualifying interactions, building community trust.
- **Admin and moderation** -- Full moderation console with reporting, risk scoring, ban/shadow-ban tools, and audit logs.
- **Identity verification** -- Optional Stripe Identity verification for sellers, earning a verified badge and increased platform limits.
- **Saved searches and alerts** -- Save filter/radius queries and receive notifications when new matches appear.

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend (Web)** | Next.js 14+ (App Router), React 18, TypeScript, Tailwind CSS |
| **Backend API** | NestJS (Node.js), TypeScript |
| **Database** | PostgreSQL 16 + PostGIS |
| **Search** | PostGIS (MVP), Algolia or Elasticsearch (Phase 2) |
| **Object Storage** | S3-compatible (AWS S3 / MinIO for local dev) |
| **Job Queue** | BullMQ (Redis-backed) |
| **Real-time** | WebSockets (Socket.IO / NestJS Gateway) |
| **Payments** | Stripe (Checkout, Identity, Connect) |
| **Mobile** | React Native (Phase 2) |
| **Maps / Geocoding** | Google Maps Platform or Mapbox |
| **Infrastructure** | Docker, Docker Compose (dev), AWS / GCP (production) |

## Project Structure

```
marketplace/
├── apps/
│   ├── web/                # Next.js frontend application
│   └── api/                # NestJS backend API
├── packages/
│   └── shared/             # Shared types, utilities, and constants
├── docs/                   # Project documentation
│   ├── DEVELOPMENT.md      # Development setup and workflow guide
│   ├── API_DESIGN.md       # REST API design and endpoint reference
│   ├── DATABASE_SCHEMA.md  # Database schema and entity documentation
│   └── PROGRESS.md         # Project progress tracking
├── docker-compose.yml      # Local development services
├── plan.md                 # Original product plan and requirements
├── CLAUDE.md               # Claude Code project context
└── README.md               # This file
```

## Getting Started

### Prerequisites

- **Node.js** 20+ (LTS recommended)
- **pnpm** 9+ (package manager)
- **Docker** and **Docker Compose** (for local services)
- **Git**

### Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd marketplace

# Install dependencies
pnpm install

# Copy environment files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Start infrastructure (PostgreSQL, Redis, MinIO)
docker compose up -d

# Run database migrations
pnpm --filter api db:migrate

# Seed the database (categories, test data)
pnpm --filter api db:seed

# Start the API server
pnpm --filter api dev

# Start the web frontend (in a separate terminal)
pnpm --filter web dev
```

The API will be available at `http://localhost:3001` and the web app at `http://localhost:3000`.

For the full development guide, see [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Documentation

| Document | Description |
|---|---|
| [Development Guide](docs/DEVELOPMENT.md) | Environment setup, workflow, testing, and conventions |
| [API Design](docs/API_DESIGN.md) | REST API conventions, endpoints, and error catalog |
| [Database Schema](docs/DATABASE_SCHEMA.md) | Entity relationships, tables, indexing strategy |
| [Progress Tracker](docs/PROGRESS.md) | Phase-by-phase project status and task breakdown |
| [Claude Code Context](CLAUDE.md) | AI-assisted development instructions and patterns |

## Contributing

1. Create a feature branch from `main`: `git checkout -b feat/short-description`
2. Make your changes following the conventions in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).
3. Write or update tests for any new functionality.
4. Ensure all linting and tests pass: `pnpm lint && pnpm test`
5. Open a pull request with a clear description of the change.

For branch naming, commit conventions, and the full PR process, see the [Development Guide](docs/DEVELOPMENT.md).

## License

License TBD. All rights reserved until a license is selected.
