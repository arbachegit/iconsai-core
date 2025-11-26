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
      
      // Buscar imagem no cache (APENAS BUSCAR - sem geração dinâmica)
      const { data: existingImage } = await supabase
        .from('generated_images')
        .select('image_url')
        .eq('section_id', sectionId)
        .eq('prompt_key', promptKey)
        .maybeSingle();
      
      if (existingImage?.image_url) {
        console.log(`Imagem encontrada no cache para ${sectionId}`);
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
      
      // Imagem não encontrada - usar fallback permanente
      // Admin deve pré-gerar as imagens através do painel admin
      console.log(`Imagem não encontrada no cache para ${sectionId} - usando fallback`);
      setImage(FALLBACK_IMAGE);
      setIsLoading(false);
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
