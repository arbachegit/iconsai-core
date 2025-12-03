-- Tabela para preferências de personalização do chat
CREATE TABLE public.user_chat_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  chat_type TEXT NOT NULL CHECK (chat_type IN ('health', 'study')),
  
  -- Preferência de estilo de resposta
  response_style TEXT DEFAULT 'not_set' CHECK (response_style IN ('detailed', 'concise', 'not_set')),
  response_style_confidence NUMERIC(3,2) DEFAULT 0.00,
  
  -- Histórico de interações para aprendizado
  total_interactions INTEGER DEFAULT 0,
  avg_message_length INTEGER DEFAULT 0,
  topics_discussed TEXT[] DEFAULT '{}',
  
  -- Intenção/objetivo detectado
  detected_intent TEXT,
  intent_confirmed BOOLEAN DEFAULT FALSE,
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(session_id, chat_type)
);

-- Índices para performance
CREATE INDEX idx_user_chat_prefs_session ON user_chat_preferences(session_id);
CREATE INDEX idx_user_chat_prefs_chat_type ON user_chat_preferences(chat_type);

-- Habilitar RLS
ALTER TABLE user_chat_preferences ENABLE ROW LEVEL SECURITY;

-- Políticas RLS permissivas para o sistema
CREATE POLICY "System can insert user preferences" 
  ON user_chat_preferences FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "System can read user preferences" 
  ON user_chat_preferences FOR SELECT 
  USING (true);

CREATE POLICY "System can update user preferences" 
  ON user_chat_preferences FOR UPDATE 
  USING (true);