import { useState, useEffect, useRef } from "react";
import { X, Play, StopCircle, Download, Clock, Baby, Users, GraduationCap, Rocket, Bot, Sparkles, Snowflake, Skull, Crown, Home, Cat, Palette, Lightbulb } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileHistoryCarousel } from "./MobileHistoryCarousel";
import { cn } from "@/lib/utils";
import { generateAudioUrl } from "@/lib/audio-player";

interface AIHistoryPanelProps {
  onClose: () => void;
}

// Estrutura de dados das eras (constante estática fora do componente)
const ERAS_DATA = [
  {
    id: 'dream',
    title: 'O Sonho (Antes de 1950)',
    subtitle: 'Onde tudo era ficção científica e desejo humano.',
    icon: Clock,
    colorFrom: 'amber-500',
    colorTo: 'orange-500',
    items: [
      { icon: Sparkles, text: 'Antiguidade: Mitos gregos já falavam de autômatos e estátuas que ganhavam vida (como Talos, o gigante de bronze).' },
      { icon: Sparkles, text: '1843 - A "Avó" da Programação: Ada Lovelace escreve o primeiro algoritmo para uma máquina.' },
      { icon: Bot, text: '1920 - Nasce a palavra "Robô": Uma peça de teatro tcheca (R.U.R.) usa o termo pela primeira vez.' }
    ]
  },
  {
    id: 'birth',
    title: 'O Nascimento (Anos 50)',
    subtitle: 'Onde a IA ganha nome e dá os primeiros passos.',
    icon: Baby,
    colorFrom: 'blue-500',
    colorTo: 'cyan-500',
    items: [
      { icon: Lightbulb, text: '1950 - O Teste de Turing: Alan Turing lança a pergunta: "Máquinas podem pensar?"' },
      { icon: Sparkles, text: '1956 - O Batismo: Conferência de Dartmouth cunha oficialmente o termo "Inteligência Artificial".' },
      { icon: Bot, text: '1957 - Perceptron: Frank Rosenblatt cria uma máquina que tenta imitar um neurônio.' }
    ]
  },
  {
    id: 'childhood',
    title: 'A Infância e Adolescência (Anos 60 a 80)',
    subtitle: 'Altos e baixos, rebeldia e filmes de Hollywood.',
    icon: Users,
    colorFrom: 'purple-500',
    colorTo: 'pink-500',
    items: [
      { icon: Bot, text: '1966 - ELIZA, a "Psicóloga": O primeiro chatbot da história!' },
      { icon: Snowflake, text: 'Anos 70 - O Inverno da IA: As promessas eram grandes demais e a tecnologia não entregava.' },
      { icon: Sparkles, text: 'Anos 80 - O Retorno: A IA volta com os "Sistemas Especialistas".' },
      { icon: Skull, text: 'O Exterminador do Futuro (1984): O cinema cria a imagem da IA como vilã.' }
    ]
  },
  {
    id: 'adulthood',
    title: 'A Fase Adulta (Anos 90 e 2000)',
    subtitle: 'A IA começa a ganhar dos humanos e a entrar na nossa casa.',
    icon: GraduationCap,
    colorFrom: 'green-500',
    colorTo: 'emerald-500',
    items: [
      { icon: Crown, text: '1997 - Xeque-mate: O computador Deep Blue (IBM) vence Garry Kasparov no xadrez.' },
      { icon: Home, text: '2002 - Roomba: A IA entra na sua sala... para aspirar pó.' },
      { icon: Bot, text: '2011 - "Ei, Siri": Começamos a falar com nossos telefones.' }
    ]
  },
  {
    id: 'revolution',
    title: 'A Revolução Generativa (2010s até Hoje)',
    subtitle: 'A IA deixa de apenas analisar e começa a CRIAR.',
    icon: Rocket,
    colorFrom: 'cyan-500',
    colorTo: 'blue-600',
    items: [
      { icon: Cat, text: '2012 - O "Big Bang" do Deep Learning: Redes neurais aprendem a identificar gatos no YouTube sozinhas.' },
      { icon: Crown, text: '2016 - AlphaGo: A IA vence o campeão mundial de Go com jogadas "criativas".' },
      { icon: Sparkles, text: '2017 - O Transformer: O Google publica um artigo que muda tudo.' },
      { icon: Palette, text: '2022/2023 - A Era do ChatGPT e Gemini: A IA "sai da jaula".' }
    ]
  }
];

