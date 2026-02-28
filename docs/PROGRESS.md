# Project Progress

Last updated: 2026-02-22

This document tracks the development status of the Marketplace application across all phases. It serves as the single source of truth for what has been completed, what is in progress, and what remains.

Status legend:
- **[ ]** Not started
- **[~]** In progress
- **[x]** Done

---

## Table of Contents

- [Phase 0: Discovery](#phase-0-discovery)
- [Phase 1: MVP (Web + API)](#phase-1-mvp-web--api)
- [Phase 2: Native Mobile Apps](#phase-2-native-mobile-apps)
- [Phase 3: Trust + Monetization Expansion](#phase-3-trust--monetization-expansion)
- [Key Decisions and Trade-offs](#key-decisions-and-trade-offs)
- [Open Questions](#open-questions)

---

## Phase 0: Discovery

| Task | Status | Notes |
|---|---|---|
| Product plan and requirements document | [x] | `plan.md` finalized |
| Technical architecture design | [x] | `ARCHITECTURE.md` complete — NestJS, Next.js, PostGIS, Redis, BullMQ, Stripe |
| UI/UX design system | [x] | `docs/UI_DESIGN.md` complete — design tokens, Tailwind config, component library |
| Security architecture | [x] | `docs/SECURITY.md` complete — threat model, auth flows, risk scoring engine |
| Mobile app architecture | [x] | `docs/MOBILE_ARCHITECTURE.md` complete — React Native + Expo scaffolded |
| Category taxonomy definition | [x] | Full category tree in `packages/shared/src/constants/categories.ts` — 6 top-level, 42 subcategories, 200+ field definitions |
| Content policy documentation | [x] | `docs/CONTENT_POLICY.md` — prohibited items, enforcement ladder (6 levels), SLAs, appeals process, auto-moderation signals |
| MVP ranking rules | [x] | `docs/RANKING.md` — composite score formula, promotion slot layout, anti-gaming rules |
| Database schema design | [x] | `docs/DATABASE_SCHEMA.md` complete; Prisma schema with all 16+ models implemented |
| API design documentation | [x] | `docs/API_DESIGN.md` complete — full endpoint catalog, error codes, rate limits |
| Project documentation setup | [x] | README, DEVELOPMENT.md, CLAUDE.md, PROGRESS.md, SECURITY.md, UI_DESIGN.md, MOBILE_ARCHITECTURE.md |

---

## Phase 1: MVP (Web + API)

### Infrastructure and Scaffolding

| Task | Status | Notes |
|---|---|---|
| Monorepo setup (pnpm workspace) | [x] | `pnpm-workspace.yaml`, `turbo.json`, root `package.json` |
| NestJS API project setup | [x] | `apps/api/` with global prefix `/api/v1`, Swagger, validation pipe, CORS |
| Next.js web app setup | [x] | `apps/web/` with App Router, Tailwind, Zustand, React Query |
| Docker Compose (PostgreSQL, Redis, MinIO) | [x] | `infrastructure/docker-compose.yml` with PostGIS, Redis, MinIO, MailHog |
| Production Dockerfiles | [x] | `apps/api/Dockerfile` (multi-stage NestJS) + `apps/web/Dockerfile` (Next.js standalone); `.dockerignore` |
| CI/CD pipeline (lint, test, build) | [x] | `.github/workflows/ci.yml` — lint, typecheck, API tests (PostGIS service), web tests, turbo build |
| Environment configuration management | [x] | `apps/api/.env.example`, `apps/web/.env.example`; `apps/api/src/config/` |
| Shared TypeScript package | [x] | `packages/shared/` — types, constants, validation schemas, utilities |
| UI component library | [x] | `packages/ui/` — 24 components (atoms, molecules, organisms) |

### Auth Module

| Task | Status | Notes |
|---|---|---|
| User registration (email + password) | [x] | `POST /api/v1/auth/signup` with bcrypt hashing |
| Login with JWT + refresh tokens | [x] | `POST /api/v1/auth/login` — 15min access + 7day refresh |
| Refresh token rotation | [x] | `POST /api/v1/auth/refresh` — old token invalidated on use |
| Phone OTP send + verify | [x] | `POST /api/v1/auth/otp/send` + `/verify` |
| Password reset flow | [x] | `POST /api/v1/auth/forgot-password` + `/reset-password` |
| Session management (list, revoke) | [x] | `GET /api/v1/auth/sessions`, `DELETE /sessions/:id`, `DELETE /sessions` |
| Auth guards and decorators (NestJS) | [x] | `JwtAuthGuard`, `RolesGuard`, `@CurrentUser()`, `@Public()` |
| Login / signup UI pages | [x] | `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx` |

### Listings Module

| Task | Status | Notes |
|---|---|---|
| Listing CRUD API endpoints | [x] | `GET/POST /listings`, `GET/PATCH/DELETE /listings/:id` |
| Listing status state machine | [x] | draft → pending_review → active → sold/closed/expired |
| Media upload (images) | [x] | `POST /listings/:id/media` — S3 upload endpoint; EXIF stripping pipeline scaffolded |
| Media upload (video) | [x] | `process-video` BullMQ job — fluent-ffmpeg thumbnail extraction at 00:00:01; uploads to S3; ffmpeg added to Dockerfile |
| Category-specific field validation | [x] | EAV pattern with `listing_fields` table; DTO validation in place |
| Listing expiration + renewal | [x] | 30-day expiration via scheduled job; `POST /listings/:id/renew` |
| Listing creation UI | [x] | `app/(main)/listings/new/page.tsx` — 7-step wizard |
| Listing detail page UI | [x] | `app/(main)/listings/[id]/page.tsx` — image gallery, seller info, contact CTA |
| Listing edit UI | [x] | `app/(main)/listings/[id]/edit/page.tsx` — 4-step edit wizard |
| My listings management UI | [x] | `app/(main)/profile/page.tsx` includes listing management |

### Search Module

| Task | Status | Notes |
|---|---|---|
| PostGIS radius search query | [x] | `ST_DWithin` radius filter with `ST_Distance` for sorting |
| Location selection (GPS, typed address) | [x] | `LocationSearch.tsx` — Nominatim/OSM autocomplete + browser GPS; wired into listing creation wizard and search page |
| Radius selector (5/10/25/50 miles) | [x] | `radiusMiles` query param, validated in DTO |
| Category + price + condition filters | [x] | Full filter set in `SearchQueryDto` |
| Sort by distance / newest / price | [x] | `sortBy` and `sortOrder` params |
| Full-text search (title + description) | [x] | PostgreSQL `tsvector` with GIN index |
| Search results page UI | [x] | `app/(main)/search/page.tsx` — infinite scroll, filter sidebar, list/grid toggle |
| Map view | [x] | Web: `app/(main)/search/MapView.tsx` — Leaflet/OSM with listing pins; Mobile: `components/ListingMapView.tsx` wired into search tab |
| Pagination (cursor-based) | [x] | `cursor` + `limit` on all collection endpoints |

### Chat / Messaging Module

| Task | Status | Notes |
|---|---|---|
| Conversation creation (per listing) | [x] | `POST /api/v1/conversations` |
| Message send + receive API | [x] | `POST /conversations/:id/messages`, `GET /conversations/:id/messages` |
| WebSocket real-time delivery | [x] | NestJS Gateway (`ChatGateway`) — `sendMessage`, `typing`, `joinConversation`, `markRead` events |
| Read receipts | [x] | `markRead` WebSocket event + REST endpoint |
| Typing indicators | [x] | `typing` WebSocket event broadcast |
| Anti-spam: rate limits, link blocking | [x] | 30 messages/min limit; external link blocking for low-trust accounts |
| Safety prompts in chat | [x] | Zelle/CashApp/Venmo detection with contextual safety warnings |
| Block user functionality | [x] | `POST /conversations/:id/block` |
| Chat inbox UI | [x] | `app/(main)/messages/page.tsx` — two-panel inbox + thread view |
| Chat thread UI | [x] | `app/(main)/messages/[id]/page.tsx` — real-time input, safety banners, auto-scroll |

### Payments / Promotions Module

| Task | Status | Notes |
|---|---|---|
| Promotion plan definitions | [x] | Bump $2.99/24h, Featured $9.99/7d, Spotlight $19.99/7d |
| Stripe Checkout integration | [x] | `POST /payments/promotions/:listingId/purchase` creates Checkout session |
| Promotion purchase flow | [x] | Plan selection → Stripe Checkout → webhook activation |
| Stripe webhook handler | [x] | `POST /payments/webhook` — handles `checkout.session.completed` |
| Promotion analytics tracking | [x] | `POST /payments/promotions/:id/analytics` — impressions, clicks, messages |
| Promote listing UI | [x] | `app/(main)/listings/[id]/promote/page.tsx` — Bump/Featured/Spotlight cards with Stripe redirect |
| Promotion dashboard UI | [x] | `app/(main)/profile/promotions/page.tsx` — active/expired tabs with analytics |

### Ratings Module

| Task | Status | Notes |
|---|---|---|
| Submit rating API | [x] | `POST /api/v1/ratings` — score + comment |
| Rating constraints (one per user per listing) | [x] | Qualifying interaction check + duplicate prevention |
| User rating aggregation (avg, count) | [x] | Cached on `users.rating_avg` + `users.rating_count`, updated on submit |
| Rating display on user profiles | [x] | Public profile page shows `ratingAvg` and `ratingCount` |
| Rating prompt after interaction | [x] | `RatingTrigger.tsx` + `RatingModal.tsx` — shown on listing detail when status is sold |

### Admin / Moderation Module

| Task | Status | Notes |
|---|---|---|
| Admin authentication + role guards | [x] | `role: admin | super_admin` check via `RolesGuard` |
| Moderation queue (listings pending review) | [x] | `GET /api/v1/admin/moderation/queue` |
| Listing moderation actions | [x] | Approve, reject, remove — `PATCH /admin/listings/:id/approve|reject|remove` |
| User management (search, view, status) | [x] | Search, detail, ban, shadow-ban, suspend, unsuspend |
| Report submission API | [x] | `POST /api/v1/reports` — listing, user, message reports |
| Report management (list, resolve) | [x] | `GET /admin/reports`, `PATCH /admin/reports/:id/resolve` |
| Audit log recording | [x] | Append-only audit log on every admin action via `$transaction` |
| Admin console UI | [x] | `app/(main)/admin/page.tsx` — stats cards, moderation queue, reports table |

### Anti-Spam and Safety

| Task | Status | Notes |
|---|---|---|
| Progressive trust (daily listing limits) | [x] | New accounts: 3/day limit enforced in `ListingsService` |
| Phone verification gate for posting | [x] | `phoneVerified` check before allowing listing creation |
| Prohibited keyword detection | [x] | Keyword list + fuzzy matching in `RiskScoringService` |
| Risk scoring per listing | [x] | `apps/api/src/modules/moderation/risk-scoring.service.ts` — 18+ signal evaluators |
| Image hash for known-bad uploads | [x] | dHash implemented in `MediaProcessingProcessor` via Sharp (9×8 greyscale); hash stored on `ListingMedia`; `RiskScoringProcessor` queries `BadMediaHash` blocklist |
| Rate limiting (per-endpoint) | [x] | NestJS ThrottlerModule; custom `ThrottleGuard` with tiered limits |

### Cross-cutting

| Task | Status | Notes |
|---|---|---|
| Unit test suite | [x] | 5 spec files, 40 tests — `media-processing.processor.spec.ts`, `search.service.spec.ts`, `chat.service.spec.ts`, `users.service.spec.ts`, `exchange.service.spec.ts` |
| Error handling middleware | [x] | Global exception filter with standardized `{ error: { code, message } }` format |
| Request validation (DTOs) | [x] | `AppValidationPipe` with `whitelist`, `forbidNonWhitelisted`, `transform` |
| Logging infrastructure | [x] | `AppLogger` — structured JSON in production, colorized dev output; wired into `main.ts` |
| Health check endpoint | [x] | `GET /health` via `@nestjs/terminus` — checks DB + Redis |
| Email service integration | [x] | `EmailService` with nodemailer SMTP; 7 templates (welcome, verification, reset, expired, new message, approved, rejected) |
| Background job processing (BullMQ) | [x] | MediaProcessingProcessor (dHash + resize + video thumbnail), NotificationProcessor (real Expo push delivery + stale token cleanup), RiskScoringProcessor — all wired with queue injection |

---

## Phase 2: Native Mobile Apps

| Task | Status | Notes |
|---|---|---|
| React Native project setup | [x] | `apps/mobile/` scaffolded with Expo + TypeScript |
| Navigation structure | [x] | Tab-based navigation with stack navigators (`app/(tabs)/`) |
| Auth screens (login, signup) | [x] | `app/(auth)/login.tsx`, `app/(auth)/signup.tsx` — JWT flow + secure token storage |
| Listing detail screen | [x] | `app/listing/[id].tsx` — image gallery, seller card, sticky CTA bar, share button |
| Camera-first listing creation | [x] | `app/create/` — 3-step flow: media picker → details → preview + upload |
| Public user profile screen | [x] | `app/user/[id].tsx` — avatar, stats, 2-col listings grid, FlashList |
| Push notification integration | [x] | Expo Notifications wired; `POST/DELETE /users/me/push-token`; real Expo push delivery via `expo-server-sdk`; chat messages and moderation decisions enqueue push jobs |
| Location permissions + "near me" | [x] | `hooks/useLocation.ts` + `expo-location`; GPS pre-fills listing creation |
| Mobile chat UX | [x] | `app/chat/[id].tsx` — Socket.IO real-time, typing indicators, optimistic sends, mark-read; QR exchange buttons wired (seller: show QR, buyer: scan QR) |
| Offline support / caching | [x] | MMKV-backed cache (5-min TTL) in `stores/cache-store.ts`; `OfflineBanner` component |
| QR code exchange handshake | [x] | `ExchangeModule` — seller generates JWT QR token (`POST /conversations/:id/exchange-qr`), buyer confirms by scan (`POST /exchange-tokens/confirm`); `ExchangeQRModal` + `ExchangeScannerModal`; wired into chat header |
| Web notification bell | [x] | `NotificationBell.tsx` — React Query polling (30s), unread badge, dropdown, mark-all-read; added to `Header.tsx` |
| App store submission | [ ] | Requires EAS account setup |

---

## Phase 3: Trust + Monetization Expansion

| Task | Status | Notes |
|---|---|---|
| Stripe Identity verification (verified badge) | [x] | `POST /users/me/verify-identity` → Stripe Identity session; webhook marks `identityVerified=true` |
| Identity verification UI | [x] | `app/(main)/settings/verification/page.tsx` — benefit list, Stripe redirect |
| Tiered seller limits based on verification | [x] | `SellerSubscription.dailyListingLimit` wired; `TIER_DAILY_LISTING_LIMITS` in `subscription-plans.ts` |
| Saved searches + new match alerts | [x] | `SavedSearchesModule` — CRUD + daily cron (`@Cron('0 8 * * *')`); "Save search" button on web search page |
| Saved searches management UI | [x] | `app/(main)/profile/saved-searches/page.tsx` — list, delete, toggle notifications |
| Seller storefronts | [x] | `GET /users/:id` returns full public profile + listing count; `app/(main)/users/[id]/page.tsx` |
| Offer / counteroffer system | [x] | `OffersModule` — create, respond (accept/decline/counter), withdraw, expire cron; `OfferButton.tsx` on listing detail |
| Subscription plans for power sellers | [x] | `SubscriptionsModule` — Stripe Checkout + webhook lifecycle; 3 tiers (basic/pro/unlimited); `app/(main)/settings/subscription/page.tsx` |
| Advanced moderation automation | [~] | `RiskScoringProcessor` auto-holds (≥70) / auto-rejects (≥90); full ML pipeline deferred |
| In-app checkout + Stripe Connect payouts | [x] | Web: `/settings/payouts` with Connect onboarding, status, dashboard link, transaction history. Mobile: `PurchaseModal` with Stripe payment sheet, `Buy Now` button on listing detail, `api.payments.*` client |
| Prisma schema additions | [x] | `PushToken`, `Offer`, `SellerSubscription`, `SavedSearch`, `BadMediaHash`, `ExchangeToken` models added; `MediaProcessingStatus` enum + `processingStatus` field on `ListingMedia` |

---

## Key Decisions and Trade-offs

### Decided

| Decision | Rationale | Date |
|---|---|---|
| **NestJS for backend API** | Strong TypeScript support, modular architecture, built-in WebSocket support, large ecosystem | 2026-02-17 |
| **Next.js for web frontend** | App Router for SSR/SSG, React ecosystem, good DX, Tailwind integration | 2026-02-17 |
| **PostgreSQL + PostGIS for MVP search** | Full control over geo queries, predictable costs, no external dependency; can add Algolia later | 2026-02-17 |
| **pnpm monorepo** | Efficient disk usage, strict dependency management, workspace support | 2026-02-17 |
| **JWT + refresh token auth** | Stateless access tokens for API scalability, rotating refresh tokens for security | 2026-02-17 |
| **Prisma as ORM** | Type-safe database access, migration management, good DX with TypeScript | 2026-02-17 |
| **React Native for mobile (Phase 2)** | Code sharing with web (React), large community, good performance | 2026-02-17 |
| **Stripe for payments** | Industry standard, supports Checkout, Identity, Connect; handles compliance | 2026-02-17 |
| **Cursor-based pagination** | Better performance and consistency than offset pagination for large datasets | 2026-02-17 |
| **EAV pattern for category fields** | Flexibility for different categories without schema changes per category | 2026-02-17 |
| **Risk scoring engine (custom)** | 18+ behavioral signals evaluated per listing/message; catches fraud patterns before moderation queue | 2026-02-19 |

### Under Discussion

| Topic | Options | Notes |
|---|---|---|
| Maps provider | Google Maps Platform vs. Mapbox | Currently Leaflet/OSM; upgrade path when richer map features are needed |
| Search engine | Algolia vs. Elasticsearch/OpenSearch | Currently PostGIS; migration path available when faceted search latency demands it |
| Email provider | SendGrid vs. AWS SES vs. Resend | Nodemailer stub in place; provider selection needed before launch |

---

## Open Questions

1. **Search ranking algorithm** -- How should promoted results interleave with organic results? What weight does distance vs. recency get?

2. **Deployment target** -- AWS vs. GCP vs. other cloud provider? Kubernetes vs. simpler deployment (ECS, Cloud Run)? Deploy workflow is stubbed in `.github/workflows/deploy.yml` but not wired to a real target.

3. **Monitoring and observability** -- Which tools for APM, error tracking, and metrics? (Datadog, Sentry, Grafana, etc.) Nothing is instrumented yet.

4. **Legal and compliance** -- Privacy policy, terms of service, CCPA/GDPR considerations for user data and location tracking.

5. **Email provider** -- `EmailService` uses nodemailer; a real SMTP provider (SendGrid, AWS SES, Resend) needs to be configured and templates tested end-to-end.
