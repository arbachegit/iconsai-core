import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const CRITICAL_SECTIONS = ["software", "internet", "ia-nova-era"];

const sectionPrompts: Record<string, string> = {
  "software": "Primórdios da computação: cartões perfurados transformando-se em código binário, tons roxos e azuis, estilo futurista minimalista, sem texto",
  "internet": "Primeiros cabos de rede conectando continentes, visualização abstrata de dados fluindo pelo oceano, tons azul elétrico e roxo, sem texto",
  "ia-nova-era": "Nascimento do ChatGPT: barreira técnica sendo quebrada, comunicação natural fluindo entre humano e IA, tons cyan brilhantes, sem texto"
};

const CREDITS_EXHAUSTED_KEY = "lovable_credits_exhausted";

const checkCreditsExhausted = (): boolean => {
  const exhaustedData = localStorage.getItem(CREDITS_EXHAUSTED_KEY);
  if (!exhaustedData) return false;
  
  try {
    const { timestamp } = JSON.parse(exhaustedData);
    if (Date.now() - timestamp > 60 * 60 * 1000) {
      localStorage.removeItem(CREDITS_EXHAUSTED_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

const preloadImage = async (sectionId: string): Promise<void> => {
  const prompt = sectionPrompts[sectionId];
  if (!prompt || checkCreditsExhausted()) return;

  const promptKey = `${sectionId}-0`;

  // Verificar se já existe no cache
  const { data: existingImage } = await supabase
    .from('generated_images')
    .select('image_url')
    .eq('section_id', sectionId)
    .eq('prompt_key', promptKey)
    .single();

  if (existingImage?.image_url) {
    console.log(`✓ Imagem ${sectionId} já em cache`);
    return;
  }

  // Gerar nova imagem
  console.log(`⏳ Pré-carregando imagem: ${sectionId}`);
  const startTime = Date.now();
  
  try {
    const { data, error } = await supabase.functions.invoke('generate-image', {
      body: { prompt }
    });

    const generationTime = Date.now() - startTime;

    if (error || !data?.imageUrl) {
      console.error(`✗ Erro ao pré-carregar ${sectionId}:`, error);
      return;
    }

    // Salvar no cache
    await supabase.from('generated_images').insert({
      section_id: sectionId,
      prompt_key: promptKey,
      image_url: data.imageUrl,
    });

    await supabase.from('image_analytics').insert({
      section_id: sectionId,
      prompt_key: promptKey,
      success: true,
      cached: false,
      generation_time_ms: generationTime,
    });

    console.log(`✓ Imagem ${sectionId} pré-carregada (${generationTime}ms)`);
  } catch (error) {
    console.error(`✗ Erro ao pré-carregar ${sectionId}:`, error);
  }
};

export const useImagePreload = () => {
  useEffect(() => {
    // Executar pré-carregamento em paralelo após pequeno delay
    const timer = setTimeout(() => {
      console.log("🚀 Iniciando pré-carregamento de imagens críticas...");
      Promise.all(CRITICAL_SECTIONS.map(preloadImage))
        .then(() => console.log("✓ Pré-carregamento concluído"))
        .catch(err => console.error("✗ Erro no pré-carregamento:", err));
    }, 500);

    return () => clearTimeout(timer);
  }, []);
};
