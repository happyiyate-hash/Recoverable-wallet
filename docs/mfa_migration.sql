₦₦-- INSTITUTIONAL MFA REGISTRY MIGRATION
-- Version: 1.0.0
-- Authority: Lead Security Architect

-- 1. Provision new MFA nodes
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS mfa_secret TEXT,
ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS mfa_last_verified TIMESTAMP WITH TIME ZONE;

-- 2. Migrate existing data nodes (if any)
UPDATE public.profiles 
SET mfa_secret = two_factor_secret, 
    mfa_enabled = two_factor_enabled 
WHERE mfa_secret IS NULL AND two_factor_secret IS NOT NULL;

-- 3. Add comment nodes for administrative audit
COMMENT ON COLUMN public.profiles.mfa_secret IS 'Encrypted Base32 TOTP secret node.';
COMMENT ON COLUMN public.profiles.mfa_enabled IS 'MFA Security Guard toggle.';
COMMENT ON COLUMN public.profiles.mfa_last_verified IS 'Timestamp of last successful handshake to prevent replay attacks.';
