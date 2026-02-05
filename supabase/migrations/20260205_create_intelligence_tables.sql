-- ============================================================
-- Migração: Sistema de Inteligência Competitiva
-- Data: 2026-02-05
-- ============================================================

-- ============================================================
-- DIMENSÕES
-- ============================================================

-- dim_clientes: Nossos clientes que fazem pesquisas
CREATE TABLE IF NOT EXISTS dim_clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  cnpj VARCHAR(14) UNIQUE,
  email VARCHAR(255),
  plano VARCHAR(50) DEFAULT 'free', -- free, basic, pro, enterprise
  creditos_restantes INT DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- dim_empresas: Todas as empresas pesquisadas (clientes e concorrentes)
CREATE TABLE IF NOT EXISTS dim_empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  nome_fantasia VARCHAR(255),
  cnpj VARCHAR(14) UNIQUE,
  website VARCHAR(500),
  setor VARCHAR(255),
  porte VARCHAR(50), -- MEI, ME, EPP, MEDIO, GRANDE
  uf VARCHAR(2),
  cidade VARCHAR(255),
  endereco TEXT,
  telefone VARCHAR(20),
  email VARCHAR(255),
  data_abertura DATE,
  situacao VARCHAR(50), -- ATIVA, BAIXADA, SUSPENSA
  natureza_juridica VARCHAR(255),
  capital_social DECIMAL(15,2),
  -- Dados enriquecidos
  descricao_site TEXT,
  missao TEXT,
  visao TEXT,
  valores TEXT,
  produtos_servicos TEXT[],
  redes_sociais JSONB DEFAULT '{}',
  -- Metadados
  fonte_dados VARCHAR(50)[], -- ['brasilapi', 'website', 'perplexity']
  ultima_atualizacao TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- dim_pessoas: Pessoas (funcionários, sócios, políticos)
CREATE TABLE IF NOT EXISTS dim_pessoas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  slug VARCHAR(100), -- 'funcionario', 'socio', 'politico', 'executivo'
  cpf VARCHAR(11),
  email VARCHAR(255),
  telefone VARCHAR(20),
  cargo VARCHAR(255),
  -- LinkedIn
  linkedin_url VARCHAR(500),
  linkedin_headline VARCHAR(500),
  linkedin_resumo TEXT,
  linkedin_experiencias JSONB DEFAULT '[]',
  linkedin_formacao JSONB DEFAULT '[]',
  linkedin_habilidades TEXT[],
  -- Instagram
  instagram_url VARCHAR(500),
  instagram_bio TEXT,
  instagram_seguidores INT,
  -- Político específico
  partido VARCHAR(50),
  cargo_politico VARCHAR(255),
  mandatos JSONB DEFAULT '[]',
  projetos_lei JSONB DEFAULT '[]',
  votacoes JSONB DEFAULT '[]',
  patrimonio_declarado DECIMAL(15,2),
  -- Metadados
  fonte_dados VARCHAR(50)[],
  ultima_atualizacao TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- dim_fontes: Fontes de dados disponíveis
CREATE TABLE IF NOT EXISTS dim_fontes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL UNIQUE,
  tipo VARCHAR(50), -- 'api', 'scraping', 'llm'
  url_base VARCHAR(500),
  creditos_por_request INT DEFAULT 1,
  ativo BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}'
);

-- ============================================================
-- FATOS
-- ============================================================

-- fato_pesquisas: Log de todas as pesquisas realizadas
CREATE TABLE IF NOT EXISTS fato_pesquisas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES dim_clientes(id),
  tipo VARCHAR(50) NOT NULL, -- 'empresa', 'pessoa', 'concorrente', 'politico'
  termo_busca VARCHAR(500),
  empresa_id UUID REFERENCES dim_empresas(id),
  pessoa_id UUID REFERENCES dim_pessoas(id),
  status VARCHAR(50) DEFAULT 'pendente', -- 'pendente', 'processando', 'concluido', 'erro'
  creditos_consumidos INT DEFAULT 0,
  fontes_utilizadas VARCHAR(50)[],
  tempo_processamento_ms INT,
  erro_mensagem TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- fato_analise_empresa: Análises de empresas via LLM
