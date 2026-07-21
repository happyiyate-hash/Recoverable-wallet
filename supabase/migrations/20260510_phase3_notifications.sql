-- Phase 3: Notifications Intelligence Migration
-- Add priority, metadata JSONB, and transaction tracking columns to the notifications table.

-- 1. Ensure the table exists or create if missing (assuming it already exists based on context)
-- 2. Alter table to add the new advanced tracking columns

ALTER TABLE IF EXISTS "public"."notifications"
ADD COLUMN IF NOT EXISTS "priority" TEXT DEFAULT 'NORMAL',
ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS "event_id" TEXT,
ADD COLUMN IF NOT EXISTS "source" TEXT,
ADD COLUMN IF NOT EXISTS "chain_id" INTEGER,
ADD COLUMN IF NOT EXISTS "tx_hash" TEXT,
ADD COLUMN IF NOT EXISTS "dismissed" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP WITH TIME ZONE;

-- Add index on event_id for fast deduplication lookup
CREATE INDEX IF NOT EXISTS "idx_notifications_event_id" ON "public"."notifications" ("event_id");

-- Add index on tx_hash for fast activity linkage
CREATE INDEX IF NOT EXISTS "idx_notifications_tx_hash" ON "public"."notifications" ("tx_hash");
