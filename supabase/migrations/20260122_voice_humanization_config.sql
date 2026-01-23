-- ============================================================
-- Migration: Voice Humanization Configuration
-- ============================================================
-- Data: 2026-01-22
-- Versão: 1.0.0
--
-- Adiciona suporte para configurações de humanização de voz
-- no painel administrativo do IconsAI Business.
-- ============================================================

-- Verificar e adicionar colunas na tabela pwa_config se não existirem
DO $$
BEGIN
    -- A tabela pwa_config já existe, apenas garantindo que as
    -- configurações de voz serão armazenadas corretamente como JSON

    -- Inserir configuração padrão de voz global (se não existir)
    INSERT INTO pwa_config (config_key, config_value, config_type, updated_at)
    VALUES (
        'voice_humanization_config',
        '{
            "globalVoice": "nova",
            "globalHumanization": {
                "warmth": 70,
                "enthusiasm": 50,
                "pace": 50,
                "expressiveness": 60,
                "formality": 30,
                "speed": 1.0,
                "fillerWords": true,
                "naturalBreathing": true,
                "emotionalResponses": true
            },
            "globalInstructions": "",
            "lastSaved": null
        }',
        'json',
        NOW()
    )
    ON CONFLICT (config_key) DO NOTHING;

    -- Inserir presets de boas-vindas padrão (se não existir)
    INSERT INTO pwa_config (config_key, config_value, config_type, updated_at)
    VALUES (
        'welcome_presets',
        '[
            {
                "id": "home",
                "name": "Home",
                "color": "#00D4FF",
                "text": "Olá, [name]! Eu sou o IconsAI Business, seu assistente de voz desenvolvido pela Arbache AI. Escolha um módulo abaixo para começar.",
                "voice": "nova"
            },
            {
                "id": "health",
                "name": "Saúde",
                "color": "#FF6B6B",
                "text": "Olá, [name]. Seja bem-vindo ao módulo de Saúde do IconsAI. Estou aqui para ajudar você a cuidar do seu bem-estar. O que posso fazer por você hoje?",
                "voice": "shimmer"
            },
            {
                "id": "ideas",
                "name": "Ideias",
                "color": "#F59E0B",
                "text": "Olá, [name]! Que bom ter você no módulo de Ideias! Vamos explorar possibilidades juntos? Conte-me sobre o que você está pensando!",
                "voice": "coral"
            },
            {
                "id": "world",
                "name": "Mundo",
                "color": "#10B981",
                "text": "Olá, [name]. Bem-vindo ao módulo Mundo do IconsAI. Aqui você pode explorar conhecimentos, notícias e descobertas. Sobre o que gostaria de saber?",
                "voice": "sage"
            },
            {
                "id": "help",
                "name": "Ajuda",
                "color": "#6366F1",
                "text": "Olá, [name]! Estou aqui para ajudar você com qualquer dúvida sobre o IconsAI. Pode perguntar à vontade!",
                "voice": "echo"
            }
        ]',
        'json',
        NOW()
    )
    ON CONFLICT (config_key) DO NOTHING;

    -- Inserir configurações de agentes/módulos padrão (se não existir)
    INSERT INTO pwa_config (config_key, config_value, config_type, updated_at)
    VALUES (
        'agent_voice_configs',
        '[
            {
                "moduleId": "home",
                "voice": "nova",
                "humanization": {
                    "warmth": 70,
                    "enthusiasm": 50,
                    "pace": 50,
                    "expressiveness": 60,
                    "formality": 30,
                    "speed": 1.0,
                    "fillerWords": true,
                    "naturalBreathing": true,
                    "emotionalResponses": true
                },
                "instructions": "",
                "isCustom": false
            },
            {
                "moduleId": "health",
                "voice": "shimmer",
                "humanization": {
                    "warmth": 80,
                    "enthusiasm": 40,
                    "pace": 40,
                    "expressiveness": 70,
                    "formality": 40,
                    "speed": 0.95,
                    "fillerWords": true,
                    "naturalBreathing": true,
                    "emotionalResponses": true
                },
                "instructions": "",
                "isCustom": false
            },
            {
                "moduleId": "ideas",
                "voice": "coral",
                "humanization": {
                    "warmth": 60,
                    "enthusiasm": 80,
                    "pace": 70,
                    "expressiveness": 80,
                    "formality": 20,
                    "speed": 1.05,
                    "fillerWords": true,
                    "naturalBreathing": true,
                    "emotionalResponses": true
                },
                "instructions": "",
                "isCustom": false
            },
            {
                "moduleId": "world",
                "voice": "sage",
                "humanization": {
                    "warmth": 50,
                    "enthusiasm": 50,
                    "pace": 50,
                    "expressiveness": 60,
                    "formality": 50,
                    "speed": 1.0,
                    "fillerWords": false,
                    "naturalBreathing": true,
                    "emotionalResponses": true
                },
                "instructions": "",
                "isCustom": false
            },
            {
                "moduleId": "help",
                "voice": "echo",
                "humanization": {
                    "warmth": 65,
                    "enthusiasm": 45,
                    "pace": 45,
                    "expressiveness": 55,
                    "formality": 35,
                    "speed": 1.0,
                    "fillerWords": true,
                    "naturalBreathing": true,
                    "emotionalResponses": true
                },
                "instructions": "",
                "isCustom": false
            }
        ]',
        'json',
        NOW()
    )
    ON CONFLICT (config_key) DO NOTHING;

