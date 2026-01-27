-- ============================================
-- ICONSAI - SCHEMA LIMPO v1.0.0
-- Data: 2026-01-27
-- Descrição: 12 tabelas da nova arquitetura
-- ============================================

-- =============================================
-- 1. INSTITUTIONS - Instituições/Empresas
-- =============================================
CREATE TABLE IF NOT EXISTS public.institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  cnpj TEXT UNIQUE,

  -- Domínios de email permitidos
  email_domains TEXT[] NOT NULL DEFAULT '{}',

  -- Configurações
  max_users INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,

  -- Endereço
  address_street TEXT,
  address_number TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,

  -- Contato
  phone TEXT,
  email TEXT,

  -- Metadata
  logo_url TEXT,
  primary_color TEXT DEFAULT '#00D4FF',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- =============================================
-- 2. DEPARTMENTS - Departamentos por instituição
-- =============================================
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(institution_id, slug)
);

-- =============================================
-- 3. PLATFORM_USERS - Usuários da plataforma
-- =============================================
CREATE TABLE IF NOT EXISTS public.platform_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Dados pessoais
  first_name TEXT NOT NULL,
  last_name TEXT,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,

  -- Vínculo institucional
  institution_id UUID REFERENCES public.institutions(id),
  department_id UUID REFERENCES public.departments(id),

  -- Papel (user, admin, superadmin)
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'superadmin')),

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'inactive')),

  -- Verificação
  email_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,
  verification_code TEXT,
  verification_expires_at TIMESTAMPTZ,

  -- Controle
  password_set BOOLEAN DEFAULT false,
  last_login_at TIMESTAMPTZ,
  login_count INTEGER DEFAULT 0,

  -- Metadata
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  invited_by UUID REFERENCES public.platform_users(id)
);

-- =============================================
-- 4. USER_INVITES - Convites de usuários
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Dados do convidado
  email TEXT NOT NULL,
  phone TEXT,
  name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,

  -- Vínculo
  institution_id UUID REFERENCES public.institutions(id),
  department_id UUID REFERENCES public.departments(id),
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'superadmin')),

  -- Acessos
  has_platform_access BOOLEAN DEFAULT false,
  has_app_access BOOLEAN DEFAULT true,

  -- Token de acesso
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),

  -- Verificação
  verification_code TEXT,
  verification_code_expires_at TIMESTAMPTZ,
  verification_attempts INTEGER DEFAULT 0,
  verification_sent_at TIMESTAMPTZ,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'opened', 'completed', 'expired', 'cancelled')),

  -- Tracking
  email_sent_at TIMESTAMPTZ,
  whatsapp_sent_at TIMESTAMPTZ,
  sms_sent_at TIMESTAMPTZ,
  email_opened_at TIMESTAMPTZ,
  whatsapp_opened_at TIMESTAMPTZ,
  link_opened_at TIMESTAMPTZ,
  form_started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Validade
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days'),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- =============================================
-- 5. USER_ROLES - Papéis de usuários (Supabase Auth)
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'admin', 'superadmin')),
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, role)
);

-- =============================================
-- 6. ICONSAI_AGENTS - Agentes/Módulos do sistema
-- =============================================
CREATE TABLE IF NOT EXISTS public.iconsai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,

  -- Configuração
  system_prompt TEXT,
  model TEXT DEFAULT 'gpt-4o-mini',
  temperature FLOAT DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 1024,

  -- Visual
  icon TEXT,
  color TEXT DEFAULT '#00D4FF',
  avatar_url TEXT,

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true,

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 7. PWA_HOME_AGENTS - Agentes na home do PWA
-- =============================================
CREATE TABLE IF NOT EXISTS public.pwa_home_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.iconsai_agents(id) ON DELETE CASCADE,

  -- Posição e visibilidade
  position INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,

  -- Escopo
  institution_id UUID REFERENCES public.institutions(id),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 8. PWA_SESSIONS - Sessões do PWA