export const AIHistoryPanel = ({ onClose }: AIHistoryPanelProps) => {
  const isMobile = useIsMobile();
  const [position, setPosition] = useState({ x: window.innerWidth / 2 - 400, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [eraImages, setEraImages] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState(true);
  const [currentEraId, setCurrentEraId] = useState("dream");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const eraRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const fullText = `O Sonho (Antes de 1950). Onde tudo era ficção científica e desejo humano.

Antiguidade: Mitos gregos já falavam de autômatos e estátuas que ganhavam vida (como Talos, o gigante de bronze). A ideia de "algo não-vivo que pensa" é mais velha que andar para frente!

1843 - A "Avó" da Programação: Ada Lovelace escreve o primeiro algoritmo para uma máquina. Ela já imaginava que computadores poderiam fazer mais do que apenas contas matemáticas.

1920 - Nasce a palavra "Robô": Uma peça de teatro tcheca (R.U.R.) usa o termo pela primeira vez. Spoiler: na peça, eles não eram muito amigáveis.

O Nascimento (Anos 50). Onde a IA ganha nome e dá os primeiros passos.

1950 - O Teste de Turing: Alan Turing lança a pergunta de um milhão de dólares: "Máquinas podem pensar?". Ele cria o famoso Teste de Turing para ver se um computador consegue enganar um humano numa conversa.

1956 - O Batismo: Numa conferência de verão em Dartmouth (EUA), cientistas cunham oficialmente o termo "Inteligência Artificial". É o certidão de nascimento oficial da área!

1957 - Perceptron: Frank Rosenblatt cria uma máquina que tenta imitar um neurônio. O New York Times diz que ela, em breve, será capaz de "falar, ouvir, escrever e ter consciência". (Eles erraram a previsão em "apenas" uns 60 anos...)

A Infância e Adolescência (Anos 60 a 80). Altos e baixos, rebeldia e filmes de Hollywood.

1966 - ELIZA, a "Psicóloga": O primeiro chatbot da história! Ela repetia o que você dizia em forma de pergunta. Ex: "Estou triste" -> "Por que você está triste?". Simples, mas enganou muita gente.

Anos 70 - O Inverno da IA: As promessas eram grandes demais e a tecnologia não entregava. O financiamento secou. A IA ficou "de castigo" no canto da sala.

Anos 80 - O Retorno: A IA volta com os "Sistemas Especialistas". Computadores que sabiam MUITO sobre uma única coisa (tipo diagnosticar uma doença específica), mas não sabiam nada sobre o resto do mundo.

O Exterminador do Futuro (1984): O cinema ajuda a criar a imagem da IA como vilã. A cultura pop fica obcecada (e com medo) da Skynet.

A Fase Adulta (Anos 90 e 2000). A IA começa a ganhar dos humanos e a entrar na nossa casa.

1997 - Xeque-mate: O computador Deep Blue (IBM) vence o campeão mundial de xadrez, Garry Kasparov. O mundo fica chocado: "As máquinas sabem pensar melhor que nós?" (Em xadrez, sim).

2002 - Roomba: A IA entra na sua sala... para aspirar pó. É a primeira vez que muita gente tem um robô autônomo em casa.

2011 - "Ei, Siri": A Apple lança a Siri. Começamos a falar com nossos telefones, e (às vezes) eles entendem o que queremos.

A Revolução Generativa (2010s até Hoje). A IA deixa de apenas analisar e começa a CRIAR.

2012 - O "Big Bang" do Deep Learning: Redes neurais aprendem a identificar gatos no YouTube sozinhas. A capacidade de processamento de imagens explode.

2016 - AlphaGo: A IA vence o campeão mundial de Go (um jogo muito mais complexo que xadrez). A máquina fez jogadas "criativas" que nenhum humano jamais pensou.

2017 - O Transformer: O Google publica um artigo ("Attention Is All You Need") que muda tudo. Nasce a arquitetura que permitiria o surgimento do GPT.

2022/2023 - A Era do ChatGPT e Gemini: A IA "sai da jaula". Agora ela escreve poemas, cria imagens, programa códigos e conversa sobre o sentido da vida. Deixamos de ter apenas uma "calculadora turbinada" para ter uma co-piloto criativa.

Resumo da Ópera: Começamos querendo imitar o cérebro, passamos décadas ensinando regras lógicas, e acabamos criando modelos que aprendem lendo a internet inteira. Onde vamos parar? Essa é a próxima página da história que estamos escrevendo agora!`;

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  const handlePlayAudio = async () => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    } else {
      try {
        const audioUrl = await generateAudioUrl(fullText);
        
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.addEventListener('timeupdate', () => {
          setCurrentTime(audio.currentTime);
        });

        audio.addEventListener('loadedmetadata', () => {
          setDuration(audio.duration);
        });

        audio.addEventListener('ended', () => {
          setIsPlaying(false);
        });

        audio.play();
        setIsPlaying(true);
      } catch (error) {
        console.error('Erro ao gerar áudio:', error);
      }
    }
  };

  const handleStopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  const handleDownloadAudio = () => {
    if (audioRef.current) {
      const link = document.createElement('a');
      link.href = audioRef.current.src;
      link.download = 'historia-da-ia.mp3';
      link.click();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Timestamps de cada era no áudio (em segundos)
  const eraTimestamps = [
    { id: 'dream', startTime: 0, endTime: 45 },
    { id: 'birth', startTime: 45, endTime: 90 },
    { id: 'childhood', startTime: 90, endTime: 150 },
    { id: 'adulthood', startTime: 150, endTime: 200 },
    { id: 'revolution', startTime: 200, endTime: 280 }
  ];

  // Carregar imagens das eras (executar apenas UMA VEZ)
  useEffect(() => {
    const loadImages = async () => {
      setLoadingImages(true);
      const images: Record<string, string> = {};

      for (const era of ERAS_DATA) {
        try {
          const { data, error } = await supabase.functions.invoke('generate-history-image', {
            body: { eraId: era.id }
          });

          if (error) throw error;
          if (data?.imageUrl) {
            images[era.id] = data.imageUrl;
            console.log(`Era ${era.id}: ${data.fromCache ? 'cache' : 'gerado'}`);
          }
        } catch (error) {
          console.error(`Erro ao carregar imagem da era ${era.id}:`, error);
        }
      }

      setEraImages(images);
      setLoadingImages(false);
    };

    loadImages();
  }, []); // ✅ Rodar apenas UMA VEZ na montagem
  
  // Cleanup audio on component unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
    };
  }, []);

  // Listen for global stop audio event
  useEffect(() => {
    const handleStopAll = () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setIsPlaying(false);
        setCurrentTime(0);
      }
    };
    
    window.addEventListener('stopAllAudio', handleStopAll);
    return () => window.removeEventListener('stopAllAudio', handleStopAll);
  }, []);
  
  // Função para pular para uma era específica
  const handleJumpToEra = (eraId: string) => {
    setCurrentEraId(eraId);
    
    // Scroll para a era (desktop)
    if (!isMobile && eraRefs.current[eraId]) {
      eraRefs.current[eraId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
    
    // Se áudio existir, pula para o timestamp da era
    if (audioRef.current) {
      const eraTimestamp = eraTimestamps.find(e => e.id === eraId);
      if (eraTimestamp) {
        audioRef.current.currentTime = eraTimestamp.startTime;
      }
    }
  };

  // Auto-scroll sincronizado com áudio
  useEffect(() => {
    if (!isPlaying) return;

    const currentEra = eraTimestamps.find(
      (era) => currentTime >= era.startTime && currentTime < era.endTime
    );

    if (currentEra && currentEra.id !== currentEraId) {
      setCurrentEraId(currentEra.id);
      
      // Desktop: scroll suave para a seção
      if (!isMobile && eraRefs.current[currentEra.id]) {
        eraRefs.current[currentEra.id]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
      // Mobile: o carousel já sincroniza via props currentEraId
    }
  }, [currentTime, isPlaying, isMobile, currentEraId]);

  // Renderização mobile
  if (isMobile) {
    return (
      <Drawer open={true} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="h-[90vh]">
          <div className="p-4 space-y-4 h-full flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                História da IA
              </h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Audio Controls */}
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Button onClick={handlePlayAudio} disabled={isPlaying} size="sm" variant="outline">
                  <Play className="w-4 h-4 mr-1" />
                  Play
                </Button>
                <Button onClick={handleStopAudio} disabled={!isPlaying} size="sm" variant="outline">
                  <StopCircle className="w-4 h-4 mr-1" />
                  Stop
                </Button>
                <Button onClick={handleDownloadAudio} disabled={!audioRef.current} size="sm" variant="outline">
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </Button>
              </div>
              {duration > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${(currentTime / duration) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px]">{formatTime(currentTime)} / {formatTime(duration)}</span>
                </div>
              )}
            </div>

            <MobileHistoryCarousel
              eras={ERAS_DATA}
              currentEraId={currentEraId}
              eraImages={eraImages}
              loadingImages={loadingImages}
              onEraSelect={handleJumpToEra}
            />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Renderização desktop
  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in"
        onClick={() => {
          window.dispatchEvent(new CustomEvent('stopAllAudio'));
          onClose();
        }}
      />
      
      <Card
        className="fixed z-50 w-[800px] max-h-[80vh] bg-background/95 backdrop-blur-md border-primary/20 shadow-2xl animate-scale-in"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onMouseDown={handleMouseDown}
      >
        <div className="relative p-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 z-10"
          >
            <X className="w-5 h-5" />
          </Button>

          <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            A História da Inteligência Artificial
          </h2>

          {/* Era Navigation */}
          <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
            {ERAS_DATA.map((era) => {
              const Icon = era.icon;
              return (
                <Button
                  key={era.id}
                  variant={currentEraId === era.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleJumpToEra(era.id)}
                  className="flex items-center gap-2"
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{era.title.split('(')[0].trim()}</span>
                </Button>
              );
            })}
          </div>

          {/* Audio Controls */}
          <div className="mb-6 p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-3 mb-2">
              <Button
                onClick={handlePlayAudio}
                disabled={isPlaying}
                size="sm"
                variant="outline"
              >
                <Play className="w-4 h-4 mr-2" />
                Play
              </Button>
              <Button
                onClick={handleStopAudio}
                disabled={!isPlaying}
                size="sm"
                variant="outline"
              >
                <StopCircle className="w-4 h-4 mr-2" />
                Stop
              </Button>
              <Button
                onClick={handleDownloadAudio}
                disabled={!audioRef.current}
                size="sm"
                variant="outline"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
            {duration > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  />
                </div>
                <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
              </div>
            )}
          </div>

          <ScrollArea className="h-[calc(80vh-250px)]">
            <div className="space-y-8 pr-4">
              {ERAS_DATA.map((era) => {
                const Icon = era.icon;
                return (
                  <div
                    key={era.id}
                    ref={(el) => (eraRefs.current[era.id] = el)}
                    className={cn(
                      "relative pl-10 border-l-2 transition-all duration-500",
                      currentEraId === era.id
                        ? `border-${era.colorFrom} bg-${era.colorFrom}/5 scale-[1.02]`
                        : `border-${era.colorFrom}/30`
                    )}
                  >
                    <div
                      className="absolute -left-5 top-0 w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
                      style={{
                        background: `linear-gradient(to bottom right, hsl(var(--${era.colorFrom})), hsl(var(--${era.colorTo})))`,
                      }}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>

                    <div className="flex gap-6">
                      <div className="flex-1">
                        <h3
                          className="text-xl font-bold bg-clip-text text-transparent"
                          style={{
                            backgroundImage: `linear-gradient(to right, hsl(var(--${era.colorFrom})), hsl(var(--${era.colorTo})))`,
                          }}
                        >
                          {era.title}
                        </h3>
                        <p className="text-sm text-muted-foreground italic mb-4">{era.subtitle}</p>
                        <ul className="space-y-3 text-sm">
                          {era.items.map((item, idx) => {
                            const ItemIcon = item.icon;
                            return (
                              <li key={idx} className="flex gap-3">
                                <ItemIcon className={`w-4 h-4 text-${era.colorFrom} flex-shrink-0 mt-0.5`} />
                                <div>{item.text}</div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>

                      {/* Imagem da era */}
                      <div className="w-64 flex-shrink-0">
                        <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-muted/50 border border-border">
                          {loadingImages ? (
                            <Skeleton className="w-full h-full" />
                          ) : eraImages[era.id] ? (
                            <img
                              src={eraImages[era.id]}
                              alt={era.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Icon className="w-16 h-16 text-muted-foreground/50" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Conclusão */}
              <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 border border-primary/20">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <p className="font-semibold text-primary mb-1">Resumo da Ópera:</p>
                    <p className="text-sm text-muted-foreground">
                      Começamos querendo imitar o cérebro, passamos décadas ensinando regras lógicas, 
                      e acabamos criando modelos que aprendem lendo a internet inteira. Onde vamos parar? 
                      Essa é a próxima página da história que estamos escrevendo agora!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      </Card>
    </>
  );
};
