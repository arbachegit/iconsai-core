-- Create section_audio table to cache generated audio for sections
CREATE TABLE IF NOT EXISTS public.section_audio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id TEXT NOT NULL UNIQUE,
  audio_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.section_audio ENABLE ROW LEVEL SECURITY;

-- Everyone can read section audio
CREATE POLICY "Everyone can read section audio"
  ON public.section_audio
  FOR SELECT
  USING (true);

-- Anyone can insert section audio (for caching)
CREATE POLICY "Anyone can insert section audio"
  ON public.section_audio
  FOR INSERT
  WITH CHECK (true);

-- Only admins can update section audio
CREATE POLICY "Only admins can update section audio"
  ON public.section_audio
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete section audio
CREATE POLICY "Only admins can delete section audio"
  ON public.section_audio
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_section_audio_updated_at
  BEFORE UPDATE ON public.section_audio
  FOR EACH ROW
  EXECUTE FUNCTION public.update_generated_images_updated_at();