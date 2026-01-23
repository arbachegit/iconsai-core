-- ============================================
-- Criar Agentes PWA: Mundo, Ajuda, Ideias, Saúde
-- Deploy: 2026-01-23
--
-- Cria os 4 agentes principais do PWA IconsAI Business
-- com campos de escopo aprovado e proibído no metadata
-- ============================================

-- Agente: Mundo
INSERT INTO public.chat_agents (
  id,
  name,
  description,
  is_active,
  system_prompt,
  temperature,
  max_tokens,
  model,
  metadata,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Mundo',
  'Agente especializado em notícias, atualidades e conhecimentos gerais sobre o mundo.',
  true,
  'Você é um assistente especializado em notícias, atualidades e conhecimentos gerais. Forneça informações precisas e atualizadas sobre eventos mundiais, geografia, cultura e sociedade. Seja objetivo e imparcial nas suas respostas.',
  0.7,
  4096,
  'default',
  jsonb_build_object(
    'allowedScope', '',
    'forbiddenScope', '',
    'module', 'world',
    'icon', 'Globe',
    'color', '#10B981'
  ),
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- Agente: Ajuda
INSERT INTO public.chat_agents (
  id,
  name,
  description,
  is_active,
  system_prompt,
  temperature,
  max_tokens,
  model,
  metadata,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Ajuda',
  'Agente de suporte e assistência ao usuário.',
  true,
  'Você é um assistente de suporte amigável e prestativo. Ajude os usuários com dúvidas sobre o aplicativo, funcionalidades e navegação. Seja paciente, claro e didático nas explicações.',
  0.5,
  4096,
  'default',
  jsonb_build_object(
    'allowedScope', '',
    'forbiddenScope', '',
    'module', 'help',
    'icon', 'HelpCircle',
    'color', '#6366F1'
  ),
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- Agente: Ideias
INSERT INTO public.chat_agents (
  id,
  name,
  description,
  is_active,
  system_prompt,
  temperature,
  max_tokens,
  model,
  metadata,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Ideias',
  'Agente criativo para brainstorming e geração de ideias.',
  true,
  'Você é um assistente criativo especializado em brainstorming e geração de ideias. Ajude os usuários a pensar fora da caixa, explore possibilidades e sugira soluções inovadoras. Seja entusiasmado e incentive a criatividade.',
  0.9,
  4096,
  'default',
  jsonb_build_object(
    'allowedScope', '',
    'forbiddenScope', '',
    'module', 'ideas',
    'icon', 'Lightbulb',
    'color', '#F59E0B'
  ),
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- Agente: Saúde
INSERT INTO public.chat_agents (
  id,
  name,
  description,
  is_active,
  system_prompt,
  temperature,
  max_tokens,
  model,
  metadata,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Saúde',
  'Agente especializado em bem-estar, saúde e qualidade de vida.',
  true,
  'Você é um assistente especializado em bem-estar e qualidade de vida. Forneça informações sobre hábitos saudáveis, alimentação equilibrada, exercícios e cuidados com a saúde mental. Sempre recomende consultar profissionais de saúde para questões específicas.',
  0.6,
  4096,
  'default',
  jsonb_build_object(
    'allowedScope', '',
    'forbiddenScope', '',
    'module', 'health',
    'icon', 'Heart',
    'color', '#FF6B6B'
  ),
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- ============================================
-- Log de conclusão
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'Agentes PWA criados com sucesso!';
  RAISE NOTICE '';
  RAISE NOTICE '1. Mundo - Notícias e atualidades';
  RAISE NOTICE '2. Ajuda - Suporte ao usuário';
  RAISE NOTICE '3. Ideias - Brainstorming criativo';
  RAISE NOTICE '4. Saúde - Bem-estar e qualidade de vida';
  RAISE NOTICE '';
  RAISE NOTICE 'Cada agente possui campos de escopo no metadata:';
  RAISE NOTICE '- allowedScope: O que o agente PODE fazer';
  RAISE NOTICE '- forbiddenScope: O que o agente NAO PODE fazer';
  RAISE NOTICE '=========================================';
END $$;
