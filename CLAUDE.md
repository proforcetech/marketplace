# Marketplace - Claude Code Context

This file provides context and conventions for AI-assisted development on the Marketplace project.

## Project Overview

Marketplace is a location-based marketplace application for local buying, selling, and services. Users can browse listings within a configurable radius, create listings with category-specific fields, communicate via in-app chat, and promote listings for increased visibility.

**Key differentiator:** Radius-based search is a hard requirement. Every search is geographically scoped using PostGIS.

## Architecture

- **Monorepo** managed with pnpm workspaces
- **Backend:** NestJS (Node.js) with TypeScript -- REST API at `/api/v1/*`
- **Frontend:** Next.js 14+ with App Router, React 18, TypeScript, Tailwind CSS
- **Database:** PostgreSQL 16 + PostGIS for geospatial queries
- **ORM:** Prisma with migrations in `apps/api/prisma/`
- **Cache / Queue:** Redis (BullMQ for background jobs)
- **Object Storage:** S3-compatible (MinIO locally, AWS S3 in production)
- **Real-time:** WebSockets via NestJS Gateway (Socket.IO)
- **Payments:** Stripe (Checkout, Identity, Connect)
- **Mobile (Phase 2):** React Native

## Directory Structure

```
marketplace/
├── apps/
│   ├── api/                  # NestJS backend
│   │   ├── src/
│   │   │   ├── modules/      # Feature modules (auth, listings, search, etc.)
│   │   │   │   ├── auth/
│   │   │   │   │   ├── auth.module.ts
│   │   │   │   │   ├── auth.controller.ts
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   ├── dto/
│   │   │   │   │   ├── guards/
│   │   │   │   │   └── strategies/
│   │   │   │   ├── listings/
│   │   │   │   ├── search/
│   │   │   │   ├── chat/
│   │   │   │   ├── payments/
│   │   │   │   ├── ratings/
│   │   │   │   ├── admin/
│   │   │   │   └── moderation/
│   │   │   ├── common/       # Shared decorators, filters, interceptors, pipes
│   │   │   ├── config/       # Configuration and environment validation
│   │   │   └── main.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   └── test/
│   └── web/                  # Next.js frontend
│       ├── src/
│       │   ├── app/          # App Router pages and layouts
│       │   ├── components/   # React components
│       │   │   ├── ui/       # Base UI components (design system)
│       │   │   └── features/ # Feature-specific components
│       │   ├── hooks/        # Custom React hooks
│       │   ├── lib/          # Utilities, API client, helpers
│       │   ├── stores/       # Client state (Zustand or similar)
│       │   └── styles/       # Global styles, Tailwind config
│       └── public/
├── packages/
│   └── shared/               # Shared TypeScript types, constants, validation
│       ├── src/
│       │   ├── types/        # Shared type definitions
│       │   ├── constants/    # Shared constants (categories, statuses, etc.)
│       │   └── validation/   # Shared Zod schemas or validation logic
│       └── package.json
├── docs/                     # Project documentation
├── docker-compose.yml
├── pnpm-workspace.yaml
└── package.json
```

## Development Commands

```bash
# Install dependencies
pnpm install

# Start infrastructure (PostgreSQL, Redis, MinIO)
docker compose up -d

# Run all apps in dev mode
pnpm dev

# Run only the API
pnpm --filter api dev

# Run only the web app
pnpm --filter web dev

# Database operations
pnpm --filter api db:migrate          # Apply migrations
pnpm --filter api db:migrate:create --name <name>  # Create migration
pnpm --filter api db:seed             # Seed data
pnpm --filter api db:reset            # Full reset
pnpm --filter api db:studio           # Open Prisma Studio

# Testing
pnpm test                             # All tests
pnpm --filter api test                # API unit tests
pnpm --filter api test:integration    # API integration tests
pnpm --filter web test                # Web unit tests
pnpm --filter web test:e2e            # End-to-end tests
pnpm --filter api test:coverage       # Coverage report

# Code quality
pnpm lint                             # Lint all packages
pnpm lint:fix                         # Auto-fix lint issues
pnpm format                           # Format with Prettier
pnpm typecheck                        # TypeScript type checking
```

