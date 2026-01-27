-- ============================================================
-- Migration: User Invites
-- Description: Sistema de convites com tracking multicanal
-- Date: 2026-01-28
-- Depends on: 20260128000001_platform_users.sql
-- ============================================================

-- ============================================
-- 1. TABELA DE CONVITES
-- Gerenciamento de convites para novos usuários
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Dados do convidado
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  phone_country_code TEXT DEFAULT '+55',
  first_name TEXT NOT NULL,
  last_name TEXT,

  -- Vínculo institucional
  institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,

  -- Papel a ser atribuído
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),

  -- Token de acesso único (usado no link de convite)
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),

  -- Status do convite
  -- pending: Criado, aguardando envio
  -- sent: Enviado por pelo menos um canal
  -- opened: Link foi acessado
  -- verified: Código verificado
  -- completed: Cadastro finalizado
  -- expired: Expirou
  -- cancelled: Cancelado manualmente
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'sent', 'opened', 'verified', 'completed', 'expired', 'cancelled'
  )),

  -- Tracking de envio por canal
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

  -- Tracking de interação
  link_opened_at TIMESTAMPTZ,
  link_opened_count INTEGER DEFAULT 0,
  link_opened_ip TEXT,
  link_opened_user_agent TEXT,

  -- Código de verificação para o convite
  verification_code TEXT,
  verification_code_sent_at TIMESTAMPTZ,
  verification_expires_at TIMESTAMPTZ,
  verification_attempts INTEGER DEFAULT 0,
  verified_at TIMESTAMPTZ,
  verified_via TEXT CHECK (verified_via IN ('email', 'whatsapp', 'sms')),

  -- Conclusão
  completed_at TIMESTAMPTZ,
  platform_user_id UUID REFERENCES public.platform_users(id) ON DELETE SET NULL,

  -- Validade do convite
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days'),

  -- Reenvios
  resend_count INTEGER DEFAULT 0,
  last_resent_at TIMESTAMPTZ,

  -- Cancelamento
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES public.platform_users(id) ON DELETE SET NULL,
  cancellation_reason TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.platform_users(id) ON DELETE SET NULL
);

