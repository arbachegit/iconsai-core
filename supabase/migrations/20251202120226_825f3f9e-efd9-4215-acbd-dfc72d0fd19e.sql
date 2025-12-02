-- Criar tabela system_increments para rastrear mudanças no banco de dados
CREATE TABLE public.system_increments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Quem causou a mudança
  triggered_by_user_id UUID,
  triggered_by_email TEXT NOT NULL,
  
  -- O que aconteceu
  operation_type TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE', 'BULK_INSERT'
  operation_source TEXT NOT NULL, -- 'document_upload', 'tag_suggestion', 'config_update', etc.
  
  -- Onde foi afetado
  tables_affected TEXT[] NOT NULL, -- ['documents', 'document_chunks', 'document_tags']
  
  -- Resumo
  summary TEXT NOT NULL,
  
  -- Detalhes estruturados (sem conteúdo, apenas metadados)
  details JSONB DEFAULT '{}'::jsonb
);

-- Habilitar RLS
ALTER TABLE public.system_increments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins podem ler incrementos"
  ON public.system_increments
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Sistema pode inserir incrementos"
  ON public.system_increments
  FOR INSERT
  WITH CHECK (true);

-- Índices para performance
CREATE INDEX idx_system_increments_timestamp ON public.system_increments(timestamp DESC);
CREATE INDEX idx_system_increments_operation_type ON public.system_increments(operation_type);
CREATE INDEX idx_system_increments_operation_source ON public.system_increments(operation_source);
CREATE INDEX idx_system_increments_triggered_by ON public.system_increments(triggered_by_email);