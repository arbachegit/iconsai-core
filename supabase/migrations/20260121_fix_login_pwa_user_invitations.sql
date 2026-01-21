-- ============================================
-- login_pwa v3.0 - CORRIGIDA para suportar user_invitations
-- Deploy: 2026-01-21
-- FIX: Agora busca convites em AMBAS as tabelas:
--   1. pwa_invites (PWAInvitesManager - status = 'accepted' ou 'pending')
--   2. user_invitations (create-invitation - status = 'pending' com has_app_access = true)
-- ============================================

CREATE OR REPLACE FUNCTION public.login_pwa(p_phone TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invite RECORD;
  v_session RECORD;
  v_code TEXT;
  v_phone TEXT;
  v_now TIMESTAMPTZ := NOW();
  v_user_name TEXT;
BEGIN
  -- Normalizar telefone (remover caracteres não numéricos)
  v_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');

  -- Adicionar código do país se necessário
  IF length(v_phone) = 11 THEN
    v_phone := '55' || v_phone;
  END IF;

  -- 1. VERIFICAR SE TEM CONVITE ACEITO EM pwa_invites
  SELECT * INTO v_invite
  FROM pwa_invites
  WHERE phone = v_phone
    AND status IN ('accepted', 'pending')  -- Aceitar pending também
    AND (expires_at IS NULL OR expires_at > v_now)
  ORDER BY
    CASE WHEN status = 'accepted' THEN 0 ELSE 1 END,
    created_at DESC
  LIMIT 1;

  IF v_invite IS NOT NULL THEN
    v_user_name := v_invite.name;

    -- Se encontrou pending, atualizar para accepted
    IF v_invite.status = 'pending' THEN
      UPDATE pwa_invites SET status = 'accepted', updated_at = v_now WHERE id = v_invite.id;
    END IF;
  ELSE
    -- 2. VERIFICAR SE TEM CONVITE EM user_invitations (create-invitation)
    SELECT * INTO v_invite
    FROM user_invitations
    WHERE phone = v_phone
      AND status = 'pending'
      AND has_app_access = true
      AND (expires_at IS NULL OR expires_at > v_now)
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_invite IS NOT NULL THEN
      v_user_name := v_invite.name;

      -- Criar registro em pwa_invites para manter compatibilidade
      INSERT INTO pwa_invites (phone, name, email, status, created_at, updated_at)
      VALUES (v_phone, v_invite.name, v_invite.email, 'accepted', v_now, v_now)
      ON CONFLICT (phone) DO UPDATE SET
        status = 'accepted',
        name = EXCLUDED.name,
        updated_at = v_now;
    END IF;
  END IF;

  IF v_user_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'no_invitation',
      'phone', v_phone
    );
  END IF;

  -- 3. VERIFICAR SE JÁ TEM SESSÃO VERIFICADA (para multi-dispositivo)
  SELECT * INTO v_session
  FROM pwa_sessions
  WHERE phone = v_phone AND is_verified = true
  ORDER BY created_at DESC
  LIMIT 1;

  -- Se já tem sessão verificada, permite acesso direto (multi-dispositivo)
  IF v_session IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_verified', true,
      'user_name', v_session.user_name,
      'phone', v_phone
    );
  END IF;

  -- 4. CRIAR NOVA SESSÃO COM CÓDIGO DE VERIFICAÇÃO
  v_code := lpad(floor(random() * 1000000)::text, 6, '0');

  -- Deletar sessões não verificadas antigas deste telefone
  DELETE FROM pwa_sessions WHERE phone = v_phone AND is_verified = false;

  -- Inserir nova sessão
  INSERT INTO pwa_sessions (
    phone,
    user_name,
    verification_code,
    is_verified,
    verification_code_expires_at,
    verification_attempts,
    created_at,
    updated_at
  )
  VALUES (
    v_phone,
    v_user_name,
    v_code,
    false,
    v_now + INTERVAL '10 minutes',
    0,
    v_now,
    v_now
  );

  RETURN jsonb_build_object(
    'success', true,
    'verification_code', v_code,
    'user_name', v_user_name,
    'phone', v_phone,
    'expires_in', 600
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Garantir que pwa_invites tem constraint unique em phone
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pwa_invites_phone_key'
    AND conrelid = 'pwa_invites'::regclass
  ) THEN
    ALTER TABLE pwa_invites ADD CONSTRAINT pwa_invites_phone_key UNIQUE (phone);
  END IF;
EXCEPTION WHEN duplicate_object THEN
  -- Constraint já existe
  NULL;
END $$;
