-- Criar tabela podcast_contents
CREATE TABLE public.podcast_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spotify_episode_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para ordenação
CREATE INDEX idx_podcast_contents_display_order ON public.podcast_contents(display_order);

-- Habilitar RLS
ALTER TABLE public.podcast_contents ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Permitir leitura pública de podcasts ativos"
ON public.podcast_contents FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins podem gerenciar podcasts"
ON public.podcast_contents FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Inserir os 3 podcasts
INSERT INTO public.podcast_contents (spotify_episode_id, title, description, display_order) VALUES
(
  '2lORJJJIGECuG57sxtbmTx',
  '🚀 T1E1 | O Custo do Silêncio: A IA provando que prevenção dá lucro',
  '"Isso é gasto a fundo perdido". Quantas vezes você já ouviu isso ao tentar aprovar um projeto de inovação ou prevenção? 🛑

Hoje, vamos mudar esse jogo. Fernando Arbache (KnowRisk) explica como a Simulação de Cenários está acabando com o "achismo" na saúde.

Neste episódio:
✅ Como calcular o ROI (Retorno sobre Investimento) do que é invisível.
✅ O caso prático de monitoramento preventivo escolar.
✅ Como transformar dados de saúde em argumentos financeiros irrefutáveis.

Pare de brigar com opiniões e comece a convencer com dados. 📊

Toque para ouvir agora! ▶️',
  1
),
(
  '7FbQynx7mlyn98zylx5dNg',
  'T1E2 | O Algoritmo da Dignidade',
  'Neste episódio, Fernando Arbache mostra o outro lado da moeda: como a tecnologia pode ser usada para medir o imensurável — a dignidade humana.

Vamos visitar o caso de "Vale Sereno" e descobrir como um simples aplicativo está ajudando a:
🆘 Identificar pedidos de socorro silenciosos de adolescentes.
🏫 Preservar anos de estudo e evitar a evasão escolar.
🤝 Transformar dados frios em calor humano.

Descubra como o ROI Social prova que a decisão mais humana também é a mais inteligente.',
  2
),
(
  '0lHencLq7GVTeAihuY18JS',
  'T1E3 | Prevendo o Futuro',
  'Muitos gestores têm medo do custo da inovação. Mas quase ninguém calcula o Custo da Inação. 💸

Neste episódio, Fernando Arbache revela como usamos a Inteligência Artificial como uma verdadeira "máquina do tempo" para gestão de riscos.

O que você vai aprender:
🚦 Como parar de decidir com base em "achismos" e começar a decidir com evidências.
📉 O caso prático: comparando a curva de uma crise versus a curva da prevenção.
🛡️ Como a Modelagem Preditiva transforma dados frios em segurança para tomar decisões difíceis.

Pare de apostar no escuro. Aprenda a visitar o futuro para consertar o presente.',
  3
);