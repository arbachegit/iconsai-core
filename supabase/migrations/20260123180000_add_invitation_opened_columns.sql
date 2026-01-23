-- ============================================
-- Migration: Add first_opened_at columns to user_invitations
-- Date: 2026-01-23
-- ============================================

-- Add missing columns to user_invitations table
ALTER TABLE public.user_invitations
ADD COLUMN IF NOT EXISTS first_opened_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.user_invitations
ADD COLUMN IF NOT EXISTS platform_first_opened_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.user_invitations
ADD COLUMN IF NOT EXISTS app_first_opened_at TIMESTAMPTZ DEFAULT NULL;

-- Comment on columns
COMMENT ON COLUMN public.user_invitations.first_opened_at IS 'Timestamp when invitation was first opened (any source)';
COMMENT ON COLUMN public.user_invitations.platform_first_opened_at IS 'Timestamp when platform invitation was first opened';
COMMENT ON COLUMN public.user_invitations.app_first_opened_at IS 'Timestamp when app invitation was first opened';
