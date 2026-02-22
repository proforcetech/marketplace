# Marketplace Architecture Document

> Location-based marketplace application for buying, selling, and promoting items and services.

---

## Table of Contents

1. [Tech Stack Decisions](#tech-stack-decisions)
2. [Project Structure](#project-structure)
3. [Database Schema Design](#database-schema-design)
4. [API Design](#api-design)
5. [Frontend Architecture](#frontend-architecture)
6. [Real-Time Communication](#real-time-communication)
7. [Media Pipeline](#media-pipeline)
8. [Search Architecture](#search-architecture)
9. [Trust & Safety System](#trust--safety-system)
10. [Infrastructure & Deployment](#infrastructure--deployment)
11. [Security Model](#security-model)
12. [Phased Delivery](#phased-delivery)

---

## Tech Stack Decisions

### Backend: Node.js with NestJS (TypeScript)

**Rationale:** NestJS provides a modular, decorator-driven architecture that scales well from MVP to production. Its dependency injection system makes services testable and composable. TypeScript gives us compile-time safety across the entire stack, and the Node ecosystem has mature libraries for every integration point (Stripe, Twilio, S3, WebSockets).

**Alternatives considered:**
- Laravel (PHP): Strong contender but would split the team across two languages (PHP + TypeScript for frontend). Less natural WebSocket support.
- Go/Rust: Better raw performance but slower iteration speed for a marketplace with many CRUD-heavy modules.

### Frontend: Next.js 14+ (App Router) with React

**Rationale:** Server-side rendering is critical for marketplace SEO (listing pages must be indexable). The App Router provides React Server Components, streaming, and a clear data-fetching model. Next.js handles image optimization out of the box, which matters for a media-heavy marketplace.

**Key patterns:**
- Server Components for listing pages, search results, and public profiles (SEO + performance).
- Client Components for interactive elements (chat, map, forms, filters).
- Route Groups for auth-gated vs. public sections.

### Database: PostgreSQL 16 + PostGIS

**Rationale:** PostGIS is the industry standard for geospatial queries. Radius search, distance sorting, and bounding-box queries all run efficiently with proper spatial indexes (GiST). PostgreSQL's JSONB columns allow category-specific fields without schema sprawl, and its full-text search can supplement geo queries.

**Key decisions:**
- Store locations as `geography(Point, 4326)` for accurate distance calculations using meters.
- Use JSONB for category-specific listing attributes (`custom_fields`).
- Partition the `listings` table by status (active vs. archived) for query performance.

### Search: PostGIS for MVP, Algolia Integration Path for Phase 2

**Rationale:** PostGIS handles radius search with filters well at moderate scale (millions of listings). We avoid the cost and operational complexity of a search engine for MVP. The schema is designed so that syncing to Algolia (or Elasticsearch) later is straightforward -- listings have a flat `custom_fields` JSONB column that maps directly to search index attributes.

**Migration path:** When faceted search latency or complexity demands it, add an Algolia index synced via a BullMQ job on listing create/update/delete. The API layer abstracts the search provider behind an interface.

### Cache/Queue: Redis + BullMQ

**Rationale:** Redis serves dual duty as a cache (session data, rate limiting, hot query results) and as BullMQ's backing store. BullMQ is battle-tested for Node.js job queues and supports delayed jobs, retries, rate limiting, and concurrency control.

**Queue jobs include:**
- Media processing (resize, WebP conversion, EXIF stripping, thumbnail generation)
- Moderation scoring (text analysis, image hashing, risk score computation)
- Notification dispatch (push, email, SMS)
- Saved search matching (new listing -> check against saved searches)
- Promotion analytics aggregation

### Real-Time: Socket.io

**Rationale:** Socket.io provides reliable WebSocket connections with automatic fallback to long-polling. Its room abstraction maps directly to our conversation model. The `@nestjs/websockets` + `@nestjs/platform-socket.io` integration is first-class in NestJS.

### Storage: S3-Compatible (AWS S3 / MinIO for Dev)

**Rationale:** S3 is the standard for object storage. Using the S3-compatible API means we can run MinIO locally during development with zero code changes. Media is served via CDN (CloudFront or equivalent) with signed URLs for private content.

**Image pipeline:** Client-side resize before upload (max 2048px) -> S3 upload via presigned URL -> BullMQ job processes (WebP conversion, thumbnails at 150px/400px/800px, EXIF strip) -> CDN delivery.

### Auth: JWT + Refresh Tokens + Phone OTP

**Rationale:** JWT access tokens (15-minute expiry) for stateless API auth. Refresh tokens (30-day expiry, stored in DB, rotated on use) for session continuity. Phone OTP via Twilio for account verification -- this is a hard requirement for posting (anti-spam).

**Token strategy:**
- Access token: short-lived, stored in memory (never localStorage).
- Refresh token: httpOnly secure cookie.
- Device/session tracking in DB for "manage sessions" feature.

### Payments: Stripe

**Rationale:** Stripe covers all current and planned payment needs:
- **Checkout Sessions** for promoted listing purchases (MVP).
- **Identity** for optional seller verification badge.
- **Connect** (Phase 2) for buyer-to-seller transactions with platform fee.
- **Webhooks** for payment confirmation, subscription events, identity verification results.

### Maps: Mapbox

**Rationale:** Mapbox offers competitive pricing at scale, superior customization (custom map styles for marketplace branding), and a generous free tier. The GL JS library is performant for rendering many listing markers. Geocoding API handles address-to-coordinates conversion.

### Mobile (Phase 2): React Native with Expo

**Rationale:** Code sharing with the web app (shared types, API client, business logic). Expo simplifies build/deploy for both iOS and Android. Camera-first listing creation and push notifications are well-supported.

---

## Project Structure

Turborepo monorepo with pnpm workspaces.

```
marketplace/
├── apps/
│   ├── api/                    # NestJS backend API
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── modules/
│   │   │   │   ├── auth/       # Authentication & sessions
│   │   │   │   ├── users/      # User profiles & settings
│   │   │   │   ├── listings/   # Listing CRUD & status management
│   │   │   │   ├── search/     # Geo search & filtering
│   │   │   │   ├── messages/   # Conversations & chat
│   │   │   │   ├── payments/   # Stripe integration & promotions
│   │   │   │   ├── ratings/    # Two-sided reviews
│   │   │   │   ├── reports/    # Abuse reporting
│   │   │   │   ├── media/      # Upload & processing
│   │   │   │   ├── admin/      # Moderation & management
│   │   │   │   ├── notifications/ # Push, email, SMS dispatch
│   │   │   │   └── moderation/ # Trust & safety scoring
│   │   │   ├── common/
│   │   │   │   ├── guards/     # Auth, roles, rate-limit guards
│   │   │   │   ├── filters/    # Exception filters
│   │   │   │   ├── interceptors/ # Logging, transform interceptors
│   │   │   │   ├── decorators/ # Custom param decorators
│   │   │   │   └── pipes/      # Validation pipes
│   │   │   └── config/         # App configuration modules
│   │   ├── test/
│   │   ├── nest-cli.json
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── web/                    # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/            # App Router pages
│   │   │   │   ├── (public)/   # Public routes (browse, listing detail)
│   │   │   │   ├── (auth)/     # Auth routes (login, signup)
│   │   │   │   ├── (dashboard)/ # Authenticated routes
│   │   │   │   ├── api/        # Next.js API routes (BFF pattern)
│   │   │   │   ├── layout.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── components/     # App-specific components
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── lib/            # API client, utils
│   │   │   └── styles/         # Global styles, Tailwind config
│   │   ├── public/
│   │   ├── next.config.js
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── admin/                  # Admin dashboard (Next.js)
│       ├── src/
│       │   ├── app/
│       │   ├── components/
│       │   └── lib/
│       ├── next.config.js
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   ├── shared/                 # Shared types, utils, constants
│   │   ├── src/
│   │   │   ├── types/          # TypeScript interfaces & enums
│   │   │   ├── constants/      # Shared constants (categories, statuses)
│   │   │   ├── utils/          # Shared utility functions
│   │   │   └── validation/     # Shared validation schemas (zod)
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── db/                     # Prisma schema + migrations
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── ui/                     # Shared UI component library
│       ├── src/
│       │   ├── components/
│       │   └── index.ts
│       ├── tsconfig.json
│       └── package.json
│
├── infrastructure/
│   ├── docker/
│   │   ├── Dockerfile.api
│   │   ├── Dockerfile.web
│   │   └── nginx.conf
│   ├── docker-compose.yml      # Local development services
│   ├── docker-compose.prod.yml # Production overrides
│   └── scripts/
│       ├── setup.sh            # First-time dev setup
│       └── seed.sh             # Database seeding
│
├── docs/                       # Extended documentation
│   └── api/                    # API documentation
│
├── .env.example                # Environment variable template
├── .gitignore
├── .eslintrc.js
├── .prettierrc
├── turbo.json                  # Turborepo pipeline config
├── pnpm-workspace.yaml
├── tsconfig.base.json          # Base TypeScript config
├── package.json                # Root package.json
├── ARCHITECTURE.md             # This document
└── plan.md                     # Product requirements
```

---

## Database Schema Design

### Entity Relationship Overview

```
Users ──< Listings ──< Media
  │           │
  │           ├──< ListingPromotions
  │           │
  │           ├──< Conversations ──< Messages
  │           │         │
  │           │         └── (buyer_id, seller_id)
  │           │
  │           └──< Reports
  │
  ├──< Ratings (as rater / as rated)
  ├──< SavedSearches
  ├──< Sessions
  ├──< BlockedUsers
  └──< AuditLogs
```

### Core Tables

#### users
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| email | VARCHAR(255) | Unique, indexed |
| phone | VARCHAR(20) | Unique, nullable |
| phone_verified | BOOLEAN | Default false |
| password_hash | VARCHAR(255) | bcrypt/argon2 |
| display_name | VARCHAR(100) | |
| avatar_url | VARCHAR(500) | |
| bio | TEXT | |
| location | geography(Point, 4326) | PostGIS |
| location_text | VARCHAR(255) | Human-readable location |
| identity_verified | BOOLEAN | Stripe Identity result |
| identity_verified_at | TIMESTAMPTZ | |
| role | ENUM | user, admin, super_admin |
| status | ENUM | active, suspended, banned |
| reputation_score | DECIMAL(3,2) | Computed average |
| response_rate | DECIMAL(3,2) | Percentage |
| listing_count | INTEGER | Denormalized counter |
| daily_post_limit | INTEGER | Progressive trust |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |
| last_active_at | TIMESTAMPTZ | |

#### listings
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| user_id | UUID (FK -> users) | |
| category_id | UUID (FK -> categories) | |
| title | VARCHAR(200) | Full-text indexed |
| description | TEXT | Full-text indexed |
| price | DECIMAL(12,2) | Nullable (free items) |
| price_type | ENUM | fixed, obo, free, hourly, monthly |
| condition | ENUM | new, like_new, good, fair, poor, na |
| location | geography(Point, 4326) | PostGIS, GiST indexed |
| location_text | VARCHAR(255) | Display string |
| location_precision | ENUM | exact, area, city |
| custom_fields | JSONB | Category-specific structured data |
| visibility | ENUM | public, followers, private_link |
| status | ENUM | draft, pending_review, active, sold, closed, removed |
| status_reason | VARCHAR(255) | Reason for removal/rejection |
| risk_score | DECIMAL(5,2) | Moderation risk score |
| view_count | INTEGER | |
| message_count | INTEGER | |
| is_promoted | BOOLEAN | Currently has active promotion |
| expires_at | TIMESTAMPTZ | Auto-expire (30 days default) |
| published_at | TIMESTAMPTZ | When listing went active |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Indexes:**
- `GiST(location)` -- spatial index for radius queries
- `GIN(custom_fields)` -- JSONB index for category-specific filtering
- `GIN(to_tsvector('english', title || ' ' || description))` -- full-text search
- `BTREE(category_id, status, published_at DESC)` -- category browse
- `BTREE(user_id, status)` -- user's listings
- `BTREE(status, expires_at)` -- expiration job queries

#### categories
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| parent_id | UUID (FK -> categories) | Nullable for top-level |
| name | VARCHAR(100) | |
| slug | VARCHAR(100) | URL-safe, unique |
| description | TEXT | |
| icon | VARCHAR(50) | Icon identifier |
| required_fields | JSONB | Schema for required custom_fields |
| optional_fields | JSONB | Schema for optional custom_fields |
| validation_rules | JSONB | Validation constraints |
| sort_order | INTEGER | Display ordering |
| is_active | BOOLEAN | |
| created_at | TIMESTAMPTZ | |

**Field schema example (Automotive):**
```json
{
  "required_fields": {
    "vehicle_type": { "type": "enum", "options": ["car", "truck", "suv", "motorcycle", "rv", "boat"] },
    "year": { "type": "integer", "min": 1900, "max": 2027 },
    "make": { "type": "string", "max_length": 50 },
    "model": { "type": "string", "max_length": 50 },
    "mileage": { "type": "integer", "min": 0 },
    "title_status": { "type": "enum", "options": ["clean", "salvage", "rebuilt", "lien"] }
  },
  "optional_fields": {
    "trim": { "type": "string", "max_length": 50 },
    "transmission": { "type": "enum", "options": ["automatic", "manual", "cvt"] },
    "fuel_type": { "type": "enum", "options": ["gasoline", "diesel", "electric", "hybrid", "other"] },
    "drivetrain": { "type": "enum", "options": ["fwd", "rwd", "awd", "4wd"] },
    "exterior_color": { "type": "string", "max_length": 30 },
    "vin": { "type": "string", "pattern": "^[A-HJ-NPR-Z0-9]{17}$" }
  }
}
```

#### media
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| listing_id | UUID (FK -> listings) | |
| user_id | UUID (FK -> users) | Uploader |
| type | ENUM | image, video |
| original_url | VARCHAR(500) | Original upload path |
| processed_url | VARCHAR(500) | Processed/optimized path |
| thumbnail_url | VARCHAR(500) | 150px thumbnail |
| medium_url | VARCHAR(500) | 400px medium |
| large_url | VARCHAR(500) | 800px large |
| width | INTEGER | |
| height | INTEGER | |
| file_size | INTEGER | Bytes |
| mime_type | VARCHAR(50) | |
| blurhash | VARCHAR(100) | Placeholder blur hash |
| perceptual_hash | VARCHAR(64) | For duplicate/abuse detection |
| sort_order | INTEGER | Display ordering |
| processing_status | ENUM | pending, processing, completed, failed |
| created_at | TIMESTAMPTZ | |

#### conversations
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| listing_id | UUID (FK -> listings) | |
| buyer_id | UUID (FK -> users) | Initiator |
| seller_id | UUID (FK -> users) | Listing owner |
| status | ENUM | active, archived, blocked |
| last_message_at | TIMESTAMPTZ | For sorting |
| buyer_unread_count | INTEGER | |
| seller_unread_count | INTEGER | |
| created_at | TIMESTAMPTZ | |

**Unique constraint:** `(listing_id, buyer_id)` -- one conversation per buyer per listing.

#### messages
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| conversation_id | UUID (FK -> conversations) | |
| sender_id | UUID (FK -> users) | |
| content | TEXT | Encrypted at rest |
| type | ENUM | text, image, system, safety_warning |
| read_at | TIMESTAMPTZ | Nullable |
| created_at | TIMESTAMPTZ | |

**Index:** `BTREE(conversation_id, created_at)` -- message history pagination.

#### ratings
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| listing_id | UUID (FK -> listings) | |
| conversation_id | UUID (FK -> conversations) | Qualifying interaction proof |
| rater_id | UUID (FK -> users) | |
| rated_id | UUID (FK -> users) | |
| role | ENUM | buyer, seller |
| score | SMALLINT | 1-5 |
| comment | TEXT | |
| created_at | TIMESTAMPTZ | |

**Unique constraint:** `(conversation_id, rater_id)` -- one rating per user per conversation.

#### promotions
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| listing_id | UUID (FK -> listings) | |
| user_id | UUID (FK -> users) | Purchaser |
| type | ENUM | featured, top_of_results, category_spotlight |
| stripe_payment_id | VARCHAR(255) | |
| stripe_checkout_session_id | VARCHAR(255) | |
| amount_paid | DECIMAL(10,2) | |
| currency | VARCHAR(3) | Default 'usd' |
| impressions | INTEGER | Analytics counter |
| clicks | INTEGER | Analytics counter |
| messages_received | INTEGER | Analytics counter |
| starts_at | TIMESTAMPTZ | |
| ends_at | TIMESTAMPTZ | |
| status | ENUM | pending, active, expired, cancelled, refunded |
| created_at | TIMESTAMPTZ | |

#### reports
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| reporter_id | UUID (FK -> users) | |
| reported_user_id | UUID (FK -> users) | Nullable |
| reported_listing_id | UUID (FK -> listings) | Nullable |
| reported_message_id | UUID (FK -> messages) | Nullable |
| reason | ENUM | scam, explicit, trafficking, underage, harassment, spam, other |
| description | TEXT | |
| evidence | JSONB | Snapshots: message excerpts, listing state |
| status | ENUM | open, reviewing, resolved, dismissed |
| resolution | TEXT | Admin notes |
| resolved_by | UUID (FK -> users) | Admin who resolved |
| resolved_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |

#### saved_searches
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| user_id | UUID (FK -> users) | |
| name | VARCHAR(100) | |
| location | geography(Point, 4326) | Search center |
| radius_meters | INTEGER | |
| category_id | UUID (FK -> categories) | Nullable |
| filters | JSONB | Price range, condition, custom fields |
| sort_by | VARCHAR(50) | |
| notify_enabled | BOOLEAN | |
| last_notified_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |

#### sessions
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| user_id | UUID (FK -> users) | |
| refresh_token_hash | VARCHAR(255) | Hashed refresh token |
| device_info | VARCHAR(255) | Browser/device identifier |
| ip_address | INET | |
| last_used_at | TIMESTAMPTZ | |
| expires_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |

#### blocked_users
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| blocker_id | UUID (FK -> users) | |
| blocked_id | UUID (FK -> users) | |
| created_at | TIMESTAMPTZ | |

**Unique constraint:** `(blocker_id, blocked_id)`.

#### audit_logs
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| actor_id | UUID (FK -> users) | Nullable for system actions |
| action | VARCHAR(100) | e.g., 'listing.remove', 'user.ban' |
| target_type | VARCHAR(50) | 'user', 'listing', 'report' |
| target_id | UUID | |
| metadata | JSONB | Action-specific details |
| ip_address | INET | |
| created_at | TIMESTAMPTZ | |

**Index:** `BTREE(target_type, target_id, created_at DESC)` -- audit trail for any entity.

---

## API Design

### Base URL Pattern
```
Production: https://api.marketplace.com/v1
Development: http://localhost:3001/v1
```

All endpoints return standard envelope:
```json
{
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 150 },
  "errors": null
}
```

### Auth Module (`/v1/auth`)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/auth/signup` | Register with email + password | Public |
| POST | `/auth/login` | Login, returns access + refresh tokens | Public |
| POST | `/auth/refresh` | Rotate refresh token, get new access token | Cookie |
| POST | `/auth/logout` | Invalidate session | Authenticated |
| POST | `/auth/otp/send` | Send OTP to phone number | Authenticated |
| POST | `/auth/otp/verify` | Verify phone OTP | Authenticated |
| POST | `/auth/password/forgot` | Request password reset email | Public |
| POST | `/auth/password/reset` | Reset password with token | Public |
| GET | `/auth/sessions` | List active sessions | Authenticated |
| DELETE | `/auth/sessions/:id` | Revoke a session | Authenticated |

### Users Module (`/v1/users`)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/users/me` | Get current user profile | Authenticated |
| PATCH | `/users/me` | Update profile | Authenticated |
| PATCH | `/users/me/location` | Update location | Authenticated |
| GET | `/users/:id` | Get public profile | Public |
| GET | `/users/:id/listings` | Get user's active listings | Public |
| GET | `/users/:id/ratings` | Get ratings for user | Public |
| POST | `/users/me/verify-identity` | Start Stripe Identity session | Authenticated |
| POST | `/users/block/:id` | Block a user | Authenticated |
| DELETE | `/users/block/:id` | Unblock a user | Authenticated |

### Listings Module (`/v1/listings`)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/listings` | Create listing (draft or submit) | Authenticated + Phone Verified |
| GET | `/listings/:id` | Get listing detail | Public |
| PATCH | `/listings/:id` | Update listing | Owner |
| DELETE | `/listings/:id` | Delete listing | Owner |
| POST | `/listings/:id/publish` | Submit for review / publish | Owner |
| POST | `/listings/:id/pause` | Pause listing | Owner |
| POST | `/listings/:id/renew` | Renew expired listing | Owner |
| POST | `/listings/:id/sold` | Mark as sold | Owner |
| GET | `/listings/:id/media` | Get listing media | Public |
| POST | `/listings/:id/media` | Get presigned upload URL | Owner |
| DELETE | `/listings/:id/media/:mediaId` | Remove media | Owner |
| PATCH | `/listings/:id/media/reorder` | Reorder media | Owner |

**Status transitions:**
```
draft -> pending_review -> active -> sold/closed
                  |                    |
                  v                    v
               removed             removed
active -> draft (pause/unpublish)
expired -> active (renew)
```

### Search Module (`/v1/search`)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/search/listings` | Geo search with filters | Public |
| GET | `/search/suggestions` | Autocomplete suggestions | Public |
| POST | `/search/saved` | Save a search | Authenticated |
| GET | `/search/saved` | List saved searches | Authenticated |
| DELETE | `/search/saved/:id` | Delete saved search | Authenticated |
| PATCH | `/search/saved/:id` | Update saved search | Authenticated |

**Search query parameters:**
```
GET /v1/search/listings?
  lat=40.7128&lng=-74.0060          # Center point (required)
  &radius=25                         # Miles (default: 25, max: 100)
  &category=automotive               # Category slug
  &q=honda+civic                     # Text search
  &price_min=5000&price_max=15000   # Price range
  &condition=good,like_new           # Condition filter (comma-separated)
  &custom_fields[year_min]=2018     # Category-specific filters
  &custom_fields[transmission]=automatic
  &sort=distance|newest|price_asc|price_desc
  &page=1&limit=20
```

**Response includes:**
- Listing data with distance from search center
- Promoted listings flagged with `is_sponsored: true`
- Facet counts for active filters
- Total result count

### Messages Module (`/v1/messages`)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/messages/conversations` | List conversations | Authenticated |
| POST | `/messages/conversations` | Start conversation (requires listing_id) | Authenticated |
| GET | `/messages/conversations/:id` | Get conversation with messages | Authenticated (participant) |
| POST | `/messages/conversations/:id` | Send message | Authenticated (participant) |
| POST | `/messages/conversations/:id/read` | Mark as read | Authenticated (participant) |
| POST | `/messages/conversations/:id/archive` | Archive conversation | Authenticated (participant) |

**WebSocket events (via Socket.io):**
```
Client -> Server:
  join_conversation(conversationId)
  leave_conversation(conversationId)
  send_message({ conversationId, content, type })
  typing({ conversationId, isTyping })

Server -> Client:
  new_message({ message, conversationId })
  message_read({ conversationId, readAt })
  typing({ conversationId, userId, isTyping })
  conversation_updated({ conversation })
```

### Payments Module (`/v1/payments`)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/payments/promotions/checkout` | Create Stripe Checkout for promotion | Authenticated |
| GET | `/payments/promotions` | List user's promotions | Authenticated |
| GET | `/payments/promotions/:id` | Get promotion details + analytics | Authenticated |
| POST | `/payments/webhook` | Stripe webhook handler | Stripe signature |

### Ratings Module (`/v1/ratings`)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/ratings` | Submit rating (requires conversation_id) | Authenticated |
| GET | `/ratings/pending` | Ratings the user can still submit | Authenticated |
| GET | `/ratings/user/:id` | Get ratings for a user | Public |

### Reports Module (`/v1/reports`)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/reports` | Submit a report | Authenticated |
| GET | `/reports/mine` | List my submitted reports | Authenticated |

### Admin Module (`/v1/admin`)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/admin/moderation/queue` | Get pending review items | Admin |
| POST | `/admin/moderation/:id/approve` | Approve listing | Admin |
| POST | `/admin/moderation/:id/reject` | Reject listing | Admin |
| POST | `/admin/moderation/:id/request-changes` | Request changes | Admin |
| GET | `/admin/users` | List/search users | Admin |
| GET | `/admin/users/:id` | User detail with history | Admin |
| POST | `/admin/users/:id/suspend` | Suspend user | Admin |
| POST | `/admin/users/:id/ban` | Ban user | Admin |
| POST | `/admin/users/:id/shadow-ban` | Shadow-ban user | Admin |
| GET | `/admin/reports` | List reports | Admin |
| PATCH | `/admin/reports/:id` | Update report status | Admin |
| GET | `/admin/audit-logs` | Query audit logs | Admin |
| GET | `/admin/listings/:id` | Listing detail with moderation data | Admin |
| DELETE | `/admin/listings/:id/media/:mediaId` | Remove specific media | Admin |

---

## Frontend Architecture

### Page Structure (Next.js App Router)

```
app/
├── (public)/
│   ├── page.tsx                    # Homepage with search
│   ├── search/page.tsx             # Search results (SSR)
│   ├── listings/[id]/page.tsx      # Listing detail (SSR for SEO)
│   ├── users/[id]/page.tsx         # Public profile (SSR)
│   └── categories/[slug]/page.tsx  # Category browse (SSR)
│
├── (auth)/
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── verify-phone/page.tsx
│   └── reset-password/page.tsx
│
├── (dashboard)/
│   ├── layout.tsx                  # Auth-gated layout
│   ├── listings/
│   │   ├── page.tsx                # My listings
│   │   ├── new/page.tsx            # Create listing
│   │   └── [id]/edit/page.tsx      # Edit listing
│   ├── messages/
│   │   ├── page.tsx                # Conversations list
│   │   └── [id]/page.tsx           # Conversation thread
│   ├── profile/page.tsx            # Edit profile
│   ├── settings/page.tsx           # Account settings
│   ├── promotions/page.tsx         # My promotions
│   ├── saved-searches/page.tsx     # Saved searches
│   └── ratings/page.tsx            # My ratings
│
├── api/                            # BFF routes (token refresh, etc.)
├── layout.tsx                      # Root layout
└── not-found.tsx
```

### Key Frontend Patterns

1. **API Client:** Typed fetch wrapper using shared types from `@marketplace/shared`. Handles token refresh transparently.
2. **State Management:** Server state via TanStack Query (React Query). Minimal client state via React Context for auth and UI preferences.
3. **Forms:** React Hook Form + Zod validation (schemas shared with backend).
4. **Maps:** Mapbox GL JS with custom marker components for listing pins.
5. **Real-time:** Socket.io client for chat with optimistic UI updates.
6. **Image Upload:** Client-side resize via canvas API before presigned URL upload. Progress tracking via XHR.

---

## Real-Time Communication

### Socket.io Architecture

```
Client (web/mobile)
    |
    v
Socket.io Gateway (NestJS)
    |
    ├── Authentication (JWT validation on connection)
    ├── Room management (conversation rooms)
    ├── Message broadcasting
    └── Presence tracking
    |
    v
Redis Adapter (for horizontal scaling)
    |
    v
PostgreSQL (message persistence)
```

- Connections are authenticated via JWT token passed during handshake.
- Each conversation maps to a Socket.io room.
- Redis adapter enables multi-instance Socket.io (messages broadcast across API instances).
- Messages are persisted to PostgreSQL before being broadcast (write-ahead).

---

## Media Pipeline

```
Client                    API                      S3                  Worker
  |                        |                       |                     |
  |-- Request presigned -->|                       |                     |
  |<-- Presigned URL ------|                       |                     |
  |                        |                       |                     |
  |-- Upload directly ---------------------------->|                     |
  |                        |                       |                     |
  |-- Confirm upload ----->|                       |                     |
  |                        |-- Enqueue job --------|-------------------->|
  |                        |                       |                     |
  |                        |                       |<-- Download orig ---|
  |                        |                       |                     |
  |                        |                       |   [Strip EXIF]      |
  |                        |                       |   [Resize: 150/400/800]
  |                        |                       |   [Convert WebP]    |
  |                        |                       |   [Generate blurhash]
  |                        |                       |   [Compute phash]   |
  |                        |                       |                     |
  |                        |                       |<-- Upload variants -|
  |                        |<-- Update DB record --|---------------------|
  |<-- SSE/WS: ready ------|                       |                     |
```

---

## Search Architecture

### PostGIS Radius Query Pattern

```sql
SELECT
  l.*,
  ST_Distance(l.location, ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geography) AS distance_meters
FROM listings l
WHERE
  l.status = 'active'
  AND ST_DWithin(
    l.location,
    ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geography,
    $radius_meters
  )
  AND ($category_id IS NULL OR l.category_id = $category_id)
  AND ($price_min IS NULL OR l.price >= $price_min)
  AND ($price_max IS NULL OR l.price <= $price_max)
ORDER BY
  CASE WHEN $sort = 'distance' THEN ST_Distance(l.location, ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geography) END ASC,
  CASE WHEN $sort = 'newest' THEN l.published_at END DESC,
  CASE WHEN $sort = 'price_asc' THEN l.price END ASC,
  CASE WHEN $sort = 'price_desc' THEN l.price END DESC
LIMIT $limit OFFSET $offset;
```

### Promoted Listing Injection

Promoted listings are fetched separately and injected into results at defined positions (e.g., positions 1, 5, 10). They are clearly marked with `is_sponsored: true`. If a promoted listing also matches the organic query, it appears only in the promoted slot (deduplicated).

### Algolia Migration Path (Phase 2)

1. Create `SearchProvider` interface in the API.
2. Implement `PostgisSearchProvider` (MVP) and `AlgoliaSearchProvider` (Phase 2).
3. Sync listings to Algolia index via BullMQ on create/update/delete.
4. Feature-flag the provider switch.

---

## Trust & Safety System

### Risk Scoring Model

Every listing receives a `risk_score` (0-100) computed from weighted signals:

| Signal | Weight | Description |
|--------|--------|-------------|
| Account age | 15 | New accounts score higher risk |
| Phone verified | 10 | Unverified = higher risk |
| Post velocity | 15 | Rapid posting = higher risk |
| Text analysis | 20 | Prohibited keywords, obfuscation, coded language |
| Price anomaly | 10 | Significantly below market = higher risk |
| Image hash match | 20 | Matches known-bad image = high risk |
| Behavioral signals | 10 | VPN, device reuse, geo hops |

**Thresholds:**
- 0-30: Auto-approve
- 31-60: Queue for review (publish but flag)
- 61-100: Hold for review (do not publish)

### Content Moderation Queue

Admin dashboard shows queue sorted by risk score. Each item displays:
- Listing content + media thumbnails
- Matched risk signals highlighted
- User history (account age, previous reports, previous actions)
- One-click actions: Approve, Reject, Request Changes, Remove, Ban User, Shadow-Ban

---

## Infrastructure & Deployment

### Local Development (Docker Compose)

```yaml
services:
  postgres:    # PostgreSQL 16 + PostGIS 3.4
  redis:       # Redis 7
  minio:       # S3-compatible storage
  mailpit:     # Email testing
```

Developers run `pnpm dev` which starts the API (port 3001) and web (port 3000) with hot reload. Docker Compose provides backing services only.

### CI/CD Pipeline

```
Push to branch
    |
    v
GitHub Actions
    ├── Lint (ESLint + Prettier check)
    ├── Type check (tsc --noEmit across all packages)
    ├── Unit tests (Jest/Vitest)
    ├── Integration tests (against Docker Compose services)
    └── Build (all apps)
    |
    v
Pull Request
    ├── Required status checks pass
    ├── Code review approval
    └── Preview deployment (Vercel for web, Railway/Render for API)
    |
    v
Merge to main
    ├── Build Docker images
    ├── Push to container registry
    ├── Deploy to staging
    ├── Run smoke tests
    └── Manual promotion to production
```

### Environment Configuration

Three environments: `development`, `staging`, `production`.

Configuration is loaded via environment variables with validation at startup (fail fast if missing). The `.env.example` file documents every required variable. Secrets are managed via platform-specific secret managers (AWS Secrets Manager, Railway/Render secrets, or Doppler).

### Monitoring & Logging

| Concern | Tool | Notes |
|---------|------|-------|
| Application logs | Pino (structured JSON) | Shipped to CloudWatch/Datadog |
| Error tracking | Sentry | Source maps uploaded at build |
| APM | Datadog or New Relic | Request traces, DB query timing |
| Uptime | Better Uptime or Checkly | API health endpoint checks |
| Metrics | Custom (promotion analytics, search latency) | Stored in PostgreSQL, dashboarded |
| Alerting | PagerDuty/Opsgenie | Error rate spikes, queue depth, DB latency |

### Health Check Endpoint

```
GET /health
{
  "status": "ok",
  "version": "1.0.0",
  "uptime": 86400,
  "checks": {
    "database": "ok",
    "redis": "ok",
    "storage": "ok"
  }
}
```

---

## Security Model

### Authentication Flow

```
Signup -> Email + Password -> Account created (limited)
    -> Phone OTP verification -> Full access (can post)
    -> Optional: Stripe Identity -> Verified badge

Login -> Email + Password -> Access token (15 min) + Refresh token (30 day, httpOnly cookie)
    -> Access token expired -> Refresh endpoint -> New access + refresh (rotation)
    -> Refresh token expired -> Re-login required
```

### Authorization

Role-based access control (RBAC) with guards:
- **Public:** Browse, search, view listings/profiles
- **Authenticated:** Message, save searches, manage profile
- **Phone Verified:** Create listings, rate users
- **Admin:** Moderation queue, user management, audit logs
- **Super Admin:** System configuration, admin management

### Rate Limiting

| Endpoint Group | Limit | Window |
|----------------|-------|--------|
| Auth (login/signup) | 5 requests | 15 minutes |
| OTP send | 3 requests | 1 hour |
| Listing create | 10 requests | 24 hours (scales with trust) |
| Message send | 60 requests | 1 minute |
| Search | 30 requests | 1 minute |
| General API | 100 requests | 1 minute |

Implemented via Redis-backed rate limiter (`@nestjs/throttler` + Redis store).

### Data Protection

- Passwords hashed with Argon2id (memory-hard).
- Refresh tokens stored as SHA-256 hashes (never plaintext).
- EXIF data stripped from uploaded images (location privacy).
- Listing location precision configurable (exact, area, city-level).
- PII (email, phone) never exposed in public API responses.
- Messages encrypted at rest (application-level encryption with per-conversation keys, or database-level TDE).

---

## Phased Delivery

### Phase 0: Foundation (Weeks 1-2)
- Monorepo setup, CI/CD pipeline, Docker Compose
- Database schema, Prisma migrations
- Auth module (signup, login, JWT, refresh, OTP)
- Basic NestJS structure with all module stubs

### Phase 1: MVP Core (Weeks 3-8)
- Listing CRUD with media upload pipeline
- Category system with structured fields (Automotive, Housing, Real Estate, General)
- Geo search with PostGIS radius queries
- In-app messaging with Socket.io
- Promoted listings purchase via Stripe Checkout
- Basic ratings system
- Abuse reporting
- Admin moderation queue
- Next.js frontend with all core pages

### Phase 2: Trust & Polish (Weeks 9-12)
- Stripe Identity verification
- Saved searches with notification alerts
- Advanced moderation scoring and automation
- Map view for search results
- Performance optimization and caching
- Email notifications (transactional)

### Phase 3: Mobile & Scale (Weeks 13-18)
- React Native mobile app
- Push notifications
- Algolia search integration (if scale demands)
- Seller storefronts
- In-app checkout with Stripe Connect
