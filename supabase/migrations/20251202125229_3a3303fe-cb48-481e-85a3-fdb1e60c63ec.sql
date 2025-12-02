-- Tabela para rastrear cliques em sugestões (ranking)
CREATE TABLE public.suggestion_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_text TEXT NOT NULL,
  chat_type TEXT NOT NULL CHECK (chat_type IN ('health', 'study')),
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_suggestion_clicks_chat_type ON public.suggestion_clicks(chat_type);
CREATE INDEX idx_suggestion_clicks_text ON public.suggestion_clicks(suggestion_text);
CREATE INDEX idx_suggestion_clicks_clicked_at ON public.suggestion_clicks(clicked_at DESC);

-- RLS
ALTER TABLE public.suggestion_clicks ENABLE ROW LEVEL SECURITY;

-- Políticas: permitir insert público e select para admins
CREATE POLICY "Anyone can insert suggestion clicks"
ON public.suggestion_clicks
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can read suggestion clicks"
ON public.suggestion_clicks
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can read suggestion clicks"
ON public.suggestion_clicks
FOR SELECT
USING (true);