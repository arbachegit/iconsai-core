-- ============================================================
-- Migration: iconsai_agents
-- Description: Create agents table for PWA Voice Platform
-- Date: 2026-01-25
-- ============================================================

-- Create agents table
CREATE TABLE IF NOT EXISTS public.iconsai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'Bot',
  color TEXT DEFAULT '#00D4FF',
  welcome_audio_url TEXT,
  edge_function_name TEXT NOT NULL,
  -- MCP Configuration (Tools, Resources, Prompts)
  mcp_config JSONB DEFAULT '{}',
  -- Domains this agent can handle
  domains TEXT[] DEFAULT ARRAY[]::TEXT[],
  -- Keywords for intent matching
  keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
  -- Fallback configuration
  fallback_provider TEXT DEFAULT 'gemini',
  fallback_model TEXT DEFAULT 'gemini-2.0-flash',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index on slug for fast lookups
CREATE INDEX IF NOT EXISTS idx_iconsai_agents_slug ON public.iconsai_agents(slug);

-- Create index on is_active for filtering
CREATE INDEX IF NOT EXISTS idx_iconsai_agents_active ON public.iconsai_agents(is_active) WHERE is_active = true;

-- Add RLS policies
ALTER TABLE public.iconsai_agents ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active agents
CREATE POLICY "Public can read active agents"
  ON public.iconsai_agents
  FOR SELECT
  TO public
  USING (is_active = true);

-- Allow authenticated users to read all agents
CREATE POLICY "Authenticated users can read all agents"
  ON public.iconsai_agents
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow service role full access
CREATE POLICY "Service role has full access to agents"
  ON public.iconsai_agents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_iconsai_agents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_iconsai_agents_updated_at_trigger
  BEFORE UPDATE ON public.iconsai_agents
  FOR EACH ROW
  EXECUTE FUNCTION update_iconsai_agents_updated_at();

-- Insert default home agent
INSERT INTO public.iconsai_agents (
  name,
  slug,
  display_name,
  description,
  icon,
  color,
  edge_function_name,
  domains,
  keywords,
  sort_order
)
VALUES (
  'home',
  'home',
  'IconsAI',
  'Assistente principal do IconsAI - roteia para domínios especializados',
  'Home',
  '#00D4FF',
  'pwa-home-agent',
  ARRAY['geral', 'localizacao', 'populacao', 'saude', 'educacao', 'atualidades'],
  ARRAY['iconsai', 'assistente', 'ajuda', 'informacao'],
  0
)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  edge_function_name = EXCLUDED.edge_function_name,
  domains = EXCLUDED.domains,
  keywords = EXCLUDED.keywords,
  updated_at = now();

-- Add comment
COMMENT ON TABLE public.iconsai_agents IS 'Agent configurations for IconsAI PWA Voice Platform';
