import { useState, useRef, useEffect } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, ChevronUp, ImageOff, RefreshCw, Play, Square, Download } from "lucide-react";
import { useGeneratedImage } from "@/hooks/useGeneratedImage";
import { AudioStreamPlayer, generateAudioUrl } from "@/lib/audio-player";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const SECTION_TEXT = `Se a internet já exclui hoje bilhões de pessoas, a "internet conversacional" baseada em prompts corre o risco de ampliar ainda mais essa distância. Estimando uma população mundial em torno de 8 bilhões de pessoas e considerando que o uso avançado de IA exige competências cognitivas e linguísticas que a maioria não domina, é razoável supor que algo em torno de 5,74 bilhões de pessoas – mais de 70% da humanidade – não conseguirá utilizar plenamente essa nova camada da internet, mesmo estando conectada.

Embora cerca de 6 bilhões de pessoas já estejam online, o que corresponde a aproximadamente 75% da população mundial, boa parte delas possui apenas habilidades digitais básicas, como navegação, uso de redes sociais e mensageiros. Competências mais sofisticadas – como estruturar pedidos complexos, analisar respostas críticas ou criar conteúdo – ainda são minoritárias. Em outras palavras, a infraestrutura técnica se expandiu, mas o "letramento cognitivo para IA" não acompanhou no mesmo ritmo. Escrever um prompt eficaz exige clareza de objetivo, capacidade de abstração, organização do raciocínio e vocabulário mínimo; isso representa uma barreira cognitiva real para grande parte da população global.

Há ainda uma barreira linguístico-cultural. A maioria dos grandes modelos de linguagem foi treinada com forte predominância de inglês e, em seguida, em alguns idiomas de alta disponibilidade de dados, como chinês e algumas línguas europeias (incluindo o francês). Estudos recentes mostram que muitos LLMs têm mais de 90% de seus dados de treino em inglês ou em combinações onde o inglês é a língua dominante, com apenas uma fração pequena dedicada a outros idiomas. Isso significa que, mesmo quando a interface aceita qualquer idioma, a "mente estatística" do modelo pensa majoritariamente em inglês e depois "volta" traduzindo.

Esse processo tem consequências diretas para gírias, dialetos, expressões regionais e idiossincrasias locais. A IA tende a normalizar o texto para um registro coloquial neutro, frequentemente eliminando nuances culturais, humor local, ironia ou formas de respeito típicas de cada comunidade linguística. Em países com grande diversidade interna – como os da América Latina, África e Ásia – isso implica que milhões de pessoas podem se sentir "mal traduzidas" ou pouco compreendidas pela IA, mesmo quando falam o idioma oficial do país. Além disso, cerca de 88% dos idiomas do mundo permanecem sub-representados na internet, o que faz com que mais de 1 bilhão de pessoas não consiga sequer usar sua própria língua de forma plena no ambiente digital, quanto mais em sistemas avançados de IA.

O resultado é um duplo bloqueio: de um lado, incapacidade cognitiva de formular prompts estruturados para interagir com sistemas sofisticados; de outro, modelos treinados em poucos idiomas dominantes, que não captam bem as formas reais de falar de grande parte da população. Se nada for feito para reduzir essas barreiras – com interfaces mais naturais, suporte robusto a idiomas locais e estratégias de inclusão cognitiva e educacional – a IA generativa corre o risco de se tornar uma tecnologia usada de forma plena por uma minoria, enquanto bilhões permanecem à margem de uma nova fase da internet que, em teoria, deveria ser para todos.`;