CREATE TABLE IF NOT EXISTS fato_analise_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES dim_empresas(id) NOT NULL,
  pesquisa_id UUID REFERENCES fato_pesquisas(id),
  -- Análise SWOT
  pontos_fortes TEXT[],
  pontos_fracos TEXT[],
  oportunidades TEXT[],
  ameacas TEXT[],
  -- Foco e estratégia
  foco_principal TEXT,
  proposta_valor TEXT,
  diferencial_competitivo TEXT,
  publico_alvo TEXT,
  -- OKRs sugeridos
  okrs_sugeridos JSONB DEFAULT '[]', -- [{objetivo, key_results: []}]
  -- Comunicação
  tom_comunicacao VARCHAR(100), -- formal, informal, técnico, amigável
  mensagem_principal TEXT,
  palavras_chave TEXT[],
  -- Score (0-100)
  score_presenca_digital INT,
  score_clareza_proposta INT,
  score_profissionalismo INT,
  -- Metadados
  modelo_llm VARCHAR(50), -- 'claude-3-opus', 'gpt-4', etc
  prompt_versao VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- fato_analise_pessoa: Análises de pessoas via LLM
CREATE TABLE IF NOT EXISTS fato_analise_pessoa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id UUID REFERENCES dim_pessoas(id) NOT NULL,
  empresa_id UUID REFERENCES dim_empresas(id), -- empresa relacionada
  pesquisa_id UUID REFERENCES fato_pesquisas(id),
  -- Análise de perfil
  pontos_fortes TEXT[],
  areas_experiencia TEXT[],
  nivel_senioridade VARCHAR(50), -- junior, pleno, senior, especialista, executivo
  -- Alinhamento
  alinhamento_empresa INT, -- 0-100, quão alinhado está com a empresa
  justificativa_alinhamento TEXT,
  -- Para políticos
  analise_atuacao TEXT,
  posicionamentos_principais JSONB DEFAULT '[]',
  controversias TEXT[],
  -- Score
  score_perfil_profissional INT,
  score_influencia INT,
  -- Metadados
  modelo_llm VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- fato_concorrencia: Relação entre empresa cliente e concorrentes
CREATE TABLE IF NOT EXISTS fato_concorrencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_cliente_id UUID REFERENCES dim_empresas(id) NOT NULL,
  empresa_concorrente_id UUID REFERENCES dim_empresas(id) NOT NULL,
  pesquisa_id UUID REFERENCES fato_pesquisas(id),
  -- Análise comparativa
  nivel_concorrencia VARCHAR(50), -- 'direto', 'indireto', 'potencial'
  sobreposicao_mercado INT, -- 0-100
  -- Comparação
  vantagens_cliente TEXT[],
  vantagens_concorrente TEXT[],
  diferenciais_unicos_cliente TEXT[],
  diferenciais_unicos_concorrente TEXT[],
  -- Recomendações
  recomendacoes TEXT[],
  -- Metadados
  modelo_llm VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(empresa_cliente_id, empresa_concorrente_id)
);

