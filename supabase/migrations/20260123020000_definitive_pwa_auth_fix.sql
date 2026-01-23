-- ============================================
-- FIX DEFINITIVO: PWA Auth Flow v2.0
-- Deploy: 2026-01-23
--
-- PROBLEMAS REPORTADOS:
-- 1. Após verificar código SMS, usuário vê OUTRA tela de login
-- 2. Usuário NÃO aparece em "Usuários Ativos"
-- 3. Convite não atualiza corretamente
--
-- CAUSA RAIZ:
-- - check_pwa_access não encontra dispositivo verificado
-- - user_registrations não está sendo criado
--
-- SOLUÇÃO DEFINITIVA:
-- 1. check_pwa_access com matching ultra-flexível
-- 2. verify_pwa_code_simple cria user_registrations
-- 3. Logging detalhado para debug
-- ============================================

-- ============================================
-- PARTE 1: Função auxiliar phone_last_digits (garantir existe)
-- ============================================
CREATE OR REPLACE FUNCTION public.phone_last_digits(p_phone TEXT, p_count INT DEFAULT 11)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_digits TEXT;
BEGIN
  v_digits := regexp_replace(COALESCE(p_phone, ''), '[^0-9]', '', 'g');
  RETURN right(v_digits, p_count);
END;
$$;

