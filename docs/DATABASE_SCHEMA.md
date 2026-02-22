# Database Schema

This document describes the PostgreSQL database schema for the Marketplace application, including entity relationships, table definitions, indexing strategy, and PostGIS usage.

The database uses **PostgreSQL 16** with the **PostGIS** extension for geospatial queries.

---

## Table of Contents

- [Entity Relationships](#entity-relationships)
- [Core Tables](#core-tables)
  - [users](#users)
  - [user_sessions](#user_sessions)
  - [user_verifications](#user_verifications)
  - [listings](#listings)
  - [listing_media](#listing_media)
  - [listing_fields](#listing_fields)
  - [categories](#categories)
  - [category_fields](#category_fields)
  - [conversations](#conversations)
  - [messages](#messages)
  - [ratings](#ratings)
  - [promotions](#promotions)
  - [promotion_purchases](#promotion_purchases)
  - [reports](#reports)
  - [moderation_actions](#moderation_actions)
  - [saved_searches](#saved_searches)
  - [audit_logs](#audit_logs)
- [PostGIS Usage](#postgis-usage)
- [Indexing Strategy](#indexing-strategy)
- [Migration Strategy](#migration-strategy)

---

## Entity Relationships

```
users
  |-- 1:N --> user_sessions
  |-- 1:N --> user_verifications
  |-- 1:N --> listings
  |-- 1:N --> conversations (as buyer or seller)
  |-- 1:N --> messages (as sender)
  |-- 1:N --> ratings (as rater and as rated)
  |-- 1:N --> promotion_purchases
  |-- 1:N --> reports (as reporter)
  |-- 1:N --> saved_searches
  |-- 1:N --> audit_logs (as actor)

listings
  |-- N:1 --> users (seller)
  |-- N:1 --> categories
  |-- 1:N --> listing_media
  |-- 1:N --> listing_fields
  |-- 1:N --> conversations
  |-- 1:N --> ratings (context)
  |-- 1:1 --> promotions (active promotion)
  |-- 1:N --> reports (target)

categories
  |-- 1:N --> categories (self-referencing parent/child)
  |-- 1:N --> category_fields
  |-- 1:N --> listings

conversations
  |-- N:1 --> listings
  |-- N:N --> users (participants, via buyer_id/seller_id)
  |-- 1:N --> messages

promotions
  |-- 1:N --> promotion_purchases

reports
  |-- 1:N --> moderation_actions
```

---

## Core Tables

### users

The central user account table.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `text` (CUID) | No | `cuid()` | Primary key |
| `email` | `varchar(255)` | No | -- | Unique, lowercase |
| `password_hash` | `varchar(255)` | No | -- | bcrypt hash |
| `display_name` | `varchar(100)` | No | -- | Public display name |
| `avatar_url` | `text` | Yes | `null` | Profile image URL |
| `phone` | `varchar(20)` | Yes | `null` | Phone number (E.164 format) |
| `phone_verified` | `boolean` | No | `false` | Whether phone is verified |
| `identity_verified` | `boolean` | No | `false` | Stripe Identity verification status |
| `stripe_identity_id` | `text` | Yes | `null` | Stripe Identity verification session ID |
| `location` | `geography(Point, 4326)` | Yes | `null` | User's approximate location |
| `location_city` | `varchar(100)` | Yes | `null` | City name for display |
| `location_state` | `varchar(50)` | Yes | `null` | State/province |
| `role` | `varchar(20)` | No | `'user'` | `user`, `moderator`, `admin` |
| `status` | `varchar(20)` | No | `'active'` | `active`, `suspended`, `banned`, `shadow_banned` |
| `daily_listing_limit` | `integer` | No | `3` | Max listings per day (increases with trust) |
| `response_rate` | `decimal(3,2)` | Yes | `null` | Calculated response rate (0.00 - 1.00) |
| `rating_avg` | `decimal(2,1)` | Yes | `null` | Cached average rating |
| `rating_count` | `integer` | No | `0` | Cached total ratings received |
| `last_active_at` | `timestamptz` | Yes | `null` | Last activity timestamp |
| `created_at` | `timestamptz` | No | `now()` | Account creation time |
| `updated_at` | `timestamptz` | No | `now()` | Last update time |

### user_sessions

Tracks active login sessions for device/session management.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `text` (CUID) | No | `cuid()` | Primary key |
| `user_id` | `text` | No | -- | FK to `users.id` |
| `refresh_token_hash` | `varchar(255)` | No | -- | Hashed refresh token |
| `device_info` | `jsonb` | Yes | `null` | User agent, device type, OS |
| `ip_address` | `inet` | Yes | `null` | IP at session creation |
| `expires_at` | `timestamptz` | No | -- | Session expiration time |
| `created_at` | `timestamptz` | No | `now()` | Session start |

### user_verifications

Stores OTP codes and verification tokens.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `text` (CUID) | No | `cuid()` | Primary key |
| `user_id` | `text` | No | -- | FK to `users.id` |
| `type` | `varchar(20)` | No | -- | `phone_otp`, `email_verify`, `password_reset` |
| `target` | `varchar(255)` | No | -- | Phone number or email |
| `code_hash` | `varchar(255)` | No | -- | Hashed OTP or token |
| `attempts` | `integer` | No | `0` | Failed verification attempts |
| `max_attempts` | `integer` | No | `5` | Maximum allowed attempts |
| `expires_at` | `timestamptz` | No | -- | Code expiration time |
| `verified_at` | `timestamptz` | Yes | `null` | When verified (null = pending) |
| `created_at` | `timestamptz` | No | `now()` | Created time |

### listings

The core marketplace listing.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `text` (CUID) | No | `cuid()` | Primary key |
| `user_id` | `text` | No | -- | FK to `users.id` (seller) |
| `category_id` | `text` | No | -- | FK to `categories.id` |
| `title` | `varchar(200)` | No | -- | Listing title |
| `slug` | `varchar(250)` | No | -- | URL-friendly slug (unique) |
| `description` | `text` | Yes | `null` | Full description |
| `price` | `integer` | Yes | `null` | Price in cents (null = contact for price) |
| `price_type` | `varchar(20)` | No | `'fixed'` | `fixed`, `obo`, `free`, `hourly`, `contact` |
| `condition` | `varchar(20)` | Yes | `null` | `new`, `like_new`, `used`, `fair`, `for_parts` |
| `status` | `varchar(20)` | No | `'draft'` | `draft`, `pending_review`, `active`, `sold`, `closed`, `expired`, `rejected`, `removed` |
| `visibility` | `varchar(20)` | No | `'public'` | `public`, `followers`, `private_link` |
| `location` | `geography(Point, 4326)` | No | -- | Listing geographic point |
| `location_city` | `varchar(100)` | Yes | `null` | City for display |
| `location_state` | `varchar(50)` | Yes | `null` | State for display |
| `location_zip` | `varchar(10)` | Yes | `null` | ZIP/postal code |
| `view_count` | `integer` | No | `0` | Total views |
| `message_count` | `integer` | No | `0` | Total inquiry messages |
| `is_promoted` | `boolean` | No | `false` | Currently has active promotion |
| `risk_score` | `decimal(3,2)` | No | `0.00` | Automated risk assessment (0.00 - 1.00) |
| `rejection_reason` | `text` | Yes | `null` | Reason if rejected by moderation |
| `expires_at` | `timestamptz` | Yes | `null` | Auto-expiration date (30 days default) |
| `published_at` | `timestamptz` | Yes | `null` | When listing went active |
| `created_at` | `timestamptz` | No | `now()` | Created time |
| `updated_at` | `timestamptz` | No | `now()` | Last update time |

### listing_media

Images and videos attached to listings.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `text` (CUID) | No | `cuid()` | Primary key |
| `listing_id` | `text` | No | -- | FK to `listings.id` |
| `url` | `text` | No | -- | Full URL to the media file |
| `thumbnail_url` | `text` | Yes | `null` | Thumbnail version URL |
| `type` | `varchar(10)` | No | -- | `image`, `video` |
| `mime_type` | `varchar(50)` | No | -- | MIME type (e.g., `image/webp`) |
| `size_bytes` | `integer` | No | -- | File size in bytes |
| `width` | `integer` | Yes | `null` | Image/video width in pixels |
| `height` | `integer` | Yes | `null` | Image/video height in pixels |
| `position` | `integer` | No | `0` | Display order (0 = primary) |
| `hash` | `varchar(64)` | Yes | `null` | Perceptual hash for duplicate/abuse detection |
| `created_at` | `timestamptz` | No | `now()` | Upload time |

### listing_fields

Dynamic category-specific field values stored as key-value pairs (EAV pattern).

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `text` (CUID) | No | `cuid()` | Primary key |
| `listing_id` | `text` | No | -- | FK to `listings.id` |
| `field_id` | `text` | No | -- | FK to `category_fields.id` |
| `value` | `text` | No | -- | Field value (stored as text, validated by field type) |
| `created_at` | `timestamptz` | No | `now()` | Created time |

Unique constraint: `(listing_id, field_id)`

### categories

Hierarchical category taxonomy.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `text` (CUID) | No | `cuid()` | Primary key |
| `parent_id` | `text` | Yes | `null` | FK to `categories.id` (null = top-level) |
| `name` | `varchar(100)` | No | -- | Display name |
| `slug` | `varchar(100)` | No | -- | URL-friendly slug (unique) |
| `description` | `text` | Yes | `null` | Category description |
| `icon` | `varchar(50)` | Yes | `null` | Icon identifier |
| `position` | `integer` | No | `0` | Display order |
| `is_active` | `boolean` | No | `true` | Whether the category is enabled |
| `created_at` | `timestamptz` | No | `now()` | Created time |

Top-level categories: Automotive, Housing, Real Estate, Jobs/Services, For Sale, Community

### category_fields

Defines the structured fields available for each category.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `text` (CUID) | No | `cuid()` | Primary key |
| `category_id` | `text` | No | -- | FK to `categories.id` |
| `name` | `varchar(100)` | No | -- | Field internal name (e.g., `vehicle_type`) |
| `label` | `varchar(100)` | No | -- | Display label (e.g., "Vehicle Type") |
| `type` | `varchar(20)` | No | -- | `text`, `number`, `select`, `multiselect`, `boolean` |
| `options` | `jsonb` | Yes | `null` | Allowed values for select/multiselect fields |
| `is_required` | `boolean` | No | `false` | Whether the field is required for listing creation |
| `is_filterable` | `boolean` | No | `false` | Whether the field appears as a search filter |
| `validation` | `jsonb` | Yes | `null` | Validation rules (min, max, pattern, etc.) |
| `position` | `integer` | No | `0` | Display order in forms |
| `created_at` | `timestamptz` | No | `now()` | Created time |

### conversations

Per-listing messaging threads between two users.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `text` (CUID) | No | `cuid()` | Primary key |
| `listing_id` | `text` | No | -- | FK to `listings.id` |
| `buyer_id` | `text` | No | -- | FK to `users.id` (inquirer) |
| `seller_id` | `text` | No | -- | FK to `users.id` (listing owner) |
| `status` | `varchar(20)` | No | `'active'` | `active`, `blocked`, `archived` |
| `blocked_by` | `text` | Yes | `null` | FK to `users.id` (who blocked) |
| `buyer_last_read_at` | `timestamptz` | Yes | `null` | Buyer's last read timestamp |
| `seller_last_read_at` | `timestamptz` | Yes | `null` | Seller's last read timestamp |
| `last_message_at` | `timestamptz` | Yes | `null` | Timestamp of most recent message |
| `created_at` | `timestamptz` | No | `now()` | Conversation start time |

Unique constraint: `(listing_id, buyer_id)` -- one conversation per buyer per listing

### messages

Individual messages within a conversation.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `text` (CUID) | No | `cuid()` | Primary key |
| `conversation_id` | `text` | No | -- | FK to `conversations.id` |
| `sender_id` | `text` | No | -- | FK to `users.id` |
| `body` | `text` | No | -- | Message text content |
| `type` | `varchar(20)` | No | `'text'` | `text`, `system`, `safety_warning`, `offer` |
| `metadata` | `jsonb` | Yes | `null` | Additional data (offer amount, system context) |
| `is_flagged` | `boolean` | No | `false` | Flagged by automated checks |
| `created_at` | `timestamptz` | No | `now()` | Sent time |

### ratings

Two-sided user ratings tied to a listing interaction.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `text` (CUID) | No | `cuid()` | Primary key |
| `rater_id` | `text` | No | -- | FK to `users.id` (who gave the rating) |
| `rated_user_id` | `text` | No | -- | FK to `users.id` (who received the rating) |
| `listing_id` | `text` | No | -- | FK to `listings.id` (context) |
| `conversation_id` | `text` | No | -- | FK to `conversations.id` (proof of interaction) |
| `score` | `smallint` | No | -- | Rating score: 1-5 |
| `comment` | `text` | Yes | `null` | Optional review text |
| `is_hidden` | `boolean` | No | `false` | Hidden by admin (e.g., abusive review) |
| `created_at` | `timestamptz` | No | `now()` | Rating submission time |
| `updated_at` | `timestamptz` | No | `now()` | Last edit time |

Unique constraint: `(rater_id, rated_user_id, listing_id)` -- one rating per rater per user per listing

### promotions

Promotion plan definitions.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `text` (CUID) | No | `cuid()` | Primary key |
| `name` | `varchar(50)` | No | -- | Plan name (e.g., "Featured 7-Day") |
| `slug` | `varchar(50)` | No | -- | Plan identifier (e.g., `featured_7d`) |
| `description` | `text` | Yes | `null` | Plan description |
| `duration_hours` | `integer` | No | -- | How long the promotion lasts |
| `price_cents` | `integer` | No | -- | Cost in cents |
| `placement` | `varchar(30)` | No | -- | `bump`, `featured`, `spotlight` |
| `is_active` | `boolean` | No | `true` | Whether the plan is available for purchase |
| `created_at` | `timestamptz` | No | `now()` | Created time |

### promotion_purchases

Records of purchased promotions for listings.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `text` (CUID) | No | `cuid()` | Primary key |
| `user_id` | `text` | No | -- | FK to `users.id` (buyer) |
| `listing_id` | `text` | No | -- | FK to `listings.id` |
| `promotion_id` | `text` | No | -- | FK to `promotions.id` (plan) |
| `stripe_payment_id` | `text` | Yes | `null` | Stripe payment intent ID |
| `status` | `varchar(20)` | No | `'pending'` | `pending`, `active`, `expired`, `cancelled`, `refunded` |
| `amount_cents` | `integer` | No | -- | Amount charged in cents |
| `starts_at` | `timestamptz` | Yes | `null` | Promotion start time |
| `ends_at` | `timestamptz` | Yes | `null` | Promotion end time |
| `impressions` | `integer` | No | `0` | Total impressions tracked |
| `clicks` | `integer` | No | `0` | Total clicks tracked |
| `messages_received` | `integer` | No | `0` | Messages received during promotion |
| `created_at` | `timestamptz` | No | `now()` | Purchase time |

### reports

User-submitted reports for listings, users, or messages.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `text` (CUID) | No | `cuid()` | Primary key |
| `reporter_id` | `text` | No | -- | FK to `users.id` |
| `target_type` | `varchar(20)` | No | -- | `listing`, `user`, `message` |
| `target_id` | `text` | No | -- | ID of the reported entity |
| `reason` | `varchar(50)` | No | -- | Report reason code |
| `details` | `text` | Yes | `null` | Additional context from reporter |
| `evidence` | `jsonb` | Yes | `null` | Message IDs, screenshot URLs, snapshots |
| `status` | `varchar(20)` | No | `'pending'` | `pending`, `reviewing`, `resolved`, `dismissed` |
| `priority` | `varchar(10)` | No | `'normal'` | `low`, `normal`, `high`, `critical` |
| `resolved_by` | `text` | Yes | `null` | FK to `users.id` (admin who resolved) |
| `resolved_at` | `timestamptz` | Yes | `null` | Resolution time |
| `resolution_notes` | `text` | Yes | `null` | Admin notes on resolution |
| `created_at` | `timestamptz` | No | `now()` | Report submission time |

### moderation_actions

Log of moderation decisions and actions taken.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `text` (CUID) | No | `cuid()` | Primary key |
| `admin_id` | `text` | No | -- | FK to `users.id` (moderator) |
| `report_id` | `text` | Yes | `null` | FK to `reports.id` (if triggered by report) |
| `target_type` | `varchar(20)` | No | -- | `listing`, `user`, `message` |
| `target_id` | `text` | No | -- | ID of the affected entity |
| `action` | `varchar(30)` | No | -- | `approve`, `reject`, `remove`, `request_changes`, `suspend`, `ban`, `shadow_ban`, `warn`, `unban` |
| `reason` | `text` | Yes | `null` | Reason for the action |
| `metadata` | `jsonb` | Yes | `null` | Additional context (duration, matched signals) |
| `created_at` | `timestamptz` | No | `now()` | Action time |

### saved_searches

Saved search queries for alert notifications.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `text` (CUID) | No | `cuid()` | Primary key |
| `user_id` | `text` | No | -- | FK to `users.id` |
| `name` | `varchar(100)` | Yes | `null` | User-given name for the search |
| `query` | `jsonb` | No | -- | Full search parameters (q, category, filters, location, radius) |
| `notify` | `boolean` | No | `true` | Whether to send notifications for new matches |
| `last_notified_at` | `timestamptz` | Yes | `null` | Last notification sent |
| `created_at` | `timestamptz` | No | `now()` | Created time |

### audit_logs

Immutable log of significant system and admin actions.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `text` (CUID) | No | `cuid()` | Primary key |
| `actor_id` | `text` | Yes | `null` | FK to `users.id` (null = system) |
| `actor_type` | `varchar(20)` | No | -- | `user`, `admin`, `system` |
| `action` | `varchar(100)` | No | -- | Action identifier (e.g., `user.ban`, `listing.remove`) |
| `target_type` | `varchar(20)` | Yes | `null` | Entity type affected |
| `target_id` | `text` | Yes | `null` | Entity ID affected |
| `details` | `jsonb` | Yes | `null` | Action-specific context and data |
| `ip_address` | `inet` | Yes | `null` | Actor's IP address |
| `created_at` | `timestamptz` | No | `now()` | Event time |

This table is **append-only** -- rows are never updated or deleted.

---

## PostGIS Usage

### Extension setup

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

### Geography columns

The `users.location` and `listings.location` columns use the `geography(Point, 4326)` type. This type:

- Stores coordinates as longitude/latitude on the WGS 84 ellipsoid
- Returns distances in **meters** by default
- Handles curvature of the earth correctly (unlike `geometry` with planar calculations)

### Storing a point

```sql
-- Insert a listing with location (Austin, TX)
INSERT INTO listings (id, location, ...)
VALUES ('lst_abc', ST_SetSRID(ST_MakePoint(-97.7431, 30.2672), 4326)::geography, ...);
```

Note: `ST_MakePoint` takes **(longitude, latitude)** -- not (lat, lng).

### Distance queries

```sql
-- Find all active listings within 25 miles of a point
SELECT id, title, price,
       ST_Distance(location, ST_SetSRID(ST_MakePoint(-97.7431, 30.2672), 4326)::geography) / 1609.34 AS distance_miles
FROM listings
WHERE status = 'active'
  AND ST_DWithin(location, ST_SetSRID(ST_MakePoint(-97.7431, 30.2672), 4326)::geography, 25 * 1609.34)
ORDER BY distance_miles ASC
LIMIT 20;
```

`ST_DWithin` with geography types uses meters, so we multiply miles by 1609.34.

### Bounding box optimization

For large result sets, use `&&` with a bounding box before the precise distance filter:

```sql
WHERE location && ST_Expand(
    ST_SetSRID(ST_MakePoint(-97.7431, 30.2672), 4326)::geography::geometry,
    0.5  -- approximate degrees for bounding box
  )
  AND ST_DWithin(location, ...)
```

---

## Indexing Strategy

### Primary indexes

Every table has a primary key index on `id`.

### User indexes

```sql
CREATE UNIQUE INDEX idx_users_email ON users (lower(email));
CREATE UNIQUE INDEX idx_users_phone ON users (phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_users_status ON users (status);
CREATE INDEX idx_users_location ON users USING GIST (location);
```

### Listing indexes (critical for search performance)

```sql
-- Geographic search (the most important index)
CREATE INDEX idx_listings_location ON listings USING GIST (location);

-- Status filtering (almost every query filters on status)
CREATE INDEX idx_listings_status ON listings (status);

-- Composite index for common search patterns
CREATE INDEX idx_listings_status_category ON listings (status, category_id);

-- Sorting indexes
CREATE INDEX idx_listings_created_at ON listings (created_at DESC);
CREATE INDEX idx_listings_price ON listings (price) WHERE status = 'active';

-- User's listings
CREATE INDEX idx_listings_user_id ON listings (user_id);

-- Slug lookup
CREATE UNIQUE INDEX idx_listings_slug ON listings (slug);

-- Expiration checks (background job)
CREATE INDEX idx_listings_expires_at ON listings (expires_at) WHERE status = 'active';

-- Promotion filtering
CREATE INDEX idx_listings_promoted ON listings (is_promoted) WHERE is_promoted = true AND status = 'active';
```

### Listing fields index

```sql
CREATE INDEX idx_listing_fields_listing ON listing_fields (listing_id);
CREATE INDEX idx_listing_fields_field_value ON listing_fields (field_id, value);
```

### Conversation and message indexes

```sql
CREATE INDEX idx_conversations_buyer ON conversations (buyer_id);
CREATE INDEX idx_conversations_seller ON conversations (seller_id);
CREATE INDEX idx_conversations_listing ON conversations (listing_id);
CREATE INDEX idx_conversations_last_message ON conversations (last_message_at DESC);

CREATE INDEX idx_messages_conversation ON messages (conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages (sender_id);
```

### Rating indexes

```sql
CREATE INDEX idx_ratings_rated_user ON ratings (rated_user_id);
CREATE INDEX idx_ratings_listing ON ratings (listing_id);
```

### Report and moderation indexes

```sql
CREATE INDEX idx_reports_status ON reports (status, priority);
CREATE INDEX idx_reports_target ON reports (target_type, target_id);
CREATE INDEX idx_moderation_actions_target ON moderation_actions (target_type, target_id);
```

### Audit log indexes

```sql
CREATE INDEX idx_audit_logs_actor ON audit_logs (actor_id);
CREATE INDEX idx_audit_logs_target ON audit_logs (target_type, target_id);
CREATE INDEX idx_audit_logs_created ON audit_logs (created_at DESC);
```

### Full-text search (optional, for PostGIS-only MVP)

```sql
-- Add a generated tsvector column for full-text search
ALTER TABLE listings ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) STORED;

CREATE INDEX idx_listings_search ON listings USING GIN (search_vector);
```

Query with full-text search + geo:

```sql
SELECT id, title,
       ts_rank(search_vector, plainto_tsquery('english', 'honda civic')) AS relevance,
       ST_Distance(location, ref_point) / 1609.34 AS distance_miles
FROM listings
WHERE search_vector @@ plainto_tsquery('english', 'honda civic')
  AND ST_DWithin(location, ref_point, 25 * 1609.34)
  AND status = 'active'
ORDER BY relevance DESC, distance_miles ASC
LIMIT 20;
```

---

## Migration Strategy

### Tools

- **Prisma Migrate** for schema migrations in development and production
- Migration files are stored in `apps/api/prisma/migrations/`
- Each migration is a timestamped directory containing a SQL file

### Principles

1. **Forward-only migrations** -- Never edit an existing migration file. Create a new migration to modify the schema.
2. **Backward-compatible changes** -- When possible, make additive changes (new columns with defaults, new tables) that do not break the running application. This enables zero-downtime deployments.
3. **Data migrations separate from schema migrations** -- If data needs to be transformed, create a separate migration or script rather than mixing DDL and DML.
4. **Test migrations against production-like data** -- Before applying to production, test migrations against a copy of the production database to catch performance issues with large tables.
5. **PostGIS extension** -- The first migration must enable the PostGIS extension before creating geography columns.

### Seeding

Seed data is maintained in `apps/api/prisma/seed.ts` and includes:

- Category taxonomy (all top-level and subcategories)
- Category field definitions
- Promotion plan definitions
- (Development only) Test users, sample listings, and sample data

Run seeds with:

```bash
pnpm --filter api db:seed
```
