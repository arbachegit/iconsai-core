import { useState, useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { supabase } from "@/integrations/supabase/client";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { ImagePlaceholder } from "@/components/ImagePlaceholder";

interface SectionSingleImageProps {
  sectionId: string;
  priority?: boolean;
}

const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1024' height='1024'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%238B5CF6;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%233B82F6;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='1024' height='1024' fill='url(%23grad)'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='48' fill='white' text-anchor='middle' dominant-baseline='middle' opacity='0.7'%3EKnowRisk%3C/text%3E%3C/svg%3E";

const CREDITS_EXHAUSTED_KEY = "lovable_credits_exhausted";
const CREDITS_EXHAUSTED_DURATION = 60 * 60 * 1000;

const checkCreditsExhausted = (): boolean => {
  const exhaustedData = localStorage.getItem(CREDITS_EXHAUSTED_KEY);
  if (!exhaustedData) return false;
  
  try {
    const { timestamp } = JSON.parse(exhaustedData);
    if (Date.now() - timestamp > CREDITS_EXHAUSTED_DURATION) {
      localStorage.removeItem(CREDITS_EXHAUSTED_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

const markCreditsExhausted = () => {
  localStorage.setItem(CREDITS_EXHAUSTED_KEY, JSON.stringify({ timestamp: Date.now() }));
};

const sectionPrompts: Record<string, string> = {
  "software": "Primórdios da computação: cartões perfurados transformando-se em código binário, tons roxos e azuis, estilo futurista minimalista, sem texto",
  "internet": "Primeiros cabos de rede conectando continentes, visualização abstrata de dados fluindo pelo oceano, tons azul elétrico e roxo, sem texto",
  "tech-sem-proposito": "Hype do Metaverso: espaços virtuais vazios e desconectados, cores desbotadas, contraste com elementos de IA vibrantes, sem texto",
  "watson": "IBM Watson competindo no Jeopardy 2011: palco televisivo icônico, tela digital mostrando Watson respondendo questões, público assistindo, atmosfera de competição histórica humano vs máquina, iluminação de estúdio, tons azuis e roxos tecnológicos, sem texto",
  "ia-nova-era": "Nascimento do ChatGPT: barreira técnica sendo quebrada, comunicação natural fluindo entre humano e IA, tons cyan brilhantes, sem texto",
  "bom-prompt": "Arte de fazer perguntas certas: palavras transformando-se em resultados precisos, magia digital roxa, visualização abstrata, sem texto"
};

export const SectionSingleImage = ({ sectionId, priority = false }: SectionSingleImageProps) => {
  const [image, setImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [usesFallback, setUsesFallback] = useState(false);
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  useEffect(() => {
    if (!inView) return;
    
    const generateImage = async () => {
      const prompt = sectionPrompts[sectionId];
      if (!prompt) {
        setIsLoading(false);
        return;
      }
      
      if (checkCreditsExhausted()) {
        console.log(`Créditos esgotados - usando fallback para ${sectionId}`);
        setImage(FALLBACK_IMAGE);
        setUsesFallback(true);
        setIsLoading(false);
        return;
      }
      
      const promptKey = `${sectionId}-0`;
      
      // Buscar imagem no cache
      const { data: existingImage } = await supabase
        .from('generated_images')
        .select('image_url')
        .eq('section_id', sectionId)
        .eq('prompt_key', promptKey)
        .single();
      
      if (existingImage?.image_url) {
        setImage(existingImage.image_url);
        setIsLoading(false);
        
        await supabase.from('image_analytics').insert({
          section_id: sectionId,
          prompt_key: promptKey,
          success: true,
          cached: true,
        });
        return;
      }
      
      // Gerar nova imagem
      const startTime = Date.now();
      try {
        const { data, error } = await supabase.functions.invoke('generate-image', {
          body: { prompt }
        });
        
        const generationTime = Date.now() - startTime;
        
        if (error?.message?.includes("402") || error?.message?.includes("Créditos insuficientes")) {
          console.log("Créditos esgotados - marcando e usando fallback");
          markCreditsExhausted();
          setUsesFallback(true);
          setImage(FALLBACK_IMAGE);
          
          await supabase.rpc('log_credit_usage', {
            p_operation_type: 'image_generation',
            p_success: false,
            p_error_code: '402',
            p_section_id: sectionId,
            p_metadata: { prompt_key: promptKey }
          });
          
          await supabase.from('image_analytics').insert({
            section_id: sectionId,
            prompt_key: promptKey,
            success: false,
            cached: false,
            generation_time_ms: generationTime,
            error_message: "Credits exhausted"
          });
          
          setIsLoading(false);
          return;
        }
        
        if (error || !data?.imageUrl) {
          console.error("Erro ao gerar imagem:", error);
          setImage(FALLBACK_IMAGE);
          
          await supabase.from('image_analytics').insert({
            section_id: sectionId,
            prompt_key: promptKey,
            success: false,
            cached: false,
            generation_time_ms: generationTime,
            error_message: error?.message || 'No image URL returned'
          });
          
          setIsLoading(false);
          return;
        }
        
        const imageUrl = data.imageUrl;
        
        await supabase.rpc('log_credit_usage', {
          p_operation_type: 'image_generation',
          p_success: true,
          p_error_code: null,
          p_section_id: sectionId,
          p_metadata: { prompt_key: promptKey, generation_time_ms: generationTime }
        });
        
        await supabase.from('generated_images').insert({
          section_id: sectionId,
          prompt_key: promptKey,
          image_url: imageUrl,
        });
        
        await supabase.from('image_analytics').insert({
          section_id: sectionId,
          prompt_key: promptKey,
          success: true,
          cached: false,
          generation_time_ms: generationTime,
        });
        
        setImage(imageUrl);
        setIsLoading(false);
      } catch (error) {
        const generationTime = Date.now() - startTime;
        console.error("Erro ao gerar imagem:", error);
        
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        if (errorMsg.includes("402") || errorMsg.includes("Créditos insuficientes")) {
          markCreditsExhausted();
          setUsesFallback(true);
        }
        
        await supabase.from('image_analytics').insert({
          section_id: sectionId,
          prompt_key: promptKey,
          success: false,
          cached: false,
          generation_time_ms: generationTime,
          error_message: errorMsg
        });
        
        setImage(FALLBACK_IMAGE);
        setIsLoading(false);
      }
    };
    
    generateImage();
  }, [sectionId, inView]);
  
  return (
    <div ref={ref} className="w-full h-full">
      {usesFallback && (
        <div className="mb-2 text-xs text-muted-foreground text-center opacity-75">
          <p>Imagem temporária (créditos esgotados)</p>
        </div>
      )}
      <div className="w-full h-full rounded-lg overflow-hidden bg-muted/10">
        {image ? (
          <OptimizedImage
            src={image}
            alt={`${sectionId} - Ilustração`}
            priority={priority}
            aspectRatio="square"
          />
        ) : (
          <ImagePlaceholder className="w-full h-full" />
        )}
      </div>
    </div>
  );
};
