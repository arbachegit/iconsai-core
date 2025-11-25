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

interface SectionImageCarouselProps {
  sectionId: string;
}

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

export const SectionImageCarousel = ({ sectionId }: SectionImageCarouselProps) => {
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const generateImages = async () => {
      const cacheKey = `section-carousel-${sectionId}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        setImages(JSON.parse(cached));
        setIsLoading(false);
        return;
      }
      
      const prompts = sectionPrompts[sectionId] || [];
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
      <div className="w-full h-full bg-muted/10 rounded-lg animate-pulse flex items-center justify-center">
        <span className="text-muted-foreground text-sm">Gerando imagens...</span>
      </div>
    );
  }
  
  if (images.length === 0) {
    return (
      <div className="w-full h-full rounded-full bg-gradient-primary opacity-20 animate-pulse-slow" />
    );
  }
  
  return (
    <Carousel
      opts={{ loop: true }}
      plugins={[Autoplay({ delay: 5000 })]}
      className="w-full h-full"
    >
      <CarouselContent className="h-full">
        {images.map((img, index) => (
          <CarouselItem key={index} className="h-full">
            <div className="w-full h-full rounded-lg overflow-hidden bg-muted/10">
              <img 
                src={img} 
                alt={`${sectionId} - Imagem ${index + 1}`}
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
