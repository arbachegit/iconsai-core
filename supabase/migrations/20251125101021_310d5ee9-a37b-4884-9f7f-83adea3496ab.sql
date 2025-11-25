-- Atualizar políticas RLS para permitir INSERT anônimo

-- Remover política restritiva de generated_images
DROP POLICY IF EXISTS "Only admins can insert generated images" ON public.generated_images;

-- Criar nova política permitindo INSERT anônimo
CREATE POLICY "Anyone can insert generated images"
  ON public.generated_images
  FOR INSERT
  WITH CHECK (true);

-- Remover política restritiva de image_analytics
DROP POLICY IF EXISTS "Only admins can insert image analytics" ON public.image_analytics;

-- Criar nova política permitindo INSERT anônimo
CREATE POLICY "Anyone can insert image analytics"
  ON public.image_analytics
  FOR INSERT
  WITH CHECK (true);

-- Criar política para permitir INSERT anônimo em chat_analytics
CREATE POLICY "Anyone can insert chat analytics"
  ON public.chat_analytics
  FOR INSERT
  WITH CHECK (true);