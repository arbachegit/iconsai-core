-- ============================================
-- verify_pwa_code_simple v2.0 - Atualiza status em user_invitations
-- Deploy: 2026-01-21
-- FIX: Após verificação bem-sucedida, marca user_invitations.status = 'completed'
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
  -- Extrair apenas dígitos do telefone
  v_phone_digits := regexp_replace(p_phone, '[^0-9]', '', 'g');
  v_phone_digits := right(v_phone_digits, 11);

  -- Normalizar telefone
  v_normalized_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');
  IF length(v_normalized_phone) = 10 OR length(v_normalized_phone) = 11 THEN
    v_normalized_phone := '55' || v_normalized_phone;
  END IF;
  IF NOT v_normalized_phone LIKE '+%' THEN
    v_normalized_phone := '+' || v_normalized_phone;
  END IF;

  -- Buscar dispositivo com busca flexível
  SELECT * INTO v_device
  FROM public.pwa_user_devices
  WHERE (
    phone = v_normalized_phone
    OR right(regexp_replace(phone, '[^0-9]', '', 'g'), 11) = v_phone_digits
  )
  AND verification_code = p_code
  AND verification_code_expires_at > v_now
  LIMIT 1;

  IF v_device IS NULL THEN
    -- Verificar se existe dispositivo mas código expirou
    SELECT * INTO v_device
    FROM public.pwa_user_devices
    WHERE (
      phone = v_normalized_phone
      OR right(regexp_replace(phone, '[^0-9]', '', 'g'), 11) = v_phone_digits
    )
    LIMIT 1;

    IF v_device IS NOT NULL THEN
      -- Incrementar tentativas
      UPDATE public.pwa_user_devices
      SET verification_attempts = COALESCE(verification_attempts, 0) + 1,
          updated_at = v_now
      WHERE id = v_device.id;

      IF v_device.verification_code_expires_at < v_now THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'code_expired',
          'message', 'Código expirado. Solicite um novo código.'
        );
      END IF;
    END IF;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_code',
      'message', 'Código inválido. Verifique e tente novamente.'
    );
  END IF;

  -- Buscar convite para pegar pwa_access
  SELECT * INTO v_invitation
  FROM public.user_invitations
  WHERE (
    right(regexp_replace(phone, '[^0-9]', '', 'g'), 11) = v_phone_digits
    OR right(regexp_replace(phone, '[^0-9]', '', 'g'), 10) = right(v_phone_digits, 10)
  )
  AND has_app_access = true
  ORDER BY created_at DESC
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

  -- =========================================
  -- FIX: Atualizar user_invitations.status para 'completed'
  -- Isso move o usuário de "convidados" para "ativos"
  -- =========================================
  IF v_invitation IS NOT NULL THEN
    UPDATE public.user_invitations
    SET status = 'completed',
        updated_at = v_now
    WHERE id = v_invitation.id;

    -- Também criar/atualizar registro em pwa_invites para compatibilidade
    INSERT INTO public.pwa_invites (phone, name, email, status, created_at, updated_at)
    VALUES (v_normalized_phone, v_invitation.name, v_invitation.email, 'accepted', v_now, v_now)
    ON CONFLICT (phone) DO UPDATE SET
      status = 'accepted',
      name = EXCLUDED.name,
      updated_at = v_now;
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
