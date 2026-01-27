-- ============================================
-- Migration: Security Fixes
-- Version: 1.0.0
-- Date: 2026-01-28
--
-- Fixes:
-- 1. Add soft delete columns to institutions table
-- 2. Fix RLS policy for user_invites (remove anonymous full access)
-- ============================================

-- ====================
-- 1. SOFT DELETE FOR INSTITUTIONS
-- ====================

-- Add soft delete columns if they don't exist
ALTER TABLE public.institutions
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Create index for soft delete queries
CREATE INDEX IF NOT EXISTS idx_institutions_is_deleted
ON public.institutions(is_deleted)
WHERE is_deleted = false;

-- ====================
-- 2. FIX RLS POLICY FOR USER_INVITES
-- ====================

-- Drop the insecure anonymous access policy
DROP POLICY IF EXISTS "Anyone can read invites by token" ON public.user_invites;

-- Create a secure policy: only allow reading invite by its token via RPC function
-- Anonymous users should NOT be able to read all invites

-- Policy: Users can only read their own invites (after authentication)
CREATE POLICY "Users can read own invites"
ON public.user_invites FOR SELECT
USING (
  -- Authenticated users can see invites they created
  (auth.uid() IS NOT NULL AND created_by IN (
    SELECT id FROM public.platform_users WHERE auth_user_id = auth.uid()
  ))
  OR
  -- Authenticated users can see invites for their email
  (auth.uid() IS NOT NULL AND email = (
    SELECT email FROM auth.users WHERE id = auth.uid()
  ))
);

-- Policy: Admins can read all invites from their institution
CREATE POLICY "Admins can read institution invites"
ON public.user_invites FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.platform_users pu
    WHERE pu.auth_user_id = auth.uid()
    AND pu.role IN ('admin', 'superadmin')
    AND (
      pu.role = 'superadmin'
      OR pu.institution_id = user_invites.institution_id
    )
  )
);

-- Create a secure RPC function to lookup invites by token
-- This is the ONLY way anonymous users should access invite data
CREATE OR REPLACE FUNCTION public.get_invite_by_token(p_token TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  phone TEXT,
  first_name TEXT,
  last_name TEXT,
  institution_id UUID,
  institution_name TEXT,
  role TEXT,
  status TEXT,
  expires_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ui.id,
    ui.email,
    -- Mask phone number for security (show only last 4 digits)
    CASE
      WHEN length(ui.phone) > 4 THEN
        repeat('*', length(ui.phone) - 4) || right(ui.phone, 4)
      ELSE ui.phone
    END as phone,
    ui.first_name,
    ui.last_name,
    ui.institution_id,
    i.name as institution_name,
    ui.role,
    ui.status,
    ui.expires_at
  FROM public.user_invites ui
  LEFT JOIN public.institutions i ON i.id = ui.institution_id
  WHERE ui.token = p_token
  AND ui.status NOT IN ('completed', 'cancelled', 'expired')
  AND ui.expires_at > now()
  LIMIT 1;
END;
$$;

-- Grant execute to anonymous users (this is the secure way to access invites)
GRANT EXECUTE ON FUNCTION public.get_invite_by_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_invite_by_token(TEXT) TO authenticated;

-- ====================
-- 3. ADD ADDITIONAL SECURITY POLICIES
-- ====================

-- Ensure only superadmins can hard-delete institutions
-- (soft delete is handled by the application)
DROP POLICY IF EXISTS "Admins can delete institutions" ON public.institutions;

CREATE POLICY "Only superadmins can delete institutions"
ON public.institutions FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.platform_users pu
    WHERE pu.auth_user_id = auth.uid()
    AND pu.role = 'superadmin'
  )
);

-- Ensure soft-deleted institutions are hidden from non-superadmins
CREATE POLICY "Hide deleted institutions from regular users"
ON public.institutions FOR SELECT
USING (
  (is_deleted IS NULL OR is_deleted = false)
  OR
  EXISTS (
    SELECT 1 FROM public.platform_users pu
    WHERE pu.auth_user_id = auth.uid()
    AND pu.role = 'superadmin'
  )
);

-- ====================
-- 4. AUDIT LOG FOR SECURITY EVENTS
-- ====================

-- Log security-related actions
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  target_type TEXT,
  target_id UUID,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for querying audit logs
CREATE INDEX IF NOT EXISTS idx_security_audit_log_event_type ON public.security_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON public.security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at ON public.security_audit_log(created_at DESC);

-- RLS for security audit log (only superadmins can read)
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only superadmins can read security audit log"
ON public.security_audit_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.platform_users pu
    WHERE pu.auth_user_id = auth.uid()
    AND pu.role = 'superadmin'
  )
);

-- Function to log security events (can be called from Edge Functions)
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type TEXT,
  p_user_id UUID DEFAULT NULL,
  p_target_type TEXT DEFAULT NULL,
  p_target_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT '{}',
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.security_audit_log (
    event_type, user_id, target_type, target_id, details, ip_address, user_agent
  ) VALUES (
    p_event_type, p_user_id, p_target_type, p_target_id, p_details, p_ip_address, p_user_agent
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Grant execute to service role only (Edge Functions)
GRANT EXECUTE ON FUNCTION public.log_security_event TO service_role;

COMMENT ON TABLE public.security_audit_log IS 'Security audit trail for sensitive operations';
COMMENT ON FUNCTION public.log_security_event IS 'Log security events from Edge Functions';
COMMENT ON FUNCTION public.get_invite_by_token IS 'Secure way to lookup invites by token (masks sensitive data)';
