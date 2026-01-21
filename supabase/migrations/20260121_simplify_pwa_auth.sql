-- ============================================
-- SIMPLIFICACAO DA AUTENTICACAO PWA v5.0
-- Deploy: 2026-01-21
--
-- MUDANCAS:
-- 1. Normalizacao de telefone mais robusta
-- 2. Timeout OTP aumentado de 10 para 15 minutos
-- 3. Busca flexivel por ultimos 11 digitos
-- 4. Funcao unificada que funciona com ambas tabelas
-- ============================================

-- Funcao auxiliar para normalizar telefone de forma consistente
CREATE OR REPLACE FUNCTION public.normalize_phone(p_phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_digits TEXT;
BEGIN
  -- Extrair apenas digitos
  v_digits := regexp_replace(COALESCE(p_phone, ''), '[^0-9]', '', 'g');

  -- Se vazio, retornar NULL
  IF v_digits = '' THEN
    RETURN NULL;
  END IF;

  -- Se comeca com 55 e tem 12-13 digitos, esta ok
  IF v_digits ~ '^55' AND length(v_digits) >= 12 THEN
    RETURN '+' || v_digits;
  END IF;

  -- Se tem 10-11 digitos (DDD + numero), adicionar 55
  IF length(v_digits) IN (10, 11) THEN
    RETURN '+55' || v_digits;
  END IF;

  -- Se tem 8-9 digitos (numero sem DDD), retornar como esta (incompleto)
  IF length(v_digits) IN (8, 9) THEN
    RETURN v_digits;
  END IF;

  -- Outros casos, retornar com + se nao tiver
  RETURN '+' || v_digits;
END;
$$;

-- Funcao para extrair ultimos 11 digitos (para matching flexivel)
CREATE OR REPLACE FUNCTION public.phone_last_digits(p_phone TEXT, p_count INT DEFAULT 11)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN right(regexp_replace(COALESCE(p_phone, ''), '[^0-9]', '', 'g'), p_count);
END;
$$;

-- ============================================
-- login_pwa_unified v5.0
-- Funcao unificada que:
-- 1. Normaliza telefone corretamente
-- 2. Busca em user_invitations E pwa_invites
-- 3. Usa matching flexivel (ultimos 11 digitos)
-- 4. OTP de 15 minutos
-- ============================================
CREATE OR REPLACE FUNCTION public.login_pwa_unified(p_phone TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite RECORD;
  v_device RECORD;
  v_code TEXT;
  v_normalized_phone TEXT;
  v_phone_digits TEXT;
  v_now TIMESTAMPTZ := NOW();
  v_user_name TEXT;
  v_pwa_access TEXT[];
BEGIN
  -- Normalizar telefone
  v_normalized_phone := normalize_phone(p_phone);
  v_phone_digits := phone_last_digits(p_phone, 11);

  IF v_phone_digits IS NULL OR length(v_phone_digits) < 10 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_phone',
      'message', 'Telefone invalido. Use formato: (11) 99999-9999'
    );
  END IF;

  -- 1. BUSCAR CONVITE EM user_invitations (prioridade)
  SELECT * INTO v_invite
  FROM user_invitations
  WHERE phone_last_digits(phone, 11) = v_phone_digits
    AND has_app_access = true
    AND status IN ('pending', 'form_submitted', 'completed')
    AND (expires_at IS NULL OR expires_at > v_now)
  ORDER BY
    CASE WHEN status = 'completed' THEN 0
         WHEN status = 'form_submitted' THEN 1
         ELSE 2 END,
    created_at DESC
  LIMIT 1;

  IF v_invite IS NOT NULL THEN
    v_user_name := v_invite.name;
    v_pwa_access := COALESCE(v_invite.pwa_access, ARRAY['area1']::TEXT[]);
  ELSE
    -- 2. BUSCAR EM pwa_invites (fallback)
    SELECT * INTO v_invite
    FROM pwa_invites
    WHERE phone_last_digits(phone, 11) = v_phone_digits
      AND status IN ('accepted', 'pending')
      AND (expires_at IS NULL OR expires_at > v_now)
    ORDER BY
      CASE WHEN status = 'accepted' THEN 0 ELSE 1 END,
      created_at DESC
    LIMIT 1;

    IF v_invite IS NOT NULL THEN
      v_user_name := v_invite.name;
      v_pwa_access := ARRAY['area1']::TEXT[];
    END IF;
  END IF;

  -- Se nao encontrou convite
  IF v_user_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'no_invitation',
      'message', 'Voce precisa de um convite para acessar o KnowYOU.',
      'phone_searched', v_phone_digits
    );
  END IF;

  -- 3. VERIFICAR SE JA TEM DISPOSITIVO VERIFICADO
  SELECT * INTO v_device
  FROM pwa_user_devices
  WHERE phone_last_digits(phone, 11) = v_phone_digits
    AND is_verified = true
    AND (expires_at IS NULL OR expires_at > v_now)
  ORDER BY verified_at DESC
  LIMIT 1;

  IF v_device IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_verified', true,
      'user_name', v_device.user_name,
      'phone', v_device.phone,
      'pwa_access', v_pwa_access
    );
  END IF;

  -- 4. GERAR CODIGO DE VERIFICACAO (6 digitos)
  v_code := lpad(floor(random() * 1000000)::text, 6, '0');

  -- 5. CRIAR/ATUALIZAR REGISTRO EM pwa_user_devices
  INSERT INTO pwa_user_devices (
    phone,
    user_name,
    verification_code,
    verification_code_expires_at,
    verification_attempts,
    is_verified,
    created_at,
    updated_at
  )
  VALUES (
    v_normalized_phone,
    v_user_name,
    v_code,
    v_now + INTERVAL '15 minutes', -- 15 minutos ao inves de 10
    0,
    false,
    v_now,
    v_now
  )
  ON CONFLICT (phone) DO UPDATE SET
    user_name = EXCLUDED.user_name,
    verification_code = EXCLUDED.verification_code,
    verification_code_expires_at = EXCLUDED.verification_code_expires_at,
    verification_attempts = 0,
    is_verified = false,
    updated_at = v_now;

  RETURN jsonb_build_object(
    'success', true,
    'verification_code', v_code,
    'user_name', v_user_name,
    'phone', v_normalized_phone,
    'pwa_access', v_pwa_access,
    'expires_in', 900 -- 15 minutos em segundos
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'internal_error',
    'message', 'Erro interno. Tente novamente.',
    'details', SQLERRM
  );
