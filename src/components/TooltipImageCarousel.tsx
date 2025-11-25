import { useState, useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { supabase } from "@/integrations/supabase/client";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

interface TooltipImageCarouselProps {
  sectionId: string;
}

// Fallback SVG quando créditos esgotarem
const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='450'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%238B5CF6;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%233B82F6;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='800' height='450' fill='url(%23grad)'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='36' fill='white' text-anchor='middle' dominant-baseline='middle' opacity='0.7'%3EKnowRisk%3C/text%3E%3C/svg%3E";

// Chave para marcar quando créditos esgotaram
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

const carouselPrompts: Record<string, string[]> = {
  "software": [
    "Abstract visualization of early computer programming, punch cards transforming into digital code, purple and blue gradients, futuristic tech style, no text",
    "Human and machine connection through binary code streams, geometric patterns, dark background with cyan highlights, no text",
    "Evolution of programming languages represented as flowing energy streams, modern minimalist style, purple blue palette, no text"
  ],
  "internet": [
    "Global network of light connections around Earth, data streams flowing between continents, cyan and purple colors, no text",
    "People connected through digital threads across the world, abstract representation of global connectivity, blue tones, no text",
    "Information democratization visualized as light spreading across a dark globe, tech futuristic style, no text"
  ],
  "tech-sem-proposito": [
    "Abstract representation of hype vs substance, empty virtual spaces, muted colors transitioning to vibrant AI elements, no text",
    "Contrast between hollow promises and purposeful technology, split image showing NFT/Metaverse fading vs AI glowing, no text",
    "Technology without purpose represented as fragmented pixels, contrasting with cohesive AI networks, purple gradients, no text"
  ],
  "kubrick": [
    "HAL 9000 inspired AI eye visualization, red and blue contrasts, cinematic sci-fi atmosphere, no text",
    "2001 Space Odyssey style AI consciousness, geometric shapes and space elements, purple and cyan palette, no text",
    "Vision of conversational AI from 1969, retro-futuristic design, human and machine dialogue visualization, no text"
  ],
  "watson": [
    "Cognitive computing visualization, IBM Watson style neural networks, blue dominant colors, professional tech aesthetic, no text",
    "Machine understanding human language, semantic waves and knowledge graphs, purple blue gradient, no text",
    "AI competing with human intelligence, quiz show inspired visualization, futuristic style, no text"
  ],
  "ia-nova-era": [
    "ChatGPT era visualization, natural conversation flowing between human and AI, bright cyan accents, modern design, no text",
    "Barrier-free communication between humans and machines, inclusive technology representation, warm futuristic tones, no text",
    "Universal AI assistant concept, accessibility and ease of use visualized, purple gradient background, no text"
  ],
  "knowyou": [
    "Healthcare AI interaction, doctor consulting with intelligent system, medical icons integrated with AI, teal and purple, no text",
    "Personalized healthcare communication, patient-centric AI approach, warm professional colors, no text",
    "KnowYOU concept: AI understanding human cognitive patterns in healthcare, brain and heart connection, no text"
  ],
  "bom-prompt": [
    "Art of crafting effective prompts, words transforming into precise results, purple magic-like visualization, no text",
    "Specific vs vague communication with AI, clarity represented as focused light beam, dark background, no text",
    "Context and iteration in AI communication, refinement process visualized as polishing diamond, tech style, no text"
  ]
};

export const TooltipImageCarousel = ({ sectionId }: TooltipImageCarouselProps) => {
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [usesFallback, setUsesFallback] = useState(false);
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });
  
  useEffect(() => {
    if (!inView) return;
    
    const generateImages = async () => {
      const prompts = carouselPrompts[sectionId] || [];
      
      // Se créditos esgotados recentemente, usar fallback imediatamente
      if (checkCreditsExhausted()) {
        console.log(`Créditos esgotados - usando fallback para tooltip ${sectionId}`);
        setImages(prompts.map(() => FALLBACK_IMAGE));
        setUsesFallback(true);
        setIsLoading(false);
        return;
      }
      
      // Buscar imagens já geradas no banco
      const { data: existingImages } = await supabase
        .from('generated_images')
        .select('prompt_key, image_url')
        .eq('section_id', `tooltip-${sectionId}`);
      
      const existingMap = new Map(
        existingImages?.map(img => [img.prompt_key, img.image_url]) || []
      );
      
      // Se todas as imagens já existem, usar cache
      if (existingImages && existingImages.length === prompts.length) {
        const cachedImages = prompts
          .map((_, idx) => existingMap.get(`tooltip-${sectionId}-${idx}`))
          .filter((url): url is string => !!url);
        
        if (cachedImages.length === prompts.length) {
          setImages(cachedImages);
          setIsLoading(false);
          
          // Registrar analytics de cache hit (sem await)
          prompts.forEach((_, idx) => {
            supabase.from('image_analytics').insert({
              section_id: `tooltip-${sectionId}`,
              prompt_key: `tooltip-${sectionId}-${idx}`,
              success: true,
              cached: true,
            });
          });
          return;
        }
      }
      
      // Gerar imagens faltantes
      let creditsError = false;
      const results = await Promise.all(
        prompts.map(async (prompt, idx) => {
          const promptKey = `tooltip-${sectionId}-${idx}`;
          
          // Usar cache se disponível
          if (existingMap.has(promptKey)) {
            return existingMap.get(promptKey)!;
          }
          
          // Se já detectamos falta de créditos, usar fallback
          if (creditsError) {
            return FALLBACK_IMAGE;
          }
          
          const startTime = Date.now();
          try {
            const { data, error } = await supabase.functions.invoke('generate-image', {
              body: { prompt }
            });
            
            const generationTime = Date.now() - startTime;
            
            // Detectar erro 402 (sem créditos)
            if (error?.message?.includes("402") || error?.message?.includes("Créditos insuficientes")) {
              console.log("Créditos esgotados - marcando e usando fallback");
              markCreditsExhausted();
              creditsError = true;
              setUsesFallback(true);
              
              // Registrar uso de crédito com falha
              await supabase.rpc('log_credit_usage', {
                p_operation_type: 'image_generation',
                p_success: false,
                p_error_code: '402',
                p_section_id: `tooltip-${sectionId}`,
                p_metadata: { prompt_key: promptKey }
              });
              
              await supabase.from('image_analytics').insert({
                section_id: `tooltip-${sectionId}`,
                prompt_key: promptKey,
                success: false,
                cached: false,
                generation_time_ms: generationTime,
                error_message: "Credits exhausted"
              });
              
              return FALLBACK_IMAGE;
            }
            
            if (error || !data?.imageUrl) {
              console.error("Erro ao gerar imagem:", error);
              
              // Registrar erro
              await supabase.from('image_analytics').insert({
                section_id: `tooltip-${sectionId}`,
                prompt_key: promptKey,
                success: false,
                cached: false,
                generation_time_ms: generationTime,
                error_message: error?.message || 'No image URL returned'
              });
              
              return FALLBACK_IMAGE;
            }
            
            const imageUrl = data.imageUrl;
            
            // Registrar sucesso de uso de crédito
            await supabase.rpc('log_credit_usage', {
              p_operation_type: 'image_generation',
              p_success: true,
              p_error_code: null,
              p_section_id: `tooltip-${sectionId}`,
              p_metadata: { prompt_key: promptKey, generation_time_ms: generationTime }
            });
            
            // Salvar no banco
            await supabase.from('generated_images').insert({
              section_id: `tooltip-${sectionId}`,
              prompt_key: promptKey,
              image_url: imageUrl,
            });
            
            // Registrar analytics
            await supabase.from('image_analytics').insert({
              section_id: `tooltip-${sectionId}`,
              prompt_key: promptKey,
              success: true,
              cached: false,
              generation_time_ms: generationTime,
            });
            
            return imageUrl;
          } catch (error) {
            const generationTime = Date.now() - startTime;
            console.error("Erro ao gerar imagem:", error);
            
            // Detectar erro 402 em exceptions também
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            if (errorMsg.includes("402") || errorMsg.includes("Créditos insuficientes")) {
              markCreditsExhausted();
              creditsError = true;
              setUsesFallback(true);
            }
            
            await supabase.from('image_analytics').insert({
              section_id: `tooltip-${sectionId}`,
              prompt_key: promptKey,
              success: false,
              cached: false,
              generation_time_ms: generationTime,
              error_message: errorMsg
            });
            
            return FALLBACK_IMAGE;
          }
        })
      );
      
      const generatedImages = results.filter((url): url is string => url !== null);
      
      if (generatedImages.length > 0) {
        setImages(generatedImages);
      }
      
      setIsLoading(false);
    };
    
    generateImages();
  }, [sectionId, inView]);
  
  if (isLoading || !inView) {
    return (
      <div 
        ref={ref}
        className="w-full h-48 bg-gradient-to-br from-primary/20 via-accent/20 to-primary/20 rounded-lg animate-pulse-slow flex items-center justify-center"
      >
        {inView && (
          <span className="text-muted-foreground text-sm">Gerando imagens...</span>
        )}
      </div>
    );
  }
  
  if (images.length === 0) {
    return null;
  }
  
  return (
    <div className="w-full">
      {usesFallback && (
        <div className="mb-2 text-xs text-muted-foreground text-center opacity-75">
          <p>Imagens temporárias (créditos esgotados)</p>
        </div>
      )}
      <Carousel
        opts={{ loop: true }}
        plugins={[Autoplay({ delay: 4000 })]}
        className="w-full"
      >
        <CarouselContent>
          {images.map((img, index) => (
            <CarouselItem key={index}>
              <div className="aspect-video rounded-lg overflow-hidden bg-muted/10">
                <img 
                  src={img} 
                  alt={`Ilustração ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-2" />
        <CarouselNext className="right-2" />
      </Carousel>
    </div>
  );
};
