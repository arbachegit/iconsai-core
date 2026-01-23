-- ============================================
-- FIX COMPLETO DO FLUXO DE CONVITE v1.0
-- Deploy: 2026-01-22
--
-- PROBLEMAS IDENTIFICADOS:
-- 1. verify_pwa_code_simple foi sobrescrito por alias menos robusto
-- 2. Matching de telefone não é flexível o suficiente
-- 3. check_pwa_access pode não encontrar dispositivo verificado
--
-- SOLUÇÃO:
-- 1. Recriar verify_pwa_code_simple com matching mais flexível
-- 2. Garantir que user_invitations.status seja atualizado corretamente
-- 3. Garantir UNIQUE constraint em pwa_user_devices
-- ============================================

-- ============================================
-- PARTE 1: Função auxiliar para matching de telefone
-- ============================================
CREATE OR REPLACE FUNCTION public.phones_match(p_phone1 TEXT, p_phone2 TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_digits1 TEXT;
  v_digits2 TEXT;
BEGIN
  -- Extrair apenas dígitos
  v_digits1 := regexp_replace(COALESCE(p_phone1, ''), '[^0-9]', '', 'g');
  v_digits2 := regexp_replace(COALESCE(p_phone2, ''), '[^0-9]', '', 'g');

  -- Se algum é vazio, não combina
  IF v_digits1 = '' OR v_digits2 = '' THEN
    RETURN false;
  END IF;

  -- Match por últimos 11 dígitos
  IF right(v_digits1, 11) = right(v_digits2, 11) THEN
    RETURN true;
  END IF;

  -- Match por últimos 10 dígitos (fallback para números antigos)
  IF right(v_digits1, 10) = right(v_digits2, 10) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- ============================================
-- PARTE 2: Garantir UNIQUE constraint em pwa_user_devices
-- ============================================
DO $$
DECLARE
  v_count INT;
BEGIN
  -- Primeiro, remover duplicatas se existirem (manter o mais recente)
  DELETE FROM pwa_user_devices a
  USING pwa_user_devices b
  WHERE a.id < b.id
    AND phone_last_digits(a.phone, 11) = phone_last_digits(b.phone, 11);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN
    RAISE NOTICE 'Removidas % duplicatas de pwa_user_devices', v_count;
  END IF;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Erro ao remover duplicatas: %', SQLERRM;
END $$;

-- Adicionar constraint se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'pwa_user_devices_phone_key'
  ) THEN
    ALTER TABLE pwa_user_devices ADD CONSTRAINT pwa_user_devices_phone_key UNIQUE (phone);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Constraint já existe ou erro: %', SQLERRM;
END $$;

