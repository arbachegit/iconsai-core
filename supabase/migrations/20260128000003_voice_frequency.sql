-- ============================================================
-- Migration: Voice Frequency Analysis
-- Description: Análise detalhada de F0 e detecção de emoções
-- Date: 2026-01-28
-- Depends on: 20260127000000_pwa_conversations_sessions.sql
-- ============================================================

-- ============================================
-- 1. ADICIONAR CAMPOS DE VÍNCULO EM PWA_CONVERSATIONS
-- ============================================
ALTER TABLE public.pwa_conversations
ADD COLUMN IF NOT EXISTS platform_user_id UUID REFERENCES public.platform_users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL;

-- Índices para os novos campos
CREATE INDEX IF NOT EXISTS idx_pwa_conversations_platform_user ON public.pwa_conversations(platform_user_id) WHERE platform_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pwa_conversations_institution ON public.pwa_conversations(institution_id) WHERE institution_id IS NOT NULL;

-- ============================================
-- 2. TABELA DE ANÁLISE DE FREQUÊNCIA DE VOZ
-- Armazena dados detalhados de F0 para cada conversa
-- ============================================
CREATE TABLE IF NOT EXISTS public.voice_frequency_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relacionamento
  conversation_id UUID NOT NULL REFERENCES public.pwa_conversations(id) ON DELETE CASCADE,
  platform_user_id UUID REFERENCES public.platform_users(id) ON DELETE SET NULL,
  institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,

  -- Identificação do áudio
  audio_type TEXT NOT NULL CHECK (audio_type IN ('question', 'response')),
  audio_url TEXT,
  audio_duration_seconds NUMERIC(10,2),

  -- ============================================
  -- DADOS BRUTOS DE FREQUÊNCIA F0
  -- ============================================
  -- Array de amostras F0 (em Hz)
  f0_samples FLOAT[] DEFAULT '{}',
  -- Timestamps correspondentes (em segundos)
  f0_timestamps FLOAT[] DEFAULT '{}',
  -- Taxa de amostragem usada
  sample_rate INTEGER DEFAULT 100,

  -- ============================================
  -- MÉTRICAS ESTATÍSTICAS
  -- ============================================
  f0_mean FLOAT,           -- Média de F0 em Hz
  f0_median FLOAT,         -- Mediana de F0 em Hz
  f0_min FLOAT,            -- Mínimo de F0 em Hz
  f0_max FLOAT,            -- Máximo de F0 em Hz
  f0_range_hz FLOAT,       -- Amplitude (max - min) em Hz
  f0_range_semitones FLOAT,-- Amplitude em semitons
  f0_std_deviation FLOAT,  -- Desvio padrão
  f0_variance FLOAT,       -- Variância
  f0_percentile_25 FLOAT,  -- 25º percentil
  f0_percentile_75 FLOAT,  -- 75º percentil
  f0_iqr FLOAT,            -- Intervalo interquartil

  -- ============================================
  -- CONTORNO MELÓDICO
  -- ============================================
  -- Tipo de contorno predominante
  contour_type TEXT CHECK (contour_type IN (
    'ascending',    -- Subindo
    'descending',   -- Descendo
    'flat',         -- Plano
    'varied',       -- Variado (sem padrão claro)
    'peak',         -- Pico (sobe e desce)
    'valley',       -- Vale (desce e sobe)
    'rising_falling', -- Subindo depois descendo
    'falling_rising'  -- Descendo depois subindo
  )),
  -- Pontos de inflexão do contorno
  contour_points JSONB DEFAULT '[]',
  -- Slope geral (inclinação média)
  contour_slope FLOAT,

  -- ============================================
  -- DETECÇÃO DE EMOÇÃO
  -- ============================================
  -- Emoção primária detectada
  emotion TEXT CHECK (emotion IN (
    'neutral',   -- Neutro (F0 100-150 Hz, range 30-50)
    'happy',     -- Alegria (F0 150-200 Hz, range 80-120)
    'sad',       -- Tristeza (F0 80-120 Hz, range 20-40)
    'angry',     -- Raiva (F0 180-250 Hz, range 100-150)
    'fearful',   -- Medo (F0 150-220 Hz, range 80-130)
    'surprised', -- Surpresa (F0 200-280 Hz, range 120-180)
    'bored',     -- Tédio (F0 90-110 Hz, range 15-30)
    'anxious',   -- Ansiedade (F0 160-200 Hz, irregular)
    'confident', -- Confiança (F0 estável, range moderado)
    'uncertain'  -- Incerteza (F0 variável, contorno ascendente)
  )),
  -- Confiança da detecção (0-1)
  emotion_confidence FLOAT CHECK (emotion_confidence BETWEEN 0 AND 1),
  -- Emoção secundária (se houver)
  emotion_secondary TEXT,
  emotion_secondary_confidence FLOAT,
  -- Scores para cada emoção
  emotion_scores JSONB DEFAULT '{}',

  -- ============================================
  -- QUALIDADE DO ÁUDIO
  -- ============================================
  audio_quality_score FLOAT CHECK (audio_quality_score BETWEEN 0 AND 1),
  noise_level_db FLOAT,
  signal_to_noise_ratio FLOAT,
  clipping_detected BOOLEAN DEFAULT false,
  silence_percentage FLOAT,

  -- ============================================
  -- CARACTERÍSTICAS DA FALA
  -- ============================================
  -- Velocidade da fala
  speech_rate_wpm INTEGER,        -- Palavras por minuto
  speech_rate_syllables_sec FLOAT, -- Sílabas por segundo
  -- Pausas
  pause_count INTEGER,            -- Número de pausas
  avg_pause_duration FLOAT,       -- Duração média das pausas
  max_pause_duration FLOAT,       -- Pausa mais longa
  total_pause_duration FLOAT,     -- Duração total das pausas
  -- Energia/Volume
  energy_mean FLOAT,
  energy_variance FLOAT,
  -- Jitter e Shimmer (qualidade da voz)
  jitter_percentage FLOAT,        -- Variação de frequência
  shimmer_percentage FLOAT,       -- Variação de amplitude

  -- ============================================
  -- CARACTERÍSTICAS PROSÓDICAS
  -- ============================================
  prosody_features JSONB DEFAULT '{
    "stress_pattern": null,
    "rhythm_regularity": null,
    "intonation_pattern": null
  }',

  -- ============================================
  -- COMPARAÇÃO COM BASELINE
  -- ============================================
  -- Desvio do baseline do usuário
  deviation_from_baseline FLOAT,
  baseline_comparison JSONB DEFAULT '{}',

  -- ============================================
  -- METADADOS DO PROCESSAMENTO
  -- ============================================
  processing_version TEXT DEFAULT '1.0.0',
  processing_duration_ms INTEGER,
  processor_model TEXT,
  raw_analysis JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para voice_frequency_analysis
