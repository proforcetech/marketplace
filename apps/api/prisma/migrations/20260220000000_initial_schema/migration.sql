-- =============================================================
-- Initial Schema Migration
-- Creates all base tables for the Marketplace application.
-- Requires PostgreSQL 16 + PostGIS.
--
-- Incremental migrations that run after this:
--   20260221000000 — adds processing_status to listing_media,
--                    bad_media_hashes, exchange_tokens
--   20260222000000 — adds Stripe Connect fields and transactions
-- =============================================================

-- PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- ─── Enums ────────────────────────────────────────────────────

CREATE TYPE "user_role" AS ENUM ('user', 'moderator', 'admin', 'super_admin');
CREATE TYPE "user_status" AS ENUM ('active', 'suspended', 'banned', 'shadow_banned');
CREATE TYPE "listing_status" AS ENUM ('draft', 'pending_review', 'active', 'sold', 'closed', 'expired', 'rejected', 'removed');
CREATE TYPE "price_type" AS ENUM ('fixed', 'obo', 'free', 'hourly', 'contact');
CREATE TYPE "item_condition" AS ENUM ('new', 'like_new', 'used', 'fair', 'for_parts');
CREATE TYPE "listing_visibility" AS ENUM ('public', 'followers', 'private_link');
CREATE TYPE "media_type" AS ENUM ('image', 'video');
CREATE TYPE "category_field_type" AS ENUM ('text', 'number', 'select', 'multiselect', 'boolean');
CREATE TYPE "message_type" AS ENUM ('text', 'system', 'safety_warning', 'offer');
CREATE TYPE "conversation_status" AS ENUM ('active', 'blocked', 'archived');
CREATE TYPE "promotion_placement" AS ENUM ('bump', 'featured', 'spotlight');
CREATE TYPE "promotion_purchase_status" AS ENUM ('pending', 'active', 'expired', 'cancelled', 'refunded');
CREATE TYPE "report_target_type" AS ENUM ('listing', 'user', 'message');
CREATE TYPE "report_status" AS ENUM ('pending', 'reviewing', 'resolved', 'dismissed');
CREATE TYPE "report_priority" AS ENUM ('low', 'normal', 'high', 'critical');
CREATE TYPE "moderation_action_type" AS ENUM ('approve', 'reject', 'remove', 'request_changes', 'suspend', 'ban', 'shadow_ban', 'warn', 'unban');
CREATE TYPE "verification_type" AS ENUM ('phone_otp', 'email_verify', 'password_reset');
CREATE TYPE "audit_actor_type" AS ENUM ('user', 'admin', 'system');
CREATE TYPE "offer_status" AS ENUM ('pending', 'accepted', 'declined', 'countered', 'expired', 'withdrawn');
CREATE TYPE "subscription_tier" AS ENUM ('basic', 'pro', 'unlimited');
CREATE TYPE "subscription_status" AS ENUM ('active', 'past_due', 'cancelled', 'trialing');

-- ─── Users ────────────────────────────────────────────────────

