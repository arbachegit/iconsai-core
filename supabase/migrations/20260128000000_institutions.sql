-- ============================================================
-- Migration: Institutions and Departments
-- Description: Sistema de instituições com domínios de email
-- Date: 2026-01-28
-- ============================================================

-- ============================================
-- 1. TABELA DE INSTITUIÇÕES
-- Empresas/organizações que usam a plataforma
-- ============================================
CREATE TABLE IF NOT EXISTS public.institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificação
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  cnpj TEXT UNIQUE,

  -- Domínios de email permitidos para cadastro
  -- Ex: ['empresa.com.br', 'empresa.com']
  email_domains TEXT[] NOT NULL DEFAULT '{}',

  -- Configurações
  max_users INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,

  -- Endereço
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  address_country TEXT DEFAULT 'Brasil',

  -- Contato
  phone TEXT,
  email TEXT,
  website TEXT,

  -- Branding
  logo_url TEXT,
  primary_color TEXT DEFAULT '#00D4FF',
  secondary_color TEXT DEFAULT '#0A0E1A',

  -- Configurações PWA
  pwa_config JSONB DEFAULT '{
    "allowVoiceRecording": true,
    "allowedModules": ["home", "world", "health", "ideas"],
    "sessionTimeoutMinutes": 10,
    "maxMessagesPerDay": 100
  }',

  -- Metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Índices para instituições
CREATE INDEX IF NOT EXISTS idx_institutions_slug ON public.institutions(slug);
CREATE INDEX IF NOT EXISTS idx_institutions_active ON public.institutions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_institutions_email_domains ON public.institutions USING GIN(email_domains);
CREATE INDEX IF NOT EXISTS idx_institutions_created_at ON public.institutions(created_at DESC);

-- ============================================
-- 2. TABELA DE DEPARTAMENTOS
-- Divisões dentro de uma instituição
-- ============================================
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Vínculo com instituição
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,

  -- Identificação
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,

  -- Hierarquia (departamento pai)
  parent_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Contato do departamento
  email TEXT,
  phone TEXT,

  -- Responsável
  manager_name TEXT,
  manager_email TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Slug único por instituição
  UNIQUE(institution_id, slug)
);

-- Índices para departamentos
CREATE INDEX IF NOT EXISTS idx_departments_institution ON public.departments(institution_id);
CREATE INDEX IF NOT EXISTS idx_departments_parent ON public.departments(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_departments_active ON public.departments(institution_id, is_active) WHERE is_active = true;

-- ============================================
-- 3. FUNÇÃO PARA GERAR SLUG
-- ============================================
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

-- ============================================
-- 4. FUNÇÃO PARA VALIDAR DOMÍNIO DE EMAIL
-- ============================================
CREATE OR REPLACE FUNCTION validate_email_domain(
  p_email TEXT,
  p_institution_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_email_domain TEXT;
  v_allowed_domains TEXT[];
BEGIN
  -- Extrair domínio do email
  v_email_domain := split_part(p_email, '@', 2);

  -- Buscar domínios permitidos da instituição
  SELECT email_domains INTO v_allowed_domains
  FROM public.institutions
  WHERE id = p_institution_id AND is_active = true;

  -- Se não encontrou instituição ou não tem domínios, retorna false
  IF v_allowed_domains IS NULL OR array_length(v_allowed_domains, 1) IS NULL THEN
    RETURN false;
  END IF;

  -- Verificar se o domínio está na lista
  RETURN v_email_domain = ANY(v_allowed_domains);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- 5. FUNÇÃO PARA CONTAR USUÁRIOS DA INSTITUIÇÃO
-- ============================================
CREATE OR REPLACE FUNCTION get_institution_user_count(p_institution_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.platform_users
  WHERE institution_id = p_institution_id
    AND status IN ('active', 'pending');

  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- 6. FUNÇÃO PARA VERIFICAR LIMITE DE USUÁRIOS
-- ============================================
CREATE OR REPLACE FUNCTION check_institution_user_limit(p_institution_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_max_users INTEGER;
  v_current_users INTEGER;
BEGIN
  SELECT max_users INTO v_max_users
  FROM public.institutions
  WHERE id = p_institution_id;

  v_current_users := get_institution_user_count(p_institution_id);

  RETURN v_current_users < COALESCE(v_max_users, 100);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- 7. RLS POLICIES
-- ============================================

-- Institutions
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

-- Super-admins podem ver todas as instituições
CREATE POLICY "Superadmins can manage all institutions"
  ON public.institutions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_users
      WHERE auth_user_id = auth.uid()
        AND role = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.platform_users
      WHERE auth_user_id = auth.uid()
        AND role = 'superadmin'
    )
  );

-- Admins podem ver sua própria instituição
CREATE POLICY "Admins can view own institution"
  ON public.institutions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_users
      WHERE auth_user_id = auth.uid()
        AND institution_id = institutions.id
        AND role IN ('admin', 'superadmin')
    )
  );

