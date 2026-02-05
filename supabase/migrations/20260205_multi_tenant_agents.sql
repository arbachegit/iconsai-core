-- ============================================================
-- Migracao: Sistema Multi-Tenant de Agentes
-- Data: 2026-02-05
-- Descricao: Adiciona suporte para agentes por empresa com
--            knowledge slugs (RAG/Scraping), usuarios por empresa,
--            e tabelas de fatos para analytics
-- ============================================================

-- ============================================================
-- ALTERACAO: assistants
-- Adiciona knowledge_slugs para integracao com RAG/Scraping APIs
-- ============================================================
ALTER TABLE assistants
ADD COLUMN IF NOT EXISTS knowledge_slugs TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS temperature DECIMAL(3,2) DEFAULT 0.7,
ADD COLUMN IF NOT EXISTS max_tokens INTEGER DEFAULT 2048,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Indice para busca em knowledge_slugs
CREATE INDEX IF NOT EXISTS idx_assistants_knowledge_slugs ON assistants USING GIN(knowledge_slugs);

COMMENT ON COLUMN assistants.knowledge_slugs IS 'Slugs das fontes de conhecimento (RAG/Scraping APIs)';
COMMENT ON COLUMN assistants.temperature IS 'Temperatura do modelo (0.0 a 1.0)';
COMMENT ON COLUMN assistants.max_tokens IS 'Maximo de tokens na resposta';
COMMENT ON COLUMN assistants.metadata IS 'Metadados extras em JSON';

-- ============================================================
-- ALTERACAO: companies
-- Adiciona slug para URLs personalizadas (core.iconsai.ai/[slug])
-- ============================================================
ALTER TABLE companies
ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7) DEFAULT '#6366f1',
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- Indice para busca por slug
CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug) WHERE slug IS NOT NULL;

COMMENT ON COLUMN companies.slug IS 'Slug unico para URL da empresa (core.iconsai.ai/[slug])';
COMMENT ON COLUMN companies.logo_url IS 'URL do logo da empresa';
COMMENT ON COLUMN companies.primary_color IS 'Cor primaria da marca (hex)';
COMMENT ON COLUMN companies.settings IS 'Configuracoes personalizadas da empresa';

-- ============================================================
-- TABELA: company_assistants
-- Relacionamento N:N entre empresas e assistentes
-- ============================================================
CREATE TABLE IF NOT EXISTS company_assistants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  assistant_id UUID NOT NULL REFERENCES assistants(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  position INTEGER DEFAULT 0,
  custom_system_prompt TEXT,
  custom_settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, assistant_id)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_company_assistants_company ON company_assistants(company_id);
CREATE INDEX IF NOT EXISTS idx_company_assistants_assistant ON company_assistants(assistant_id);
CREATE INDEX IF NOT EXISTS idx_company_assistants_active ON company_assistants(company_id, is_active);

-- RLS
ALTER TABLE company_assistants ENABLE ROW LEVEL SECURITY;

-- Policy: Admins podem gerenciar
CREATE POLICY "Admins can manage company_assistants" ON company_assistants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'superadmin')
    )
  );

-- Policy: Gestores podem ver assistentes da sua empresa
CREATE POLICY "Managers can view company assistants" ON company_assistants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM managers
      WHERE managers.user_id = auth.uid()
      AND managers.company_id = company_assistants.company_id
      AND managers.is_active = true
    )
  );

COMMENT ON TABLE company_assistants IS 'Relacionamento entre empresas e assistentes disponiveis';
COMMENT ON COLUMN company_assistants.is_default IS 'Se e o assistente padrao da empresa';
COMMENT ON COLUMN company_assistants.position IS 'Ordem de exibicao na lista';
COMMENT ON COLUMN company_assistants.custom_system_prompt IS 'System prompt personalizado para esta empresa';
COMMENT ON COLUMN company_assistants.custom_settings IS 'Configuracoes especificas para esta empresa';

-- ============================================================
-- TABELA: company_users
-- Usuarios registrados por gestores para suas empresas
-- ============================================================
CREATE TABLE IF NOT EXISTS company_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(50) DEFAULT 'user',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  login_count INTEGER DEFAULT 0,
  avatar_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES managers(id) ON DELETE SET NULL,
  UNIQUE(company_id, email)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_company_users_company ON company_users(company_id);
CREATE INDEX IF NOT EXISTS idx_company_users_auth ON company_users(auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_company_users_email ON company_users(email);
CREATE INDEX IF NOT EXISTS idx_company_users_active ON company_users(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_company_users_created_by ON company_users(created_by);

-- RLS
ALTER TABLE company_users ENABLE ROW LEVEL SECURITY;

-- Policy: Admins podem gerenciar todos
CREATE POLICY "Admins can manage company_users" ON company_users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'superadmin')
    )
  );

-- Policy: Gestores podem gerenciar usuarios da sua empresa
CREATE POLICY "Managers can manage own company users" ON company_users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM managers
      WHERE managers.user_id = auth.uid()
      AND managers.company_id = company_users.company_id
      AND managers.is_active = true
    )
  );

