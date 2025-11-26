import { useState, useEffect, useRef } from "react";
import { ChevronDown, Play, Square, Download } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { AudioStreamPlayer } from "@/lib/audio-player";
import { toast } from "sonner";

export const DigitalExclusionSection = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioPlayerRef = useRef<AudioStreamPlayer | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchAudio();
  }, []);

  const fetchAudio = async () => {
    try {
      const { data, error } = await supabase
        .from('section_audio')
        .select('audio_url')
        .eq('section_id', 'digital-exclusion')
        .single();

      if (error) throw error;
      if (data?.audio_url) {
        setAudioUrl(data.audio_url);
      }
    } catch (error) {
      console.error('Error fetching audio:', error);
    }
  };

  const handlePlayAudio = async () => {
    if (!audioUrl) {
      toast.error("Áudio não disponível");
      return;
    }

    if (isPlaying) {
      audioElementRef.current?.pause();
      setIsPlaying(false);
      return;
    }

    try {
      if (!audioElementRef.current) {
        const audio = new Audio(audioUrl);
        audioElementRef.current = audio;
        
        audio.addEventListener('loadedmetadata', () => {
          setDuration(audio.duration);
        });
        
        audio.addEventListener('timeupdate', () => {
          setCurrentTime(audio.currentTime);
        });
        
        audio.addEventListener('ended', () => {
          setIsPlaying(false);
          setCurrentTime(0);
        });
      }
      
      await audioElementRef.current.play();
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing audio:', error);
      toast.error("Erro ao reproduzir áudio");
    }
  };

  const handleStopAudio = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  const handleDownloadAudio = () => {
    if (audioUrl) {
      const link = document.createElement('a');
      link.href = audioUrl;
      link.download = 'exclusao-digital.mp3';
      link.click();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <section className="py-8 relative">
      <div className="container mx-auto px-4">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm border border-primary/20 rounded-lg p-8 shadow-lg">
              <div className="text-center space-y-4">
                <h1 className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  5,74 bilhões
                </h1>
                <h1 className="text-2xl md:text-3xl font-semibold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent mt-4">
                  de pessoas ainda não conseguem acessar a internet
                </h1>
                
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="group border-primary/30 hover:border-primary/60 transition-all duration-300"
                  >
                    <span className="mr-2">Saiba mais sobre esse desafio</span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
              </div>

              <CollapsibleContent className="mt-8 space-y-6 animate-accordion-down">
                {/* Audio Controls */}
                {audioUrl && (
                  <div className="border-t border-primary/20 pt-6 space-y-4">
                    <div className="flex items-center gap-2 justify-center flex-wrap">
                      <Button
                        size="sm"
                        onClick={handlePlayAudio}
                        variant="outline"
                        className="gap-2"
                      >
                        <Play className="h-4 w-4" />
                        {isPlaying ? 'Pausar' : 'Play'}
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleStopAudio}
                        variant="outline"
                        className="gap-2"
                      >
                        <Square className="h-4 w-4" />
                        Stop
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleDownloadAudio}
                        variant="outline"
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-primary to-secondary h-full transition-all duration-200"
                          style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Content Text */}
                <div className="prose prose-invert max-w-none space-y-4 text-muted-foreground">
                  <p>
                    Enquanto celebramos os avanços da inteligência artificial e sua capacidade de transformar indústrias, 
                    comunicação e conhecimento, uma realidade inquietante permanece: 5,74 bilhões de pessoas ao redor do 
                    mundo ainda não têm acesso à internet. Essa exclusão digital representa não apenas uma barreira 
                    tecnológica, mas um abismo de oportunidades que se amplia exponencialmente na era da IA generativa.
                  </p>

                  <div className="my-8 flex justify-center">
                    <div className="w-full max-w-md aspect-square rounded-lg bg-gradient-subtle flex items-center justify-center border border-primary/20">
                      <div className="w-32 h-32 rounded-full bg-gradient-primary opacity-20 animate-pulse-slow" />
                    </div>
                  </div>

                  <p>
                    A democratização da inteligência artificial depende fundamentalmente do acesso à conectividade. 
                    Sem internet, bilhões de pessoas estão excluídas não apenas das ferramentas de IA, mas também da 
                    alfabetização necessária para compreender, questionar e utilizar essas tecnologias de forma crítica 
                    e produtiva.
                  </p>

                  <p>
                    Além das barreiras de infraestrutura, enfrentamos desafios linguísticos e cognitivos: a maioria dos 
                    modelos de IA é treinada predominantemente em inglês, e mesmo quando disponíveis em outros idiomas, 
                    exigem um nível de alfabetização digital que grande parte da população global ainda não possui. 
                    A verdadeira revolução da IA só será completa quando conseguirmos incluir essas 5,74 bilhões de 
                    vozes na conversa.
                  </p>
                </div>
              </CollapsibleContent>
            </div>
          </div>
        </Collapsible>
      </div>
    </section>
  );
};