-- ============================================
-- PARTE 3: Atualizar login_pwa_unified para melhor matching
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
  -- Matching flexível: últimos 11 OU 10 dígitos
  SELECT * INTO v_invite
  FROM user_invitations
  WHERE (
    phone_last_digits(phone, 11) = v_phone_digits
    OR phone_last_digits(phone, 10) = right(v_phone_digits, 10)
  )
    AND has_app_access = true
    AND status IN ('pending', 'form_submitted', 'completed')
    AND (expires_at IS NULL OR expires_at > v_now)
  ORDER BY
    CASE WHEN status = 'pending' THEN 0
         WHEN status = 'form_submitted' THEN 1
         ELSE 2 END,
    created_at DESC
  LIMIT 1;

  IF v_invite IS NOT NULL THEN
    v_user_name := v_invite.name;
    v_pwa_access := COALESCE(v_invite.pwa_access, ARRAY['area1']::TEXT[]);

    RAISE NOTICE '[login_pwa_unified] Encontrado convite em user_invitations: % (status: %)',
      v_invite.id, v_invite.status;
  ELSE
    -- 2. BUSCAR EM pwa_invites (fallback)
    SELECT * INTO v_invite
    FROM pwa_invites
    WHERE (
      phone_last_digits(phone, 11) = v_phone_digits
      OR phone_last_digits(phone, 10) = right(v_phone_digits, 10)
    )
      AND status IN ('accepted', 'pending')
      AND (expires_at IS NULL OR expires_at > v_now)
    ORDER BY
      CASE WHEN status = 'accepted' THEN 0 ELSE 1 END,
      created_at DESC
    LIMIT 1;

    IF v_invite IS NOT NULL THEN
      v_user_name := v_invite.name;
      v_pwa_access := ARRAY['area1']::TEXT[];
      RAISE NOTICE '[login_pwa_unified] Encontrado convite em pwa_invites: %', v_invite.id;
    END IF;
  END IF;

  -- Se nao encontrou convite
  IF v_user_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'no_invitation',
      'message', 'Voce precisa de um convite para acessar o IconsAI Business.',
      'phone_searched', v_phone_digits
    );
  END IF;

  -- 3. VERIFICAR SE JA TEM DISPOSITIVO VERIFICADO
  SELECT * INTO v_device
  FROM pwa_user_devices
  WHERE (
    phone_last_digits(phone, 11) = v_phone_digits
    OR phone_last_digits(phone, 10) = right(v_phone_digits, 10)
  )
    AND is_verified = true
    AND (expires_at IS NULL OR expires_at > v_now)
  ORDER BY verified_at DESC NULLS LAST
  LIMIT 1;

  IF v_device IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_verified', true,
      'user_name', v_device.user_name,
      'phone', v_device.phone,
      'normalized_phone', v_device.phone,
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
    v_now + INTERVAL '15 minutes',
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
    'normalized_phone', v_normalized_phone,
    'pwa_access', v_pwa_access,
    'expires_in', 900
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
-- PARTE 4: verify_pwa_code_simple CORRIGIDA
-- Não mais um alias - implementação completa e robusta
-- ============================================
CREATE OR REPLACE FUNCTION public.verify_pwa_code_simple(p_phone TEXT, p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_device RECORD;
  v_invitation RECORD;
  v_now TIMESTAMP WITH TIME ZONE := NOW();
  v_normalized_phone TEXT;
  v_phone_digits TEXT;
BEGIN
  -- Extrair e normalizar telefone
  v_phone_digits := phone_last_digits(p_phone, 11);
  v_normalized_phone := normalize_phone(p_phone);

  RAISE NOTICE '[verify_pwa_code_simple v3.0] Phone: %, Digits: %, Code: %',
    p_phone, v_phone_digits, p_code;

  -- Buscar dispositivo com código válido (matching flexível)
  SELECT * INTO v_device
  FROM public.pwa_user_devices
  WHERE (
    phone_last_digits(phone, 11) = v_phone_digits
    OR phone_last_digits(phone, 10) = right(v_phone_digits, 10)
    OR phone = v_normalized_phone
  )
  AND verification_code = p_code
  AND verification_code_expires_at > v_now
  LIMIT 1;

  IF v_device IS NULL THEN
    -- Verificar se existe dispositivo mas código está errado/expirado
    SELECT * INTO v_device
    FROM public.pwa_user_devices
    WHERE (
      phone_last_digits(phone, 11) = v_phone_digits
      OR phone_last_digits(phone, 10) = right(v_phone_digits, 10)
      OR phone = v_normalized_phone
    )
    LIMIT 1;

    IF v_device IS NOT NULL THEN
      -- Incrementar tentativas
      UPDATE public.pwa_user_devices
      SET verification_attempts = COALESCE(verification_attempts, 0) + 1,
          updated_at = v_now
      WHERE id = v_device.id;

      -- Verificar se expirou
      IF v_device.verification_code_expires_at IS NOT NULL
         AND v_device.verification_code_expires_at < v_now THEN
        RAISE NOTICE '[verify_pwa_code_simple] Código expirado';
        RETURN jsonb_build_object(
          'success', false,
          'error', 'code_expired',
          'message', 'Código expirado. Solicite um novo código.'
        );
      END IF;

      -- Verificar bloqueio por tentativas
      IF COALESCE(v_device.verification_attempts, 0) >= 5 THEN
        UPDATE public.pwa_user_devices
        SET is_blocked = true,
            blocked_reason = 'Excesso de tentativas',
            updated_at = v_now
        WHERE id = v_device.id;

        RAISE NOTICE '[verify_pwa_code_simple] Bloqueado por excesso de tentativas';
        RETURN jsonb_build_object(
          'success', false,
          'error', 'too_many_attempts',
          'message', 'Bloqueado por excesso de tentativas. Contate o suporte.'
        );
      END IF;
    END IF;

    RAISE NOTICE '[verify_pwa_code_simple] Código inválido ou dispositivo não encontrado';
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_code',
      'message', 'Código inválido. Verifique e tente novamente.'
    );
  END IF;

  RAISE NOTICE '[verify_pwa_code_simple] Dispositivo encontrado: % (phone: %)',
    v_device.id, v_device.phone;

  -- Buscar convite em user_invitations para pegar pwa_access E atualizar status
  SELECT * INTO v_invitation
  FROM public.user_invitations
  WHERE (
    phone_last_digits(phone, 11) = v_phone_digits
    OR phone_last_digits(phone, 10) = right(v_phone_digits, 10)
  )
  AND has_app_access = true
  ORDER BY
    CASE WHEN status = 'pending' THEN 0 ELSE 1 END,
    created_at DESC
  LIMIT 1;

  -- Marcar dispositivo como verificado ANTES de atualizar o convite
  UPDATE public.pwa_user_devices
  SET is_verified = true,
      verified_at = v_now,
      verification_code = NULL,
      verification_code_expires_at = NULL,
      verification_attempts = 0,
      expires_at = v_now + INTERVAL '30 days',
      updated_at = v_now
  WHERE id = v_device.id;

  RAISE NOTICE '[verify_pwa_code_simple] Dispositivo marcado como verificado';

  -- CRÍTICO: Atualizar user_invitations.status para 'completed'
  -- Isso move o usuário de "convidados pendentes" para "usuários ativos"
  IF v_invitation IS NOT NULL THEN
    RAISE NOTICE '[verify_pwa_code_simple] Atualizando convite % de % para completed',
      v_invitation.id, v_invitation.status;

    UPDATE public.user_invitations
    SET status = 'completed',
        updated_at = v_now
    WHERE id = v_invitation.id;

    -- Também criar/atualizar registro em pwa_invites para compatibilidade
    INSERT INTO public.pwa_invites (phone, name, email, status, created_at, updated_at)
    VALUES (v_device.phone, v_invitation.name, v_invitation.email, 'accepted', v_now, v_now)
    ON CONFLICT (phone) DO UPDATE SET
      status = 'accepted',
      name = EXCLUDED.name,
      updated_at = v_now;

    RAISE NOTICE '[verify_pwa_code_simple] pwa_invites atualizado para accepted';
  ELSE
    RAISE NOTICE '[verify_pwa_code_simple] AVISO: Convite não encontrado em user_invitations para phone %', v_phone_digits;
  END IF;

  RAISE NOTICE '[verify_pwa_code_simple] SUCESSO! Retornando dados do usuário';

  RETURN jsonb_build_object(
    'success', true,
    'verified', true,
    'user_name', v_device.user_name,
    'phone', v_device.phone,
    'pwa_access', COALESCE(v_invitation.pwa_access, ARRAY['area1']::TEXT[]),
    'expires_at', v_now + INTERVAL '30 days'
  );

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '[verify_pwa_code_simple] ERRO: %', SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'error', 'internal_error',
    'message', 'Erro interno. Tente novamente.',
    'details', SQLERRM
  );
