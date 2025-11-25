-- Remove conflicting INSERT policy for admins
DROP POLICY IF EXISTS "Only admins can insert chat analytics" ON public.chat_analytics;

-- Allow anonymous UPDATE for chat analytics
DROP POLICY IF EXISTS "Only admins can update chat analytics" ON public.chat_analytics;

CREATE POLICY "Anyone can update chat analytics"
  ON public.chat_analytics 
  FOR UPDATE 
  USING (true) 
  WITH CHECK (true);