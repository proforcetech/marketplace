-- CreateEnum
CREATE TYPE "connect_account_status" AS ENUM ('not_connected', 'onboarding', 'active', 'restricted', 'disabled');

-- CreateEnum
CREATE TYPE "transaction_status" AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');

-- AlterTable: add Stripe Connect fields to users
ALTER TABLE "users"
  ADD COLUMN "stripe_connect_account_id" TEXT,
  ADD COLUMN "connect_account_status" "connect_account_status" NOT NULL DEFAULT 'not_connected';

-- CreateTable
CREATE TABLE "transactions" (
    "id"                       TEXT NOT NULL,
    "listing_id"               TEXT NOT NULL,
    "buyer_id"                 TEXT NOT NULL,
    "seller_id"                TEXT NOT NULL,
    "amount_cents"             INTEGER NOT NULL,
    "platform_fee_cents"       INTEGER NOT NULL,
    "seller_payout_cents"      INTEGER NOT NULL,
    "currency"                 VARCHAR(3) NOT NULL DEFAULT 'usd',
    "status"                   "transaction_status" NOT NULL DEFAULT 'pending',
    "stripe_payment_intent_id" TEXT,
    "stripe_transfer_id"       TEXT,
    "created_at"               TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"               TIMESTAMPTZ NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transactions_stripe_payment_intent_id_key" ON "transactions"("stripe_payment_intent_id");
CREATE INDEX "transactions_buyer_id_idx"   ON "transactions"("buyer_id");
CREATE INDEX "transactions_seller_id_idx"  ON "transactions"("seller_id");
CREATE INDEX "transactions_listing_id_idx" ON "transactions"("listing_id");
CREATE INDEX "transactions_status_idx"     ON "transactions"("status");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_listing_id_fkey"
  FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "transactions" ADD CONSTRAINT "transactions_buyer_id_fkey"
  FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "transactions" ADD CONSTRAINT "transactions_seller_id_fkey"
  FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