-- Policy: Usuarios podem ver seus proprios dados
CREATE POLICY "Users can view own data" ON company_users
  FOR SELECT USING (
    auth_user_id = auth.uid()
  );

COMMENT ON TABLE company_users IS 'Usuarios registrados pelos gestores das empresas';
COMMENT ON COLUMN company_users.auth_user_id IS 'Referencia ao usuario autenticado (apos primeiro login)';
COMMENT ON COLUMN company_users.created_by IS 'Gestor que criou o usuario';
COMMENT ON COLUMN company_users.role IS 'Papel do usuario na empresa (user, viewer, etc)';

-- ============================================================
-- TABELA: conversation_facts
-- Tabela de fatos para analytics (dimensao: usuario/agente/data)
-- ============================================================
CREATE TABLE IF NOT EXISTS conversation_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Dimensoes
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES company_users(id) ON DELETE CASCADE,
  assistant_id UUID NOT NULL REFERENCES assistants(id) ON DELETE CASCADE,

  -- Tempo
  conversation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  conversation_hour SMALLINT,
  day_of_week SMALLINT,

  -- Metricas da conversa
  message_count INTEGER DEFAULT 0,
  user_messages INTEGER DEFAULT 0,
  assistant_messages INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  total_duration_seconds INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER DEFAULT 0,

  -- Analise de sentimento agregada
  positive_messages INTEGER DEFAULT 0,
  negative_messages INTEGER DEFAULT 0,
  neutral_messages INTEGER DEFAULT 0,

  -- Audio
  total_audio_duration_seconds INTEGER DEFAULT 0,
  voice_messages INTEGER DEFAULT 0,

  -- Metadados
  session_count INTEGER DEFAULT 1,
  first_message_at TIMESTAMP WITH TIME ZONE,
  last_message_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraint para evitar duplicatas por dia
  UNIQUE(company_id, user_id, assistant_id, conversation_date)
);

-- Indices para queries de analytics
CREATE INDEX IF NOT EXISTS idx_conversation_facts_company ON conversation_facts(company_id);
CREATE INDEX IF NOT EXISTS idx_conversation_facts_user ON conversation_facts(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_facts_assistant ON conversation_facts(assistant_id);
CREATE INDEX IF NOT EXISTS idx_conversation_facts_date ON conversation_facts(conversation_date DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_facts_company_date ON conversation_facts(company_id, conversation_date DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_facts_user_date ON conversation_facts(user_id, conversation_date DESC);

-- Indice para agregacoes por periodo
CREATE INDEX IF NOT EXISTS idx_conversation_facts_period ON conversation_facts(company_id, conversation_date, assistant_id);

-- RLS
ALTER TABLE conversation_facts ENABLE ROW LEVEL SECURITY;

-- Policy: Admins podem ver todos
CREATE POLICY "Admins can view all facts" ON conversation_facts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'superadmin')
    )
  );

-- Policy: Gestores podem ver fatos da sua empresa
CREATE POLICY "Managers can view company facts" ON conversation_facts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM managers
      WHERE managers.user_id = auth.uid()
      AND managers.company_id = conversation_facts.company_id
      AND managers.is_active = true
    )
  );

COMMENT ON TABLE conversation_facts IS 'Tabela de fatos para analytics de conversas (agregacao diaria)';
COMMENT ON COLUMN conversation_facts.conversation_date IS 'Data da conversa (agregacao por dia)';
COMMENT ON COLUMN conversation_facts.day_of_week IS 'Dia da semana (0=domingo, 6=sabado)';
COMMENT ON COLUMN conversation_facts.message_count IS 'Total de mensagens no dia';

-- ============================================================
-- FUNCAO: Atualizar updated_at automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_company_assistants_updated_at ON company_assistants;
CREATE TRIGGER update_company_assistants_updated_at
  BEFORE UPDATE ON company_assistants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_company_users_updated_at ON company_users;
CREATE TRIGGER update_company_users_updated_at
  BEFORE UPDATE ON company_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversation_facts_updated_at ON conversation_facts;
CREATE TRIGGER update_conversation_facts_updated_at
  BEFORE UPDATE ON conversation_facts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- FUNCAO: Agregar conversa em fatos
-- Chamada apos inserir em pwa_conversations
-- ============================================================
CREATE OR REPLACE FUNCTION aggregate_conversation_to_facts()
RETURNS TRIGGER AS $$
DECLARE
  v_company_user_id UUID;
  v_company_id UUID;
