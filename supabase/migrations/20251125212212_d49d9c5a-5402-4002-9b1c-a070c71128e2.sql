-- Create debug logs table for storing system logs
CREATE TABLE IF NOT EXISTS public.debug_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  log_type TEXT NOT NULL, -- 'scroll', 'animation', 'carousel', 'mount', 'effect'
  component TEXT, -- component name
  message TEXT NOT NULL,
  data JSONB, -- additional data
  environment TEXT, -- 'development', 'production'
  user_agent TEXT,
  viewport_width INTEGER,
  viewport_height INTEGER,
  scroll_x INTEGER,
  scroll_y INTEGER
);

-- Create index for efficient queries
CREATE INDEX idx_debug_logs_created_at ON public.debug_logs(created_at DESC);
CREATE INDEX idx_debug_logs_log_type ON public.debug_logs(log_type);
CREATE INDEX idx_debug_logs_component ON public.debug_logs(component);

-- Enable RLS
ALTER TABLE public.debug_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert logs (for capturing data)
CREATE POLICY "Allow insert debug logs for all users"
  ON public.debug_logs
  FOR INSERT
  WITH CHECK (true);

-- Policy: Only admins can read logs
CREATE POLICY "Allow read debug logs for admins"
  ON public.debug_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Policy: Only admins can delete logs
CREATE POLICY "Allow delete debug logs for admins"
  ON public.debug_logs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Create feature flags table
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  flag_name TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  environment TEXT -- 'development', 'production', 'all'
);

-- Enable RLS on feature flags
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read feature flags
CREATE POLICY "Allow read feature flags for all users"
  ON public.feature_flags
  FOR SELECT
  USING (true);

-- Policy: Only admins can update feature flags
CREATE POLICY "Allow update feature flags for admins"
  ON public.feature_flags
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Insert default feature flags
INSERT INTO public.feature_flags (flag_name, enabled, description, environment)
VALUES 
  ('ENABLE_ANIMATIONS', true, 'Enable all animations across the app', 'all'),
  ('ENABLE_FLOATING_BUTTON_GLOW', true, 'Enable glow effects on floating chat button', 'all'),
  ('ENABLE_CAROUSEL_ANIMATIONS', true, 'Enable carousel animations', 'all'),
  ('ENABLE_DEBUG_LOGS', true, 'Enable debug logging to database', 'all'),
  ('ENABLE_SCROLL_SMOOTH', true, 'Enable smooth scroll behavior', 'all')
ON CONFLICT (flag_name) DO NOTHING;

-- Enable realtime for debug logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.debug_logs;