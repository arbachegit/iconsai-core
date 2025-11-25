-- Allow public inserts into chat_analytics for anonymous analytics tracking
DROP POLICY IF EXISTS "Allow public insert into chat_analytics" ON chat_analytics;

CREATE POLICY "Allow public insert into chat_analytics"
ON chat_analytics
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Allow public read for analytics purposes (optional, keep restrictive if needed)
DROP POLICY IF EXISTS "Allow public read of chat_analytics" ON chat_analytics;

CREATE POLICY "Allow public read of chat_analytics"
ON chat_analytics
FOR SELECT
TO anon, authenticated
USING (true);