-- Service role tem acesso total
CREATE POLICY "Service role has full access to institutions"
  ON public.institutions FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Departments
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Super-admins podem gerenciar todos os departamentos
CREATE POLICY "Superadmins can manage all departments"
  ON public.departments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_users
      WHERE auth_user_id = auth.uid()
        AND role = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.platform_users
      WHERE auth_user_id = auth.uid()
        AND role = 'superadmin'
    )
  );

-- Admins podem gerenciar departamentos de sua instituição
CREATE POLICY "Admins can manage own institution departments"
  ON public.departments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_users
      WHERE auth_user_id = auth.uid()
        AND institution_id = departments.institution_id
        AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.platform_users
      WHERE auth_user_id = auth.uid()
        AND institution_id = departments.institution_id
        AND role = 'admin'
    )
  );

-- Usuários podem ver departamentos de sua instituição
CREATE POLICY "Users can view own institution departments"
  ON public.departments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_users
      WHERE auth_user_id = auth.uid()
        AND institution_id = departments.institution_id
    )
  );

-- Service role tem acesso total
CREATE POLICY "Service role has full access to departments"
  ON public.departments FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ============================================
-- 8. TRIGGERS
-- ============================================

-- Trigger para updated_at em institutions
CREATE TRIGGER update_institutions_updated_at
  BEFORE UPDATE ON public.institutions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger para updated_at em departments
CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- COMENTÁRIOS
-- ============================================
COMMENT ON TABLE public.institutions IS 'Instituições/empresas que usam a plataforma IconsAI';
COMMENT ON TABLE public.departments IS 'Departamentos dentro de cada instituição';
COMMENT ON COLUMN public.institutions.email_domains IS 'Lista de domínios de email permitidos para cadastro de usuários';
COMMENT ON COLUMN public.institutions.max_users IS 'Limite máximo de usuários ativos na instituição';
COMMENT ON COLUMN public.institutions.pwa_config IS 'Configurações específicas do PWA para a instituição';
COMMENT ON FUNCTION validate_email_domain IS 'Valida se um email pertence aos domínios permitidos da instituição';
COMMENT ON FUNCTION check_institution_user_limit IS 'Verifica se a instituição ainda pode cadastrar novos usuários';

-- ============================================
-- LOG
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'Institutions & Departments criado!';
  RAISE NOTICE '';
  RAISE NOTICE 'Tabelas criadas:';
  RAISE NOTICE '1. institutions - Empresas/organizações';
  RAISE NOTICE '2. departments - Divisões internas';
  RAISE NOTICE '';
  RAISE NOTICE 'Funções criadas:';
  RAISE NOTICE '- generate_slug()';
  RAISE NOTICE '- validate_email_domain()';
  RAISE NOTICE '- get_institution_user_count()';
  RAISE NOTICE '- check_institution_user_limit()';
  RAISE NOTICE '=========================================';
END $$;