-- fato_pessoa_empresa: Relação pessoa-empresa
CREATE TABLE IF NOT EXISTS fato_pessoa_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id UUID REFERENCES dim_pessoas(id) NOT NULL,
  empresa_id UUID REFERENCES dim_empresas(id) NOT NULL,
  tipo_relacao VARCHAR(50), -- 'socio', 'funcionario', 'executivo', 'conselheiro'
  cargo VARCHAR(255),
  data_inicio DATE,
  data_fim DATE,
  participacao_societaria DECIMAL(5,2), -- % de participação
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(pessoa_id, empresa_id, tipo_relacao)
);

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_dim_empresas_cnpj ON dim_empresas(cnpj);
CREATE INDEX IF NOT EXISTS idx_dim_empresas_nome ON dim_empresas(nome);
CREATE INDEX IF NOT EXISTS idx_dim_empresas_setor ON dim_empresas(setor);
CREATE INDEX IF NOT EXISTS idx_dim_pessoas_slug ON dim_pessoas(slug);
CREATE INDEX IF NOT EXISTS idx_dim_pessoas_nome ON dim_pessoas(nome);
CREATE INDEX IF NOT EXISTS idx_fato_pesquisas_cliente ON fato_pesquisas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_fato_pesquisas_status ON fato_pesquisas(status);
CREATE INDEX IF NOT EXISTS idx_fato_analise_empresa_empresa ON fato_analise_empresa(empresa_id);
CREATE INDEX IF NOT EXISTS idx_fato_concorrencia_cliente ON fato_concorrencia(empresa_cliente_id);

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================

ALTER TABLE dim_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE dim_pessoas ENABLE ROW LEVEL SECURITY;
ALTER TABLE fato_pesquisas ENABLE ROW LEVEL SECURITY;
ALTER TABLE fato_analise_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE fato_analise_pessoa ENABLE ROW LEVEL SECURITY;
ALTER TABLE fato_concorrencia ENABLE ROW LEVEL SECURITY;

-- Policy: Admins podem ver tudo
CREATE POLICY "Admins full access dim_clientes" ON dim_clientes FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
);

CREATE POLICY "Admins full access dim_empresas" ON dim_empresas FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
);

CREATE POLICY "Admins full access dim_pessoas" ON dim_pessoas FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
);

CREATE POLICY "Admins full access fato_pesquisas" ON fato_pesquisas FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
);

CREATE POLICY "Admins full access fato_analise_empresa" ON fato_analise_empresa FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
);

CREATE POLICY "Admins full access fato_analise_pessoa" ON fato_analise_pessoa FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
);

CREATE POLICY "Admins full access fato_concorrencia" ON fato_concorrencia FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin'))
);

-- ============================================================
-- DADOS INICIAIS: Fontes
-- ============================================================

INSERT INTO dim_fontes (nome, tipo, url_base, creditos_por_request, config) VALUES
  ('brasilapi', 'api', 'https://brasilapi.com.br/api', 0, '{"endpoints": {"cnpj": "/cnpj/v1/{cnpj}"}}'),
  ('perplexity', 'llm', 'https://api.perplexity.ai', 1, '{"model": "llama-3.1-sonar-large-128k-online"}'),
  ('claude', 'llm', 'https://api.anthropic.com', 2, '{"model": "claude-3-5-sonnet-20241022"}'),
  ('proxycurl', 'api', 'https://nubela.co/proxycurl/api', 5, '{"endpoints": {"person": "/v2/linkedin", "company": "/linkedin/company"}}'),
  ('website_scraper', 'scraping', NULL, 1, '{"max_pages": 5}'),
  ('google_search', 'api', 'https://www.googleapis.com/customsearch/v1', 1, '{}'),
  ('instagram_graph', 'api', 'https://graph.instagram.com', 2, '{}')
ON CONFLICT (nome) DO NOTHING;

-- ============================================================
-- COMENTÁRIOS
-- ============================================================

COMMENT ON TABLE dim_clientes IS 'Clientes que utilizam o sistema de inteligência';
COMMENT ON TABLE dim_empresas IS 'Empresas pesquisadas (clientes e concorrentes)';
COMMENT ON TABLE dim_pessoas IS 'Pessoas: funcionários, sócios, políticos';
COMMENT ON TABLE fato_pesquisas IS 'Log de todas as pesquisas realizadas';
COMMENT ON TABLE fato_analise_empresa IS 'Análises SWOT e OKRs via LLM';
COMMENT ON TABLE fato_analise_pessoa IS 'Análises de perfil de pessoas via LLM';
COMMENT ON TABLE fato_concorrencia IS 'Análise comparativa entre empresas';