-- =============================================
CREATE TABLE IF NOT EXISTS public.pwa_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  platform_user_id UUID REFERENCES public.platform_users(id) ON DELETE SET NULL,

  -- Identificação
  device_id TEXT,
  session_token TEXT UNIQUE,

  -- Contexto
  institution_id UUID REFERENCES public.institutions(id),
  agent_id UUID REFERENCES public.iconsai_agents(id),

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ DEFAULT now(),

  -- Metadata
  user_agent TEXT,
  ip_address TEXT,
  metadata JSONB DEFAULT '{}'
);

-- =============================================
-- 9. PWA_CONVERSATIONS - Conversas do PWA
-- =============================================
CREATE TABLE IF NOT EXISTS public.pwa_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.pwa_sessions(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  platform_user_id UUID REFERENCES public.platform_users(id) ON DELETE SET NULL,

  -- Contexto
  institution_id UUID REFERENCES public.institutions(id),
  agent_id UUID REFERENCES public.iconsai_agents(id),
  module_slug TEXT,

  -- Mensagem do usuário
  user_message TEXT,
  user_audio_url TEXT,
  user_audio_duration FLOAT,

  -- Resposta da IA
  ai_response TEXT,
  ai_audio_url TEXT,
  ai_audio_duration FLOAT,

  -- Análise
  keywords TEXT[] DEFAULT '{}',
  sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  intent TEXT,

  -- Métricas
  response_time_ms INTEGER,
  tokens_used INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Metadata
  metadata JSONB DEFAULT '{}'
);

-- =============================================
-- 10. PWA_USER_ACTIVITY - Atividades do usuário
-- =============================================
CREATE TABLE IF NOT EXISTS public.pwa_user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  platform_user_id UUID REFERENCES public.platform_users(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.pwa_sessions(id) ON DELETE SET NULL,

  -- Ação
  action_type TEXT NOT NULL,
  action_data JSONB DEFAULT '{}',

  -- Contexto
  page_url TEXT,
  module_slug TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 11. VOICE_FREQUENCY_ANALYSIS - Análise de voz
-- =============================================
CREATE TABLE IF NOT EXISTS public.voice_frequency_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.pwa_conversations(id) ON DELETE CASCADE,

  -- Dados brutos de frequência
  f0_samples FLOAT[] DEFAULT '{}',
  f0_timestamps FLOAT[] DEFAULT '{}',

  -- Métricas calculadas
  f0_mean FLOAT,
  f0_min FLOAT,
  f0_max FLOAT,
  f0_range_hz FLOAT,
  f0_range_semitones FLOAT,
  f0_std_deviation FLOAT,

  -- Contorno e padrão
  contour_type TEXT CHECK (contour_type IN ('ascending', 'descending', 'flat', 'varied', 'peak', 'valley')),
  contour_points JSONB DEFAULT '[]',

  -- Emoção detectada
  emotion TEXT CHECK (emotion IN ('neutral', 'happy', 'sad', 'angry', 'fearful', 'surprised', 'bored')),
  emotion_confidence FLOAT CHECK (emotion_confidence BETWEEN 0 AND 1),
  emotion_secondary TEXT,

  -- Qualidade do áudio
  audio_quality_score FLOAT CHECK (audio_quality_score BETWEEN 0 AND 1),
  noise_level FLOAT,

  -- Velocidade da fala
  speech_rate_wpm INTEGER,
  pause_count INTEGER,
  avg_pause_duration FLOAT,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 12. USER_VOICE_BASELINE - Baseline de voz do usuário
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_voice_baseline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform_user_id UUID REFERENCES public.platform_users(id) ON DELETE CASCADE,

  -- Métricas de baseline
  f0_baseline_mean FLOAT,
  f0_baseline_min FLOAT,
  f0_baseline_max FLOAT,
  f0_baseline_std FLOAT,

  -- Amostras usadas
  sample_count INTEGER DEFAULT 0,
  last_sample_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id)
);