END;
$$;

-- ============================================
-- PARTE 5: check_pwa_access CORRIGIDA
-- ============================================
CREATE OR REPLACE FUNCTION public.check_pwa_access(p_phone TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_device RECORD;
  v_phone_digits TEXT;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Extrair últimos 11 dígitos para matching flexível
  v_phone_digits := phone_last_digits(p_phone, 11);

  IF v_phone_digits IS NULL OR length(v_phone_digits) < 10 THEN
    RETURN jsonb_build_object(
      'has_access', false,
      'reason', 'invalid_phone'
    );
  END IF;

  RAISE NOTICE '[check_pwa_access v6.0] Buscando dispositivo para digits: %', v_phone_digits;

  -- Buscar dispositivo verificado (matching flexível)
  SELECT * INTO v_device
  FROM pwa_user_devices
  WHERE (
    phone_last_digits(phone, 11) = v_phone_digits
    OR phone_last_digits(phone, 10) = right(v_phone_digits, 10)
  )
    AND is_verified = true
  ORDER BY verified_at DESC NULLS LAST
  LIMIT 1;

  -- Se não encontrou dispositivo verificado
  IF v_device IS NULL THEN
    RAISE NOTICE '[check_pwa_access v6.0] Dispositivo não encontrado';
    RETURN jsonb_build_object(
      'has_access', false,
      'reason', 'not_verified'
    );
  END IF;

  RAISE NOTICE '[check_pwa_access v6.0] Dispositivo encontrado: % (phone: %)',
    v_device.id, v_device.phone;

  -- Se dispositivo bloqueado
  IF v_device.is_blocked = true THEN
    RAISE NOTICE '[check_pwa_access v6.0] Dispositivo bloqueado';
    RETURN jsonb_build_object(
      'has_access', false,
      'reason', 'blocked',
      'block_reason', v_device.blocked_reason
    );
  END IF;

  -- Se expirado
  IF v_device.expires_at IS NOT NULL AND v_device.expires_at < v_now THEN
    RAISE NOTICE '[check_pwa_access v6.0] Dispositivo expirado';
    UPDATE pwa_user_devices
    SET is_verified = false, updated_at = v_now
    WHERE id = v_device.id;

    RETURN jsonb_build_object(
      'has_access', false,
      'reason', 'expired'
    );
  END IF;

  -- SUCESSO - Atualizar último acesso
  UPDATE pwa_user_devices
  SET last_access_at = v_now, updated_at = v_now
  WHERE id = v_device.id;

  RAISE NOTICE '[check_pwa_access v6.0] ACESSO CONCEDIDO para %', v_device.user_name;

  RETURN jsonb_build_object(
    'has_access', true,
    'user_name', v_device.user_name,
    'phone', v_device.phone,
    'expires_at', v_device.expires_at
  );

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '[check_pwa_access v6.0] ERRO: %', SQLERRM;
  RETURN jsonb_build_object(
    'has_access', false,
    'reason', 'internal_error',
    'details', SQLERRM
  );
END;
$$;

-- ============================================
-- PARTE 6: login_pwa_by_phone_simple como implementação completa
-- (não mais um alias)
-- ============================================
CREATE OR REPLACE FUNCTION public.login_pwa_by_phone_simple(p_phone TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Chamar a função unificada
  RETURN login_pwa_unified(p_phone);
END;
$$;

-- ============================================
-- PARTE 7: Garantir permissões
-- ============================================
GRANT EXECUTE ON FUNCTION public.phones_match(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.login_pwa_unified(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.login_pwa_by_phone_simple(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_pwa_code_simple(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_pwa_access(TEXT) TO anon, authenticated, service_role;

-- ============================================
-- PARTE 8: Log de conclusão
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'FIX COMPLETO DO FLUXO DE CONVITE v1.0';
  RAISE NOTICE 'Deploy: 2026-01-22';
  RAISE NOTICE '';
  RAISE NOTICE 'Funções atualizadas:';
  RAISE NOTICE '  - phones_match: matching flexível de telefones';
  RAISE NOTICE '  - login_pwa_unified: login com matching flexível';
  RAISE NOTICE '  - login_pwa_by_phone_simple: wrapper para login_pwa_unified';
  RAISE NOTICE '  - verify_pwa_code_simple: verificação completa';
  RAISE NOTICE '  - check_pwa_access: acesso com matching flexível';
  RAISE NOTICE '';
  RAISE NOTICE 'O fluxo agora deve funcionar corretamente!';
  RAISE NOTICE '=========================================';
END $$;
