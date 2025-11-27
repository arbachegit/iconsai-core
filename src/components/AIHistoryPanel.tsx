import { useState, useEffect, useRef } from "react";
import { X, Play, StopCircle, Download, Clock, Baby, Users, GraduationCap, Rocket, Bot, Sparkles, Snowflake, Skull, Crown, Home, Cat, Palette, Lightbulb } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";

interface AIHistoryPanelProps {
  onClose: () => void;
}

export const AIHistoryPanel = ({ onClose }: AIHistoryPanelProps) => {
  const [position, setPosition] = useState({ x: window.innerWidth / 2 - 400, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
        const response = await supabase.functions.invoke('text-to-speech', {
          body: { text: fullText }
        });

        if (response.error) throw response.error;

        const audioBlob = await response.data;
        const audioUrl = URL.createObjectURL(audioBlob);
        
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

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
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
              {/* Era 1: O Sonho */}
              <div className="relative pl-10 border-l-2 border-amber-500/30">
                <div className="absolute -left-5 top-0 w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                  O Sonho (Antes de 1950)
                </h3>
                <p className="text-sm text-muted-foreground italic mb-4">Onde tudo era ficção científica e desejo humano.</p>
                <ul className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div><strong>Antiguidade:</strong> Mitos gregos já falavam de autômatos e estátuas que ganhavam vida (como Talos, o gigante de bronze).</div>
                  </li>
                  <li className="flex gap-3">
                    <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div><strong>1843 - A "Avó" da Programação:</strong> Ada Lovelace escreve o primeiro algoritmo para uma máquina.</div>
                  </li>
                  <li className="flex gap-3">
                    <Bot className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div><strong>1920 - Nasce a palavra "Robô":</strong> Uma peça de teatro tcheca (R.U.R.) usa o termo pela primeira vez.</div>
                  </li>
                </ul>
              </div>

              {/* Era 2: O Nascimento */}
              <div className="relative pl-10 border-l-2 border-blue-500/30">
                <div className="absolute -left-5 top-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                  <Baby className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                  O Nascimento (Anos 50)
                </h3>
                <p className="text-sm text-muted-foreground italic mb-4">Onde a IA ganha nome e dá os primeiros passos.</p>
                <ul className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <Lightbulb className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div><strong>1950 - O Teste de Turing:</strong> Alan Turing lança a pergunta: "Máquinas podem pensar?"</div>
                  </li>
                  <li className="flex gap-3">
                    <Sparkles className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div><strong>1956 - O Batismo:</strong> Conferência de Dartmouth cunha oficialmente o termo "Inteligência Artificial".</div>
                  </li>
                  <li className="flex gap-3">
                    <Bot className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div><strong>1957 - Perceptron:</strong> Frank Rosenblatt cria uma máquina que tenta imitar um neurônio.</div>
                  </li>
                </ul>
              </div>

              {/* Era 3: Infância e Adolescência */}
              <div className="relative pl-10 border-l-2 border-purple-500/30">
                <div className="absolute -left-5 top-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                  A Infância e Adolescência (Anos 60 a 80)
                </h3>
                <p className="text-sm text-muted-foreground italic mb-4">Altos e baixos, rebeldia e filmes de Hollywood.</p>
                <ul className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <Bot className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                    <div><strong>1966 - ELIZA, a "Psicóloga":</strong> O primeiro chatbot da história!</div>
                  </li>
                  <li className="flex gap-3">
                    <Snowflake className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                    <div><strong>Anos 70 - O Inverno da IA:</strong> As promessas eram grandes demais e a tecnologia não entregava.</div>
                  </li>
                  <li className="flex gap-3">
                    <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                    <div><strong>Anos 80 - O Retorno:</strong> A IA volta com os "Sistemas Especialistas".</div>
                  </li>
                  <li className="flex gap-3">
                    <Skull className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                    <div><strong>O Exterminador do Futuro (1984):</strong> O cinema cria a imagem da IA como vilã.</div>
                  </li>
                </ul>
              </div>

              {/* Era 4: Fase Adulta */}
              <div className="relative pl-10 border-l-2 border-green-500/30">
                <div className="absolute -left-5 top-0 w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
                  A Fase Adulta (Anos 90 e 2000)
                </h3>
                <p className="text-sm text-muted-foreground italic mb-4">A IA começa a ganhar dos humanos e a entrar na nossa casa.</p>
                <ul className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <Crown className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <div><strong>1997 - Xeque-mate:</strong> O computador Deep Blue (IBM) vence Garry Kasparov no xadrez.</div>
                  </li>
                  <li className="flex gap-3">
                    <Home className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <div><strong>2002 - Roomba:</strong> A IA entra na sua sala... para aspirar pó.</div>
                  </li>
                  <li className="flex gap-3">
                    <Bot className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <div><strong>2011 - "Ei, Siri":</strong> Começamos a falar com nossos telefones.</div>
                  </li>
                </ul>
              </div>

              {/* Era 5: Revolução Generativa */}
              <div className="relative pl-10 border-l-2 border-cyan-500/30">
                <div className="absolute -left-5 top-0 w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg animate-pulse">
                  <Rocket className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">
                  A Revolução Generativa (2010s até Hoje)
                </h3>
                <p className="text-sm text-muted-foreground italic mb-4">A IA deixa de apenas analisar e começa a CRIAR.</p>
                <ul className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <Cat className="w-4 h-4 text-cyan-500 flex-shrink-0 mt-0.5" />
                    <div><strong>2012 - O "Big Bang" do Deep Learning:</strong> Redes neurais aprendem a identificar gatos no YouTube sozinhas.</div>
                  </li>
                  <li className="flex gap-3">
                    <Crown className="w-4 h-4 text-cyan-500 flex-shrink-0 mt-0.5" />
                    <div><strong>2016 - AlphaGo:</strong> A IA vence o campeão mundial de Go com jogadas "criativas".</div>
                  </li>
                  <li className="flex gap-3">
                    <Sparkles className="w-4 h-4 text-cyan-500 flex-shrink-0 mt-0.5" />
                    <div><strong>2017 - O Transformer:</strong> Google publica "Attention Is All You Need". Nasce a arquitetura do GPT.</div>
                  </li>
                  <li className="flex gap-3">
                    <Palette className="w-4 h-4 text-cyan-500 flex-shrink-0 mt-0.5" />
                    <div><strong>2022/2023 - A Era do ChatGPT e Gemini:</strong> A IA "sai da jaula" e se torna uma co-piloto criativa.</div>
                  </li>
                </ul>
              </div>

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