## Code Style and Conventions

### TypeScript

- **Strict mode always:** `strict: true` in all tsconfig files
- **No `any`:** Use `unknown` and type guards instead
- **Explicit return types** on all exported functions
- **Prefer `interface`** over `type` for object shapes
- **Use `const` assertions** for literal types and enums where appropriate

### NestJS (Backend)

- One module per feature domain (auth, listings, search, chat, etc.)
- Each module contains: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`, `guards/`
- Use **DTOs with class-validator** for all request validation
- Use **Prisma** for all database operations (no raw SQL except for PostGIS queries)
- Throw **NestJS HTTP exceptions** (`NotFoundException`, `BadRequestException`, etc.)
- Use **custom decorators** for common patterns (e.g., `@CurrentUser()`, `@Public()`)
- Services contain business logic; controllers handle HTTP concerns only
- Use **interceptors** for response transformation (wrapping in `{ data: ... }` envelope)

### Next.js (Frontend)

- Use the **App Router** (not Pages Router)
- Server Components by default; add `'use client'` only when needed
- Use **server actions** for form submissions where appropriate
- **Tailwind CSS** for all styling -- no CSS modules or styled-components
- Component file naming: PascalCase (e.g., `ListingCard.tsx`)
- Colocate component-specific types in the component file
- Use **Zustand** for client-side state management
- Use **React Query (TanStack Query)** for server state and data fetching

### Database

- Table names: `snake_case`, plural (e.g., `listings`, `listing_media`)
- Column names: `snake_case` (e.g., `created_at`, `user_id`)
- Use `text` with CUID for primary keys (not auto-incrementing integers)
- Always include `created_at` and `updated_at` timestamps
- Soft-delete where appropriate (listings, users) rather than hard delete
- Geography columns use `geography(Point, 4326)` type
- PostGIS functions: `ST_DWithin` for radius queries, `ST_Distance` for distance calculation

### API

- All endpoints under `/api/v1/`
- Plural nouns for resources: `/listings`, `/users`, `/conversations`
- Use `PATCH` for partial updates (not `PUT`)
- Cursor-based pagination on all collection endpoints
- Standardized error response: `{ error: { code, message, details } }`
- Rate limiting headers on every response

### Testing

- **Unit tests:** colocated with source files as `*.spec.ts`
- **Integration tests:** in `test/` directory, use a test database
- **E2E tests:** Playwright for web, separate test database and seeded data
- Mock external services (Stripe, S3, geocoding) in unit tests
- Use **factories** to generate test data (no hardcoded test fixtures)

## Important Patterns

### PostGIS Query Pattern

```typescript
// In a Prisma raw query for geo search
const listings = await this.prisma.$queryRaw`
  SELECT id, title, price,
    ST_Distance(
      location,
      ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
    ) / 1609.34 AS distance_miles
  FROM listings
  WHERE status = 'active'
    AND ST_DWithin(
      location,
      ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
      ${radiusMiles} * 1609.34
    )
  ORDER BY distance_miles ASC
  LIMIT ${limit}
`;
```

### NestJS Module Pattern

```typescript
// listings.module.ts
@Module({
  imports: [PrismaModule, StorageModule, QueueModule],
  controllers: [ListingsController],
  providers: [ListingsService, ListingsRepository],
  exports: [ListingsService],
})
export class ListingsModule {}
```

### DTO Validation Pattern

```typescript
// dto/create-listing.dto.ts
export class CreateListingDto {
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  categoryId: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @IsEnum(PriceType)
  priceType: PriceType;

  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;
}
```

### Response Envelope Pattern

```typescript
// common/interceptors/response.interceptor.ts
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => ({
        data,
      })),
    );
  }
}
```

## Key Documentation

- [Development Guide](docs/DEVELOPMENT.md) -- Setup, workflow, and conventions
- [API Design](docs/API_DESIGN.md) -- Endpoint catalog, error codes, rate limits
- [Database Schema](docs/DATABASE_SCHEMA.md) -- Tables, indexes, PostGIS usage
- [Progress Tracker](docs/PROGRESS.md) -- Current project status
- [Product Plan](plan.md) -- Original requirements and feature breakdown
