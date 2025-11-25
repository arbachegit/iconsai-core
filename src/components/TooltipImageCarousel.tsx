import { useState, useEffect } from "react";
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
  
  useEffect(() => {
    const generateImages = async () => {
      const cacheKey = `tooltip-carousel-${sectionId}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        setImages(JSON.parse(cached));
        setIsLoading(false);
        return;
      }
      
      const prompts = carouselPrompts[sectionId] || [];
      const generatedImages: string[] = [];
      
      for (const prompt of prompts) {
        try {
          const { data, error } = await supabase.functions.invoke('generate-image', {
            body: { prompt }
          });
          
          if (error) {
            console.error("Erro ao gerar imagem:", error);
            continue;
          }
          
          if (data?.imageUrl) {
            generatedImages.push(data.imageUrl);
          }
        } catch (error) {
          console.error("Erro ao gerar imagem:", error);
        }
      }
      
      if (generatedImages.length > 0) {
        setImages(generatedImages);
        localStorage.setItem(cacheKey, JSON.stringify(generatedImages));
      }
      
      setIsLoading(false);
    };
    
    generateImages();
  }, [sectionId]);
  
  if (isLoading) {
    return (
      <div className="w-full h-48 bg-muted/20 rounded-lg animate-pulse flex items-center justify-center">
        <span className="text-muted-foreground text-sm">Gerando imagens...</span>
      </div>
    );
  }
  
  if (images.length === 0) {
    return null;
  }
  
  return (
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
  );
};
