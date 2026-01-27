-- ============================================================
-- Migration: PWA Conversations, Sessions e Home Config
-- Description: Estrutura completa para conversas com IA
-- Date: 2026-01-27
-- ============================================================

-- ============================================
-- 1. TABELA DE SESSÕES
-- Uma sessão é criada quando:
-- - Usuário inicia conversa
-- - Muda de módulo
-- - Retorna após 10+ minutos
-- - Retorna com palavras-chave diferentes
-- ============================================
CREATE TABLE IF NOT EXISTS public.pwa_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificação do usuário
  device_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Módulo/Container da sessão
  module_slug TEXT NOT NULL,

  -- Timestamps
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Resumo gerado ao encerrar sessão
  summary TEXT,
  summary_keywords TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Estatísticas da sessão
  total_messages INTEGER DEFAULT 0,
  total_duration_seconds INTEGER DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Metadata adicional
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para sessões
CREATE INDEX IF NOT EXISTS idx_pwa_sessions_device_id ON public.pwa_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_pwa_sessions_user_id ON public.pwa_sessions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pwa_sessions_module ON public.pwa_sessions(module_slug);
CREATE INDEX IF NOT EXISTS idx_pwa_sessions_active ON public.pwa_sessions(device_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_pwa_sessions_last_activity ON public.pwa_sessions(last_activity_at DESC);

-- ============================================
-- 2. TABELA DE CONVERSAS
-- Cada linha = uma pergunta + resposta
-- ============================================
CREATE TABLE IF NOT EXISTS public.pwa_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relacionamento com sessão
  session_id UUID NOT NULL REFERENCES public.pwa_sessions(id) ON DELETE CASCADE,

  -- Identificação
  device_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Módulo onde ocorreu a conversa
  module_slug TEXT NOT NULL,

  -- Conteúdo
  question TEXT NOT NULL,
  response TEXT NOT NULL,

  -- Timestamp detalhado
  asked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,

  -- Palavras-chave extraídas
  keywords_user TEXT[] DEFAULT ARRAY[]::TEXT[],
  keywords_ai TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Entonação (análise de frequência F0)
  intonation_user JSONB DEFAULT '{}',
  -- Estrutura esperada:
  -- {
  --   "f0_mean": 185.4,
  --   "f0_range_hz": 125.3,
  --   "f0_range_st": 12.4,
  --   "contour": "ascending|descending|flat",
  --   "emotion": "neutral|happy|sad|angry|surprised",
  --   "confidence": 0.85
  -- }

  intonation_ai JSONB DEFAULT '{}',
  -- Estrutura esperada:
  -- {
  --   "voice": "nova",
  --   "style": "warm|neutral|urgent",
  --   "speed": 1.0,
  --   "pitch": 1.0,
  --   "context": "greeting|info|alert|question"
  -- }

  -- Áudio (URLs ou referências)
  audio_question_url TEXT,
  audio_response_url TEXT,

  -- Duração em segundos
  question_duration_seconds NUMERIC(10,2),
  response_duration_seconds NUMERIC(10,2),

  -- Qualidade da resposta (feedback do usuário)
  user_satisfaction INTEGER CHECK (user_satisfaction BETWEEN 1 AND 5),
  user_feedback TEXT,

  -- Ordem na sessão
  sequence_number INTEGER NOT NULL DEFAULT 1,

  -- Metadata adicional
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para conversas
CREATE INDEX IF NOT EXISTS idx_pwa_conversations_session ON public.pwa_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_pwa_conversations_device ON public.pwa_conversations(device_id);
CREATE INDEX IF NOT EXISTS idx_pwa_conversations_user ON public.pwa_conversations(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pwa_conversations_module ON public.pwa_conversations(module_slug);
CREATE INDEX IF NOT EXISTS idx_pwa_conversations_asked_at ON public.pwa_conversations(asked_at DESC);
CREATE INDEX IF NOT EXISTS idx_pwa_conversations_keywords_user ON public.pwa_conversations USING GIN(keywords_user);
CREATE INDEX IF NOT EXISTS idx_pwa_conversations_keywords_ai ON public.pwa_conversations USING GIN(keywords_ai);

-- ============================================
-- 3. EXTENSÃO PARA AGENTS (container config)
-- Adicionar campos para configuração de container
-- ============================================
ALTER TABLE public.iconsai_agents
ADD COLUMN IF NOT EXISTS welcome_message TEXT,
ADD COLUMN IF NOT EXISTS welcome_message_returning TEXT,
ADD COLUMN IF NOT EXISTS is_home_container BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_in_home BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS container_config JSONB DEFAULT '{}';

-- Estrutura container_config:
-- {
--   "navigation": {
--     "showBackToHome": true,
--     "showOtherAgents": true
--   },
--   "voice": {
--     "defaultVoice": "nova",
--     "speed": 1.0
--   },
--   "behavior": {
--     "autoStartRecording": false,
--     "sessionTimeoutMinutes": 10
--   }
-- }

COMMENT ON COLUMN public.iconsai_agents.welcome_message IS 'Mensagem de boas-vindas para primeiro acesso';
COMMENT ON COLUMN public.iconsai_agents.welcome_message_returning IS 'Mensagem para usuários que retornam';
COMMENT ON COLUMN public.iconsai_agents.is_home_container IS 'Se este é o container HOME (único)';
COMMENT ON COLUMN public.iconsai_agents.show_in_home IS 'Se deve aparecer como opção no HOME';
COMMENT ON COLUMN public.iconsai_agents.container_config IS 'Configurações específicas do container';

-- Marcar HOME como container principal
UPDATE public.iconsai_agents
SET
  is_home_container = true,
  welcome_message = 'Olá, {user_name}! Sou o IconsAI, seu assistente de voz. Como posso ajudar você hoje?',
  welcome_message_returning = 'Olá novamente, {user_name}! Você estava usando o módulo {last_module}. Deseja continuar de onde parou?',
  container_config = jsonb_build_object(
    'navigation', jsonb_build_object(
      'showBackToHome', false,
      'showOtherAgents', true
    ),
    'voice', jsonb_build_object(
      'defaultVoice', 'nova',
      'speed', 1.0
    ),
    'behavior', jsonb_build_object(
      'autoStartRecording', false,
      'sessionTimeoutMinutes', 10
    )
  )
WHERE slug = 'home';

-- ============================================
-- 4. TABELA DE CONFIGURAÇÃO DO HOME
-- Quais containers/agents aparecem no HOME
-- ============================================
CREATE TABLE IF NOT EXISTS public.pwa_home_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Referência ao agent
  agent_id UUID NOT NULL REFERENCES public.iconsai_agents(id) ON DELETE CASCADE,

  -- Configuração visual no HOME
  display_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,

  -- Ícone customizado (se diferente do agent)
  custom_icon TEXT,
  custom_color TEXT,
  custom_label TEXT,

  -- Descrição curta para exibir no HOME
  short_description TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(agent_id)
);

-- Índice para ordenação
CREATE INDEX IF NOT EXISTS idx_pwa_home_agents_order ON public.pwa_home_agents(display_order) WHERE is_visible = true;

-- ============================================
-- 5. TABELA DE ÚLTIMAS ATIVIDADES
-- Para saber qual foi o último módulo usado
-- ============================================
CREATE TABLE IF NOT EXISTS public.pwa_user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  device_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Último módulo acessado
  last_module_slug TEXT NOT NULL,
  last_session_id UUID REFERENCES public.pwa_sessions(id) ON DELETE SET NULL,

  -- Quando foi o último acesso
  last_access_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Total de acessos
  total_sessions INTEGER DEFAULT 1,

  -- Configurações do usuário
  user_preferences JSONB DEFAULT '{}',
  -- Estrutura:
  -- {
  --   "preferredVoice": "nova",
  --   "preferredSpeed": 1.0,
  --   "language": "pt-BR",
  --   "notifications": true
  -- }

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(device_id)
);

-- Índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_pwa_user_activity_device ON public.pwa_user_activity(device_id);
CREATE INDEX IF NOT EXISTS idx_pwa_user_activity_user ON public.pwa_user_activity(user_id) WHERE user_id IS NOT NULL;

-- ============================================
-- 6. RLS POLICIES
-- ============================================

-- Sessions
ALTER TABLE public.pwa_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON public.pwa_sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR device_id IN (
    SELECT device_id FROM public.pwa_user_activity WHERE user_id = auth.uid()
  ));

CREATE POLICY "Service role has full access to sessions"
  ON public.pwa_sessions FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Anon can insert sessions"
  ON public.pwa_sessions FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can view own sessions by device"
  ON public.pwa_sessions FOR SELECT
  TO anon
  USING (true);

-- Conversations
ALTER TABLE public.pwa_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
  ON public.pwa_conversations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR device_id IN (
    SELECT device_id FROM public.pwa_user_activity WHERE user_id = auth.uid()
  ));

CREATE POLICY "Service role has full access to conversations"
  ON public.pwa_conversations FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Anon can insert conversations"
  ON public.pwa_conversations FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can view own conversations by device"
  ON public.pwa_conversations FOR SELECT
  TO anon
  USING (true);

-- Home Agents
ALTER TABLE public.pwa_home_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read home agents config"
  ON public.pwa_home_agents FOR SELECT
  TO public
  USING (is_visible = true);