-- ============================================
-- PARTE 2: Função auxiliar normalize_phone (garantir existe)
-- ============================================
CREATE OR REPLACE FUNCTION public.normalize_phone(p_phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_digits TEXT;
BEGIN
  v_digits := regexp_replace(COALESCE(p_phone, ''), '[^0-9]', '', 'g');

  IF length(v_digits) = 13 AND left(v_digits, 2) = '55' THEN
    RETURN '+' || v_digits;
  ELSIF length(v_digits) = 11 THEN
    RETURN '+55' || v_digits;
  ELSIF length(v_digits) = 10 THEN
    RETURN '+55' || v_digits;
  ELSE
    RETURN '+' || v_digits;
  END IF;
END;
$$;

-- ============================================
-- PARTE 3: check_pwa_access DEFINITIVO v7.0
-- Agora com matching ULTRA-FLEXÍVEL e logging detalhado
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
  v_phone_digits_10 TEXT;
  v_normalized TEXT;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Extrair dígitos do telefone
  v_phone_digits := phone_last_digits(p_phone, 11);
  v_phone_digits_10 := right(v_phone_digits, 10);
  v_normalized := normalize_phone(p_phone);

  RAISE NOTICE '[check_pwa_access v7.0] === VERIFICANDO ACESSO ===';
  RAISE NOTICE '[check_pwa_access v7.0] Input phone: %', p_phone;
  RAISE NOTICE '[check_pwa_access v7.0] Digits 11: %, Digits 10: %', v_phone_digits, v_phone_digits_10;
  RAISE NOTICE '[check_pwa_access v7.0] Normalized: %', v_normalized;

  IF v_phone_digits IS NULL OR length(v_phone_digits) < 10 THEN
    RAISE NOTICE '[check_pwa_access v7.0] ERRO: Telefone inválido';
    RETURN jsonb_build_object(
      'has_access', false,
      'reason', 'invalid_phone'
    );
  END IF;

  -- Buscar dispositivo verificado com MATCHING ULTRA-FLEXÍVEL
  -- Tenta: últimos 11 dígitos, últimos 10 dígitos, phone exato, normalized
  SELECT * INTO v_device
  FROM pwa_user_devices
  WHERE is_verified = true
    AND (
      -- Match por últimos 11 dígitos
      phone_last_digits(phone, 11) = v_phone_digits
      -- Match por últimos 10 dígitos
      OR phone_last_digits(phone, 10) = v_phone_digits_10
      -- Match exato
      OR phone = p_phone
      -- Match normalizado
      OR phone = v_normalized
      -- Match sem formatação
      OR regexp_replace(phone, '[^0-9]', '', 'g') = regexp_replace(p_phone, '[^0-9]', '', 'g')
    )
  ORDER BY verified_at DESC NULLS LAST
  LIMIT 1;

  -- Se não encontrou dispositivo verificado
  IF v_device IS NULL THEN
    -- Debug: mostrar quantos dispositivos existem com esse telefone
    RAISE NOTICE '[check_pwa_access v7.0] Nenhum dispositivo verificado encontrado';
    RAISE NOTICE '[check_pwa_access v7.0] Buscando qualquer dispositivo para debug...';

    SELECT * INTO v_device
    FROM pwa_user_devices
    WHERE phone_last_digits(phone, 11) = v_phone_digits
       OR phone_last_digits(phone, 10) = v_phone_digits_10
    LIMIT 1;

    IF v_device IS NOT NULL THEN
      RAISE NOTICE '[check_pwa_access v7.0] Encontrado dispositivo NÃO verificado: id=%, is_verified=%',
        v_device.id, v_device.is_verified;
    END IF;

    RETURN jsonb_build_object(
      'has_access', false,
      'reason', 'not_verified'
    );
  END IF;

  RAISE NOTICE '[check_pwa_access v7.0] Dispositivo verificado encontrado: id=%, phone=%',
    v_device.id, v_device.phone;

  -- Se dispositivo bloqueado
  IF v_device.is_blocked = true THEN
    RAISE NOTICE '[check_pwa_access v7.0] Dispositivo bloqueado';
    RETURN jsonb_build_object(
      'has_access', false,
      'reason', 'blocked',
      'block_reason', v_device.blocked_reason
    );
  END IF;

  -- Se expirado (mas continua funcionando se não expirou)
  IF v_device.expires_at IS NOT NULL AND v_device.expires_at < v_now THEN
    RAISE NOTICE '[check_pwa_access v7.0] Dispositivo expirado em %', v_device.expires_at;
    -- Não desverificar automaticamente, apenas retornar erro
    RETURN jsonb_build_object(
      'has_access', false,
      'reason', 'expired',
      'expired_at', v_device.expires_at
    );
  END IF;

  -- SUCESSO - Atualizar último acesso
  UPDATE pwa_user_devices
  SET last_access_at = v_now, updated_at = v_now
  WHERE id = v_device.id;

  RAISE NOTICE '[check_pwa_access v7.0] ✅ ACESSO CONCEDIDO para %', v_device.user_name;

  RETURN jsonb_build_object(
    'has_access', true,
    'user_name', v_device.user_name,
    'phone', v_device.phone,
    'expires_at', v_device.expires_at
  );

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '[check_pwa_access v7.0] ERRO: %', SQLERRM;
  RETURN jsonb_build_object(
    'has_access', false,
    'reason', 'internal_error',
    'details', SQLERRM
  );
END;
$$;

-- ============================================
-- PARTE 4: verify_pwa_code_simple DEFINITIVO v5.0
-- Cria usuário em user_registrations + pwa_invites
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
  v_existing_user RECORD;
  v_now TIMESTAMP WITH TIME ZONE := NOW();
  v_normalized_phone TEXT;
  v_phone_digits TEXT;
  v_phone_digits_10 TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
  v_name_parts TEXT[];
BEGIN
  -- Extrair e normalizar telefone
  v_phone_digits := phone_last_digits(p_phone, 11);
  v_phone_digits_10 := right(v_phone_digits, 10);
  v_normalized_phone := normalize_phone(p_phone);

  RAISE NOTICE '[verify_pwa_code_simple v5.0] === VERIFICANDO CÓDIGO ===';
  RAISE NOTICE '[verify_pwa_code_simple v5.0] Phone: %, Digits: %, Code: %',
    p_phone, v_phone_digits, p_code;

  -- Buscar dispositivo com código válido (matching flexível)
  SELECT * INTO v_device
  FROM public.pwa_user_devices
  WHERE (
    phone_last_digits(phone, 11) = v_phone_digits
    OR phone_last_digits(phone, 10) = v_phone_digits_10
    OR phone = v_normalized_phone
    OR phone = p_phone
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
      OR phone_last_digits(phone, 10) = v_phone_digits_10
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

        RETURN jsonb_build_object(
          'success', false,
          'error', 'too_many_attempts',
          'message', 'Bloqueado por excesso de tentativas. Contate o suporte.'
        );
      END IF;
    END IF;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_code',
      'message', 'Código inválido. Verifique e tente novamente.'
    );
  END IF;

  RAISE NOTICE '[verify_pwa_code_simple v5.0] Dispositivo encontrado: %', v_device.id;

  -- Buscar convite em user_invitations
  SELECT * INTO v_invitation
  FROM public.user_invitations
  WHERE (
    phone_last_digits(phone, 11) = v_phone_digits
    OR phone_last_digits(phone, 10) = v_phone_digits_10
  )
  AND has_app_access = true
  ORDER BY
    CASE WHEN status = 'pending' THEN 0 ELSE 1 END,
    created_at DESC
  LIMIT 1;

  -- =========================================
  -- CRÍTICO: Marcar dispositivo como verificado
  -- =========================================
  UPDATE public.pwa_user_devices
  SET is_verified = true,
      verified_at = v_now,
      verification_code = NULL,
      verification_code_expires_at = NULL,
      verification_attempts = 0,
      expires_at = v_now + INTERVAL '30 days',
      updated_at = v_now
  WHERE id = v_device.id;

  RAISE NOTICE '[verify_pwa_code_simple v5.0] ✅ Dispositivo marcado como VERIFICADO';

  -- Atualizar user_invitations.status para 'completed'
  IF v_invitation IS NOT NULL THEN
    RAISE NOTICE '[verify_pwa_code_simple v5.0] Atualizando convite % para completed', v_invitation.id;

    UPDATE public.user_invitations
    SET status = 'completed',
        updated_at = v_now
    WHERE id = v_invitation.id;

    -- Criar/atualizar registro em pwa_invites
    INSERT INTO public.pwa_invites (phone, name, email, status, created_at, updated_at)
    VALUES (v_device.phone, v_invitation.name, v_invitation.email, 'accepted', v_now, v_now)
    ON CONFLICT (phone) DO UPDATE SET
      status = 'accepted',
      name = EXCLUDED.name,
      updated_at = v_now;

    -- =========================================
    -- CRÍTICO: Criar registro em user_registrations
    -- Isso faz o usuário aparecer em "Usuários Ativos"
    -- =========================================

    -- Verificar se já existe usuário com esse email ou telefone
    SELECT * INTO v_existing_user
    FROM public.user_registrations
    WHERE email = v_invitation.email
       OR phone_last_digits(phone, 11) = v_phone_digits
    LIMIT 1;

    IF v_existing_user IS NULL THEN
      -- Separar nome em primeiro e último nome
      v_name_parts := string_to_array(COALESCE(v_invitation.name, ''), ' ');
      v_first_name := v_name_parts[1];
      v_last_name := CASE
        WHEN array_length(v_name_parts, 1) > 1
        THEN array_to_string(v_name_parts[2:array_length(v_name_parts, 1)], ' ')
        ELSE NULL
      END;

      RAISE NOTICE '[verify_pwa_code_simple v5.0] Criando usuário em user_registrations: %', v_invitation.email;

      INSERT INTO public.user_registrations (
        email,
        phone,
        first_name,
        last_name,
        status,
        role,
        has_platform_access,
        has_app_access,
        pwa_access,
        pwa_registered_at,
        registration_source,
        approved_at,
        created_at,
        updated_at
      )
      VALUES (
        v_invitation.email,
        regexp_replace(v_device.phone, '[^0-9]', '', 'g'),
        v_first_name,
        v_last_name,
        'approved',
        'user',
        false,
        true,
        COALESCE(v_invitation.pwa_access, ARRAY['area1']::TEXT[]),
        v_now,
        'pwa_invite',
        v_now,
        v_now,
        v_now
      );

      RAISE NOTICE '[verify_pwa_code_simple v5.0] ✅ Usuário CRIADO em user_registrations!';
    ELSE
      -- Usuário já existe, apenas atualizar campos de PWA
      RAISE NOTICE '[verify_pwa_code_simple v5.0] Usuário já existe (id=%), atualizando campos PWA', v_existing_user.id;

      UPDATE public.user_registrations
      SET has_app_access = true,
          pwa_access = COALESCE(v_invitation.pwa_access, pwa_access, ARRAY['area1']::TEXT[]),
          pwa_registered_at = COALESCE(pwa_registered_at, v_now),
          updated_at = v_now
      WHERE id = v_existing_user.id;
    END IF;
  ELSE
    RAISE NOTICE '[verify_pwa_code_simple v5.0] AVISO: Convite não encontrado para phone %', v_phone_digits;
  END IF;

  RAISE NOTICE '[verify_pwa_code_simple v5.0] ✅ SUCESSO COMPLETO!';

  RETURN jsonb_build_object(
    'success', true,
    'verified', true,
    'user_name', v_device.user_name,
    'phone', v_device.phone,
    'pwa_access', COALESCE(v_invitation.pwa_access, ARRAY['area1']::TEXT[]),
    'expires_at', v_now + INTERVAL '30 days'
  );

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '[verify_pwa_code_simple v5.0] ERRO: %', SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'error', 'internal_error',
    'message', 'Erro interno. Tente novamente.',
    'details', SQLERRM
  );
