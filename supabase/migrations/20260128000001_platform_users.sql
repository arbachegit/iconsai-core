-- ============================================================
-- Migration: Platform Users
-- Description: Usuários da plataforma com papéis hierárquicos
-- Date: 2026-01-28
-- Depends on: 20260128000000_institutions.sql
-- ============================================================

-- ============================================
-- 1. TABELA DE USUÁRIOS DA PLATAFORMA
-- Gerenciamento centralizado de todos os usuários
-- ============================================
CREATE TABLE IF NOT EXISTS public.platform_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Vínculo com auth.users (pode ser NULL antes de completar cadastro)
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Dados pessoais
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

  -- Vínculo institucional
  institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  job_title TEXT,

  -- Papel na plataforma
  -- user: Usuário comum, acesso ao PWA
  -- admin: Administrador da instituição
  -- superadmin: Super-administrador, acesso a tudo
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'superadmin')),

  -- Status do usuário
  -- pending: Aguardando completar cadastro
  -- active: Ativo e pode acessar
  -- suspended: Suspenso temporariamente
  -- inactive: Desativado
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'inactive')),

  -- Verificação
  email_verified BOOLEAN DEFAULT false,
  email_verified_at TIMESTAMPTZ,
  phone_verified BOOLEAN DEFAULT false,
  phone_verified_at TIMESTAMPTZ,

  -- Código de verificação temporário
  verification_code TEXT,
  verification_code_type TEXT CHECK (verification_code_type IN ('email', 'phone', 'both')),
  verification_expires_at TIMESTAMPTZ,
  verification_attempts INTEGER DEFAULT 0,

  -- Controle de senha
  password_set BOOLEAN DEFAULT false,
  password_set_at TIMESTAMPTZ,
  password_reset_token TEXT,
  password_reset_expires_at TIMESTAMPTZ,

  -- Login tracking
  last_login_at TIMESTAMPTZ,
  last_login_ip TEXT,
  last_login_user_agent TEXT,
  login_count INTEGER DEFAULT 0,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,

  -- Perfil
  avatar_url TEXT,
  bio TEXT,
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  locale TEXT DEFAULT 'pt-BR',

  -- Preferências
  preferences JSONB DEFAULT '{
    "notifications": {
      "email": true,
      "whatsapp": true,
      "sms": false
    },
    "pwa": {
      "preferredVoice": "nova",
      "voiceSpeed": 1.0,
      "autoPlayResponses": true
    },
    "theme": "dark"
  }',

  -- Permissões específicas (sobrescreve padrão do role)
  custom_permissions JSONB DEFAULT '{}',

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  invited_by UUID REFERENCES public.platform_users(id) ON DELETE SET NULL,
  activated_at TIMESTAMPTZ,
  suspended_at TIMESTAMPTZ,
  suspended_by UUID REFERENCES public.platform_users(id) ON DELETE SET NULL,
  suspension_reason TEXT
);

