-- ============================================================
-- Migration: estabelecimentos_saude e escolas
-- Description: Create tables for health establishments and schools
-- Date: 2026-01-26
-- ============================================================

-- ============================================
-- ESTABELECIMENTOS DE SAÚDE (CNES)
-- ============================================

CREATE TABLE IF NOT EXISTS public.estabelecimentos_saude (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Identificação CNES
  cnes TEXT UNIQUE,
  cnpj TEXT,
  -- Nome e tipo
  nome_fantasia TEXT NOT NULL,
  razao_social TEXT,
  tipo_estabelecimento TEXT NOT NULL, -- HOSPITAL, UPA, UBS, CLINICA, etc.
  natureza_juridica TEXT,
  -- Localização
  codigo_ibge INTEGER REFERENCES public.municipios(codigo_ibge),
  endereco TEXT,
  numero TEXT,
  bairro TEXT,
  cep TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  -- Contato
  telefone TEXT,
  email TEXT,
  -- Características
  tipo_gestao TEXT, -- MUNICIPAL, ESTADUAL, FEDERAL
  vinculo_sus BOOLEAN DEFAULT true,
  atendimento_urgencia BOOLEAN DEFAULT false,
  atendimento_ambulatorial BOOLEAN DEFAULT false,
  atendimento_hospitalar BOOLEAN DEFAULT false,
  -- Especialidades (array de códigos)
  especialidades TEXT[] DEFAULT ARRAY[]::TEXT[],
  -- Metadados
  is_active BOOLEAN DEFAULT true,
  data_atualizacao_cnes DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para buscas otimizadas
CREATE INDEX IF NOT EXISTS idx_estab_saude_ibge ON public.estabelecimentos_saude(codigo_ibge);
CREATE INDEX IF NOT EXISTS idx_estab_saude_tipo ON public.estabelecimentos_saude(tipo_estabelecimento);
CREATE INDEX IF NOT EXISTS idx_estab_saude_cnes ON public.estabelecimentos_saude(cnes);
CREATE INDEX IF NOT EXISTS idx_estab_saude_geo ON public.estabelecimentos_saude(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_estab_saude_urg ON public.estabelecimentos_saude(atendimento_urgencia) WHERE atendimento_urgencia = true;

-- RLS
ALTER TABLE public.estabelecimentos_saude ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read health establishments"
  ON public.estabelecimentos_saude
  FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Service role has full access to health establishments"
  ON public.estabelecimentos_saude
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- ESCOLAS (CENSO ESCOLAR)
-- ============================================

CREATE TABLE IF NOT EXISTS public.escolas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Identificação INEP
  codigo_inep TEXT UNIQUE,
  -- Nome
  nome TEXT NOT NULL,
  -- Dependência administrativa
  dependencia_administrativa TEXT, -- FEDERAL, ESTADUAL, MUNICIPAL, PRIVADA
  -- Localização
  codigo_ibge INTEGER REFERENCES public.municipios(codigo_ibge),
  endereco TEXT,
  numero TEXT,
  bairro TEXT,
  cep TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  zona_localizacao TEXT, -- URBANA, RURAL
  -- Contato
  telefone TEXT,
  email TEXT,
  -- Características
  categoria_privada TEXT, -- COMUNITARIA, CONFESSIONAL, FILANTRÓPICA, PRIVADA
  conveniada_poder_publico BOOLEAN DEFAULT false,
  -- Etapas de ensino (array)
  etapas_ensino TEXT[] DEFAULT ARRAY[]::TEXT[],
  -- Ex: ['EDUCACAO_INFANTIL', 'ENSINO_FUNDAMENTAL', 'ENSINO_MEDIO']
  -- Modalidades
  educacao_especial BOOLEAN DEFAULT false,
  eja BOOLEAN DEFAULT false, -- Educação de Jovens e Adultos
  educacao_profissional BOOLEAN DEFAULT false,
  -- Infraestrutura (booleans)
  tem_biblioteca BOOLEAN DEFAULT false,
  tem_laboratorio_informatica BOOLEAN DEFAULT false,
  tem_quadra_esportiva BOOLEAN DEFAULT false,
  tem_internet BOOLEAN DEFAULT false,
  acessibilidade BOOLEAN DEFAULT false,
  -- Contagem
  total_matriculas INTEGER,
  total_docentes INTEGER,
  -- Metadados
  is_active BOOLEAN DEFAULT true,
  ano_censo INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_escolas_ibge ON public.escolas(codigo_ibge);
CREATE INDEX IF NOT EXISTS idx_escolas_inep ON public.escolas(codigo_inep);
CREATE INDEX IF NOT EXISTS idx_escolas_dep ON public.escolas(dependencia_administrativa);
CREATE INDEX IF NOT EXISTS idx_escolas_geo ON public.escolas(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_escolas_etapas ON public.escolas USING GIN(etapas_ensino);

-- RLS
ALTER TABLE public.escolas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read schools"
  ON public.escolas
  FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Service role has full access to schools"
  ON public.escolas
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_estabelecimentos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_estabelecimentos_saude_updated_at_trigger
  BEFORE UPDATE ON public.estabelecimentos_saude
  FOR EACH ROW
  EXECUTE FUNCTION update_estabelecimentos_updated_at();

CREATE TRIGGER update_escolas_updated_at_trigger
  BEFORE UPDATE ON public.escolas
  FOR EACH ROW
  EXECUTE FUNCTION update_estabelecimentos_updated_at();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.estabelecimentos_saude IS 'Estabelecimentos de saúde do CNES (Cadastro Nacional de Estabelecimentos de Saúde)';
COMMENT ON TABLE public.escolas IS 'Instituições de ensino do Censo Escolar INEP';
