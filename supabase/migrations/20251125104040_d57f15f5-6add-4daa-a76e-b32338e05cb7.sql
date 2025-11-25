-- Tabela para tracking de consumo de créditos Lovable AI
CREATE TABLE IF NOT EXISTS public.credits_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  operation_type TEXT NOT NULL, -- 'image_generation', 'chat', etc
  credits_consumed INTEGER DEFAULT 1,
  success BOOLEAN NOT NULL,
  error_code TEXT,
  section_id TEXT,
  metadata JSONB
);

-- Index para queries por data
CREATE INDEX IF NOT EXISTS idx_credits_usage_created_at ON public.credits_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credits_usage_operation ON public.credits_usage(operation_type);

-- RLS policies
ALTER TABLE public.credits_usage ENABLE ROW LEVEL SECURITY;

-- Admins podem ler tudo
CREATE POLICY "Admins can read all credits usage"
  ON public.credits_usage
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Sistema pode inserir
CREATE POLICY "System can insert credits usage"
  ON public.credits_usage
  FOR INSERT
  WITH CHECK (true);

-- Tabela para configuração do auto-preload
CREATE TABLE IF NOT EXISTS public.auto_preload_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN DEFAULT true,
  last_check TIMESTAMP WITH TIME ZONE,
  last_preload TIMESTAMP WITH TIME ZONE,
  check_interval_minutes INTEGER DEFAULT 15,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Inserir config padrão se não existir
INSERT INTO public.auto_preload_config (enabled, check_interval_minutes)
SELECT true, 15
WHERE NOT EXISTS (SELECT 1 FROM public.auto_preload_config);

-- RLS para config
ALTER TABLE public.auto_preload_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage preload config"
  ON public.auto_preload_config
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Function para registrar uso de créditos
CREATE OR REPLACE FUNCTION public.log_credit_usage(
  p_operation_type TEXT,
  p_success BOOLEAN,
  p_error_code TEXT DEFAULT NULL,
  p_section_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.credits_usage (
    operation_type,
    success,
    error_code,
    section_id,
    metadata
  ) VALUES (
    p_operation_type,
    p_success,
    p_error_code,
    p_section_id,
    p_metadata
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;