-- =============================================
-- INDEXES
-- =============================================

-- institutions
CREATE INDEX IF NOT EXISTS idx_institutions_slug ON public.institutions(slug);
CREATE INDEX IF NOT EXISTS idx_institutions_is_active ON public.institutions(is_active);

-- departments
CREATE INDEX IF NOT EXISTS idx_departments_institution_id ON public.departments(institution_id);

-- platform_users
CREATE INDEX IF NOT EXISTS idx_platform_users_auth_user_id ON public.platform_users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_platform_users_email ON public.platform_users(email);
CREATE INDEX IF NOT EXISTS idx_platform_users_institution_id ON public.platform_users(institution_id);
CREATE INDEX IF NOT EXISTS idx_platform_users_role ON public.platform_users(role);

-- user_invites
CREATE INDEX IF NOT EXISTS idx_user_invites_email ON public.user_invites(email);
CREATE INDEX IF NOT EXISTS idx_user_invites_token ON public.user_invites(token);
CREATE INDEX IF NOT EXISTS idx_user_invites_status ON public.user_invites(status);
CREATE INDEX IF NOT EXISTS idx_user_invites_institution_id ON public.user_invites(institution_id);

-- user_roles
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- iconsai_agents
CREATE INDEX IF NOT EXISTS idx_iconsai_agents_module_slug ON public.iconsai_agents(module_slug);
CREATE INDEX IF NOT EXISTS idx_iconsai_agents_is_active ON public.iconsai_agents(is_active);

-- pwa_home_agents
CREATE INDEX IF NOT EXISTS idx_pwa_home_agents_agent_id ON public.pwa_home_agents(agent_id);
CREATE INDEX IF NOT EXISTS idx_pwa_home_agents_institution_id ON public.pwa_home_agents(institution_id);

-- pwa_sessions
CREATE INDEX IF NOT EXISTS idx_pwa_sessions_user_id ON public.pwa_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_pwa_sessions_platform_user_id ON public.pwa_sessions(platform_user_id);
CREATE INDEX IF NOT EXISTS idx_pwa_sessions_device_id ON public.pwa_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_pwa_sessions_is_active ON public.pwa_sessions(is_active);

-- pwa_conversations
CREATE INDEX IF NOT EXISTS idx_pwa_conversations_session_id ON public.pwa_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_pwa_conversations_user_id ON public.pwa_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_pwa_conversations_platform_user_id ON public.pwa_conversations(platform_user_id);
CREATE INDEX IF NOT EXISTS idx_pwa_conversations_agent_id ON public.pwa_conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_pwa_conversations_created_at ON public.pwa_conversations(created_at);

-- pwa_user_activity
CREATE INDEX IF NOT EXISTS idx_pwa_user_activity_user_id ON public.pwa_user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_pwa_user_activity_session_id ON public.pwa_user_activity(session_id);
CREATE INDEX IF NOT EXISTS idx_pwa_user_activity_action_type ON public.pwa_user_activity(action_type);
CREATE INDEX IF NOT EXISTS idx_pwa_user_activity_created_at ON public.pwa_user_activity(created_at);

-- voice_frequency_analysis
CREATE INDEX IF NOT EXISTS idx_voice_frequency_conversation_id ON public.voice_frequency_analysis(conversation_id);
CREATE INDEX IF NOT EXISTS idx_voice_frequency_emotion ON public.voice_frequency_analysis(emotion);

-- user_voice_baseline
CREATE INDEX IF NOT EXISTS idx_user_voice_baseline_user_id ON public.user_voice_baseline(user_id);

-- =============================================
-- RLS (Row Level Security)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iconsai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pwa_home_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pwa_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pwa_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pwa_user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_frequency_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_voice_baseline ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- user_roles: Leitura pública para verificação de roles
CREATE POLICY "user_roles_select_all" ON public.user_roles
  FOR SELECT USING (true);

