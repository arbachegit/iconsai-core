-- Tabela para armazenar imagens geradas com cache compartilhado
CREATE TABLE IF NOT EXISTS public.generated_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_key TEXT NOT NULL UNIQUE,
  image_url TEXT NOT NULL,
  section_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela para analytics de performance de imagens
CREATE TABLE IF NOT EXISTS public.image_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_key TEXT NOT NULL,
  section_id TEXT NOT NULL,
  generation_time_ms INTEGER,
  success BOOLEAN NOT NULL,
  cached BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_generated_images_section ON public.generated_images(section_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_prompt ON public.generated_images(prompt_key);
CREATE INDEX IF NOT EXISTS idx_image_analytics_section ON public.image_analytics(section_id);
CREATE INDEX IF NOT EXISTS idx_image_analytics_created ON public.image_analytics(created_at DESC);

-- Enable RLS
ALTER TABLE public.generated_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_analytics ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para generated_images
CREATE POLICY "Everyone can read generated images"
  ON public.generated_images
  FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert generated images"
  ON public.generated_images
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update generated images"
  ON public.generated_images
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Políticas RLS para image_analytics
CREATE POLICY "Only admins can read image analytics"
  ON public.image_analytics
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can insert image analytics"
  ON public.image_analytics
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_generated_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_generated_images_updated_at
  BEFORE UPDATE ON public.generated_images
  FOR EACH ROW
  EXECUTE FUNCTION public.update_generated_images_updated_at();