CREATE POLICY "Service role has full access to home agents"
  ON public.pwa_home_agents FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- User Activity
ALTER TABLE public.pwa_user_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity"
  ON public.pwa_user_activity FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR device_id IN (
    SELECT device_id FROM public.pwa_user_activity WHERE user_id = auth.uid()
  ));

CREATE POLICY "Service role has full access to activity"
  ON public.pwa_user_activity FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Anon can upsert activity"
  ON public.pwa_user_activity FOR ALL
  TO anon
  USING (true) WITH CHECK (true);

-- ============================================
-- 7. TRIGGERS
-- ============================================

-- Atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pwa_sessions_updated_at
  BEFORE UPDATE ON public.pwa_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_pwa_home_agents_updated_at
  BEFORE UPDATE ON public.pwa_home_agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_pwa_user_activity_updated_at
  BEFORE UPDATE ON public.pwa_user_activity
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 8. FUNÇÃO PARA VERIFICAR/CRIAR SESSÃO
-- ============================================
CREATE OR REPLACE FUNCTION get_or_create_session(
  p_device_id TEXT,
  p_module_slug TEXT,
  p_user_id UUID DEFAULT NULL,
  p_keywords TEXT[] DEFAULT NULL,
  p_timeout_minutes INTEGER DEFAULT 10
)
RETURNS UUID AS $$
DECLARE
  v_session_id UUID;
  v_last_session RECORD;
  v_should_create_new BOOLEAN := false;
  v_keywords_overlap INTEGER := 0;