-- user_roles: Apenas service role pode inserir/atualizar
CREATE POLICY "user_roles_insert_service" ON public.user_roles
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "user_roles_update_service" ON public.user_roles
  FOR UPDATE USING (auth.role() = 'service_role');

-- institutions: Leitura para usuários autenticados
CREATE POLICY "institutions_select_authenticated" ON public.institutions
  FOR SELECT TO authenticated USING (true);

-- institutions: Apenas admins podem modificar
CREATE POLICY "institutions_all_admin" ON public.institutions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- departments: Leitura para usuários autenticados
CREATE POLICY "departments_select_authenticated" ON public.departments
  FOR SELECT TO authenticated USING (true);

-- departments: Apenas admins podem modificar
CREATE POLICY "departments_all_admin" ON public.departments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- platform_users: Usuário pode ver seu próprio perfil
CREATE POLICY "platform_users_select_own" ON public.platform_users
  FOR SELECT USING (auth_user_id = auth.uid());

-- platform_users: Admins podem ver todos da instituição
CREATE POLICY "platform_users_select_admin" ON public.platform_users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.platform_users pu ON pu.auth_user_id = auth.uid()
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'superadmin')
      AND (
        ur.role = 'superadmin'
        OR pu.institution_id = platform_users.institution_id
      )
    )
  );

-- platform_users: Usuário pode atualizar seu próprio perfil
CREATE POLICY "platform_users_update_own" ON public.platform_users
  FOR UPDATE USING (auth_user_id = auth.uid());

-- user_invites: Leitura pública para verificação de token
CREATE POLICY "user_invites_select_by_token" ON public.user_invites
  FOR SELECT USING (true);

-- user_invites: Admins podem gerenciar convites
CREATE POLICY "user_invites_all_admin" ON public.user_invites
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- iconsai_agents: Leitura pública para agentes públicos
CREATE POLICY "iconsai_agents_select_public" ON public.iconsai_agents
  FOR SELECT USING (is_public = true OR is_active = true);

-- iconsai_agents: Admins podem gerenciar
CREATE POLICY "iconsai_agents_all_admin" ON public.iconsai_agents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- pwa_home_agents: Leitura pública
CREATE POLICY "pwa_home_agents_select_all" ON public.pwa_home_agents
  FOR SELECT USING (true);

-- pwa_home_agents: Admins podem gerenciar
CREATE POLICY "pwa_home_agents_all_admin" ON public.pwa_home_agents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- pwa_sessions: Usuário pode ver suas próprias sessões
CREATE POLICY "pwa_sessions_select_own" ON public.pwa_sessions
  FOR SELECT USING (user_id = auth.uid());

-- pwa_sessions: Usuário pode criar sessões
CREATE POLICY "pwa_sessions_insert_own" ON public.pwa_sessions
  FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- pwa_sessions: Usuário pode atualizar suas sessões
CREATE POLICY "pwa_sessions_update_own" ON public.pwa_sessions
  FOR UPDATE USING (user_id = auth.uid() OR user_id IS NULL);

-- pwa_conversations: Usuário pode ver suas próprias conversas
CREATE POLICY "pwa_conversations_select_own" ON public.pwa_conversations
  FOR SELECT USING (user_id = auth.uid());

-- pwa_conversations: Admins podem ver conversas da instituição
CREATE POLICY "pwa_conversations_select_admin" ON public.pwa_conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.platform_users pu ON pu.auth_user_id = auth.uid()
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'superadmin')
      AND (
        ur.role = 'superadmin'
        OR pu.institution_id = pwa_conversations.institution_id
      )
    )
  );

-- pwa_conversations: Usuário pode criar conversas
CREATE POLICY "pwa_conversations_insert_own" ON public.pwa_conversations
  FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- pwa_user_activity: Usuário pode ver suas atividades
CREATE POLICY "pwa_user_activity_select_own" ON public.pwa_user_activity
  FOR SELECT USING (user_id = auth.uid());

