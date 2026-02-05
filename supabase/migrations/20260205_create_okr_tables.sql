-- ============================================================
-- Migração: Sistema de OKRs com Análise de Alinhamento
-- Data: 2026-02-05
-- ============================================================

-- ============================================================
-- TABELAS DE OKRs DEFINIDOS (importados do Excel)
-- ============================================================

-- okr_ciclos: Ciclos de OKR (trimestral, anual)
CREATE TABLE IF NOT EXISTS okr_ciclos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES dim_empresas(id),
  cliente_id UUID REFERENCES dim_clientes(id),
  nome VARCHAR(255) NOT NULL, -- "FY 2026", "Q1 2026"
  descricao TEXT,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'ativo', -- ativo, encerrado, planejamento
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- okr_areas: Áreas/Times da empresa
CREATE TABLE IF NOT EXISTS okr_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ciclo_id UUID REFERENCES okr_ciclos(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL, -- "Onboarding", "CS", "Operations"
  responsavel VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- okr_objetivos: Objetivos estratégicos
CREATE TABLE IF NOT EXISTS okr_objetivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ciclo_id UUID REFERENCES okr_ciclos(id) ON DELETE CASCADE,
  area_id UUID REFERENCES okr_areas(id) ON DELETE CASCADE,
  titulo VARCHAR(500) NOT NULL,
  descricao TEXT,
  prioridade INT DEFAULT 1, -- 1 = alta, 2 = média, 3 = baixa
  status VARCHAR(50) DEFAULT 'nao_iniciado', -- nao_iniciado, em_progresso, concluido, atrasado
  progresso_percentual DECIMAL(5,2) DEFAULT 0,
  prazo DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- okr_key_results: Key Results (métricas)
CREATE TABLE IF NOT EXISTS okr_key_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objetivo_id UUID REFERENCES okr_objetivos(id) ON DELETE CASCADE,
  titulo VARCHAR(500) NOT NULL,
  formula TEXT, -- Como é calculado
  fonte_informacao VARCHAR(255), -- ClickUp, Planilha, etc
  metrica VARCHAR(100),
  unidade VARCHAR(50), -- %, Número, Horas, Dias
  direcao VARCHAR(20) DEFAULT 'maximizar', -- maximizar, minimizar
  baseline DECIMAL(15,2),
  meta DECIMAL(15,2),
  valor_atual DECIMAL(15,2),
  prazo DATE,
  status VARCHAR(50) DEFAULT 'nao_iniciado',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- TABELAS DE ANÁLISE
-- ============================================================

-- okr_analise_alinhamento: Análise de alinhamento OKR vs Percepção Externa
CREATE TABLE IF NOT EXISTS okr_analise_alinhamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ciclo_id UUID REFERENCES okr_ciclos(id) ON DELETE CASCADE,
  empresa_analise_id UUID REFERENCES fato_analise_empresa(id),
  -- Scores gerais
  score_alinhamento_geral INT, -- 0-100
  score_coerencia INT, -- 0-100
  score_diferenciacao INT, -- 0-100
  score_viabilidade INT, -- 0-100
  -- Análise de contexto
  analise_cenario_politico TEXT,
  analise_cenario_economico TEXT,
  analise_cenario_mercado TEXT,
  -- Resumos
  resumo_executivo TEXT,
  principais_gaps TEXT[],
  principais_riscos TEXT[],
  principais_oportunidades TEXT[],
  -- Metadados
  modelo_llm VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- okr_analise_objetivo: Análise individual de cada objetivo
CREATE TABLE IF NOT EXISTS okr_analise_objetivo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objetivo_id UUID REFERENCES okr_objetivos(id) ON DELETE CASCADE,
  analise_alinhamento_id UUID REFERENCES okr_analise_alinhamento(id) ON DELETE CASCADE,
  -- Comparação com percepção externa
  alinhamento_percepcao_externa INT, -- 0-100
  justificativa_alinhamento TEXT,
  -- Grau de dificuldade
  grau_dificuldade VARCHAR(20), -- baixo, medio, alto, muito_alto
  fatores_dificuldade TEXT[],
  -- Riscos
  riscos TEXT[],
  probabilidade_risco VARCHAR(20), -- baixa, media, alta
  impacto_risco VARCHAR(20), -- baixo, medio, alto
  -- SWOT do objetivo
  forcas TEXT[],
  fraquezas TEXT[],
  oportunidades TEXT[],
  ameacas TEXT[],
  -- Comparativo com concorrentes
  posicao_vs_concorrentes VARCHAR(50), -- atras, alinhado, a_frente, diferenciado
  observacao_concorrentes TEXT,
  -- Recomendações
  recomendacoes TEXT[],
  acoes_mitigacao TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- okr_objetivos_observados: Objetivos observados na análise externa
CREATE TABLE IF NOT EXISTS okr_objetivos_observados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES dim_empresas(id),
  analise_empresa_id UUID REFERENCES fato_analise_empresa(id),
  -- Objetivo observado
  titulo VARCHAR(500) NOT NULL,
  descricao TEXT,
  fonte VARCHAR(100), -- website, linkedin, perplexity
  evidencias TEXT[], -- Citações/trechos que indicam o objetivo
  confianca INT, -- 0-100 (quão confiante estamos que é um objetivo real)
  -- Classificação
  categoria VARCHAR(100), -- crescimento, eficiencia, inovacao, cliente, etc
  tipo VARCHAR(50), -- estrategico, tatico, operacional
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_okr_ciclos_empresa ON okr_ciclos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_okr_ciclos_cliente ON okr_ciclos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_okr_objetivos_ciclo ON okr_objetivos(ciclo_id);
CREATE INDEX IF NOT EXISTS idx_okr_objetivos_area ON okr_objetivos(area_id);
CREATE INDEX IF NOT EXISTS idx_okr_key_results_objetivo ON okr_key_results(objetivo_id);
CREATE INDEX IF NOT EXISTS idx_okr_analise_ciclo ON okr_analise_alinhamento(ciclo_id);
CREATE INDEX IF NOT EXISTS idx_okr_objetivos_observados_empresa ON okr_objetivos_observados(empresa_id);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE okr_ciclos ENABLE ROW LEVEL SECURITY;
ALTER TABLE okr_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE okr_objetivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE okr_key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE okr_analise_alinhamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE okr_analise_objetivo ENABLE ROW LEVEL SECURITY;
ALTER TABLE okr_objetivos_observados ENABLE ROW LEVEL SECURITY;

-- Policy: Admins podem ver tudo
CREATE POLICY "Admins full access okr_ciclos" ON okr_ciclos FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
);