BEGIN
  -- Buscar company_user_id baseado no user da conversa
  SELECT cu.id, cu.company_id INTO v_company_user_id, v_company_id
  FROM company_users cu
  WHERE cu.auth_user_id = NEW.user_id
  LIMIT 1;

  -- Se nao encontrar company_user, ignora
  IF v_company_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Upsert na tabela de fatos
  INSERT INTO conversation_facts (
    company_id,
    user_id,
    assistant_id,
    conversation_date,
    conversation_hour,
    day_of_week,
    message_count,
    user_messages,
    assistant_messages,
    total_tokens,
    avg_response_time_ms,
    positive_messages,
    negative_messages,
    neutral_messages,
    voice_messages,
    first_message_at,
    last_message_at
  )
  VALUES (
    v_company_id,
    v_company_user_id,
    NEW.agent_id,
    CURRENT_DATE,
    EXTRACT(HOUR FROM NEW.created_at)::SMALLINT,
    EXTRACT(DOW FROM NEW.created_at)::SMALLINT,
    2, -- user + assistant
    1,
    1,
    COALESCE(NEW.tokens_used, 0),
    COALESCE(NEW.response_time_ms, 0),
    CASE WHEN NEW.sentiment = 'positive' THEN 1 ELSE 0 END,
    CASE WHEN NEW.sentiment = 'negative' THEN 1 ELSE 0 END,
    CASE WHEN NEW.sentiment = 'neutral' OR NEW.sentiment IS NULL THEN 1 ELSE 0 END,
    CASE WHEN NEW.user_audio_url IS NOT NULL THEN 1 ELSE 0 END,
    NEW.created_at,
    NEW.created_at
  )
  ON CONFLICT (company_id, user_id, assistant_id, conversation_date)
  DO UPDATE SET
    message_count = conversation_facts.message_count + 2,
    user_messages = conversation_facts.user_messages + 1,
    assistant_messages = conversation_facts.assistant_messages + 1,
    total_tokens = conversation_facts.total_tokens + COALESCE(NEW.tokens_used, 0),
    avg_response_time_ms = (
      (conversation_facts.avg_response_time_ms * conversation_facts.message_count + COALESCE(NEW.response_time_ms, 0))
      / (conversation_facts.message_count + 2)
    ),
    positive_messages = conversation_facts.positive_messages + CASE WHEN NEW.sentiment = 'positive' THEN 1 ELSE 0 END,
    negative_messages = conversation_facts.negative_messages + CASE WHEN NEW.sentiment = 'negative' THEN 1 ELSE 0 END,
    neutral_messages = conversation_facts.neutral_messages + CASE WHEN NEW.sentiment = 'neutral' OR NEW.sentiment IS NULL THEN 1 ELSE 0 END,
    voice_messages = conversation_facts.voice_messages + CASE WHEN NEW.user_audio_url IS NOT NULL THEN 1 ELSE 0 END,
    last_message_at = NEW.created_at,
    session_count = conversation_facts.session_count +
      CASE WHEN NEW.created_at - conversation_facts.last_message_at > INTERVAL '30 minutes' THEN 1 ELSE 0 END,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para agregar conversas automaticamente
DROP TRIGGER IF EXISTS trigger_aggregate_conversation ON pwa_conversations;
CREATE TRIGGER trigger_aggregate_conversation
  AFTER INSERT ON pwa_conversations
  FOR EACH ROW EXECUTE FUNCTION aggregate_conversation_to_facts();

-- ============================================================
-- VIEW: Resumo de uso por empresa
-- ============================================================
CREATE OR REPLACE VIEW company_usage_summary AS
SELECT
  c.id AS company_id,
  c.name AS company_name,
  c.slug AS company_slug,
  COUNT(DISTINCT cu.id) AS total_users,
  COUNT(DISTINCT ca.assistant_id) AS total_assistants,
  COALESCE(SUM(cf.message_count), 0) AS total_messages,
  COALESCE(SUM(cf.session_count), 0) AS total_sessions,
  MAX(cf.last_message_at) AS last_activity_at
FROM companies c
LEFT JOIN company_users cu ON cu.company_id = c.id AND cu.is_active = true
LEFT JOIN company_assistants ca ON ca.company_id = c.id AND ca.is_active = true
LEFT JOIN conversation_facts cf ON cf.company_id = c.id
WHERE c.is_active = true
GROUP BY c.id, c.name, c.slug;

COMMENT ON VIEW company_usage_summary IS 'Resumo de uso agregado por empresa';

-- ============================================================
-- VIEW: Resumo de uso por assistente
-- ============================================================
CREATE OR REPLACE VIEW assistant_usage_summary AS
SELECT
  a.id AS assistant_id,
  a.name AS assistant_name,
  a.slug AS assistant_slug,
  COUNT(DISTINCT cf.company_id) AS companies_using,
  COUNT(DISTINCT cf.user_id) AS unique_users,
  COALESCE(SUM(cf.message_count), 0) AS total_messages,
  COALESCE(AVG(cf.avg_response_time_ms), 0)::INTEGER AS avg_response_time_ms,
  COALESCE(SUM(cf.positive_messages), 0) AS positive_messages,
  COALESCE(SUM(cf.negative_messages), 0) AS negative_messages,
  MAX(cf.last_message_at) AS last_activity_at
FROM assistants a
LEFT JOIN conversation_facts cf ON cf.assistant_id = a.id
WHERE a.is_active = true
GROUP BY a.id, a.name, a.slug;

COMMENT ON VIEW assistant_usage_summary IS 'Resumo de uso agregado por assistente';