-- Índices para platform_users
CREATE INDEX IF NOT EXISTS idx_platform_users_auth_user ON public.platform_users(auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_platform_users_email ON public.platform_users(email);
CREATE INDEX IF NOT EXISTS idx_platform_users_phone ON public.platform_users(phone);
CREATE INDEX IF NOT EXISTS idx_platform_users_institution ON public.platform_users(institution_id) WHERE institution_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_platform_users_department ON public.platform_users(department_id) WHERE department_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_platform_users_role ON public.platform_users(role);
CREATE INDEX IF NOT EXISTS idx_platform_users_status ON public.platform_users(status);
CREATE INDEX IF NOT EXISTS idx_platform_users_active ON public.platform_users(institution_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_platform_users_created_at ON public.platform_users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_users_verification ON public.platform_users(verification_code) WHERE verification_code IS NOT NULL;

-- ============================================
-- 2. FUNÇÃO PARA BUSCAR USUÁRIO POR AUTH ID
-- ============================================
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

-- ============================================
-- 3. FUNÇÃO PARA VERIFICAR PAPEL DO USUÁRIO
-- ============================================
CREATE OR REPLACE FUNCTION check_user_role(
  p_auth_user_id UUID,
  p_required_roles TEXT[]
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role TEXT;
BEGIN
  SELECT role INTO v_user_role
  FROM public.platform_users
  WHERE auth_user_id = p_auth_user_id
    AND status = 'active';

  IF v_user_role IS NULL THEN
    RETURN false;
  END IF;

  RETURN v_user_role = ANY(p_required_roles);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- 4. FUNÇÃO PARA VERIFICAR SE É ADMIN DA INSTITUIÇÃO
-- ============================================
CREATE OR REPLACE FUNCTION is_institution_admin(
  p_auth_user_id UUID,
  p_institution_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_result BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.platform_users
    WHERE auth_user_id = p_auth_user_id
      AND status = 'active'
      AND (
        role = 'superadmin'
        OR (role = 'admin' AND institution_id = p_institution_id)
      )
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- 5. FUNÇÃO PARA GERAR CÓDIGO DE VERIFICAÇÃO
-- ============================================
CREATE OR REPLACE FUNCTION generate_verification_code()
RETURNS TEXT AS $$
BEGIN
  -- Gera código de 6 dígitos
  RETURN lpad(floor(random() * 1000000)::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql VOLATILE;

-- ============================================
-- 6. FUNÇÃO PARA DEFINIR CÓDIGO DE VERIFICAÇÃO
-- ============================================
CREATE OR REPLACE FUNCTION set_verification_code(
  p_user_id UUID,
  p_code_type TEXT DEFAULT 'both',
  p_expiry_minutes INTEGER DEFAULT 10
)
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
BEGIN
  v_code := generate_verification_code();

  UPDATE public.platform_users
  SET
    verification_code = v_code,
    verification_code_type = p_code_type,
    verification_expires_at = now() + (p_expiry_minutes || ' minutes')::INTERVAL,
    verification_attempts = 0
  WHERE id = p_user_id;

  RETURN v_code;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- ============================================
-- 7. FUNÇÃO PARA VALIDAR CÓDIGO DE VERIFICAÇÃO
-- ============================================
CREATE OR REPLACE FUNCTION validate_verification_code(
  p_user_id UUID,
  p_code TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_user RECORD;
  v_result JSONB;
BEGIN
  SELECT
    verification_code,
    verification_code_type,
    verification_expires_at,
    verification_attempts
  INTO v_user
  FROM public.platform_users
  WHERE id = p_user_id;

  -- Verificar se existe código
  IF v_user.verification_code IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'no_code');
  END IF;

  -- Verificar expiração
  IF v_user.verification_expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'expired');
  END IF;

  -- Verificar tentativas
  IF v_user.verification_attempts >= 5 THEN
    RETURN jsonb_build_object('valid', false, 'error', 'max_attempts');
  END IF;

  -- Verificar código
  IF v_user.verification_code != p_code THEN
    -- Incrementar tentativas
    UPDATE public.platform_users
    SET verification_attempts = verification_attempts + 1
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
      'valid', false,
      'error', 'invalid_code',
      'attempts_remaining', 5 - v_user.verification_attempts - 1
    );
  END IF;

  -- Código válido - atualizar verificações
  UPDATE public.platform_users
  SET
    email_verified = CASE WHEN v_user.verification_code_type IN ('email', 'both') THEN true ELSE email_verified END,
    email_verified_at = CASE WHEN v_user.verification_code_type IN ('email', 'both') THEN now() ELSE email_verified_at END,
    phone_verified = CASE WHEN v_user.verification_code_type IN ('phone', 'both') THEN true ELSE phone_verified END,
    phone_verified_at = CASE WHEN v_user.verification_code_type IN ('phone', 'both') THEN now() ELSE phone_verified_at END,
    verification_code = NULL,
    verification_code_type = NULL,
    verification_expires_at = NULL,
    verification_attempts = 0
  WHERE id = p_user_id;

  RETURN jsonb_build_object('valid', true, 'verified_type', v_user.verification_code_type);
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- ============================================
-- 8. FUNÇÃO PARA ATIVAR USUÁRIO
-- ============================================
CREATE OR REPLACE FUNCTION activate_platform_user(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.platform_users
  SET
    status = 'active',
    activated_at = now()
  WHERE id = p_user_id
    AND email_verified = true
    AND phone_verified = true
    AND password_set = true;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- ============================================
-- 9. FUNÇÃO PARA REGISTRAR LOGIN
-- ============================================
CREATE OR REPLACE FUNCTION record_user_login(
  p_auth_user_id UUID,
  p_ip TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.platform_users
  SET
    last_login_at = now(),
    last_login_ip = p_ip,
    last_login_user_agent = p_user_agent,
    login_count = login_count + 1,
    failed_login_attempts = 0
  WHERE auth_user_id = p_auth_user_id;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- ============================================
-- 10. RLS POLICIES
-- ============================================
ALTER TABLE public.platform_users ENABLE ROW LEVEL SECURITY;

-- Super-admins podem ver todos os usuários
CREATE POLICY "Superadmins can manage all users"
  ON public.platform_users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_users pu
      WHERE pu.auth_user_id = auth.uid()
        AND pu.role = 'superadmin'
        AND pu.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.platform_users pu
      WHERE pu.auth_user_id = auth.uid()
        AND pu.role = 'superadmin'
        AND pu.status = 'active'
    )
  );

-- Admins podem ver usuários de sua instituição
CREATE POLICY "Admins can view institution users"
  ON public.platform_users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_users pu
      WHERE pu.auth_user_id = auth.uid()
        AND pu.role = 'admin'
        AND pu.status = 'active'
        AND pu.institution_id = platform_users.institution_id
    )
  );

-- Admins podem criar/atualizar usuários de sua instituição (exceto superadmins)
CREATE POLICY "Admins can manage institution users"
  ON public.platform_users FOR INSERT
  TO authenticated
  WITH CHECK (
    platform_users.role != 'superadmin'
    AND EXISTS (
      SELECT 1 FROM public.platform_users pu
      WHERE pu.auth_user_id = auth.uid()
        AND pu.role = 'admin'
        AND pu.status = 'active'
        AND pu.institution_id = platform_users.institution_id
    )
  );

CREATE POLICY "Admins can update institution users"
  ON public.platform_users FOR UPDATE
  TO authenticated
  USING (
    platform_users.role != 'superadmin'
    AND EXISTS (
      SELECT 1 FROM public.platform_users pu
      WHERE pu.auth_user_id = auth.uid()
        AND pu.role = 'admin'
        AND pu.status = 'active'
        AND pu.institution_id = platform_users.institution_id
    )
  )
  WITH CHECK (
    platform_users.role != 'superadmin'
    AND EXISTS (
      SELECT 1 FROM public.platform_users pu
      WHERE pu.auth_user_id = auth.uid()
        AND pu.role = 'admin'
        AND pu.status = 'active'
        AND pu.institution_id = platform_users.institution_id
    )
  );

-- Usuários podem ver e atualizar seu próprio perfil
CREATE POLICY "Users can view own profile"
  ON public.platform_users FOR SELECT
  TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.platform_users FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (
    auth_user_id = auth.uid()
    -- Não pode alterar role, status, institution
    AND role = (SELECT role FROM public.platform_users WHERE auth_user_id = auth.uid())
    AND status = (SELECT status FROM public.platform_users WHERE auth_user_id = auth.uid())
    AND institution_id IS NOT DISTINCT FROM (SELECT institution_id FROM public.platform_users WHERE auth_user_id = auth.uid())
  );

-- Service role tem acesso total
CREATE POLICY "Service role has full access to platform_users"
  ON public.platform_users FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ============================================
-- 11. TRIGGERS
-- ============================================

-- Trigger para updated_at
CREATE TRIGGER update_platform_users_updated_at
  BEFORE UPDATE ON public.platform_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger para validar domínio de email na inserção
CREATE OR REPLACE FUNCTION validate_user_email_domain()
RETURNS TRIGGER AS $$
BEGIN
  -- Superadmins não precisam de validação de domínio
  IF NEW.role = 'superadmin' THEN
    RETURN NEW;
  END IF;

  -- Se tem instituição, validar domínio
  IF NEW.institution_id IS NOT NULL THEN
    IF NOT validate_email_domain(NEW.email, NEW.institution_id) THEN
      RAISE EXCEPTION 'Email domain not allowed for this institution';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_user_email_domain_trigger
  BEFORE INSERT OR UPDATE OF email, institution_id ON public.platform_users
  FOR EACH ROW EXECUTE FUNCTION validate_user_email_domain();

-- ============================================
-- COMENTÁRIOS
-- ============================================
COMMENT ON TABLE public.platform_users IS 'Usuários da plataforma IconsAI com papéis hierárquicos';
COMMENT ON COLUMN public.platform_users.role IS 'Papel: user (PWA), admin (instituição), superadmin (tudo)';
COMMENT ON COLUMN public.platform_users.status IS 'Status: pending, active, suspended, inactive';
COMMENT ON COLUMN public.platform_users.verification_code IS 'Código de 6 dígitos para verificação de email/telefone';
COMMENT ON FUNCTION set_verification_code IS 'Define código de verificação com expiração configurável';
COMMENT ON FUNCTION validate_verification_code IS 'Valida código e marca email/phone como verificados';
COMMENT ON FUNCTION is_institution_admin IS 'Verifica se usuário é admin da instituição especificada';

-- ============================================
-- LOG
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'Platform Users criado!';
  RAISE NOTICE '';
  RAISE NOTICE 'Tabela criada:';
  RAISE NOTICE '- platform_users';
  RAISE NOTICE '';
  RAISE NOTICE 'Funções criadas:';
  RAISE NOTICE '- get_platform_user_by_auth_id()';
  RAISE NOTICE '- check_user_role()';
  RAISE NOTICE '- is_institution_admin()';
  RAISE NOTICE '- generate_verification_code()';
  RAISE NOTICE '- set_verification_code()';
  RAISE NOTICE '- validate_verification_code()';
  RAISE NOTICE '- activate_platform_user()';
  RAISE NOTICE '- record_user_login()';
  RAISE NOTICE '=========================================';
END $$;