BEGIN
  -- Buscar última sessão ativa do dispositivo
  SELECT id, module_slug, last_activity_at, summary_keywords
  INTO v_last_session
  FROM public.pwa_sessions
  WHERE device_id = p_device_id
    AND is_active = true
  ORDER BY last_activity_at DESC
  LIMIT 1;

  -- Verificar se precisa criar nova sessão
  IF v_last_session.id IS NULL THEN
    -- Primeira sessão
    v_should_create_new := true;
  ELSIF v_last_session.module_slug != p_module_slug THEN
    -- Mudou de módulo
    v_should_create_new := true;
  ELSIF v_last_session.last_activity_at < (now() - (p_timeout_minutes || ' minutes')::INTERVAL) THEN
    -- Timeout de inatividade
    v_should_create_new := true;
  ELSIF p_keywords IS NOT NULL AND array_length(p_keywords, 1) > 0 THEN
    -- Verificar se palavras-chave são diferentes
    SELECT COUNT(*) INTO v_keywords_overlap
    FROM unnest(v_last_session.summary_keywords) AS old_kw
    WHERE old_kw = ANY(p_keywords);

    -- Se menos de 30% de overlap, nova sessão
    IF v_keywords_overlap < (array_length(p_keywords, 1) * 0.3) THEN
      v_should_create_new := true;
    END IF;
  END IF;

  IF v_should_create_new THEN
    -- Encerrar sessão anterior
    IF v_last_session.id IS NOT NULL THEN
      UPDATE public.pwa_sessions
      SET
        is_active = false,
        ended_at = now(),
        total_duration_seconds = EXTRACT(EPOCH FROM (now() - started_at))
      WHERE id = v_last_session.id;
    END IF;

    -- Criar nova sessão
    INSERT INTO public.pwa_sessions (device_id, user_id, module_slug)
    VALUES (p_device_id, p_user_id, p_module_slug)
    RETURNING id INTO v_session_id;
  ELSE
    -- Atualizar última atividade
    UPDATE public.pwa_sessions
    SET last_activity_at = now()
    WHERE id = v_last_session.id;

    v_session_id := v_last_session.id;
  END IF;

  -- Atualizar atividade do usuário
  INSERT INTO public.pwa_user_activity (device_id, user_id, last_module_slug, last_session_id)
  VALUES (p_device_id, p_user_id, p_module_slug, v_session_id)
  ON CONFLICT (device_id) DO UPDATE SET
    user_id = COALESCE(p_user_id, pwa_user_activity.user_id),
    last_module_slug = p_module_slug,
    last_session_id = v_session_id,
    last_access_at = now(),
    total_sessions = pwa_user_activity.total_sessions +
      CASE WHEN v_should_create_new THEN 1 ELSE 0 END;

  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. POPULAR HOME COM AGENTS EXISTENTES
-- ============================================
INSERT INTO public.pwa_home_agents (agent_id, display_order, short_description)
SELECT
  id,
  sort_order,
  description
FROM public.iconsai_agents
WHERE slug != 'home' AND is_active = true
ON CONFLICT (agent_id) DO NOTHING;

-- ============================================
-- COMENTÁRIOS
-- ============================================
COMMENT ON TABLE public.pwa_sessions IS 'Sessões de conversa do usuário no PWA';
COMMENT ON TABLE public.pwa_conversations IS 'Histórico de perguntas e respostas com análise de palavras-chave e entonação';
COMMENT ON TABLE public.pwa_home_agents IS 'Configuração de quais agents aparecem no HOME';
COMMENT ON TABLE public.pwa_user_activity IS 'Última atividade do usuário para retorno contextual';
COMMENT ON FUNCTION get_or_create_session IS 'Gerencia criação/reuso de sessões baseado em regras de timeout e contexto';

-- ============================================
-- LOG
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'PWA Conversations & Sessions criado!';
  RAISE NOTICE '';
  RAISE NOTICE 'Tabelas criadas:';
  RAISE NOTICE '1. pwa_sessions - Sessões de conversa';
  RAISE NOTICE '2. pwa_conversations - Perguntas/respostas';
  RAISE NOTICE '3. pwa_home_agents - Config do HOME';
  RAISE NOTICE '4. pwa_user_activity - Última atividade';
  RAISE NOTICE '';
  RAISE NOTICE 'Colunas adicionadas em iconsai_agents:';
  RAISE NOTICE '- welcome_message';
  RAISE NOTICE '- welcome_message_returning';
  RAISE NOTICE '- is_home_container';
  RAISE NOTICE '- show_in_home';
  RAISE NOTICE '- container_config';
  RAISE NOTICE '';
  RAISE NOTICE 'Função criada:';
  RAISE NOTICE '- get_or_create_session()';
  RAISE NOTICE '=========================================';
END $$;
