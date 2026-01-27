-- ============================================================
-- COMBINED MIGRATION: User Management System
-- Execute this in Supabase SQL Editor
-- Date: 2026-01-28
-- ============================================================
-- This script combines:
-- 1. institutions & departments
-- 2. platform_users
-- 3. user_invites
-- 4. voice_frequency_analysis
-- ============================================================

-- Ensure unaccent extension is available
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ============================================================
-- PART 1: INSTITUTIONS & DEPARTMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  cnpj TEXT UNIQUE,
  email_domains TEXT[] NOT NULL DEFAULT '{}',
  max_users INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  address_country TEXT DEFAULT 'Brasil',
  phone TEXT,
  email TEXT,
  website TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#00D4FF',
  secondary_color TEXT DEFAULT '#0A0E1A',
  pwa_config JSONB DEFAULT '{
    "allowVoiceRecording": true,
    "allowedModules": ["home", "world", "health", "ideas"],
    "sessionTimeoutMinutes": 10,
    "maxMessagesPerDay": 100
  }',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_institutions_slug ON public.institutions(slug);
CREATE INDEX IF NOT EXISTS idx_institutions_active ON public.institutions(is_active) WHERE is_active = true AND is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_institutions_email_domains ON public.institutions USING GIN(email_domains);

CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  email TEXT,
  phone TEXT,
  manager_name TEXT,
  manager_email TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(institution_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_departments_institution ON public.departments(institution_id);
CREATE INDEX IF NOT EXISTS idx_departments_parent ON public.departments(parent_id) WHERE parent_id IS NOT NULL;

-- Helper function for slug generation
CREATE OR REPLACE FUNCTION generate_slug(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        unaccent(input_text),
        '[^a-zA-Z0-9\s-]', '', 'g'
      ),
      '\s+', '-', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- PART 2: PLATFORM USERS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.platform_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  full_name TEXT GENERATED ALWAYS AS (
    CASE
      WHEN last_name IS NOT NULL AND last_name != ''
      THEN first_name || ' ' || last_name
      ELSE first_name
    END
  ) STORED,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  phone_country_code TEXT DEFAULT '+55',
  institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  job_title TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'superadmin')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'inactive')),
  email_verified BOOLEAN DEFAULT false,
  email_verified_at TIMESTAMPTZ,
  phone_verified BOOLEAN DEFAULT false,
  phone_verified_at TIMESTAMPTZ,
  verification_code TEXT,
  verification_code_type TEXT CHECK (verification_code_type IN ('email', 'phone', 'both')),
  verification_expires_at TIMESTAMPTZ,
  verification_attempts INTEGER DEFAULT 0,
  password_set BOOLEAN DEFAULT false,
  password_set_at TIMESTAMPTZ,
  password_reset_token TEXT,
  password_reset_expires_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  last_login_ip TEXT,
  last_login_user_agent TEXT,
  login_count INTEGER DEFAULT 0,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  avatar_url TEXT,
  bio TEXT,
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  locale TEXT DEFAULT 'pt-BR',
  preferences JSONB DEFAULT '{
    "notifications": {"email": true, "whatsapp": true, "sms": false},
    "pwa": {"preferredVoice": "nova", "voiceSpeed": 1.0, "autoPlayResponses": true},
    "theme": "dark"
  }',
  custom_permissions JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  invited_by UUID REFERENCES public.platform_users(id) ON DELETE SET NULL,
  activated_at TIMESTAMPTZ,
  suspended_at TIMESTAMPTZ,
  suspended_by UUID REFERENCES public.platform_users(id) ON DELETE SET NULL,
  suspension_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_platform_users_auth_user ON public.platform_users(auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_platform_users_email ON public.platform_users(email);
CREATE INDEX IF NOT EXISTS idx_platform_users_phone ON public.platform_users(phone);
CREATE INDEX IF NOT EXISTS idx_platform_users_institution ON public.platform_users(institution_id) WHERE institution_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_platform_users_role ON public.platform_users(role);
CREATE INDEX IF NOT EXISTS idx_platform_users_status ON public.platform_users(status);

-- Helper functions for platform_users
CREATE OR REPLACE FUNCTION generate_verification_code()
RETURNS TEXT AS $$
BEGIN
  RETURN lpad(floor(random() * 1000000)::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql VOLATILE;

CREATE OR REPLACE FUNCTION get_platform_user_by_auth_id(p_auth_user_id UUID)
RETURNS public.platform_users AS $$
DECLARE
  v_user public.platform_users;
BEGIN
  SELECT * INTO v_user
  FROM public.platform_users
  WHERE auth_user_id = p_auth_user_id;
  RETURN v_user;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION check_user_role(p_auth_user_id UUID, p_required_roles TEXT[])
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role TEXT;
BEGIN
  SELECT role INTO v_user_role
  FROM public.platform_users
  WHERE auth_user_id = p_auth_user_id AND status = 'active';
  IF v_user_role IS NULL THEN RETURN false; END IF;
  RETURN v_user_role = ANY(p_required_roles);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_institution_admin(p_auth_user_id UUID, p_institution_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_result BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.platform_users
    WHERE auth_user_id = p_auth_user_id
      AND status = 'active'
      AND (role = 'superadmin' OR (role = 'admin' AND institution_id = p_institution_id))
  ) INTO v_result;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION validate_email_domain(p_email TEXT, p_institution_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_email_domain TEXT;
  v_allowed_domains TEXT[];
BEGIN
  v_email_domain := split_part(p_email, '@', 2);
  SELECT email_domains INTO v_allowed_domains
  FROM public.institutions
  WHERE id = p_institution_id AND is_active = true AND is_deleted = false;
  IF v_allowed_domains IS NULL OR array_length(v_allowed_domains, 1) IS NULL THEN
    RETURN false;
  END IF;
  RETURN v_email_domain = ANY(v_allowed_domains);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_institution_user_count(p_institution_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.platform_users
  WHERE institution_id = p_institution_id AND status IN ('active', 'pending');
  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION check_institution_user_limit(p_institution_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_max_users INTEGER;
  v_current_users INTEGER;
BEGIN
  SELECT max_users INTO v_max_users
  FROM public.institutions WHERE id = p_institution_id;
  v_current_users := get_institution_user_count(p_institution_id);
  RETURN v_current_users < COALESCE(v_max_users, 100);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================
-- PART 3: USER INVITES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  phone_country_code TEXT DEFAULT '+55',
  first_name TEXT NOT NULL,
  last_name TEXT,
  institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'sent', 'opened', 'verified', 'completed', 'expired', 'cancelled'
  )),
  email_sent_at TIMESTAMPTZ,
  email_sent_success BOOLEAN,
  email_error TEXT,
  whatsapp_sent_at TIMESTAMPTZ,
  whatsapp_sent_success BOOLEAN,
  whatsapp_message_sid TEXT,
  whatsapp_error TEXT,
  sms_sent_at TIMESTAMPTZ,
  sms_sent_success BOOLEAN,
  sms_message_sid TEXT,
  sms_error TEXT,
  link_opened_at TIMESTAMPTZ,
  link_opened_count INTEGER DEFAULT 0,
  link_opened_ip TEXT,
  link_opened_user_agent TEXT,
  verification_code TEXT,
  verification_code_sent_at TIMESTAMPTZ,
  verification_expires_at TIMESTAMPTZ,
  verification_attempts INTEGER DEFAULT 0,
  verified_at TIMESTAMPTZ,
  verified_via TEXT CHECK (verified_via IN ('email', 'whatsapp', 'sms')),
  completed_at TIMESTAMPTZ,
  platform_user_id UUID REFERENCES public.platform_users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days'),
  resend_count INTEGER DEFAULT 0,
  last_resent_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES public.platform_users(id) ON DELETE SET NULL,
  cancellation_reason TEXT,
  metadata JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.platform_users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_user_invites_token ON public.user_invites(token);
CREATE INDEX IF NOT EXISTS idx_user_invites_email ON public.user_invites(email);
CREATE INDEX IF NOT EXISTS idx_user_invites_phone ON public.user_invites(phone);
CREATE INDEX IF NOT EXISTS idx_user_invites_institution ON public.user_invites(institution_id);
CREATE INDEX IF NOT EXISTS idx_user_invites_status ON public.user_invites(status);

-- Invite functions
CREATE OR REPLACE FUNCTION get_invite_by_token(p_token TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  phone_masked TEXT,
  first_name TEXT,
  last_name TEXT,
  role TEXT,
  status TEXT,
  institution_id UUID,
  institution_name TEXT,
  expires_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ui.id,
    ui.email,
    CASE
      WHEN length(ui.phone) > 4 THEN
        repeat('*', length(ui.phone) - 4) || right(ui.phone, 4)
      ELSE '****'
    END as phone_masked,
    ui.first_name,
    ui.last_name,
    ui.role,
    ui.status,
    ui.institution_id,
    i.name as institution_name,
    ui.expires_at
  FROM public.user_invites ui
  LEFT JOIN public.institutions i ON ui.institution_id = i.id
  WHERE ui.token = p_token;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION set_invite_verification_code(p_invite_id UUID, p_expiry_minutes INTEGER DEFAULT 10)
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
BEGIN
  v_code := generate_verification_code();
  UPDATE public.user_invites
  SET
    verification_code = v_code,
    verification_code_sent_at = now(),
    verification_expires_at = now() + (p_expiry_minutes || ' minutes')::INTERVAL,
    verification_attempts = 0
  WHERE id = p_invite_id;
  RETURN v_code;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION validate_invite_code(p_invite_id UUID, p_code TEXT, p_verified_via TEXT DEFAULT 'whatsapp')
RETURNS JSONB AS $$
DECLARE
  v_invite RECORD;
BEGIN
  SELECT verification_code, verification_expires_at, verification_attempts, status, expires_at
  INTO v_invite FROM public.user_invites WHERE id = p_invite_id;

  IF v_invite IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'invite_not_found');
  END IF;
  IF v_invite.status IN ('completed', 'expired', 'cancelled') THEN
    RETURN jsonb_build_object('valid', false, 'error', 'invite_' || v_invite.status);
  END IF;
  IF v_invite.expires_at < now() THEN
    UPDATE public.user_invites SET status = 'expired' WHERE id = p_invite_id;
    RETURN jsonb_build_object('valid', false, 'error', 'invite_expired');
  END IF;
  IF v_invite.verification_code IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'no_code');
  END IF;
  IF v_invite.verification_expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'code_expired');
  END IF;
  IF v_invite.verification_attempts >= 5 THEN
    RETURN jsonb_build_object('valid', false, 'error', 'max_attempts');
  END IF;
  IF v_invite.verification_code != p_code THEN
    UPDATE public.user_invites SET verification_attempts = verification_attempts + 1 WHERE id = p_invite_id;
    RETURN jsonb_build_object('valid', false, 'error', 'invalid_code', 'attempts_remaining', 5 - v_invite.verification_attempts - 1);
  END IF;

  UPDATE public.user_invites
  SET status = 'verified', verified_at = now(), verified_via = p_verified_via, verification_code = NULL
  WHERE id = p_invite_id;

  RETURN jsonb_build_object('valid', true, 'verified_via', p_verified_via);
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION complete_invite(p_invite_id UUID, p_platform_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.user_invites
  SET status = 'completed', completed_at = now(), platform_user_id = p_platform_user_id
  WHERE id = p_invite_id;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- ============================================================
-- PART 4: VOICE FREQUENCY ANALYSIS
-- ============================================================

-- Add columns to pwa_conversations if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pwa_conversations' AND column_name = 'platform_user_id') THEN
    ALTER TABLE public.pwa_conversations ADD COLUMN platform_user_id UUID REFERENCES public.platform_users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pwa_conversations' AND column_name = 'institution_id') THEN
    ALTER TABLE public.pwa_conversations ADD COLUMN institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pwa_conversations_platform_user ON public.pwa_conversations(platform_user_id) WHERE platform_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pwa_conversations_institution ON public.pwa_conversations(institution_id) WHERE institution_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.voice_frequency_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.pwa_conversations(id) ON DELETE CASCADE,
  platform_user_id UUID REFERENCES public.platform_users(id) ON DELETE SET NULL,
  institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
  audio_type TEXT NOT NULL CHECK (audio_type IN ('question', 'response')),
  audio_url TEXT,
  audio_duration_seconds NUMERIC(10,2),
  f0_samples FLOAT[] DEFAULT '{}',
  f0_timestamps FLOAT[] DEFAULT '{}',
  sample_rate INTEGER DEFAULT 100,
  f0_mean FLOAT,
  f0_median FLOAT,
  f0_min FLOAT,
  f0_max FLOAT,
  f0_range_hz FLOAT,
  f0_range_semitones FLOAT,
  f0_std_deviation FLOAT,
  f0_variance FLOAT,
  f0_percentile_25 FLOAT,
  f0_percentile_75 FLOAT,
  f0_iqr FLOAT,
  contour_type TEXT CHECK (contour_type IN (
    'ascending', 'descending', 'flat', 'varied', 'peak', 'valley', 'rising_falling', 'falling_rising'
  )),
  contour_points JSONB DEFAULT '[]',
  contour_slope FLOAT,
  emotion TEXT CHECK (emotion IN (
    'neutral', 'happy', 'sad', 'angry', 'fearful', 'surprised', 'bored', 'anxious', 'confident', 'uncertain'
  )),
  emotion_confidence FLOAT CHECK (emotion_confidence BETWEEN 0 AND 1),
  emotion_secondary TEXT,
  emotion_secondary_confidence FLOAT,
  emotion_scores JSONB DEFAULT '{}',
  audio_quality_score FLOAT CHECK (audio_quality_score BETWEEN 0 AND 1),
  noise_level_db FLOAT,
  signal_to_noise_ratio FLOAT,
  clipping_detected BOOLEAN DEFAULT false,
  silence_percentage FLOAT,
  speech_rate_wpm INTEGER,
  speech_rate_syllables_sec FLOAT,
  pause_count INTEGER,
  avg_pause_duration FLOAT,
  max_pause_duration FLOAT,
  total_pause_duration FLOAT,
  energy_mean FLOAT,
  energy_variance FLOAT,
  jitter_percentage FLOAT,
  shimmer_percentage FLOAT,
  prosody_features JSONB DEFAULT '{"stress_pattern": null, "rhythm_regularity": null, "intonation_pattern": null}',
  deviation_from_baseline FLOAT,
  baseline_comparison JSONB DEFAULT '{}',
  processing_version TEXT DEFAULT '1.0.0',
  processing_duration_ms INTEGER,
  processor_model TEXT,
  raw_analysis JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_freq_conversation ON public.voice_frequency_analysis(conversation_id);
CREATE INDEX IF NOT EXISTS idx_voice_freq_user ON public.voice_frequency_analysis(platform_user_id) WHERE platform_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_voice_freq_institution ON public.voice_frequency_analysis(institution_id) WHERE institution_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_voice_freq_emotion ON public.voice_frequency_analysis(emotion);
CREATE INDEX IF NOT EXISTS idx_voice_freq_created_at ON public.voice_frequency_analysis(created_at DESC);

CREATE TABLE IF NOT EXISTS public.user_voice_baseline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_user_id UUID NOT NULL REFERENCES public.platform_users(id) ON DELETE CASCADE,
  baseline_f0_mean FLOAT,
  baseline_f0_range FLOAT,
  baseline_f0_std FLOAT,
  baseline_speech_rate FLOAT,
  baseline_pause_frequency FLOAT,
  sample_count INTEGER DEFAULT 0,
  first_sample_at TIMESTAMPTZ,
  last_sample_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(platform_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_voice_baseline_user ON public.user_voice_baseline(platform_user_id);

-- Emotion detection function
CREATE OR REPLACE FUNCTION detect_emotion_from_f0(
  p_f0_mean FLOAT,
  p_f0_range FLOAT,
  p_speech_rate INTEGER DEFAULT NULL,
  p_contour_type TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_emotion TEXT;
  v_confidence FLOAT;
  v_scores JSONB;
BEGIN
  v_scores := '{"neutral": 0, "happy": 0, "sad": 0, "angry": 0, "fearful": 0, "surprised": 0, "bored": 0}'::JSONB;

  IF p_f0_mean BETWEEN 100 AND 150 AND p_f0_range BETWEEN 30 AND 50 THEN
    v_scores := jsonb_set(v_scores, '{neutral}', to_jsonb(0.8 - (ABS(p_f0_mean - 125) / 50.0) - (ABS(p_f0_range - 40) / 40.0)));
  END IF;
  IF p_f0_mean BETWEEN 150 AND 200 AND p_f0_range BETWEEN 80 AND 120 THEN
    v_scores := jsonb_set(v_scores, '{happy}', to_jsonb(0.9 - (ABS(p_f0_mean - 175) / 50.0) - (ABS(p_f0_range - 100) / 80.0)));
  END IF;
  IF p_f0_mean BETWEEN 80 AND 120 AND p_f0_range BETWEEN 15 AND 40 THEN
    v_scores := jsonb_set(v_scores, '{sad}', to_jsonb(0.85 - (ABS(p_f0_mean - 100) / 40.0) - (ABS(p_f0_range - 30) / 30.0)));
  END IF;
  IF p_f0_mean BETWEEN 180 AND 250 AND p_f0_range BETWEEN 100 AND 150 THEN
    v_scores := jsonb_set(v_scores, '{angry}', to_jsonb(0.9 - (ABS(p_f0_mean - 215) / 70.0) - (ABS(p_f0_range - 125) / 50.0)));
  END IF;
  IF p_f0_mean BETWEEN 150 AND 220 AND p_f0_range BETWEEN 80 AND 130 THEN
    v_scores := jsonb_set(v_scores, '{fearful}', to_jsonb(0.75 - (ABS(p_f0_mean - 185) / 70.0) - (ABS(p_f0_range - 105) / 50.0)));
  END IF;
  IF p_f0_mean BETWEEN 200 AND 280 AND p_f0_range BETWEEN 120 AND 180 THEN
    v_scores := jsonb_set(v_scores, '{surprised}', to_jsonb(0.85 - (ABS(p_f0_mean - 240) / 80.0) - (ABS(p_f0_range - 150) / 60.0)));
  END IF;
  IF p_f0_mean BETWEEN 90 AND 110 AND p_f0_range BETWEEN 10 AND 30 THEN
    v_scores := jsonb_set(v_scores, '{bored}', to_jsonb(0.8 - (ABS(p_f0_mean - 100) / 20.0) - (ABS(p_f0_range - 22) / 20.0)));
  END IF;

  SELECT key INTO v_emotion FROM jsonb_each_text(v_scores) ORDER BY value::FLOAT DESC LIMIT 1;
  v_confidence := GREATEST(0, LEAST(1, (v_scores->>v_emotion)::FLOAT));

  IF v_confidence < 0.3 THEN
    v_emotion := 'neutral';
    v_confidence := 0.5;
  END IF;

  RETURN jsonb_build_object('emotion', v_emotion, 'confidence', ROUND(v_confidence::NUMERIC, 2), 'scores', v_scores);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- PART 5: RLS POLICIES
-- ============================================================

-- Enable RLS
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_frequency_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_voice_baseline ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid errors)
DROP POLICY IF EXISTS "Superadmins can manage all institutions" ON public.institutions;
DROP POLICY IF EXISTS "Admins can view own institution" ON public.institutions;
DROP POLICY IF EXISTS "Service role has full access to institutions" ON public.institutions;
DROP POLICY IF EXISTS "Superadmins can manage all departments" ON public.departments;
DROP POLICY IF EXISTS "Service role has full access to departments" ON public.departments;
DROP POLICY IF EXISTS "Superadmins can manage all users" ON public.platform_users;
DROP POLICY IF EXISTS "Admins can view institution users" ON public.platform_users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.platform_users;
DROP POLICY IF EXISTS "Service role has full access to platform_users" ON public.platform_users;
DROP POLICY IF EXISTS "Superadmins can manage all invites" ON public.user_invites;
DROP POLICY IF EXISTS "Admins can manage institution invites" ON public.user_invites;
DROP POLICY IF EXISTS "Service role has full access to invites" ON public.user_invites;
DROP POLICY IF EXISTS "Anon can read invite by token" ON public.user_invites;
DROP POLICY IF EXISTS "Superadmins can view all voice analysis" ON public.voice_frequency_analysis;
DROP POLICY IF EXISTS "Admins can view institution voice analysis" ON public.voice_frequency_analysis;
DROP POLICY IF EXISTS "Service role has full access to voice analysis" ON public.voice_frequency_analysis;
DROP POLICY IF EXISTS "Service role has full access to voice baseline" ON public.user_voice_baseline;

-- Institutions policies
CREATE POLICY "Superadmins can manage all institutions"
  ON public.institutions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.platform_users WHERE auth_user_id = auth.uid() AND role = 'superadmin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.platform_users WHERE auth_user_id = auth.uid() AND role = 'superadmin'));

CREATE POLICY "Admins can view own institution"
  ON public.institutions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.platform_users WHERE auth_user_id = auth.uid() AND institution_id = institutions.id AND role IN ('admin', 'superadmin')));

CREATE POLICY "Service role has full access to institutions"
  ON public.institutions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Departments policies
CREATE POLICY "Superadmins can manage all departments"
  ON public.departments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.platform_users WHERE auth_user_id = auth.uid() AND role = 'superadmin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.platform_users WHERE auth_user_id = auth.uid() AND role = 'superadmin'));

CREATE POLICY "Service role has full access to departments"
  ON public.departments FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Platform users policies
CREATE POLICY "Superadmins can manage all users"
  ON public.platform_users FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.platform_users pu WHERE pu.auth_user_id = auth.uid() AND pu.role = 'superadmin' AND pu.status = 'active'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.platform_users pu WHERE pu.auth_user_id = auth.uid() AND pu.role = 'superadmin' AND pu.status = 'active'));