CREATE POLICY "Admins full access okr_areas" ON okr_areas FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
);

CREATE POLICY "Admins full access okr_objetivos" ON okr_objetivos FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
);

CREATE POLICY "Admins full access okr_key_results" ON okr_key_results FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
);

CREATE POLICY "Admins full access okr_analise_alinhamento" ON okr_analise_alinhamento FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
);

CREATE POLICY "Admins full access okr_analise_objetivo" ON okr_analise_objetivo FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
);

CREATE POLICY "Admins full access okr_objetivos_observados" ON okr_objetivos_observados FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
);

-- ============================================================
-- COMENTÁRIOS
-- ============================================================

COMMENT ON TABLE okr_ciclos IS 'Ciclos de OKR (FY, trimestral)';
COMMENT ON TABLE okr_areas IS 'Áreas/times dentro de um ciclo';
COMMENT ON TABLE okr_objetivos IS 'Objetivos estratégicos definidos';
COMMENT ON TABLE okr_key_results IS 'Key Results com métricas';
COMMENT ON TABLE okr_analise_alinhamento IS 'Análise de alinhamento OKR vs percepção externa';
COMMENT ON TABLE okr_analise_objetivo IS 'Análise individual de cada objetivo';
COMMENT ON TABLE okr_objetivos_observados IS 'Objetivos identificados na análise externa';
