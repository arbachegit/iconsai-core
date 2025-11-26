-- Criar bucket de storage para áudio dos tooltips
INSERT INTO storage.buckets (id, name, public)
VALUES ('tooltip-audio', 'tooltip-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Criar política para permitir leitura pública
CREATE POLICY "Tooltip audio is publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'tooltip-audio');

-- Criar política para permitir upload por qualquer usuário (sistema)
CREATE POLICY "Anyone can upload tooltip audio"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'tooltip-audio');

-- Limpar URLs de áudio antigas (blob URLs) que não funcionam mais
UPDATE tooltip_contents
SET audio_url = NULL
WHERE audio_url LIKE 'blob:%';