-- pwa_user_activity: Usuário pode registrar atividades
CREATE POLICY "pwa_user_activity_insert_own" ON public.pwa_user_activity
  FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- voice_frequency_analysis: Acesso via conversation
CREATE POLICY "voice_frequency_select_via_conversation" ON public.voice_frequency_analysis
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.pwa_conversations c
      WHERE c.id = voice_frequency_analysis.conversation_id
      AND c.user_id = auth.uid()
    )
  );

-- voice_frequency_analysis: Admins podem ver análises
CREATE POLICY "voice_frequency_select_admin" ON public.voice_frequency_analysis
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- user_voice_baseline: Usuário pode ver seu próprio baseline
CREATE POLICY "user_voice_baseline_select_own" ON public.user_voice_baseline
  FOR SELECT USING (user_id = auth.uid());

-- user_voice_baseline: Usuário pode criar/atualizar seu baseline
CREATE POLICY "user_voice_baseline_insert_own" ON public.user_voice_baseline
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_voice_baseline_update_own" ON public.user_voice_baseline
  FOR UPDATE USING (user_id = auth.uid());

-- =============================================
-- TRIGGERS - Updated_at automático
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_institutions_updated_at
  BEFORE UPDATE ON public.institutions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_users_updated_at
  BEFORE UPDATE ON public.platform_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_invites_updated_at
  BEFORE UPDATE ON public.user_invites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_iconsai_agents_updated_at
  BEFORE UPDATE ON public.iconsai_agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pwa_home_agents_updated_at
  BEFORE UPDATE ON public.pwa_home_agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_voice_baseline_updated_at
  BEFORE UPDATE ON public.user_voice_baseline
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- DADOS INICIAIS - Agentes padrão
-- =============================================

INSERT INTO public.iconsai_agents (module_slug, name, description, icon, color, is_active, is_public)
VALUES
  ('fia', 'FIA', 'Assistente financeira inteligente', 'DollarSign', '#00D4FF', true, true),
  ('health', 'Saúde', 'Assistente de saúde e bem-estar', 'Heart', '#FF6B6B', true, true),
  ('city', 'Cidade', 'Assistente de serviços urbanos', 'Building2', '#4ECDC4', true, true)
ON CONFLICT (module_slug) DO NOTHING;

-- =============================================
-- RPC FUNCTIONS - PWA Auth
-- =============================================

-- Função para normalizar telefone brasileiro
CREATE OR REPLACE FUNCTION normalize_brazilian_phone(phone_input TEXT)
RETURNS TEXT AS $$
DECLARE
  clean_phone TEXT;
BEGIN
  -- Remover tudo que não é número
  clean_phone := regexp_replace(phone_input, '[^0-9]', '', 'g');

  -- Se começar com 55 e tiver mais de 11 dígitos, remover o 55
  IF length(clean_phone) > 11 AND clean_phone LIKE '55%' THEN
    clean_phone := substring(clean_phone from 3);
  END IF;

  -- Retornar no formato +55XXXXXXXXXXX
  RETURN '+55' || clean_phone;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================
-- check_pwa_access - Verifica se telefone tem acesso
-- =============================================
CREATE OR REPLACE FUNCTION check_pwa_access(p_phone TEXT)
RETURNS JSON AS $$
DECLARE
  normalized_phone TEXT;
  user_record RECORD;