END;
$$;

-- ============================================
-- verify_pwa_code_unified v5.0
-- Verifica codigo com matching flexivel
-- ============================================
CREATE OR REPLACE FUNCTION public.verify_pwa_code_unified(p_phone TEXT, p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_device RECORD;
  v_invitation RECORD;
  v_now TIMESTAMP WITH TIME ZONE := NOW();
  v_phone_digits TEXT;
BEGIN
  -- Extrair ultimos 11 digitos
  v_phone_digits := phone_last_digits(p_phone, 11);

  -- Buscar dispositivo com codigo valido
  SELECT * INTO v_device
  FROM pwa_user_devices
  WHERE phone_last_digits(phone, 11) = v_phone_digits
    AND verification_code = p_code
    AND verification_code_expires_at > v_now
  LIMIT 1;

  IF v_device IS NULL THEN
    -- Verificar se existe dispositivo mas codigo expirou
    SELECT * INTO v_device
    FROM pwa_user_devices
    WHERE phone_last_digits(phone, 11) = v_phone_digits
    LIMIT 1;

    IF v_device IS NOT NULL THEN
      -- Incrementar tentativas
      UPDATE pwa_user_devices
      SET verification_attempts = COALESCE(verification_attempts, 0) + 1,
          updated_at = v_now
      WHERE id = v_device.id;

      IF v_device.verification_code_expires_at < v_now THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'code_expired',
          'message', 'Codigo expirado. Solicite um novo codigo.'
        );
      END IF;
    END IF;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_code',
      'message', 'Codigo invalido. Verifique e tente novamente.'
    );
  END IF;

  -- Buscar convite para pegar pwa_access
  SELECT * INTO v_invitation
  FROM user_invitations
  WHERE phone_last_digits(phone, 11) = v_phone_digits
    AND has_app_access = true
  ORDER BY created_at DESC
  LIMIT 1;

  -- Marcar dispositivo como verificado
  UPDATE pwa_user_devices
  SET is_verified = true,
      verified_at = v_now,
      verification_code = NULL,
      verification_code_expires_at = NULL,
      verification_attempts = 0,
      expires_at = v_now + INTERVAL '30 days',
      updated_at = v_now
  WHERE id = v_device.id;

  -- Atualizar user_invitations.status para 'completed'
  IF v_invitation IS NOT NULL THEN
    UPDATE user_invitations
    SET status = 'completed',
        updated_at = v_now
    WHERE id = v_invitation.id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'verified', true,
    'user_name', v_device.user_name,
    'phone', v_device.phone,
    'pwa_access', COALESCE(v_invitation.pwa_access, ARRAY['area1']::TEXT[]),
    'expires_at', v_now + INTERVAL '30 days'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'internal_error',
    'message', 'Erro interno. Tente novamente.',
    'details', SQLERRM
  );
END;
$$;

-- ============================================
-- Criar aliases para manter compatibilidade
-- ============================================
CREATE OR REPLACE FUNCTION public.login_pwa_by_phone_simple(p_phone TEXT)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT login_pwa_unified(p_phone);
$$;

CREATE OR REPLACE FUNCTION public.verify_pwa_code_simple(p_phone TEXT, p_code TEXT)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT verify_pwa_code_unified(p_phone, p_code);
$$;

-- ============================================
-- Garantir que pwa_user_devices tem constraint unique
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pwa_user_devices_phone_key'
  ) THEN
    ALTER TABLE pwa_user_devices ADD CONSTRAINT pwa_user_devices_phone_key UNIQUE (phone);
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