END;
$$;

-- ============================================
-- PARTE 5: login_pwa_by_phone_simple DEFINITIVO
-- ============================================
CREATE OR REPLACE FUNCTION public.login_pwa_by_phone_simple(p_phone TEXT)
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
  v_phone_digits_10 TEXT;
  v_now TIMESTAMPTZ := NOW();
  v_user_name TEXT;
  v_pwa_access TEXT[];
BEGIN
  -- Normalizar telefone
  v_normalized_phone := normalize_phone(p_phone);
  v_phone_digits := phone_last_digits(p_phone, 11);
  v_phone_digits_10 := right(v_phone_digits, 10);

  RAISE NOTICE '[login_pwa_by_phone_simple v5.0] Phone: %, Digits: %', p_phone, v_phone_digits;

  IF v_phone_digits IS NULL OR length(v_phone_digits) < 10 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_phone',
      'message', 'Telefone invalido. Use formato: (11) 99999-9999'
    );
  END IF;

  -- 1. BUSCAR CONVITE EM user_invitations
  SELECT * INTO v_invite
  FROM user_invitations
  WHERE (
    phone_last_digits(phone, 11) = v_phone_digits
    OR phone_last_digits(phone, 10) = v_phone_digits_10
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
    RAISE NOTICE '[login_pwa_by_phone_simple v5.0] Convite encontrado: %', v_invite.id;
  ELSE
    -- 2. BUSCAR EM pwa_invites (fallback)
    SELECT * INTO v_invite
    FROM pwa_invites
    WHERE (
      phone_last_digits(phone, 11) = v_phone_digits
      OR phone_last_digits(phone, 10) = v_phone_digits_10
    )
      AND status IN ('accepted', 'pending')
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_invite IS NOT NULL THEN
      v_user_name := v_invite.name;
      v_pwa_access := ARRAY['area1']::TEXT[];
      RAISE NOTICE '[login_pwa_by_phone_simple v5.0] Convite (pwa_invites) encontrado: %', v_invite.id;
    END IF;
  END IF;

  -- Se não encontrou convite
  IF v_user_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'no_invitation',
      'message', 'Voce precisa de um convite para acessar o IconsAI Business.'
    );
  END IF;

  -- 3. VERIFICAR SE JÁ TEM DISPOSITIVO VERIFICADO
  SELECT * INTO v_device
  FROM pwa_user_devices
  WHERE (
    phone_last_digits(phone, 11) = v_phone_digits
    OR phone_last_digits(phone, 10) = v_phone_digits_10
    OR phone = v_normalized_phone
  )
    AND is_verified = true
    AND (expires_at IS NULL OR expires_at > v_now)
  ORDER BY verified_at DESC NULLS LAST
  LIMIT 1;

  IF v_device IS NOT NULL THEN
    RAISE NOTICE '[login_pwa_by_phone_simple v5.0] Já verificado!';
    RETURN jsonb_build_object(
      'success', true,
      'already_verified', true,
      'user_name', v_device.user_name,
      'phone', v_device.phone,
      'normalized_phone', v_device.phone,
      'pwa_access', v_pwa_access
    );
  END IF;

  -- 4. GERAR CÓDIGO DE VERIFICAÇÃO (6 dígitos)
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

  RAISE NOTICE '[login_pwa_by_phone_simple v5.0] Código gerado: %', v_code;

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
  RAISE NOTICE '[login_pwa_by_phone_simple v5.0] ERRO: %', SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'error', 'internal_error',
    'message', 'Erro interno. Tente novamente.',
    'details', SQLERRM
  );
END;
$$;

-- ============================================
-- PARTE 6: Garantir permissões
-- ============================================
GRANT EXECUTE ON FUNCTION public.phone_last_digits(TEXT, INT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.normalize_phone(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_pwa_access(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_pwa_code_simple(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.login_pwa_by_phone_simple(TEXT) TO anon, authenticated, service_role;

-- ============================================
-- PARTE 7: Log de conclusão
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'FIX DEFINITIVO: PWA Auth Flow v2.0';
  RAISE NOTICE 'Deploy: 2026-01-23';
  RAISE NOTICE '';
  RAISE NOTICE 'Funções atualizadas:';
  RAISE NOTICE '  - check_pwa_access v7.0: matching ultra-flexível';
  RAISE NOTICE '  - verify_pwa_code_simple v5.0: cria user_registrations';
  RAISE NOTICE '  - login_pwa_by_phone_simple v5.0: completo';
  RAISE NOTICE '';
  RAISE NOTICE 'Após este deploy:';
  RAISE NOTICE '1. Usuário verifica código → entra direto no app';
  RAISE NOTICE '2. Usuário aparece em "Usuários Ativos"';
  RAISE NOTICE '3. Convite atualiza para "completed"';
  RAISE NOTICE '=========================================';
END $$;
