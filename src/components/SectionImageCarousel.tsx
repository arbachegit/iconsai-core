import { useState, useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { supabase } from "@/integrations/supabase/client";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { OptimizedImage } from "@/components/ui/optimized-image";

interface SectionImageCarouselProps {
  sectionId: string;
  priority?: boolean;
}

// Fallback SVG quando créditos esgotarem
const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1024' height='1024'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%238B5CF6;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%233B82F6;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='1024' height='1024' fill='url(%23grad)'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='48' fill='white' text-anchor='middle' dominant-baseline='middle' opacity='0.7'%3EKnowRisk%3C/text%3E%3C/svg%3E";

// Chave para marcar quando créditos esgotaram (1 hora de cache)
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

const sectionPrompts: Record<string, string[]> = {
  "software": [
    "Primórdios da computação: cartões perfurados transformando-se em código binário, tons roxos e azuis, estilo futurista minimalista, sem texto",
    "Pessoa programando em linguagem de baixo nível, linhas de código conectando cérebro a circuitos digitais, comunicação técnica rígida, gradientes tecnológicos, sem texto",
    "Evolução das linguagens de programação: fluxos de energia representando diferentes paradigmas, símbolos geométricos, paleta roxa/azul/ciano, sem texto",
    "Transição de máquinas de calcular para computadores modernos, representação abstrata da comunicação humano-máquina, tech-forward, fundo escuro, sem texto"
  ],
  "internet": [
    "Primeiros cabos de rede conectando continentes, visualização abstrata de dados fluindo pelo oceano, tons azul elétrico e roxo, sem texto",
    "Explosão da World Wide Web: nós de rede se multiplicando ao redor do planeta Terra, conexões luminosas, estilo futurista, sem texto",
    "Democratização do conhecimento: pessoas de culturas diversas acessando informação, fluxos de dados globais, paleta ciano/roxo/azul, sem texto",
    "Era da conectividade global: compartilhamento instantâneo de ideias, rede neural planetária, atmosfera high-tech, gradientes tecnológicos, sem texto"
  ],
  "tech-sem-proposito": [
    "Hype do Metaverso: espaços virtuais vazios e desconectados, cores desbotadas, contraste com elementos de IA vibrantes, sem texto",
    "NFTs e promessas não cumpridas: tokens digitais fragmentados perdendo valor, transição de cores vibrantes para cinzas, sem texto",
    "Contraste tecnologia sem propósito vs IA com propósito: lado esquerdo fragmentado/vazio, lado direito coeso/brilhante, gradientes roxos, sem texto",
    "Lições aprendidas: inovação tecnológica transformando-se em inovação com propósito real, phoenix digital renascendo, tons purple/cyan, sem texto"
  ],
  "kubrick": [
    "HAL 9000: olho vermelho icônico da IA, câmera fisheye, atmosfera cinematográfica sci-fi, contraste vermelho e azul, sem texto",
    "2001 Uma Odisseia no Espaço: consciência artificial emergindo, formas geométricas no espaço, paleta roxa/ciano, estilo Kubrick, sem texto",
    "Visão de 1969 sobre IA conversacional: humano dialogando com máquina inteligente, design retro-futurista, gradientes tecnológicos, sem texto",
    "Profecia se tornando realidade: HAL 9000 evoluindo para assistentes de IA modernos, ponte temporal 1969-2024, estilo tech-forward, sem texto"
  ],
  "watson": [
    "IBM Watson nascendo: redes neurais cognitivas, processamento de linguagem natural visualizado, azul dominante, estética corporativa tech, sem texto",
    "Watson no Jeopardy: competição entre humano e máquina, ondas semânticas de conhecimento, grafos de informação, gradiente roxo/azul, sem texto",
    "Era cognitiva: máquina compreendendo contexto e nuances, representação abstrata de raciocínio, padrões complexos interconectados, sem texto",
    "Longa jornada da comunicação: evolução de simples processamento para compreensão profunda, linha do tempo visual, tons purple/cyan, sem texto"
  ],
  "ia-nova-era": [
    "Nascimento do ChatGPT: barreira técnica sendo quebrada, comunicação natural fluindo entre humano e IA, tons cyan brilhantes, sem texto",
    "Acessibilidade universal: pessoas de todas idades/backgrounds conversando com IA, inclusão digital, paleta warm futuristic, sem texto",
    "IA como motor de ideias: cérebro humano conectado a acelerador tecnológico, explosão criativa, gradientes vibrantes purple/cyan, sem texto",
    "Nova era da comunicação: conversa natural substituindo comandos técnicos, transição visual do rígido para fluido, design moderno, sem texto"
  ],
  "knowyou": [
    "KnowYOU em ação: médico consultando sistema inteligente, ícones médicos integrados com elementos de IA, paleta teal/purple profissional, sem texto",
    "Comunicação centrada no humano: paciente e profissional conectados através de IA empática, warm colors, atmosfera de cuidado, sem texto",
    "ACC (Augmented Cognitive Communication): padrões cognitivos humanos sendo compreendidos pela IA, cérebro e coração conectados, sem texto",
    "Reskilling na saúde: profissionais aprendendo a comunicar efetivamente com IA, transformação digital humanizada, gradientes purple/teal, sem texto"
  ],
  "bom-prompt": [
    "Arte de fazer perguntas certas: palavras transformando-se em resultados precisos, magia digital roxa, visualização abstrata, sem texto",
    "Específico vs vago: feixe de luz focado contrastando com dispersão, clareza visual, fundo escuro tech, sem texto",
    "Contexto e iteração: processo de refinamento como polimento de diamante, evolução da pergunta básica para pergunta perfeita, estilo minimalista, sem texto",
    "Comunicação efetiva com IA: fluxo bidirecional entre humano e máquina, entendimento mútuo, gradientes purple/cyan harmoniosos, sem texto"
  ]
};

export const SectionImageCarousel = ({ sectionId, priority = false }: SectionImageCarouselProps) => {
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [usesFallback, setUsesFallback] = useState(false);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => setCurrent(api.selectedScrollSnap()));
  }, [api]);
  
  useEffect(() => {
    if (!inView) return;
    
    const generateImages = async () => {
      const prompts = sectionPrompts[sectionId] || [];
      
      // Se créditos esgotados recentemente, usar fallback imediatamente
      if (checkCreditsExhausted()) {
        console.log(`Créditos esgotados - usando fallback para ${sectionId}`);
        setImages(prompts.map(() => FALLBACK_IMAGE));
        setUsesFallback(true);
        setIsLoading(false);
        return;
      }
      
      // Buscar imagens já geradas no banco
      const { data: existingImages } = await supabase
        .from('generated_images')
        .select('prompt_key, image_url')
        .eq('section_id', sectionId);
      
      const existingMap = new Map(
        existingImages?.map(img => [img.prompt_key, img.image_url]) || []
      );
      
      // Se todas as imagens já existem, usar cache
      if (existingImages && existingImages.length === prompts.length) {
        const cachedImages = prompts
          .map((_, idx) => existingMap.get(`${sectionId}-${idx}`))
          .filter((url): url is string => !!url);
        
        if (cachedImages.length === prompts.length) {
          setImages(cachedImages);
          setIsLoading(false);
          
          // Batch analytics para cache hit (não bloqueia UI)
          supabase.from('image_analytics').insert(
            prompts.map((_, idx) => ({
              section_id: sectionId,
              prompt_key: `${sectionId}-${idx}`,
              success: true,
              cached: true,
            }))
          );
          return;
        }
      }
      
      // Gerar imagens faltantes
      let creditsError = false;
      const results = await Promise.all(
        prompts.map(async (prompt, idx) => {
          const promptKey = `${sectionId}-${idx}`;
          
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
              
              return FALLBACK_IMAGE;
            }
            
            if (error || !data?.imageUrl) {
              console.error("Erro ao gerar imagem:", error);
              
              // Registrar erro
              await supabase.from('image_analytics').insert({
                section_id: sectionId,
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
              p_section_id: sectionId,
              p_metadata: { prompt_key: promptKey, generation_time_ms: generationTime }
            });
            
            // Salvar no banco
            await supabase.from('generated_images').insert({
              section_id: sectionId,
              prompt_key: promptKey,
              image_url: imageUrl,
            });
            
            // Registrar analytics
            await supabase.from('image_analytics').insert({
              section_id: sectionId,
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
              section_id: sectionId,
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
        className="w-full h-full rounded-lg bg-gradient-to-br from-primary/20 via-accent/20 to-primary/20 animate-pulse-slow flex items-center justify-center"
      >
        {inView && (
          <span className="text-muted-foreground text-sm">Gerando imagens...</span>
        )}
      </div>
    );
  }
  
  if (images.length === 0) {
    return (
      <div className="w-full h-full rounded-full bg-gradient-primary opacity-20 animate-pulse-slow" />
    );
  }
  
  return (
    <div className="w-full h-full space-y-3">
      {usesFallback && (
        <div className="mb-2 text-xs text-muted-foreground text-center opacity-75">
          <p>Imagens temporárias (créditos esgotados)</p>
        </div>
      )}
      <Carousel
        setApi={setApi}
        opts={{ loop: true }}
        className="w-full h-full"
      >
        <CarouselContent className="h-full">
          {images.map((img, index) => (
            <CarouselItem key={index} className="h-full">
              <div className="w-full h-full rounded-lg overflow-hidden bg-muted/10">
                <OptimizedImage
                  src={img}
                  alt={`${sectionId} - Imagem ${index + 1}`}
                  priority={priority && index === 0}
                  aspectRatio="square"
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-2 h-12 w-12" />
        <CarouselNext className="right-2 h-12 w-12" />
      </Carousel>
      
      {/* Dots indicadores */}
      <div className="flex justify-center gap-2">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => api?.scrollTo(index)}
            className={`h-2 rounded-full transition-all ${
              index === current ? "w-6 bg-primary" : "w-2 bg-primary/30 hover:bg-primary/50"
            }`}
            aria-label={`Ir para imagem ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};
