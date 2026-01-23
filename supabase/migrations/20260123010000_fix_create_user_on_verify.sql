-- ============================================
-- FIX: Criar usuário em user_registrations após verificação
-- Deploy: 2026-01-23
--
-- PROBLEMA:
-- - verify_pwa_code_simple atualiza user_invitations.status = 'completed'
-- - Mas NÃO cria registro em user_registrations
-- - Por isso usuário não aparece em "Usuários Ativos"
--
-- SOLUÇÃO:
-- - Após verificação bem-sucedida, criar registro em user_registrations
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
  v_first_name TEXT;
  v_last_name TEXT;
  v_name_parts TEXT[];
BEGIN
  -- Extrair e normalizar telefone
  v_phone_digits := phone_last_digits(p_phone, 11);
  v_normalized_phone := normalize_phone(p_phone);

  RAISE NOTICE '[verify_pwa_code_simple v4.0] Phone: %, Digits: %, Code: %',
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

  RAISE NOTICE '[verify_pwa_code_simple v4.0] Dispositivo encontrado: %', v_device.id;

  -- Buscar convite em user_invitations
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

  -- Marcar dispositivo como verificado
  UPDATE public.pwa_user_devices
  SET is_verified = true,
      verified_at = v_now,
      verification_code = NULL,
      verification_code_expires_at = NULL,
      verification_attempts = 0,
      expires_at = v_now + INTERVAL '30 days',
      updated_at = v_now
  WHERE id = v_device.id;

  RAISE NOTICE '[verify_pwa_code_simple v4.0] Dispositivo marcado como verificado';

  -- Atualizar user_invitations.status para 'completed'
  IF v_invitation IS NOT NULL THEN
    RAISE NOTICE '[verify_pwa_code_simple v4.0] Atualizando convite % para completed', v_invitation.id;

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

      RAISE NOTICE '[verify_pwa_code_simple v4.0] Criando usuário em user_registrations: %', v_invitation.email;

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
        regexp_replace(v_device.phone, '[^0-9]', '', 'g'), -- Phone sem +
        v_first_name,
        v_last_name,
        'approved',
        'user',
        false, -- Sem acesso à plataforma web
        true,  -- Com acesso ao app
        COALESCE(v_invitation.pwa_access, ARRAY['area1']::TEXT[]),
        v_now,
        'pwa_invite',
        v_now,
        v_now,
        v_now
      );

      RAISE NOTICE '[verify_pwa_code_simple v4.0] Usuário criado em user_registrations!';
    ELSE
      -- Usuário já existe, apenas atualizar campos de PWA
      RAISE NOTICE '[verify_pwa_code_simple v4.0] Usuário já existe, atualizando campos PWA';

      UPDATE public.user_registrations
      SET has_app_access = true,
          pwa_access = COALESCE(v_invitation.pwa_access, pwa_access, ARRAY['area1']::TEXT[]),
          pwa_registered_at = COALESCE(pwa_registered_at, v_now),
          updated_at = v_now
      WHERE id = v_existing_user.id;
    END IF;
  ELSE
    RAISE NOTICE '[verify_pwa_code_simple v4.0] AVISO: Convite não encontrado para phone %', v_phone_digits;
  END IF;

  RAISE NOTICE '[verify_pwa_code_simple v4.0] SUCESSO!';

  RETURN jsonb_build_object(
    'success', true,
    'verified', true,
    'user_name', v_device.user_name,
    'phone', v_device.phone,
    'pwa_access', COALESCE(v_invitation.pwa_access, ARRAY['area1']::TEXT[]),
    'expires_at', v_now + INTERVAL '30 days'
  );

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '[verify_pwa_code_simple v4.0] ERRO: %', SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'error', 'internal_error',
    'message', 'Erro interno. Tente novamente.',
    'details', SQLERRM
  );
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.verify_pwa_code_simple(TEXT, TEXT) TO anon, authenticated, service_role;

-- ============================================
-- Log de conclusão
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'FIX: Criar usuário em user_registrations';
  RAISE NOTICE 'Deploy: 2026-01-23';
  RAISE NOTICE '';
  RAISE NOTICE 'Agora, após verificação do código SMS:';
  RAISE NOTICE '1. pwa_user_devices.is_verified = true';
  RAISE NOTICE '2. user_invitations.status = completed';
  RAISE NOTICE '3. pwa_invites.status = accepted';
  RAISE NOTICE '4. user_registrations CRIADO (Usuários Ativos)';
  RAISE NOTICE '=========================================';
END $$;
