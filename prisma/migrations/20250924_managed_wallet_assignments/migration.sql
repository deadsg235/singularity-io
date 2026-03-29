-- Ensure enum type exists for wallet status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ManagedWalletStatus') THEN
    CREATE TYPE "ManagedWalletStatus" AS ENUM ('available', 'assigned', 'retired');
  END IF;
END
$$;

-- Add new columns to managed_wallets
ALTER TABLE "managed_wallets"
  ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS "memo" TEXT,
  ADD COLUMN IF NOT EXISTS "assigned_supabase_user_id" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "assigned_provider" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "assigned_subject" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "assigned_email" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "assigned_at" TIMESTAMPTZ;

-- Convert status column to enum
ALTER TABLE "managed_wallets"
  ADD COLUMN IF NOT EXISTS "_tmp_status" "ManagedWalletStatus" DEFAULT 'available';

UPDATE "managed_wallets"
SET "_tmp_status" = CASE
  WHEN "status" = 'active' THEN 'assigned'
  WHEN "status" = 'inactive' THEN 'retired'
  WHEN "status" IS NULL THEN 'available'
  ELSE COALESCE("status"::text, 'available')::"ManagedWalletStatus"
END;

ALTER TABLE "managed_wallets" DROP COLUMN IF EXISTS "status";
ALTER TABLE "managed_wallets" RENAME COLUMN "_tmp_status" TO "status";
ALTER TABLE "managed_wallets" ALTER COLUMN "status" SET DEFAULT 'available';

CREATE INDEX IF NOT EXISTS "managed_wallets_status_idx"
  ON "managed_wallets" ("status");
CREATE INDEX IF NOT EXISTS "managed_wallets_assigned_supabase_user_id_idx"
  ON "managed_wallets" ("assigned_supabase_user_id");

-- Drop obsolete OAuth mapping table
DROP TABLE IF EXISTS "oauth_user_wallets";
