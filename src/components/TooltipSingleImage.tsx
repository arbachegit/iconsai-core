import { useState, useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { supabase } from "@/integrations/supabase/client";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { ImagePlaceholder } from "@/components/ImagePlaceholder";

interface TooltipSingleImageProps {
  sectionId: string;
}

const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='450'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%238B5CF6;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%233B82F6;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='800' height='450' fill='url(%23grad)'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='36' fill='white' text-anchor='middle' dominant-baseline='middle' opacity='0.7'%3EKnowRisk%3C/text%3E%3C/svg%3E";

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

const imagePrompts: Record<string, string> = {
  "software": "Abstract visualization of early computer programming, punch cards transforming into digital code, purple and blue gradients, futuristic tech style, no text",
  "internet": "Global network of light connections around Earth, data streams flowing between continents, cyan and purple colors, no text",
  "tech-sem-proposito": "Abstract representation of hype vs substance, empty virtual spaces, muted colors transitioning to vibrant AI elements, no text",
  "kubrick": "HAL 9000 inspired AI eye visualization, red and blue contrasts, cinematic sci-fi atmosphere, no text",
  "watson": "Cognitive computing visualization, IBM Watson style neural networks, blue dominant colors, professional tech aesthetic, no text",
  "ia-nova-era": "ChatGPT era visualization, natural conversation flowing between human and AI, bright cyan accents, modern design, no text",
  "knowyou": "Healthcare AI interaction, doctor consulting with intelligent system, medical icons integrated with AI, teal and purple, no text",
  "bom-prompt": "Art of crafting effective prompts, words transforming into precise results, purple magic-like visualization, no text"
};

export const TooltipSingleImage = ({ sectionId }: TooltipSingleImageProps) => {
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
      const prompt = imagePrompts[sectionId];
      if (!prompt) {
        setIsLoading(false);
        return;
      }
      
      if (checkCreditsExhausted()) {
        console.log(`Créditos esgotados - usando fallback para tooltip ${sectionId}`);
        setImage(FALLBACK_IMAGE);
        setUsesFallback(true);
        setIsLoading(false);
        return;
      }
      
      const promptKey = `tooltip-${sectionId}-0`;
      
      // Buscar imagem no cache (APENAS BUSCAR - sem geração dinâmica)
      const { data: existingImage } = await supabase
        .from('generated_images')
        .select('image_url')
        .eq('section_id', `tooltip-${sectionId}`)
        .eq('prompt_key', promptKey)
        .maybeSingle();
      
      if (existingImage?.image_url) {
        console.log(`Imagem de tooltip encontrada no cache para ${sectionId}`);
        setImage(existingImage.image_url);
        setIsLoading(false);
        
        await supabase.from('image_analytics').insert({
          section_id: `tooltip-${sectionId}`,
          prompt_key: promptKey,
          success: true,
          cached: true,
        });
        return;
      }
      
      // Imagem não encontrada - usar fallback permanente
      // Admin deve pré-gerar as imagens através do painel admin
      console.log(`Imagem de tooltip não encontrada no cache para ${sectionId} - usando fallback`);
      setImage(FALLBACK_IMAGE);
      setIsLoading(false);
    };
    
    generateImage();
  }, [sectionId, inView]);
  
  return (
    <div ref={ref} className="w-full">
      {usesFallback && (
        <div className="mb-2 text-xs text-muted-foreground text-center opacity-75">
          <p>Imagem temporária (créditos esgotados)</p>
        </div>
      )}
      <div className="aspect-video rounded-lg overflow-hidden bg-muted/10">
        {image ? (
          <OptimizedImage
            src={image}
            alt={`Ilustração ${sectionId}`}
            aspectRatio="video"
          />
        ) : (
          <ImagePlaceholder className="w-full h-full" />
        )}
      </div>
    </div>
  );
};