CREATE INDEX IF NOT EXISTS idx_voice_freq_conversation ON public.voice_frequency_analysis(conversation_id);
CREATE INDEX IF NOT EXISTS idx_voice_freq_user ON public.voice_frequency_analysis(platform_user_id) WHERE platform_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_voice_freq_institution ON public.voice_frequency_analysis(institution_id) WHERE institution_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_voice_freq_emotion ON public.voice_frequency_analysis(emotion);
CREATE INDEX IF NOT EXISTS idx_voice_freq_created_at ON public.voice_frequency_analysis(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_freq_type ON public.voice_frequency_analysis(audio_type);

-- ============================================
-- 3. TABELA DE BASELINE DO USUÁRIO
-- Armazena o padrão de voz base do usuário
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_voice_baseline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  platform_user_id UUID NOT NULL REFERENCES public.platform_users(id) ON DELETE CASCADE,

  -- Baseline de F0
  baseline_f0_mean FLOAT,
  baseline_f0_range FLOAT,
  baseline_f0_std FLOAT,

  -- Baseline de velocidade
  baseline_speech_rate FLOAT,
  baseline_pause_frequency FLOAT,

  -- Número de amostras usadas para calcular
  sample_count INTEGER DEFAULT 0,

  -- Período de coleta
  first_sample_at TIMESTAMPTZ,
  last_sample_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(platform_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_voice_baseline_user ON public.user_voice_baseline(platform_user_id);

-- ============================================
-- 4. FUNÇÃO PARA CALCULAR EMOÇÃO COM BASE EM F0
-- ============================================
CREATE OR REPLACE FUNCTION detect_emotion_from_f0(
  p_f0_mean FLOAT,
  p_f0_range FLOAT,
  p_speech_rate INTEGER DEFAULT NULL,
  p_contour_type TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_emotion TEXT;
  v_confidence FLOAT;
  v_scores JSONB;
BEGIN
  -- Inicializar scores
  v_scores := '{
    "neutral": 0,
    "happy": 0,
    "sad": 0,
    "angry": 0,
    "fearful": 0,
    "surprised": 0,
    "bored": 0
  }'::JSONB;

  -- Calcular scores baseado em F0 mean e range
  -- Baseado na tabela de correlatos acústicos

  -- Neutro: F0 100-150, range 30-50
  IF p_f0_mean BETWEEN 100 AND 150 AND p_f0_range BETWEEN 30 AND 50 THEN
    v_scores := jsonb_set(v_scores, '{neutral}',
      to_jsonb(0.8 - (ABS(p_f0_mean - 125) / 50.0) - (ABS(p_f0_range - 40) / 40.0)));
  END IF;

  -- Alegria: F0 150-200, range 80-120
  IF p_f0_mean BETWEEN 150 AND 200 AND p_f0_range BETWEEN 80 AND 120 THEN
    v_scores := jsonb_set(v_scores, '{happy}',
      to_jsonb(0.9 - (ABS(p_f0_mean - 175) / 50.0) - (ABS(p_f0_range - 100) / 80.0)));
  END IF;

  -- Tristeza: F0 80-120, range 20-40
  IF p_f0_mean BETWEEN 80 AND 120 AND p_f0_range BETWEEN 15 AND 40 THEN
    v_scores := jsonb_set(v_scores, '{sad}',
      to_jsonb(0.85 - (ABS(p_f0_mean - 100) / 40.0) - (ABS(p_f0_range - 30) / 30.0)));
  END IF;

  -- Raiva: F0 180-250, range 100-150
  IF p_f0_mean BETWEEN 180 AND 250 AND p_f0_range BETWEEN 100 AND 150 THEN
    v_scores := jsonb_set(v_scores, '{angry}',
      to_jsonb(0.9 - (ABS(p_f0_mean - 215) / 70.0) - (ABS(p_f0_range - 125) / 50.0)));
  END IF;

  -- Medo: F0 150-220, range 80-130
  IF p_f0_mean BETWEEN 150 AND 220 AND p_f0_range BETWEEN 80 AND 130 THEN
    v_scores := jsonb_set(v_scores, '{fearful}',
      to_jsonb(0.75 - (ABS(p_f0_mean - 185) / 70.0) - (ABS(p_f0_range - 105) / 50.0)));
  END IF;

  -- Surpresa: F0 200-280, range 120-180
  IF p_f0_mean BETWEEN 200 AND 280 AND p_f0_range BETWEEN 120 AND 180 THEN
    v_scores := jsonb_set(v_scores, '{surprised}',
      to_jsonb(0.85 - (ABS(p_f0_mean - 240) / 80.0) - (ABS(p_f0_range - 150) / 60.0)));
  END IF;

  -- Tédio: F0 90-110, range 15-30
  IF p_f0_mean BETWEEN 90 AND 110 AND p_f0_range BETWEEN 10 AND 30 THEN
    v_scores := jsonb_set(v_scores, '{bored}',
      to_jsonb(0.8 - (ABS(p_f0_mean - 100) / 20.0) - (ABS(p_f0_range - 22) / 20.0)));
  END IF;

  -- Ajustar com base no contorno
  IF p_contour_type = 'ascending' THEN
    v_scores := jsonb_set(v_scores, '{happy}',
      to_jsonb((v_scores->>'happy')::FLOAT + 0.1));
  ELSIF p_contour_type = 'descending' THEN
    v_scores := jsonb_set(v_scores, '{sad}',
      to_jsonb((v_scores->>'sad')::FLOAT + 0.1));
  ELSIF p_contour_type = 'flat' THEN
    v_scores := jsonb_set(v_scores, '{neutral}',
      to_jsonb((v_scores->>'neutral')::FLOAT + 0.1));
    v_scores := jsonb_set(v_scores, '{bored}',
      to_jsonb((v_scores->>'bored')::FLOAT + 0.05));
  END IF;

  -- Ajustar com base na velocidade da fala
  IF p_speech_rate IS NOT NULL THEN
    IF p_speech_rate > 180 THEN
      v_scores := jsonb_set(v_scores, '{angry}',
        to_jsonb((v_scores->>'angry')::FLOAT + 0.1));
      v_scores := jsonb_set(v_scores, '{happy}',
        to_jsonb((v_scores->>'happy')::FLOAT + 0.05));
    ELSIF p_speech_rate < 100 THEN
      v_scores := jsonb_set(v_scores, '{sad}',
        to_jsonb((v_scores->>'sad')::FLOAT + 0.1));
      v_scores := jsonb_set(v_scores, '{bored}',
        to_jsonb((v_scores->>'bored')::FLOAT + 0.05));
    END IF;
  END IF;

  -- Encontrar emoção com maior score
  SELECT key INTO v_emotion
  FROM jsonb_each_text(v_scores)
  ORDER BY value::FLOAT DESC
  LIMIT 1;

  -- Obter confiança
  v_confidence := GREATEST(0, LEAST(1, (v_scores->>v_emotion)::FLOAT));

  -- Se confiança muito baixa, retornar neutro
  IF v_confidence < 0.3 THEN
    v_emotion := 'neutral';
    v_confidence := 0.5;
  END IF;

  RETURN jsonb_build_object(
    'emotion', v_emotion,
    'confidence', ROUND(v_confidence::NUMERIC, 2),
    'scores', v_scores
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 5. FUNÇÃO PARA ATUALIZAR BASELINE DO USUÁRIO
-- ============================================
CREATE OR REPLACE FUNCTION update_user_voice_baseline(
  p_platform_user_id UUID,
  p_f0_mean FLOAT,
  p_f0_range FLOAT,
  p_f0_std FLOAT,
  p_speech_rate FLOAT,
  p_pause_frequency FLOAT
)
RETURNS VOID AS $$
DECLARE
  v_current RECORD;
  v_new_mean FLOAT;
  v_new_range FLOAT;
  v_new_std FLOAT;
  v_new_rate FLOAT;
  v_new_pause FLOAT;
BEGIN
  -- Buscar baseline atual
  SELECT * INTO v_current
  FROM public.user_voice_baseline
  WHERE platform_user_id = p_platform_user_id;

  IF v_current IS NULL THEN
    -- Criar novo baseline
    INSERT INTO public.user_voice_baseline (
      platform_user_id,
      baseline_f0_mean,
      baseline_f0_range,
      baseline_f0_std,
      baseline_speech_rate,
      baseline_pause_frequency,
      sample_count,
      first_sample_at,
      last_sample_at
    ) VALUES (
      p_platform_user_id,
      p_f0_mean,
      p_f0_range,
      p_f0_std,
      p_speech_rate,
      p_pause_frequency,
      1,
      now(),
      now()
    );
  ELSE
    -- Calcular média móvel exponencial (peso 0.1 para nova amostra)
    v_new_mean := v_current.baseline_f0_mean * 0.9 + p_f0_mean * 0.1;
    v_new_range := v_current.baseline_f0_range * 0.9 + p_f0_range * 0.1;
    v_new_std := v_current.baseline_f0_std * 0.9 + p_f0_std * 0.1;
    v_new_rate := v_current.baseline_speech_rate * 0.9 + p_speech_rate * 0.1;
    v_new_pause := v_current.baseline_pause_frequency * 0.9 + p_pause_frequency * 0.1;

    UPDATE public.user_voice_baseline
    SET
      baseline_f0_mean = v_new_mean,
      baseline_f0_range = v_new_range,
      baseline_f0_std = v_new_std,
      baseline_speech_rate = v_new_rate,
      baseline_pause_frequency = v_new_pause,
      sample_count = sample_count + 1,
      last_sample_at = now(),
      updated_at = now()
    WHERE platform_user_id = p_platform_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- ============================================
-- 6. VIEW PARA ESTATÍSTICAS DE EMOÇÃO POR USUÁRIO
-- ============================================
CREATE OR REPLACE VIEW public.user_emotion_stats AS
SELECT
  vfa.platform_user_id,
  pu.full_name as user_name,
  pu.institution_id,
  i.name as institution_name,
  vfa.emotion,
  COUNT(*) as count,
  AVG(vfa.emotion_confidence) as avg_confidence,
  AVG(vfa.f0_mean) as avg_f0_mean,
  AVG(vfa.f0_range_hz) as avg_f0_range,
  AVG(vfa.speech_rate_wpm) as avg_speech_rate,
  DATE_TRUNC('day', vfa.created_at) as date
FROM public.voice_frequency_analysis vfa
LEFT JOIN public.platform_users pu ON vfa.platform_user_id = pu.id
LEFT JOIN public.institutions i ON pu.institution_id = i.id
WHERE vfa.emotion IS NOT NULL
  AND vfa.audio_type = 'question'
GROUP BY
  vfa.platform_user_id,
  pu.full_name,
  pu.institution_id,
  i.name,
  vfa.emotion,
  DATE_TRUNC('day', vfa.created_at);

-- ============================================
-- 7. VIEW PARA TIMELINE DE EMOÇÕES
-- ============================================
CREATE OR REPLACE VIEW public.emotion_timeline AS
SELECT
  vfa.id,
  vfa.conversation_id,
  vfa.platform_user_id,
  pu.full_name as user_name,
  vfa.institution_id,
  pc.module_slug,
  vfa.audio_type,
  vfa.emotion,
  vfa.emotion_confidence,
  vfa.emotion_secondary,
  vfa.f0_mean,
  vfa.f0_range_hz,
  vfa.contour_type,
  vfa.speech_rate_wpm,
  vfa.created_at
FROM public.voice_frequency_analysis vfa
LEFT JOIN public.platform_users pu ON vfa.platform_user_id = pu.id
LEFT JOIN public.pwa_conversations pc ON vfa.conversation_id = pc.id
WHERE vfa.emotion IS NOT NULL
ORDER BY vfa.created_at DESC;

-- ============================================
-- 8. RLS POLICIES
-- ============================================

-- Voice Frequency Analysis
ALTER TABLE public.voice_frequency_analysis ENABLE ROW LEVEL SECURITY;

-- Super-admins podem ver todas as análises
CREATE POLICY "Superadmins can view all voice analysis"
  ON public.voice_frequency_analysis FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_users
      WHERE auth_user_id = auth.uid()
        AND role = 'superadmin'
        AND status = 'active'
    )
  );

-- Admins podem ver análises de sua instituição
CREATE POLICY "Admins can view institution voice analysis"
  ON public.voice_frequency_analysis FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_users
      WHERE auth_user_id = auth.uid()
        AND role = 'admin'
        AND status = 'active'
        AND institution_id = voice_frequency_analysis.institution_id
    )
  );