const DigitalExclusionSection = () => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const audioPlayerRef = useRef<AudioStreamPlayer | null>(null);

  const { imageUrl, isLoading, error, retry } = useGeneratedImage(
    "Abstract visualization of global digital divide, showing 5.74 billion people disconnected from AI technology, split world with connected bright side and disconnected dark side, language barriers represented as walls, cognitive gaps as bridges broken, purple and blue color palette, futuristic, no text",
    "digital-exclusion-section"
  );

  useEffect(() => {
    const player = new AudioStreamPlayer();
    player.setProgressCallback((progress, duration) => {
      setAudioProgress(progress);
      setAudioDuration(duration);
    });
    audioPlayerRef.current = player;
    
    return () => {
      player.stop();
    };
  }, []);

  // Load cached audio from database on mount
  useEffect(() => {
    const loadCachedAudio = async () => {
      try {
        const { data, error } = await supabase
          .from('section_audio')
          .select('audio_url')
          .eq('section_id', 'digital-exclusion')
          .maybeSingle();

        if (error) {
          console.error('Error loading cached audio:', error);
          return;
        }

        if (data?.audio_url) {
          setAudioUrl(data.audio_url);
        }
      } catch (error) {
        console.error('Error loading cached audio:', error);
      }
    };

    loadCachedAudio();
  }, []);

  const handlePlayAudio = async () => {
    try {
      if (!audioPlayerRef.current) return;

      if (audioPlayerRef.current.isPausedState()) {
        await audioPlayerRef.current.resume();
        setIsPlaying(true);
        return;
      }

      if (audioPlayerRef.current.isCurrentlyPlaying()) {
        await audioPlayerRef.current.pause();
        setIsPlaying(false);
        return;
      }

      if (!audioUrl) {
        setIsGeneratingAudio(true);
        const url = await generateAudioUrl(SECTION_TEXT);
        setAudioUrl(url);
        setIsGeneratingAudio(false);
        
        // Save to database cache
        try {
          const { error } = await supabase
            .from('section_audio')
            .upsert({
              section_id: 'digital-exclusion',
              audio_url: url,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'section_id'
            });

          if (error) {
            console.error('Error caching audio:', error);
          }
        } catch (error) {
          console.error('Error saving audio to cache:', error);
        }
        
        await audioPlayerRef.current.playAudioFromUrl(url);
        setIsPlaying(true);
      } else {
        await audioPlayerRef.current.playAudioFromUrl(audioUrl);
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("Erro ao reproduzir áudio:", error);
      setIsGeneratingAudio(false);
      setIsPlaying(false);
      toast({
        title: "Erro ao reproduzir áudio",
        description: "Não foi possível reproduzir o áudio. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleStopAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.stop();
      setIsPlaying(false);
      setAudioProgress(0);
    }
  };

  const handleDownloadAudio = () => {
    if (!audioUrl) {
      toast({
        title: "Áudio não disponível",
        description: "Reproduza o áudio primeiro para poder fazer o download.",
        variant: "destructive",
      });
      return;
    }

    const link = document.createElement("a");
    link.href = audioUrl;
    link.download = "exclusao-digital.mp3";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentTime = (audioDuration * audioProgress) / 100;

  return (
    <div className="relative py-16 px-4">
      <div className="container mx-auto max-w-4xl">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          {/* Título Impactante */}
          <div className="text-center space-y-6 mb-8">
            <div className="space-y-2">
              <h2 className="text-6xl md:text-7xl lg:text-8xl font-bold text-gradient animate-fade-in">
                5,74 bilhões
              </h2>
              <p className="text-2xl md:text-3xl text-foreground/90 animate-fade-in">
                de pessoas ainda não conseguem
              </p>
              <p className="text-2xl md:text-3xl text-foreground/90 animate-fade-in">
                acessar a internet
              </p>
            </div>

            {/* Botão de Expandir/Colapsar */}
            <CollapsibleTrigger asChild>
              <Button 
                variant="outline" 
                className="gap-2 border-primary/30 hover:bg-primary/10 transition-all"
              >
                {isOpen ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Recolher
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Saiba mais sobre esse desafio
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
          </div>

          {/* Conteúdo Expansível */}
          <CollapsibleContent className="animate-accordion-down">
            <div className="space-y-8 text-lg leading-relaxed">
              {/* Controles de Áudio - MOVIDO PARA O TOPO */}
              <div className="border-b border-primary/20 pb-6 mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handlePlayAudio}
                    disabled={isGeneratingAudio}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {isGeneratingAudio ? "Gerando..." : isPlaying ? "Pausar" : "Play"}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleStopAudio}
                    disabled={!audioUrl}
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Stop
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleDownloadAudio}
                    disabled={!audioUrl}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
                
                {audioUrl && (
                  <div className="space-y-1">
                    <Progress value={audioProgress} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(audioDuration)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Bloco 1: Introdução */}
              <div className="space-y-4">
                <p>
                  Se a internet já exclui hoje bilhões de pessoas, a "internet conversacional" baseada em prompts corre o risco de ampliar ainda mais essa distância. Estimando uma população mundial em torno de 8 bilhões de pessoas e considerando que o uso avançado de IA exige competências cognitivas e linguísticas que a maioria não domina, é razoável supor que algo em torno de 5,74 bilhões de pessoas – mais de 70% da humanidade – não conseguirá utilizar plenamente essa nova camada da internet, mesmo estando conectada.
                </p>
                <p>
                  Embora cerca de 6 bilhões de pessoas já estejam online, o que corresponde a aproximadamente 75% da população mundial, boa parte delas possui apenas habilidades digitais básicas, como navegação, uso de redes sociais e mensageiros. Competências mais sofisticadas – como estruturar pedidos complexos, analisar respostas críticas ou criar conteúdo – ainda são minoritárias. Em outras palavras, a infraestrutura técnica se expandiu, mas o "letramento cognitivo para IA" não acompanhou no mesmo ritmo. Escrever um prompt eficaz exige clareza de objetivo, capacidade de abstração, organização do raciocínio e vocabulário mínimo; isso representa uma barreira cognitiva real para grande parte da população global.
                </p>
              </div>

              {/* Imagem Nano Banana */}
              <div className="my-12 relative">
                {isLoading ? (
                  <div className="aspect-video rounded-lg bg-muted animate-pulse flex items-center justify-center">
                    <p className="text-muted-foreground">Gerando visualização...</p>
                  </div>
                ) : imageUrl ? (
                  <div className="relative rounded-lg overflow-hidden shadow-2xl border border-primary/20">
                    <img 
                      src={imageUrl} 
                      alt="Visualização da divisão digital global"
                      className="w-full h-auto"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent pointer-events-none" />
                  </div>
                ) : error ? (
                  <div className="aspect-video rounded-lg bg-muted/50 border border-muted flex flex-col items-center justify-center gap-4 p-8">
                    <ImageOff className="w-16 h-16 text-muted-foreground/50" />
                    <div className="text-center space-y-2">
                      <p className="text-muted-foreground">Imagem indisponível</p>
                      <p className="text-sm text-muted-foreground/70">Não foi possível gerar a visualização</p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={retry}
                      className="gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Tentar novamente
                    </Button>
                  </div>
                ) : null}
              </div>

              {/* Bloco 2: Barreira Linguístico-Cultural */}
              <div className="space-y-4">
                <p>
                  Há ainda uma barreira linguístico-cultural. A maioria dos grandes modelos de linguagem foi treinada com forte predominância de inglês e, em seguida, em alguns idiomas de alta disponibilidade de dados, como chinês e algumas línguas europeias (incluindo o francês). Estudos recentes mostram que muitos LLMs têm mais de 90% de seus dados de treino em inglês ou em combinações onde o inglês é a língua dominante, com apenas uma fração pequena dedicada a outros idiomas. Isso significa que, mesmo quando a interface aceita qualquer idioma, a "mente estatística" do modelo pensa majoritariamente em inglês e depois "volta" traduzindo.
                </p>
                <p>
                  Esse processo tem consequências diretas para gírias, dialetos, expressões regionais e idiossincrasias locais. A IA tende a normalizar o texto para um registro coloquial neutro, frequentemente eliminando nuances culturais, humor local, ironia ou formas de respeito típicas de cada comunidade linguística. Em países com grande diversidade interna – como os da América Latina, África e Ásia – isso implica que milhões de pessoas podem se sentir "mal traduzidas" ou pouco compreendidas pela IA, mesmo quando falam o idioma oficial do país. Além disso, cerca de 88% dos idiomas do mundo permanecem sub-representados na internet, o que faz com que mais de 1 bilhão de pessoas não consiga sequer usar sua própria língua de forma plena no ambiente digital, quanto mais em sistemas avançados de IA.
                </p>
              </div>

              {/* Bloco 3: Conclusão */}
              <div className="space-y-4 pb-4">
                <p>
                  O resultado é um duplo bloqueio: de um lado, incapacidade cognitiva de formular prompts estruturados para interagir com sistemas sofisticados; de outro, modelos treinados em poucos idiomas dominantes, que não captam bem as formas reais de falar de grande parte da população. Se nada for feito para reduzir essas barreiras – com interfaces mais naturais, suporte robusto a idiomas locais e estratégias de inclusão cognitiva e educacional – a IA generativa corre o risco de se tornar uma tecnologia usada de forma plena por uma minoria, enquanto bilhões permanecem à margem de uma nova fase da internet que, em teoria, deveria ser para todos.
                </p>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
};

export default DigitalExclusionSection;
