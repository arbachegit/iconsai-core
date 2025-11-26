-- Allow anyone to update audio_url in tooltip_contents
CREATE POLICY "Anyone can update audio_url in tooltips"
ON public.tooltip_contents
FOR UPDATE
TO anon, authenticated
USING (is_active = true)
WITH CHECK (is_active = true);