-- Índices para user_invites
CREATE INDEX IF NOT EXISTS idx_user_invites_token ON public.user_invites(token);
CREATE INDEX IF NOT EXISTS idx_user_invites_email ON public.user_invites(email);
CREATE INDEX IF NOT EXISTS idx_user_invites_phone ON public.user_invites(phone);
CREATE INDEX IF NOT EXISTS idx_user_invites_institution ON public.user_invites(institution_id);
CREATE INDEX IF NOT EXISTS idx_user_invites_status ON public.user_invites(status);
CREATE INDEX IF NOT EXISTS idx_user_invites_pending ON public.user_invites(status, expires_at) WHERE status IN ('pending', 'sent', 'opened');
CREATE INDEX IF NOT EXISTS idx_user_invites_created_at ON public.user_invites(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_invites_created_by ON public.user_invites(created_by);

-- ============================================
-- 2. FUNÇÃO PARA CRIAR CONVITE
-- ============================================
CREATE OR REPLACE FUNCTION create_user_invite(
  p_email TEXT,
  p_phone TEXT,
  p_first_name TEXT,
  p_last_name TEXT DEFAULT NULL,
  p_institution_id UUID DEFAULT NULL,
  p_department_id UUID DEFAULT NULL,
  p_role TEXT DEFAULT 'user',
  p_created_by UUID DEFAULT NULL,
  p_expires_days INTEGER DEFAULT 7
)
RETURNS public.user_invites AS $$
DECLARE
  v_invite public.user_invites;
  v_existing_user UUID;
  v_existing_invite UUID;
BEGIN
  -- Verificar se já existe usuário com este email
  SELECT id INTO v_existing_user
  FROM public.platform_users
  WHERE email = p_email AND status != 'inactive';

  IF v_existing_user IS NOT NULL THEN
    RAISE EXCEPTION 'User with this email already exists';
  END IF;

  -- Verificar se já existe convite pendente
  SELECT id INTO v_existing_invite
  FROM public.user_invites
  WHERE email = p_email
    AND status IN ('pending', 'sent', 'opened', 'verified')
    AND expires_at > now();

  IF v_existing_invite IS NOT NULL THEN
    RAISE EXCEPTION 'Active invite already exists for this email';
  END IF;

  -- Verificar limite de usuários da instituição
  IF p_institution_id IS NOT NULL THEN
    IF NOT check_institution_user_limit(p_institution_id) THEN
      RAISE EXCEPTION 'Institution user limit reached';
    END IF;

    -- Validar domínio de email (exceto para admins sendo criados por superadmins)
    IF p_role = 'user' THEN
      IF NOT validate_email_domain(p_email, p_institution_id) THEN
        RAISE EXCEPTION 'Email domain not allowed for this institution';
      END IF;
    END IF;
  END IF;

  -- Criar o convite
  INSERT INTO public.user_invites (
    email,
    phone,
    first_name,
    last_name,
    institution_id,
    department_id,
    role,
    created_by,
    expires_at
  )
  VALUES (
    lower(trim(p_email)),
    p_phone,
    trim(p_first_name),
    NULLIF(trim(p_last_name), ''),
    p_institution_id,
    p_department_id,
    p_role,
    p_created_by,
    now() + (p_expires_days || ' days')::INTERVAL
  )
  RETURNING * INTO v_invite;

  RETURN v_invite;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- ============================================
-- 3. FUNÇÃO PARA BUSCAR CONVITE POR TOKEN
-- ============================================
CREATE OR REPLACE FUNCTION get_invite_by_token(p_token TEXT)
RETURNS public.user_invites AS $$
DECLARE
  v_invite public.user_invites;
BEGIN
  SELECT * INTO v_invite
  FROM public.user_invites
  WHERE token = p_token;

  RETURN v_invite;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- 4. FUNÇÃO PARA MARCAR CONVITE COMO ENVIADO
-- ============================================
CREATE OR REPLACE FUNCTION mark_invite_sent(
  p_invite_id UUID,
  p_channel TEXT,
  p_success BOOLEAN,
  p_message_sid TEXT DEFAULT NULL,
  p_error TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  IF p_channel = 'email' THEN
    UPDATE public.user_invites
    SET
      email_sent_at = now(),
      email_sent_success = p_success,
      email_error = p_error,
      status = CASE WHEN status = 'pending' THEN 'sent' ELSE status END
    WHERE id = p_invite_id;

  ELSIF p_channel = 'whatsapp' THEN
    UPDATE public.user_invites
    SET
      whatsapp_sent_at = now(),
      whatsapp_sent_success = p_success,
      whatsapp_message_sid = p_message_sid,
      whatsapp_error = p_error,
      status = CASE WHEN status = 'pending' THEN 'sent' ELSE status END
    WHERE id = p_invite_id;

  ELSIF p_channel = 'sms' THEN
    UPDATE public.user_invites
    SET
      sms_sent_at = now(),
      sms_sent_success = p_success,
      sms_message_sid = p_message_sid,
      sms_error = p_error,
      status = CASE WHEN status = 'pending' THEN 'sent' ELSE status END
    WHERE id = p_invite_id;
  END IF;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- ============================================
-- 5. FUNÇÃO PARA MARCAR LINK ABERTO
-- ============================================
CREATE OR REPLACE FUNCTION mark_invite_opened(
  p_invite_id UUID,
  p_ip TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS public.user_invites AS $$
DECLARE
  v_invite public.user_invites;
BEGIN
  UPDATE public.user_invites
  SET
    link_opened_at = COALESCE(link_opened_at, now()),
    link_opened_count = link_opened_count + 1,
    link_opened_ip = p_ip,
    link_opened_user_agent = p_user_agent,
    status = CASE
      WHEN status IN ('pending', 'sent') THEN 'opened'
      ELSE status
    END
  WHERE id = p_invite_id
    AND status NOT IN ('completed', 'expired', 'cancelled')
  RETURNING * INTO v_invite;

  RETURN v_invite;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- ============================================
-- 6. FUNÇÃO PARA DEFINIR CÓDIGO DO CONVITE
-- ============================================
CREATE OR REPLACE FUNCTION set_invite_verification_code(
  p_invite_id UUID,
  p_expiry_minutes INTEGER DEFAULT 10
)
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

-- ============================================
-- 7. FUNÇÃO PARA VALIDAR CÓDIGO DO CONVITE
-- ============================================
CREATE OR REPLACE FUNCTION validate_invite_code(
  p_invite_id UUID,
  p_code TEXT,
  p_verified_via TEXT DEFAULT 'whatsapp'
)
RETURNS JSONB AS $$
DECLARE
  v_invite RECORD;
BEGIN
  SELECT
    verification_code,
    verification_expires_at,
    verification_attempts,
    status,
    expires_at
  INTO v_invite
  FROM public.user_invites
  WHERE id = p_invite_id;

  -- Verificar se convite existe
  IF v_invite IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'invite_not_found');
  END IF;

  -- Verificar status do convite
  IF v_invite.status IN ('completed', 'expired', 'cancelled') THEN
    RETURN jsonb_build_object('valid', false, 'error', 'invite_' || v_invite.status);
  END IF;

  -- Verificar se convite expirou
  IF v_invite.expires_at < now() THEN
    UPDATE public.user_invites SET status = 'expired' WHERE id = p_invite_id;
    RETURN jsonb_build_object('valid', false, 'error', 'invite_expired');
  END IF;

  -- Verificar se código existe
  IF v_invite.verification_code IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'no_code');
  END IF;

  -- Verificar se código expirou
  IF v_invite.verification_expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'code_expired');
  END IF;

  -- Verificar tentativas
  IF v_invite.verification_attempts >= 5 THEN
    RETURN jsonb_build_object('valid', false, 'error', 'max_attempts');
  END IF;

  -- Verificar código
  IF v_invite.verification_code != p_code THEN
    UPDATE public.user_invites
    SET verification_attempts = verification_attempts + 1
    WHERE id = p_invite_id;

    RETURN jsonb_build_object(
      'valid', false,
      'error', 'invalid_code',
      'attempts_remaining', 5 - v_invite.verification_attempts - 1
    );
  END IF;

  -- Código válido
  UPDATE public.user_invites
  SET
    status = 'verified',
    verified_at = now(),
    verified_via = p_verified_via,
    verification_code = NULL
  WHERE id = p_invite_id;

  RETURN jsonb_build_object('valid', true, 'verified_via', p_verified_via);
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- ============================================
-- 8. FUNÇÃO PARA COMPLETAR CONVITE
-- ============================================
CREATE OR REPLACE FUNCTION complete_invite(
  p_invite_id UUID,
  p_platform_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.user_invites
  SET
    status = 'completed',
    completed_at = now(),
    platform_user_id = p_platform_user_id
  WHERE id = p_invite_id;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- ============================================
-- 9. FUNÇÃO PARA CANCELAR CONVITE
-- ============================================
CREATE OR REPLACE FUNCTION cancel_invite(
  p_invite_id UUID,
  p_cancelled_by UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.user_invites
  SET
    status = 'cancelled',
    cancelled_at = now(),
    cancelled_by = p_cancelled_by,
    cancellation_reason = p_reason
  WHERE id = p_invite_id
    AND status NOT IN ('completed', 'cancelled');
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- ============================================
-- 10. FUNÇÃO PARA REENVIAR CONVITE
-- ============================================
CREATE OR REPLACE FUNCTION resend_invite(p_invite_id UUID)
RETURNS public.user_invites AS $$
DECLARE
  v_invite public.user_invites;
BEGIN
  UPDATE public.user_invites
  SET
    status = 'pending',
    resend_count = resend_count + 1,
    last_resent_at = now(),
    expires_at = now() + INTERVAL '7 days',
    verification_code = NULL,
    verification_attempts = 0
  WHERE id = p_invite_id
    AND status NOT IN ('completed', 'cancelled')
  RETURNING * INTO v_invite;

  RETURN v_invite;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- ============================================
-- 11. FUNÇÃO PARA EXPIRAR CONVITES ANTIGOS
-- ============================================
CREATE OR REPLACE FUNCTION expire_old_invites()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.user_invites
  SET status = 'expired'
  WHERE status IN ('pending', 'sent', 'opened', 'verified')
    AND expires_at < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- ============================================
-- 12. RLS POLICIES
-- ============================================
ALTER TABLE public.user_invites ENABLE ROW LEVEL SECURITY;

-- Super-admins podem ver todos os convites
CREATE POLICY "Superadmins can manage all invites"
  ON public.user_invites FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_users
      WHERE auth_user_id = auth.uid()
        AND role = 'superadmin'
        AND status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.platform_users
      WHERE auth_user_id = auth.uid()
        AND role = 'superadmin'
        AND status = 'active'
    )
  );

