-- CreateEnum
CREATE TYPE "media_processing_status" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED');

-- AlterTable
ALTER TABLE "listing_media" ADD COLUMN "processing_status" "media_processing_status" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "bad_media_hashes" (
    "id" TEXT NOT NULL,
    "hash" VARCHAR(64) NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bad_media_hashes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "buyer_id" TEXT NOT NULL,
    "listing_id" TEXT NOT NULL,
    "used_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exchange_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bad_media_hashes_hash_key" ON "bad_media_hashes"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "exchange_tokens_token_key" ON "exchange_tokens"("token");

-- CreateIndex
CREATE INDEX "exchange_tokens_conversation_id_idx" ON "exchange_tokens"("conversation_id");

-- CreateIndex
CREATE INDEX "exchange_tokens_seller_id_idx" ON "exchange_tokens"("seller_id");

-- CreateIndex
CREATE INDEX "exchange_tokens_buyer_id_idx" ON "exchange_tokens"("buyer_id");

-- AddForeignKey
ALTER TABLE "exchange_tokens" ADD CONSTRAINT "exchange_tokens_conversation_id_fkey"
    FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exchange_tokens" ADD CONSTRAINT "exchange_tokens_seller_id_fkey"
    FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exchange_tokens" ADD CONSTRAINT "exchange_tokens_buyer_id_fkey"
    FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exchange_tokens" ADD CONSTRAINT "exchange_tokens_listing_id_fkey"
    FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