END $$;

-- ============================================================
-- Criar tabela pwa_agent_voice_config para armazenamento
-- estruturado (opcional, para queries mais eficientes)
-- ============================================================
CREATE TABLE IF NOT EXISTS pwa_agent_voice_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    module_id VARCHAR(50) NOT NULL UNIQUE,
    voice VARCHAR(50) NOT NULL DEFAULT 'nova',
    warmth INTEGER NOT NULL DEFAULT 70 CHECK (warmth >= 0 AND warmth <= 100),
    enthusiasm INTEGER NOT NULL DEFAULT 50 CHECK (enthusiasm >= 0 AND enthusiasm <= 100),
    pace INTEGER NOT NULL DEFAULT 50 CHECK (pace >= 0 AND pace <= 100),
    expressiveness INTEGER NOT NULL DEFAULT 60 CHECK (expressiveness >= 0 AND expressiveness <= 100),
    formality INTEGER NOT NULL DEFAULT 30 CHECK (formality >= 0 AND formality <= 100),
    speed DECIMAL(3,2) NOT NULL DEFAULT 1.0 CHECK (speed >= 0.5 AND speed <= 1.5),
    filler_words BOOLEAN NOT NULL DEFAULT true,
    natural_breathing BOOLEAN NOT NULL DEFAULT true,
    emotional_responses BOOLEAN NOT NULL DEFAULT true,
    custom_instructions TEXT DEFAULT '',
    is_custom BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para busca por módulo
CREATE INDEX IF NOT EXISTS idx_pwa_agent_voice_config_module_id
ON pwa_agent_voice_config(module_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_pwa_agent_voice_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_pwa_agent_voice_config_updated_at ON pwa_agent_voice_config;
CREATE TRIGGER trigger_pwa_agent_voice_config_updated_at
    BEFORE UPDATE ON pwa_agent_voice_config
    FOR EACH ROW
    EXECUTE FUNCTION update_pwa_agent_voice_config_updated_at();

-- Inserir configurações padrão na tabela estruturada
INSERT INTO pwa_agent_voice_config (module_id, voice, warmth, enthusiasm, pace, expressiveness, formality, speed)
VALUES
    ('home', 'nova', 70, 50, 50, 60, 30, 1.0),
    ('health', 'shimmer', 80, 40, 40, 70, 40, 0.95),
    ('ideas', 'coral', 60, 80, 70, 80, 20, 1.05),
    ('world', 'sage', 50, 50, 50, 60, 50, 1.0),
    ('help', 'echo', 65, 45, 45, 55, 35, 1.0)
ON CONFLICT (module_id) DO NOTHING;

-- ============================================================
-- Comentários na tabela
-- ============================================================
COMMENT ON TABLE pwa_agent_voice_config IS 'Configurações de humanização de voz por módulo do PWA IconsAI';
COMMENT ON COLUMN pwa_agent_voice_config.module_id IS 'Identificador do módulo (home, health, ideas, world, help)';
COMMENT ON COLUMN pwa_agent_voice_config.voice IS 'Voz OpenAI selecionada (nova, coral, shimmer, etc)';
COMMENT ON COLUMN pwa_agent_voice_config.warmth IS 'Nível de calor/acolhimento da voz (0-100)';
COMMENT ON COLUMN pwa_agent_voice_config.enthusiasm IS 'Nível de entusiasmo na fala (0-100)';
COMMENT ON COLUMN pwa_agent_voice_config.pace IS 'Ritmo/variação de velocidade (0-100)';
COMMENT ON COLUMN pwa_agent_voice_config.expressiveness IS 'Expressividade melódica (0-100)';
COMMENT ON COLUMN pwa_agent_voice_config.formality IS 'Nível de formalidade (0-100)';
COMMENT ON COLUMN pwa_agent_voice_config.speed IS 'Velocidade base da fala (0.5-1.5x)';
COMMENT ON COLUMN pwa_agent_voice_config.filler_words IS 'Usar palavras de preenchimento (então, olha, sabe)';
COMMENT ON COLUMN pwa_agent_voice_config.natural_breathing IS 'Incluir pausas de respiração';
COMMENT ON COLUMN pwa_agent_voice_config.emotional_responses IS 'Adaptar tom emocional ao contexto';
COMMENT ON COLUMN pwa_agent_voice_config.custom_instructions IS 'Instructions customizadas para gpt-4o-mini-tts';