-- Admins podem gerenciar convites de sua instituição
CREATE POLICY "Admins can manage institution invites"
  ON public.user_invites FOR ALL
  TO authenticated
  USING (
    user_invites.role != 'superadmin'
    AND EXISTS (
      SELECT 1 FROM public.platform_users
      WHERE auth_user_id = auth.uid()
        AND role = 'admin'
        AND status = 'active'
        AND institution_id = user_invites.institution_id
    )
  )
  WITH CHECK (
    user_invites.role = 'user'
    AND EXISTS (
      SELECT 1 FROM public.platform_users
      WHERE auth_user_id = auth.uid()
        AND role = 'admin'
        AND status = 'active'
        AND institution_id = user_invites.institution_id
    )
  );

-- Service role tem acesso total
CREATE POLICY "Service role has full access to invites"
  ON public.user_invites FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Acesso anônimo para validar token (via RPC)
CREATE POLICY "Anon can read invite by token"
  ON public.user_invites FOR SELECT
  TO anon
  USING (true);

-- ============================================
-- 13. TRIGGERS
-- ============================================

-- Trigger para updated_at
CREATE TRIGGER update_user_invites_updated_at
  BEFORE UPDATE ON public.user_invites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- COMENTÁRIOS
-- ============================================
COMMENT ON TABLE public.user_invites IS 'Sistema de convites para novos usuários com tracking multicanal';
COMMENT ON COLUMN public.user_invites.token IS 'Token único para link de convite';
COMMENT ON COLUMN public.user_invites.status IS 'Status: pending, sent, opened, verified, completed, expired, cancelled';
COMMENT ON FUNCTION create_user_invite IS 'Cria novo convite com validações de domínio e limite';
COMMENT ON FUNCTION mark_invite_sent IS 'Registra envio por canal (email, whatsapp, sms)';
COMMENT ON FUNCTION validate_invite_code IS 'Valida código de verificação do convite';
COMMENT ON FUNCTION complete_invite IS 'Marca convite como completado após cadastro';

-- ============================================
-- LOG
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'User Invites criado!';
  RAISE NOTICE '';
  RAISE NOTICE 'Tabela criada:';
  RAISE NOTICE '- user_invites';
  RAISE NOTICE '';
  RAISE NOTICE 'Funções criadas:';
  RAISE NOTICE '- create_user_invite()';
  RAISE NOTICE '- get_invite_by_token()';
  RAISE NOTICE '- mark_invite_sent()';
  RAISE NOTICE '- mark_invite_opened()';
  RAISE NOTICE '- set_invite_verification_code()';
  RAISE NOTICE '- validate_invite_code()';
  RAISE NOTICE '- complete_invite()';
  RAISE NOTICE '- cancel_invite()';
  RAISE NOTICE '- resend_invite()';
  RAISE NOTICE '- expire_old_invites()';
  RAISE NOTICE '=========================================';
END $$;