CREATE TABLE "users" (
    "id"                  TEXT NOT NULL,
    "email"               VARCHAR(255) NOT NULL,
    "password_hash"       VARCHAR(255) NOT NULL,
    "display_name"        VARCHAR(100) NOT NULL,
    "avatar_url"          TEXT,
    "phone"               VARCHAR(20),
    "phone_verified"      BOOLEAN NOT NULL DEFAULT false,
    "bio"                 TEXT,
    "identity_verified"   BOOLEAN NOT NULL DEFAULT false,
    "stripe_identity_id"  TEXT,
    "location_lat"        DOUBLE PRECISION,
    "location_lng"        DOUBLE PRECISION,
    "location_city"       VARCHAR(100),
    "location_state"      VARCHAR(50),
    "role"                "user_role" NOT NULL DEFAULT 'user',
    "status"              "user_status" NOT NULL DEFAULT 'active',
    "daily_listing_limit" INTEGER NOT NULL DEFAULT 3,
    "response_rate"       DECIMAL(3,2),
    "rating_avg"          DECIMAL(2,1),
    "rating_count"        INTEGER NOT NULL DEFAULT 0,
    "last_active_at"      TIMESTAMPTZ,
    "created_at"          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"          TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key"  ON "users"("email");
CREATE UNIQUE INDEX "users_phone_key"  ON "users"("phone");
CREATE INDEX        "users_status_idx" ON "users"("status");
CREATE INDEX        "users_email_idx"  ON "users"("email");

-- Geography column for location-based features
ALTER TABLE "users" ADD COLUMN "location" geography(Point, 4326);
CREATE INDEX "users_location_idx" ON "users" USING GIST ("location");

-- ─── User Sessions ────────────────────────────────────────────

CREATE TABLE "user_sessions" (
    "id"                 TEXT NOT NULL,
    "user_id"            TEXT NOT NULL,
    "refresh_token_hash" VARCHAR(255) NOT NULL,
    "device_info"        JSONB,
    "ip_address"         VARCHAR(45),
    "expires_at"         TIMESTAMPTZ NOT NULL,
    "created_at"         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_sessions_user_id_idx"            ON "user_sessions"("user_id");
CREATE INDEX "user_sessions_refresh_token_hash_idx" ON "user_sessions"("refresh_token_hash");

ALTER TABLE "user_sessions"
    ADD CONSTRAINT "user_sessions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── User Verifications ───────────────────────────────────────

CREATE TABLE "user_verifications" (
    "id"           TEXT NOT NULL,
    "user_id"      TEXT NOT NULL,
    "type"         "verification_type" NOT NULL,
    "target"       VARCHAR(255) NOT NULL,
    "code_hash"    VARCHAR(255) NOT NULL,
    "attempts"     INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "expires_at"   TIMESTAMPTZ NOT NULL,
    "verified_at"  TIMESTAMPTZ,
    "created_at"   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_verifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_verifications_user_id_type_idx"  ON "user_verifications"("user_id", "type");
CREATE INDEX "user_verifications_target_type_idx"   ON "user_verifications"("target", "type");

ALTER TABLE "user_verifications"
    ADD CONSTRAINT "user_verifications_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Categories ───────────────────────────────────────────────

CREATE TABLE "categories" (
    "id"          TEXT NOT NULL,
    "parent_id"   TEXT,
    "name"        VARCHAR(100) NOT NULL,
    "slug"        VARCHAR(100) NOT NULL,
    "description" TEXT,
    "icon"        VARCHAR(50),
    "position"    INTEGER NOT NULL DEFAULT 0,
    "is_active"   BOOLEAN NOT NULL DEFAULT true,
    "created_at"  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "categories_slug_key"              ON "categories"("slug");
CREATE INDEX        "categories_parent_id_idx"         ON "categories"("parent_id");
CREATE INDEX        "categories_is_active_position_idx" ON "categories"("is_active", "position");

ALTER TABLE "categories"
    ADD CONSTRAINT "categories_parent_id_fkey"
    FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Category Fields ──────────────────────────────────────────

CREATE TABLE "category_fields" (
    "id"            TEXT NOT NULL,
    "category_id"   TEXT NOT NULL,
    "name"          VARCHAR(100) NOT NULL,
    "label"         VARCHAR(100) NOT NULL,
    "type"          "category_field_type" NOT NULL,
    "options"       JSONB,
    "is_required"   BOOLEAN NOT NULL DEFAULT false,
    "is_filterable" BOOLEAN NOT NULL DEFAULT false,
    "validation"    JSONB,
    "position"      INTEGER NOT NULL DEFAULT 0,
    "created_at"    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "category_fields_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "category_fields_category_id_idx" ON "category_fields"("category_id");

ALTER TABLE "category_fields"
    ADD CONSTRAINT "category_fields_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Listings ─────────────────────────────────────────────────

CREATE TABLE "listings" (
    "id"               TEXT NOT NULL,
    "user_id"          TEXT NOT NULL,
    "category_id"      TEXT NOT NULL,
    "title"            VARCHAR(200) NOT NULL,
    "slug"             VARCHAR(250) NOT NULL,
    "description"      TEXT,
    "price"            INTEGER,
    "price_type"       "price_type" NOT NULL DEFAULT 'fixed',
    "condition"        "item_condition",
    "status"           "listing_status" NOT NULL DEFAULT 'draft',
    "visibility"       "listing_visibility" NOT NULL DEFAULT 'public',
    "location_lat"     DOUBLE PRECISION NOT NULL,
    "location_lng"     DOUBLE PRECISION NOT NULL,
    "location_city"    VARCHAR(100),
    "location_state"   VARCHAR(50),
    "location_zip"     VARCHAR(10),
    "view_count"       INTEGER NOT NULL DEFAULT 0,
    "message_count"    INTEGER NOT NULL DEFAULT 0,
    "is_promoted"      BOOLEAN NOT NULL DEFAULT false,
    "risk_score"       DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    "rejection_reason" TEXT,
    "expires_at"       TIMESTAMPTZ,
    "published_at"     TIMESTAMPTZ,
    "created_at"       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMPTZ NOT NULL,

    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "listings_slug_key"                 ON "listings"("slug");
CREATE INDEX        "listings_user_id_status_idx"       ON "listings"("user_id", "status");
CREATE INDEX        "listings_status_category_id_idx"   ON "listings"("status", "category_id");
CREATE INDEX        "listings_status_published_at_idx"  ON "listings"("status", "published_at" DESC);
CREATE INDEX        "listings_slug_idx"                 ON "listings"("slug");
CREATE INDEX        "listings_status_expires_at_idx"    ON "listings"("status", "expires_at");
CREATE INDEX        "listings_is_promoted_idx"          ON "listings"("is_promoted");

-- Geography column for PostGIS radius search (ST_DWithin, ST_Distance)
ALTER TABLE "listings" ADD COLUMN "location" geography(Point, 4326);
CREATE INDEX "listings_location_idx" ON "listings" USING GIST ("location");

ALTER TABLE "listings"
    ADD CONSTRAINT "listings_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "listings"
    ADD CONSTRAINT "listings_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── Listing Media ────────────────────────────────────────────
-- Note: processing_status column added by migration 20260221000000

CREATE TABLE "listing_media" (
    "id"            TEXT NOT NULL,
    "listing_id"    TEXT NOT NULL,
    "url"           TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "type"          "media_type" NOT NULL,
    "mime_type"     VARCHAR(50) NOT NULL,
    "size_bytes"    INTEGER NOT NULL,
    "width"         INTEGER,
    "height"        INTEGER,
    "position"      INTEGER NOT NULL DEFAULT 0,
    "hash"          VARCHAR(64),
    "created_at"    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_media_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "listing_media_listing_id_position_idx" ON "listing_media"("listing_id", "position");

ALTER TABLE "listing_media"
    ADD CONSTRAINT "listing_media_listing_id_fkey"
    FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Listing Field Values ─────────────────────────────────────

CREATE TABLE "listing_field_values" (
    "id"                TEXT NOT NULL,
    "listing_id"        TEXT NOT NULL,
    "category_field_id" TEXT NOT NULL,
    "value"             TEXT NOT NULL,
    "created_at"        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_field_values_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "listing_field_values_listing_id_category_field_id_key"
    ON "listing_field_values"("listing_id", "category_field_id");
CREATE INDEX "listing_field_values_category_field_id_value_idx"
    ON "listing_field_values"("category_field_id", "value");

ALTER TABLE "listing_field_values"
    ADD CONSTRAINT "listing_field_values_listing_id_fkey"
    FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "listing_field_values"
    ADD CONSTRAINT "listing_field_values_category_field_id_fkey"
    FOREIGN KEY ("category_field_id") REFERENCES "category_fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── Conversations ────────────────────────────────────────────

CREATE TABLE "conversations" (
    "id"                  TEXT NOT NULL,
    "listing_id"          TEXT NOT NULL,
    "buyer_id"            TEXT NOT NULL,
    "seller_id"           TEXT NOT NULL,
    "status"              "conversation_status" NOT NULL DEFAULT 'active',
    "blocked_by_id"       TEXT,
    "buyer_last_read_at"  TIMESTAMPTZ,
    "seller_last_read_at" TIMESTAMPTZ,
    "last_message_at"     TIMESTAMPTZ,
    "created_at"          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "conversations_listing_id_buyer_id_key"
    ON "conversations"("listing_id", "buyer_id");
CREATE INDEX "conversations_buyer_id_last_message_at_idx"
    ON "conversations"("buyer_id", "last_message_at" DESC);
CREATE INDEX "conversations_seller_id_last_message_at_idx"
    ON "conversations"("seller_id", "last_message_at" DESC);
CREATE INDEX "conversations_listing_id_idx" ON "conversations"("listing_id");

ALTER TABLE "conversations"
    ADD CONSTRAINT "conversations_listing_id_fkey"
    FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "conversations"
    ADD CONSTRAINT "conversations_buyer_id_fkey"
    FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "conversations"
    ADD CONSTRAINT "conversations_seller_id_fkey"
    FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "conversations"
    ADD CONSTRAINT "conversations_blocked_by_id_fkey"
    FOREIGN KEY ("blocked_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Messages ─────────────────────────────────────────────────

CREATE TABLE "messages" (
    "id"              TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_id"       TEXT NOT NULL,
    "body"            TEXT NOT NULL,
    "type"            "message_type" NOT NULL DEFAULT 'text',
    "metadata"        JSONB,
    "is_flagged"      BOOLEAN NOT NULL DEFAULT false,
    "created_at"      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at" DESC);
CREATE INDEX "messages_sender_id_idx" ON "messages"("sender_id");

ALTER TABLE "messages"
    ADD CONSTRAINT "messages_conversation_id_fkey"
    FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "messages"
    ADD CONSTRAINT "messages_sender_id_fkey"
    FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── Ratings ──────────────────────────────────────────────────

CREATE TABLE "ratings" (
    "id"              TEXT NOT NULL,
    "rater_id"        TEXT NOT NULL,
    "rated_user_id"   TEXT NOT NULL,
    "listing_id"      TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "score"           SMALLINT NOT NULL,
    "comment"         TEXT,
    "is_hidden"       BOOLEAN NOT NULL DEFAULT false,
    "created_at"      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ratings_rater_id_rated_user_id_listing_id_key"
    ON "ratings"("rater_id", "rated_user_id", "listing_id");
CREATE INDEX "ratings_rated_user_id_idx" ON "ratings"("rated_user_id");
CREATE INDEX "ratings_listing_id_idx"    ON "ratings"("listing_id");

ALTER TABLE "ratings"
    ADD CONSTRAINT "ratings_rater_id_fkey"
    FOREIGN KEY ("rater_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ratings"
    ADD CONSTRAINT "ratings_rated_user_id_fkey"
    FOREIGN KEY ("rated_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ratings"
    ADD CONSTRAINT "ratings_listing_id_fkey"
    FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ratings"
    ADD CONSTRAINT "ratings_conversation_id_fkey"
    FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── Promotions ───────────────────────────────────────────────

CREATE TABLE "promotions" (
    "id"             TEXT NOT NULL,
    "name"           VARCHAR(50) NOT NULL,
    "slug"           VARCHAR(50) NOT NULL,
    "description"    TEXT,
    "duration_hours" INTEGER NOT NULL,
    "price_cents"    INTEGER NOT NULL,
    "placement"      "promotion_placement" NOT NULL,
    "is_active"      BOOLEAN NOT NULL DEFAULT true,
    "created_at"     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "promotions_slug_key" ON "promotions"("slug");

-- ─── Promotion Purchases ──────────────────────────────────────

CREATE TABLE "promotion_purchases" (
    "id"                TEXT NOT NULL,
    "user_id"           TEXT NOT NULL,
    "listing_id"        TEXT NOT NULL,
    "promotion_id"      TEXT NOT NULL,
    "stripe_payment_id" TEXT,
    "status"            "promotion_purchase_status" NOT NULL DEFAULT 'pending',
    "amount_cents"      INTEGER NOT NULL,
    "starts_at"         TIMESTAMPTZ,
    "ends_at"           TIMESTAMPTZ,
    "impressions"       INTEGER NOT NULL DEFAULT 0,
    "clicks"            INTEGER NOT NULL DEFAULT 0,
    "messages_received" INTEGER NOT NULL DEFAULT 0,
    "created_at"        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotion_purchases_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "promotion_purchases_user_id_idx"        ON "promotion_purchases"("user_id");
CREATE INDEX "promotion_purchases_listing_id_idx"     ON "promotion_purchases"("listing_id");
CREATE INDEX "promotion_purchases_status_ends_at_idx" ON "promotion_purchases"("status", "ends_at");

ALTER TABLE "promotion_purchases"
    ADD CONSTRAINT "promotion_purchases_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "promotion_purchases"
    ADD CONSTRAINT "promotion_purchases_listing_id_fkey"
    FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "promotion_purchases"
    ADD CONSTRAINT "promotion_purchases_promotion_id_fkey"
    FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── Reports ──────────────────────────────────────────────────

CREATE TABLE "reports" (
    "id"               TEXT NOT NULL,
    "reporter_id"      TEXT NOT NULL,
    "target_type"      "report_target_type" NOT NULL,
    "target_id"        TEXT NOT NULL,
    "reason"           VARCHAR(50) NOT NULL,
    "details"          TEXT,
    "evidence"         JSONB,
    "status"           "report_status" NOT NULL DEFAULT 'pending',
    "priority"         "report_priority" NOT NULL DEFAULT 'normal',
    "resolved_by_id"   TEXT,
    "resolved_at"      TIMESTAMPTZ,
    "resolution_notes" TEXT,
    "created_at"       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reports_status_priority_idx"          ON "reports"("status", "priority");
CREATE INDEX "reports_target_type_target_id_idx"    ON "reports"("target_type", "target_id");
CREATE INDEX "reports_reporter_id_idx"              ON "reports"("reporter_id");

ALTER TABLE "reports"
    ADD CONSTRAINT "reports_reporter_id_fkey"
    FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reports"
    ADD CONSTRAINT "reports_resolved_by_id_fkey"
    FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Moderation Actions ───────────────────────────────────────

CREATE TABLE "moderation_actions" (
    "id"          TEXT NOT NULL,
    "admin_id"    TEXT NOT NULL,
    "report_id"   TEXT,
    "target_type" VARCHAR(20) NOT NULL,
    "target_id"   TEXT NOT NULL,
    "action"      "moderation_action_type" NOT NULL,
    "reason"      TEXT,
    "metadata"    JSONB,
    "created_at"  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_actions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "moderation_actions_target_type_target_id_idx" ON "moderation_actions"("target_type", "target_id");
CREATE INDEX "moderation_actions_admin_id_idx"              ON "moderation_actions"("admin_id");

ALTER TABLE "moderation_actions"
    ADD CONSTRAINT "moderation_actions_admin_id_fkey"
    FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "moderation_actions"
    ADD CONSTRAINT "moderation_actions_report_id_fkey"
    FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Saved Searches ───────────────────────────────────────────

CREATE TABLE "saved_searches" (
    "id"               TEXT NOT NULL,
    "user_id"          TEXT NOT NULL,
    "name"             VARCHAR(100),
    "query"            JSONB NOT NULL,
    "notify"           BOOLEAN NOT NULL DEFAULT true,
    "last_notified_at" TIMESTAMPTZ,
    "created_at"       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "saved_searches_user_id_idx" ON "saved_searches"("user_id");

ALTER TABLE "saved_searches"
    ADD CONSTRAINT "saved_searches_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Audit Logs ───────────────────────────────────────────────

CREATE TABLE "audit_logs" (
    "id"          TEXT NOT NULL,
    "actor_id"    TEXT,
    "actor_type"  "audit_actor_type" NOT NULL,
    "action"      VARCHAR(100) NOT NULL,
    "target_type" VARCHAR(20),
    "target_id"   TEXT,
    "details"     JSONB,
    "ip_address"  VARCHAR(45),
    "created_at"  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_logs_actor_id_idx"               ON "audit_logs"("actor_id");
CREATE INDEX "audit_logs_target_type_target_id_idx"  ON "audit_logs"("target_type", "target_id");
CREATE INDEX "audit_logs_created_at_idx"             ON "audit_logs"("created_at" DESC);

ALTER TABLE "audit_logs"
    ADD CONSTRAINT "audit_logs_actor_id_fkey"
    FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Notifications ────────────────────────────────────────────

CREATE TABLE "notifications" (
    "id"         TEXT NOT NULL,
    "user_id"    TEXT NOT NULL,
    "type"       VARCHAR(50) NOT NULL,
    "title"      VARCHAR(200) NOT NULL,
    "body"       TEXT NOT NULL,
    "data"       JSONB,
    "is_read"    BOOLEAN NOT NULL DEFAULT false,
    "read_at"    TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notifications_user_id_is_read_idx"   ON "notifications"("user_id", "is_read");
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at" DESC);

ALTER TABLE "notifications"
    ADD CONSTRAINT "notifications_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Push Tokens ──────────────────────────────────────────────

CREATE TABLE "push_tokens" (
    "id"         TEXT NOT NULL,
    "user_id"    TEXT NOT NULL,
    "token"      TEXT NOT NULL,
    "platform"   VARCHAR(10) NOT NULL,
    "is_active"  BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "push_tokens_token_key"   ON "push_tokens"("token");
CREATE INDEX        "push_tokens_user_id_idx" ON "push_tokens"("user_id");

ALTER TABLE "push_tokens"
    ADD CONSTRAINT "push_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Offers ───────────────────────────────────────────────────

CREATE TABLE "offers" (
    "id"              TEXT NOT NULL,
    "listing_id"      TEXT NOT NULL,
    "buyer_id"        TEXT NOT NULL,
    "seller_id"       TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "amount_cents"    INTEGER NOT NULL,
    "message"         VARCHAR(500),
    "status"          "offer_status" NOT NULL DEFAULT 'pending',
    "parent_offer_id" TEXT,
    "expires_at"      TIMESTAMPTZ NOT NULL,
    "responded_at"    TIMESTAMPTZ,
    "created_at"      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "offers_listing_id_idx"       ON "offers"("listing_id");
CREATE INDEX "offers_buyer_id_status_idx"  ON "offers"("buyer_id", "status");
CREATE INDEX "offers_seller_id_status_idx" ON "offers"("seller_id", "status");

ALTER TABLE "offers"
    ADD CONSTRAINT "offers_listing_id_fkey"
    FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "offers"
    ADD CONSTRAINT "offers_buyer_id_fkey"
    FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "offers"
    ADD CONSTRAINT "offers_seller_id_fkey"
    FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "offers"
    ADD CONSTRAINT "offers_conversation_id_fkey"
    FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "offers"
    ADD CONSTRAINT "offers_parent_offer_id_fkey"
    FOREIGN KEY ("parent_offer_id") REFERENCES "offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Seller Subscriptions ─────────────────────────────────────

CREATE TABLE "seller_subscriptions" (
    "id"                         TEXT NOT NULL,
    "user_id"                    TEXT NOT NULL,
    "tier"                       "subscription_tier" NOT NULL,
    "status"                     "subscription_status" NOT NULL DEFAULT 'active',
    "stripe_subscription_id"     TEXT,
    "stripe_customer_id"         TEXT,
    "current_period_start"       TIMESTAMPTZ NOT NULL,
    "current_period_end"         TIMESTAMPTZ NOT NULL,
    "cancel_at_period_end"       BOOLEAN NOT NULL DEFAULT false,
    "monthly_listing_limit"      INTEGER NOT NULL,
    "monthly_promo_budget_cents" INTEGER NOT NULL,
    "created_at"                 TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"                 TIMESTAMPTZ NOT NULL,

    CONSTRAINT "seller_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "seller_subscriptions_stripe_subscription_id_key"
    ON "seller_subscriptions"("stripe_subscription_id");
CREATE UNIQUE INDEX "seller_subscriptions_user_id_key" ON "seller_subscriptions"("user_id");
CREATE INDEX        "seller_subscriptions_status_idx"  ON "seller_subscriptions"("status");

ALTER TABLE "seller_subscriptions"
    ADD CONSTRAINT "seller_subscriptions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
