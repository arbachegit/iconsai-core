-- Create storage bucket for voice messages
INSERT INTO storage.buckets (id, name, public) 
VALUES ('voice-messages', 'voice-messages', true);

-- Policy to allow voice message uploads (public)
CREATE POLICY "Allow voice message uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'voice-messages');

-- Policy to allow public access to voice messages
CREATE POLICY "Allow public voice message access"
ON storage.objects FOR SELECT
USING (bucket_id = 'voice-messages');