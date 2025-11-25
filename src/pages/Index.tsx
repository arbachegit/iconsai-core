import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import Section from "@/components/Section";
import { ChatKnowYOU } from "@/components/ChatKnowYOU";
import { MediaCarousel } from "@/components/MediaCarousel";
import DigitalExclusionSection from "@/components/DigitalExclusionSection";
import { ParallaxSection } from "@/components/ParallaxSection";
import { Link } from "react-router-dom";
import { Brain } from "lucide-react";
import { useState, useEffect } from "react";
import knowriskLogo from "@/assets/knowrisk-logo.png";
import { FloatingChatButton } from "@/components/FloatingChatButton";
import { ChatModal } from "@/components/ChatModal";
import { debugLog, getEnvironmentInfo } from "@/lib/environment";
import TuringLegacy from "@/components/TuringLegacy";

const Index = () => {
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);

  useEffect(() => {
    debugLog.mount("Index Page", getEnvironmentInfo());
    
    // Log initial scroll position
    debugLog.scroll("Initial scroll position", {
      x: window.scrollX,
      y: window.scrollY,
      documentHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight
    });

    // Monitor scroll events
    const handleScroll = () => {
      debugLog.scroll("Scroll event", {
        x: window.scrollX,
        y: window.scrollY,
        timestamp: Date.now()
      });
    };

    // Monitor resize events
    const handleResize = () => {
      debugLog.scroll("Resize event", {
        width: window.innerWidth,
        height: window.innerHeight,
        timestamp: Date.now()
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });

    // Log if page scrolls automatically after mount
    const checkAutoScroll = setTimeout(() => {
      const scrollY = window.scrollY;
      if (scrollY > 0) {
        debugLog.scroll("⚠️ AUTO-SCROLL DETECTED after mount!", {
          scrollY,
          timestamp: Date.now(),
          documentHeight: document.documentElement.scrollHeight
        });
      }
    }, 1000);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      clearTimeout(checkAutoScroll);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden relative">
      <Header />
      <HeroSection />

      {/* Section 1: Software */}
      <ParallaxSection speed={0.12}>
        <Section
          id="software"
          title="A Primeira Revolução"
          subtitle="Anos 1940-1980"
          priority
          quote="O momento exato em que deixamos de apenas operar máquinas e começamos, de fato, a pensar com elas."
        >
          <p className="text-lg leading-relaxed">
            O software representou a primeira grande comunicação entre humanos e máquinas.
            Através de linguagens de programação, conseguimos instruir computadores a
            executar tarefas complexas. Era uma comunicação rígida, técnica, acessível
            apenas a especialistas.
          </p>
          <p className="text-lg leading-relaxed mt-4">
            Essa era marcou o início da transformação digital, estabelecendo as bases
            para todas as revoluções tecnológicas que viriam a seguir.
          </p>
        </Section>
      </ParallaxSection>

      {/* Section 2: Internet */}
      <ParallaxSection speed={0.15}>
        <Section
          id="internet"
          title="A Era da Conectividade"
          subtitle="Anos 1990-2000"
          reverse
          quote="A internet não apenas encurtou distâncias geográficas; ela entrelaçou o destino da humanidade em uma única rede pulsante."
        >
          <p className="text-lg leading-relaxed">
            A Internet democratizou o acesso à informação e transformou completamente
            a forma como nos comunicamos. De repente, o mundo inteiro estava conectado,
            compartilhando conhecimento em escala global.
          </p>
          <p className="text-lg leading-relaxed mt-4">
            Esta revolução não apenas conectou computadores, mas conectou pessoas,
            culturas e ideias de maneiras nunca antes imaginadas.
          </p>
        </Section>
      </ParallaxSection>

      {/* Section 3: Tecnologias Sem Propósito */}
      <ParallaxSection speed={0.18}>
        <Section
          id="tech-sem-proposito"
          title="O Hype Tecnológico"
          subtitle="Anos 2020-2022"
          quote="Sem um propósito claro, a inovação deixa de ser uma ferramenta de progresso e se torna apenas uma distração sofisticada."
        >
          <p className="text-lg leading-relaxed">
            Nem toda inovação tecnológica encontra seu propósito. O Metaverso e os NFTs
            prometeram revolucionar o mundo digital, mas faltou-lhes aplicação prática
            e valor real para os usuários.
          </p>
          <p className="text-lg leading-relaxed mt-4">
            Esta fase nos ensinou lições valiosas sobre a diferença entre inovação
            tecnológica e inovação com propósito real para a sociedade.
          </p>
        </Section>
      </ParallaxSection>

      {/* Section 4: 1969 Kubrick */}
      <ParallaxSection speed={0.14}>
        <Section
          id="kubrick"
          title="A Profecia de Kubrick"
          subtitle="1969 - 2001: Uma Odisseia no Espaço"
          reverse
          quote="Agora que a ficção de 2001 se tornou realidade, o mistério não é mais a capacidade da máquina, mas a intenção humana por trás dela."
        >
          <p className="text-lg leading-relaxed">
            Em 1969, Stanley Kubrick nos apresentou HAL 9000, uma IA que não apenas
            processava comandos, mas conversava, entendia contexto e tinha personalidade.
            Foi um presságio impressionante do futuro que estamos vivendo hoje.
          </p>
          <p className="text-lg leading-relaxed mt-4">
            O que parecia ficção científica há 50 anos, tornou-se realidade com o
            advento dos grandes modelos de linguagem e assistentes de IA conversacionais.
          </p>
        </Section>
      </ParallaxSection>

      {/* Section 5: Watson */}
      <ParallaxSection speed={0.16}>
        <Section
          id="watson"
          title="Watson: A Era da Cognição"
          subtitle="2004 - IBM Watson"
          quote="Ao ensinar uma máquina a ler nuances, descobrimos que a verdadeira inteligência não está em dar respostas, mas em compreender as perguntas."
        >
          <p className="text-lg leading-relaxed">
            O IBM Watson marcou o início da era cognitiva, demonstrando que máquinas
            poderiam não apenas processar dados, mas compreender linguagem natural,
            raciocinar e aprender.
          </p>
          <p className="text-lg leading-relaxed mt-4">
            Sua vitória no Jeopardy! em 2011 foi um marco histórico, provando que a
            IA poderia competir com humanos em tarefas que requerem conhecimento amplo
            e compreensão contextual.
          </p>
        </Section>
      </ParallaxSection>

      {/* Section 6: IA Nova Era */}
      <ParallaxSection speed={0.13}>
        <Section
          id="ia-nova-era"
          title="A Nova Era da IA"
          subtitle="2022 - Presente"
          reverse
          quote="Ao democratizar a inteligência, não estamos apenas atualizando o software do mundo, mas reescrevendo o potencial de cada ser humano."
        >
          <p className="text-lg leading-relaxed">
            Com o ChatGPT e modelos similares, entramos em uma nova era onde a
            comunicação com máquinas é natural, fluida e acessível a todos. A barreira
            técnica foi eliminada.
          </p>
          <p className="text-lg leading-relaxed mt-4">
            Agora, qualquer pessoa pode conversar com uma IA como conversaria com um
            especialista humano, abrindo possibilidades infinitas em educação, saúde,
            negócios e muito mais.
          </p>
        </Section>
      </ParallaxSection>

      {/* Section 7: KnowYOU - Interactive Chat */}
      <ParallaxSection speed={0.10}>
        <Section
          id="knowyou"
          title="KnowYOU: Reskilling na Era da IA"
          subtitle="Tecnologia Conversacional na Saúde"
        >
          <p className="text-lg leading-relaxed">
            O problema da Cauda Longa de Gauss revela um desafio crítico: a maioria
            das pessoas não sabe como comunicar-se efetivamente com IA. É aqui que
            entra o KnowYOU.
          </p>
          <p className="text-lg leading-relaxed mt-4">
            Nossa tecnologia conversacional foi especialmente desenvolvida para o setor
            de saúde, tornando a comunicação com IA natural e produtiva para todos os
            profissionais, independente de seu conhecimento técnico.
          </p>
          <div className="mt-8">
            <ChatKnowYOU />
          </div>
          
          {/* Media Carousel - Spotify & YouTube */}
          <div className="mt-8">
            <MediaCarousel />
          </div>

          {/* Nova Seção: Exclusão Digital */}
          <div className="mt-2">
            <DigitalExclusionSection />
          </div>
        </Section>
      </ParallaxSection>

      {/* Section 8: Bom Prompt */}
      <ParallaxSection speed={0.17}>
        <Section
          id="bom-prompt"
          title="A Arte do Bom Prompt"
          subtitle="Comunicação Efetiva com IA"
          reverse
        >
        <div className="relative">
          
          <p className="text-lg leading-relaxed">
            Saber fazer as perguntas certas é fundamental na era da IA. Um bom prompt
            é claro, específico, contextualizado e direcionado ao objetivo desejado.
          </p>
          <p className="text-lg leading-relaxed mt-4">
            O KnowYOU não apenas responde suas perguntas, mas ensina você a se comunicar
            melhor com IA, desenvolvendo uma habilidade essencial para o futuro do
            trabalho em saúde.
          </p>
          <div className="mt-6 space-y-3">
            <div className="p-4 bg-card rounded-lg border border-primary/10">
              <p className="text-sm font-medium text-primary">Seja Específico</p>
              <p className="text-sm text-muted-foreground mt-1">
                Em vez de "fale sobre diabetes", pergunte "quais são os principais
                indicadores para diagnóstico de diabetes tipo 2 em adultos?"
              </p>
            </div>
            <div className="p-4 bg-card rounded-lg border border-primary/10">
              <p className="text-sm font-medium text-secondary">Forneça Contexto</p>
              <p className="text-sm text-muted-foreground mt-1">
                Explique sua situação, seu papel e o que você precisa alcançar com
                a resposta.
              </p>
            </div>
            <div className="p-4 bg-card rounded-lg border border-primary/10">
              <p className="text-sm font-medium text-accent">Itere e Refine</p>
              <p className="text-sm text-muted-foreground mt-1">
                Não tenha medo de fazer perguntas de acompanhamento para obter
                exatamente a informação que precisa.
              </p>
            </div>
          </div>
        </div>
        </Section>
      </ParallaxSection>

      {/* Legado de Turing */}
      <TuringLegacy />

      {/* Footer */}
      <footer className="py-10 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="relative">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-3">
                <img 
                  src={knowriskLogo} 
                  alt="KnowRisk" 
                  className="h-8 w-auto"
                />
                <span className="text-lg font-bold text-gradient">KnowYOU</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Revolucionando o Reskilling na Era da IA
              </p>
              <p className="text-xs text-muted-foreground">
                © 2024 KnowYOU by KnowRisk. Todos os direitos reservados.
              </p>
            </div>
            
            {/* Discreet Admin Link */}
            <Link 
              to="/admin/login"
              className="absolute right-0 top-0 text-muted-foreground/20 hover:text-muted-foreground/40 transition-opacity"
              aria-label="Admin Login"
            >
              <Brain className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </footer>

      {/* Floating Chat Button */}
      <FloatingChatButton onClick={() => setIsChatModalOpen(true)} />
      
      {/* Chat Modal */}
      <ChatModal open={isChatModalOpen} onOpenChange={setIsChatModalOpen} />
    </div>
  );
};

export default Index;
