-- ============================================================
-- Migracao: Criar tabelas assistants, companies e managers
-- Data: 2026-02-04
-- ============================================================

-- ============================================================
-- TABELA: assistants
-- Armazena assistentes/agentes de IA personalizados
-- ============================================================
CREATE TABLE IF NOT EXISTS assistants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  system_prompt TEXT,
  model VARCHAR(50) NOT NULL DEFAULT 'gpt-4o',
  voice_id VARCHAR(100) DEFAULT '21m00Tcm4TlvDq8ikWAM',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_assistants_is_active ON assistants(is_active);
CREATE INDEX IF NOT EXISTS idx_assistants_slug ON assistants(slug);
CREATE INDEX IF NOT EXISTS idx_assistants_is_default ON assistants(is_default);
CREATE INDEX IF NOT EXISTS idx_assistants_created_at ON assistants(created_at DESC);

-- RLS
ALTER TABLE assistants ENABLE ROW LEVEL SECURITY;

-- Policy: Admins podem ver e gerenciar
CREATE POLICY "Admins can manage assistants" ON assistants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'superadmin')
    )
  );

-- ============================================================
-- TABELA: companies
-- Armazena empresas/clientes
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  cnpj VARCHAR(14) UNIQUE,
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_companies_is_active ON companies(is_active);
CREATE INDEX IF NOT EXISTS idx_companies_created_at ON companies(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_companies_cnpj ON companies(cnpj) WHERE cnpj IS NOT NULL;

-- RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Policy: Admins podem ver e gerenciar
CREATE POLICY "Admins can manage companies" ON companies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'superadmin')
    )
  );

-- ============================================================
-- TABELA: managers
-- Armazena gestores de empresas
-- ============================================================
CREATE TABLE IF NOT EXISTS managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_managers_is_active ON managers(is_active);
CREATE INDEX IF NOT EXISTS idx_managers_company_id ON managers(company_id);
CREATE INDEX IF NOT EXISTS idx_managers_user_id ON managers(user_id);
CREATE INDEX IF NOT EXISTS idx_managers_email ON managers(email);
CREATE INDEX IF NOT EXISTS idx_managers_created_at ON managers(created_at DESC);

-- RLS
ALTER TABLE managers ENABLE ROW LEVEL SECURITY;

-- Policy: Admins podem ver e gerenciar
CREATE POLICY "Admins can manage managers" ON managers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'superadmin')
    )
  );

-- Policy: Gestores podem ver seus proprios dados
CREATE POLICY "Managers can view own data" ON managers
  FOR SELECT USING (
    user_id = auth.uid()
  );

-- ============================================================
-- Comentarios nas tabelas
-- ============================================================
COMMENT ON TABLE assistants IS 'Assistentes de IA personalizados';
COMMENT ON TABLE companies IS 'Empresas/clientes da plataforma';
COMMENT ON TABLE managers IS 'Gestores de empresas';

COMMENT ON COLUMN assistants.system_prompt IS 'Instrucoes de comportamento para o assistente';
COMMENT ON COLUMN assistants.model IS 'Modelo de IA (gpt-4o, gpt-4o-mini, etc)';
COMMENT ON COLUMN assistants.voice_id IS 'ID da voz ElevenLabs';

COMMENT ON COLUMN companies.cnpj IS 'CNPJ sem formatacao (14 digitos)';

COMMENT ON COLUMN managers.user_id IS 'Referencia ao usuario autenticado (quando existir)';
COMMENT ON COLUMN managers.company_id IS 'Empresa vinculada ao gestor';