BEGIN
  -- Normalizar telefone
  normalized_phone := normalize_brazilian_phone(p_phone);

  -- Buscar em platform_users (usuários ativos)
  SELECT pu.first_name, pu.last_name, pu.status
  INTO user_record
  FROM platform_users pu
  WHERE normalize_brazilian_phone(pu.phone) = normalized_phone
    AND pu.status = 'active'
    AND pu.phone_verified = true
  LIMIT 1;

  IF FOUND THEN
    RETURN json_build_object(
      'has_access', true,
      'user_name', COALESCE(user_record.first_name, '') || ' ' || COALESCE(user_record.last_name, ''),
      'expires_at', (now() + interval '30 days')::text
    );
  END IF;

  -- Buscar em user_invites (convites completos)
  SELECT ui.name, ui.status
  INTO user_record
  FROM user_invites ui
  WHERE normalize_brazilian_phone(ui.phone) = normalized_phone
    AND ui.status = 'completed'
    AND ui.has_app_access = true
  LIMIT 1;

  IF FOUND THEN
    RETURN json_build_object(
      'has_access', true,
      'user_name', user_record.name,
      'expires_at', (now() + interval '30 days')::text
    );
  END IF;

  -- Sem acesso
  RETURN json_build_object('has_access', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- login_pwa_by_phone_simple - Inicia login e gera código
-- =============================================
CREATE OR REPLACE FUNCTION login_pwa_by_phone_simple(p_phone TEXT)
RETURNS JSON AS $$
DECLARE
  normalized_phone TEXT;
  user_record RECORD;
  new_code TEXT;
BEGIN
  -- Normalizar telefone
  normalized_phone := normalize_brazilian_phone(p_phone);

  -- Validar formato básico (pelo menos 10 dígitos)
  IF length(regexp_replace(normalized_phone, '[^0-9]', '', 'g')) < 10 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'invalid_phone',
      'message', 'Telefone inválido. Use o formato (DDD) 9XXXX-XXXX'
    );
  END IF;

  -- Buscar em platform_users primeiro
  SELECT pu.id, pu.first_name, pu.last_name, pu.phone, pu.status, pu.phone_verified
  INTO user_record
  FROM platform_users pu
  WHERE normalize_brazilian_phone(pu.phone) = normalized_phone
  LIMIT 1;

  IF FOUND THEN
    -- Verificar se já está verificado
    IF user_record.phone_verified = true AND user_record.status = 'active' THEN
      RETURN json_build_object(
        'success', true,
        'already_verified', true,
        'user_name', COALESCE(user_record.first_name, '') || ' ' || COALESCE(user_record.last_name, ''),
        'phone', user_record.phone,
        'normalized_phone', normalized_phone
      );
    END IF;

    -- Gerar código de 6 dígitos
    new_code := lpad(floor(random() * 1000000)::text, 6, '0');

    -- Salvar código no platform_users
    UPDATE platform_users
    SET verification_code = new_code,
        verification_expires_at = now() + interval '10 minutes',
        updated_at = now()
    WHERE id = user_record.id;

    RETURN json_build_object(
      'success', true,
      'verification_code', new_code,
      'user_name', COALESCE(user_record.first_name, '') || ' ' || COALESCE(user_record.last_name, ''),
      'phone', user_record.phone,
      'normalized_phone', normalized_phone
    );
  END IF;

  -- Buscar em user_invites
  SELECT ui.id, ui.name, ui.phone, ui.status, ui.has_app_access
  INTO user_record
  FROM user_invites ui
  WHERE normalize_brazilian_phone(ui.phone) = normalized_phone
    AND ui.has_app_access = true
    AND ui.status IN ('pending', 'sent', 'opened', 'completed')
    AND (ui.expires_at IS NULL OR ui.expires_at > now())
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'no_invitation',
      'message', 'Você precisa de um convite para acessar o PWA.'
    );
  END IF;

  -- Se já completou o convite, verificar se está realmente verificado
  IF user_record.status = 'completed' THEN
    RETURN json_build_object(
      'success', true,
      'already_verified', true,
      'user_name', user_record.name,
      'phone', user_record.phone,
      'normalized_phone', normalized_phone
    );
  END IF;

  -- Gerar código de 6 dígitos
  new_code := lpad(floor(random() * 1000000)::text, 6, '0');

  -- Salvar código no user_invites
  UPDATE user_invites
  SET verification_code = new_code,
      verification_code_expires_at = now() + interval '10 minutes',
      verification_attempts = 0,
      verification_sent_at = now(),
      status = CASE WHEN status = 'pending' THEN 'sent' ELSE status END,
      updated_at = now()
  WHERE id = user_record.id;

  RETURN json_build_object(
    'success', true,
    'verification_code', new_code,
    'user_name', user_record.name,
    'phone', user_record.phone,
    'normalized_phone', normalized_phone
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- verify_pwa_code_simple - Verifica código e ativa acesso
-- =============================================
CREATE OR REPLACE FUNCTION verify_pwa_code_simple(p_phone TEXT, p_code TEXT)
RETURNS JSON AS $$
DECLARE
  normalized_phone TEXT;
  user_record RECORD;
  invite_record RECORD;
BEGIN
  -- Normalizar telefone
  normalized_phone := normalize_brazilian_phone(p_phone);

  -- Tentar verificar em platform_users primeiro
  SELECT pu.id, pu.first_name, pu.last_name, pu.phone,
         pu.verification_code, pu.verification_expires_at
  INTO user_record
  FROM platform_users pu
  WHERE normalize_brazilian_phone(pu.phone) = normalized_phone
    AND pu.verification_code IS NOT NULL
  LIMIT 1;

  IF FOUND THEN
    -- Verificar expiração
    IF user_record.verification_expires_at < now() THEN
      RETURN json_build_object(
        'success', false,
        'error', 'code_expired',
        'message', 'Código expirado. Solicite um novo código.'
      );
    END IF;

    -- Verificar código
    IF user_record.verification_code != p_code THEN
      RETURN json_build_object(
        'success', false,
        'error', 'invalid_code',
        'message', 'Código inválido. Tente novamente.'
      );
    END IF;

    -- Código correto! Ativar usuário
    UPDATE platform_users
    SET phone_verified = true,
        status = 'active',
        verification_code = NULL,
        verification_expires_at = NULL,
        login_count = login_count + 1,
        last_login_at = now(),
        updated_at = now()
    WHERE id = user_record.id;

    RETURN json_build_object(
      'success', true,
      'verified', true,
      'user_name', COALESCE(user_record.first_name, '') || ' ' || COALESCE(user_record.last_name, ''),
      'phone', normalized_phone
    );
  END IF;

  -- Tentar verificar em user_invites
  SELECT ui.id, ui.name, ui.phone,
         ui.verification_code, ui.verification_code_expires_at,
         ui.verification_attempts
  INTO invite_record
  FROM user_invites ui
  WHERE normalize_brazilian_phone(ui.phone) = normalized_phone
    AND ui.verification_code IS NOT NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'session_not_found',
      'message', 'Sessão não encontrada. Faça login novamente.'
    );
  END IF;

  -- Verificar tentativas excessivas
  IF invite_record.verification_attempts >= 5 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'too_many_attempts',
      'message', 'Bloqueado por excesso de tentativas.'
    );
  END IF;

  -- Verificar expiração
  IF invite_record.verification_code_expires_at < now() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'code_expired',
      'message', 'Código expirado. Solicite um novo código.'
    );
  END IF;

  -- Verificar código
  IF invite_record.verification_code != p_code THEN
    -- Incrementar tentativas
    UPDATE user_invites
    SET verification_attempts = verification_attempts + 1,
        updated_at = now()
    WHERE id = invite_record.id;

    RETURN json_build_object(
      'success', false,
      'error', 'invalid_code',
      'message', 'Código inválido. Tente novamente.'
    );
  END IF;

  -- Código correto! Marcar convite como completo
  UPDATE user_invites
  SET status = 'completed',
      verification_code = NULL,
      verification_code_expires_at = NULL,
      completed_at = now(),
      updated_at = now()
  WHERE id = invite_record.id;

  RETURN json_build_object(
    'success', true,
    'verified', true,
    'user_name', invite_record.name,
    'phone', normalized_phone
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FIM DO SCHEMA
-- =============================================