CREATE POLICY "Admins can view institution users"
  ON public.platform_users FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.platform_users pu WHERE pu.auth_user_id = auth.uid() AND pu.role = 'admin' AND pu.status = 'active' AND pu.institution_id = platform_users.institution_id));

CREATE POLICY "Users can view own profile"
  ON public.platform_users FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY "Service role has full access to platform_users"
  ON public.platform_users FOR ALL TO service_role USING (true) WITH CHECK (true);

-- User invites policies
CREATE POLICY "Superadmins can manage all invites"
  ON public.user_invites FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.platform_users WHERE auth_user_id = auth.uid() AND role = 'superadmin' AND status = 'active'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.platform_users WHERE auth_user_id = auth.uid() AND role = 'superadmin' AND status = 'active'));

CREATE POLICY "Admins can manage institution invites"
  ON public.user_invites FOR ALL TO authenticated
  USING (user_invites.role != 'superadmin' AND EXISTS (SELECT 1 FROM public.platform_users WHERE auth_user_id = auth.uid() AND role = 'admin' AND status = 'active' AND institution_id = user_invites.institution_id))
  WITH CHECK (user_invites.role = 'user' AND EXISTS (SELECT 1 FROM public.platform_users WHERE auth_user_id = auth.uid() AND role = 'admin' AND status = 'active' AND institution_id = user_invites.institution_id));

CREATE POLICY "Service role has full access to invites"
  ON public.user_invites FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Voice analysis policies
CREATE POLICY "Superadmins can view all voice analysis"
  ON public.voice_frequency_analysis FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.platform_users WHERE auth_user_id = auth.uid() AND role = 'superadmin' AND status = 'active'));

CREATE POLICY "Admins can view institution voice analysis"
  ON public.voice_frequency_analysis FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.platform_users WHERE auth_user_id = auth.uid() AND role = 'admin' AND status = 'active' AND institution_id = voice_frequency_analysis.institution_id));

CREATE POLICY "Service role has full access to voice analysis"
  ON public.voice_frequency_analysis FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access to voice baseline"
  ON public.user_voice_baseline FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- COMPLETION LOG
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'User Management System Migration Complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '- institutions';
  RAISE NOTICE '- departments';
  RAISE NOTICE '- platform_users';
  RAISE NOTICE '- user_invites';
  RAISE NOTICE '- voice_frequency_analysis';
  RAISE NOTICE '- user_voice_baseline';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS policies configured for all tables';
  RAISE NOTICE '=========================================';
END $$;