-- Usuários podem ver suas próprias análises
CREATE POLICY "Users can view own voice analysis"
  ON public.voice_frequency_analysis FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_users
      WHERE auth_user_id = auth.uid()
        AND id = voice_frequency_analysis.platform_user_id
    )
  );

-- Service role tem acesso total
CREATE POLICY "Service role has full access to voice analysis"
  ON public.voice_frequency_analysis FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- User Voice Baseline
ALTER TABLE public.user_voice_baseline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to voice baseline"
  ON public.user_voice_baseline FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Users can view own baseline"
  ON public.user_voice_baseline FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_users
      WHERE auth_user_id = auth.uid()
        AND id = user_voice_baseline.platform_user_id
    )
  );

-- ============================================
-- COMENTÁRIOS
-- ============================================
COMMENT ON TABLE public.voice_frequency_analysis IS 'Análise detalhada de frequência F0 e detecção de emoções';
COMMENT ON TABLE public.user_voice_baseline IS 'Padrão de voz base do usuário para comparação';
COMMENT ON COLUMN public.voice_frequency_analysis.f0_mean IS 'Frequência fundamental média em Hz';
COMMENT ON COLUMN public.voice_frequency_analysis.f0_range_hz IS 'Amplitude de F0 (max-min) em Hz';
COMMENT ON COLUMN public.voice_frequency_analysis.emotion IS 'Emoção detectada baseada em F0 e características prosódicas';
COMMENT ON FUNCTION detect_emotion_from_f0 IS 'Detecta emoção baseada em F0 mean, range e características de fala';
COMMENT ON VIEW public.user_emotion_stats IS 'Estatísticas de emoções por usuário e data';
COMMENT ON VIEW public.emotion_timeline IS 'Timeline de emoções detectadas nas conversas';

-- ============================================
-- LOG
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '=========================================';
  RAISE NOTICE 'Voice Frequency Analysis criado!';
  RAISE NOTICE '';
  RAISE NOTICE 'Tabelas criadas:';
  RAISE NOTICE '- voice_frequency_analysis';
  RAISE NOTICE '- user_voice_baseline';
  RAISE NOTICE '';
  RAISE NOTICE 'Views criadas:';
  RAISE NOTICE '- user_emotion_stats';
  RAISE NOTICE '- emotion_timeline';
  RAISE NOTICE '';
  RAISE NOTICE 'Funções criadas:';
  RAISE NOTICE '- detect_emotion_from_f0()';
  RAISE NOTICE '- update_user_voice_baseline()';
  RAISE NOTICE '';
  RAISE NOTICE 'Colunas adicionadas em pwa_conversations:';
  RAISE NOTICE '- platform_user_id';
  RAISE NOTICE '- institution_id';
  RAISE NOTICE '=========================================';
END $$;
