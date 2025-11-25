import { useState, useRef, useEffect } from "react";
import { X, Play, Square, Download, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useTooltipContent } from "@/hooks/useTooltipContent";
import { useToast } from "@/hooks/use-toast";
import { AudioStreamPlayer, generateAudioUrl } from "@/lib/audio-player";
import { TooltipImageCarousel } from "./TooltipImageCarousel";

interface DraggablePreviewPanelProps {
  sectionId: string;
  onClose: () => void;
}

const sectionSubtitles: Record<string, string> = {
  "bom-prompt": "Como construir um prompt eficaz",
  "ia-nova-era": "IA generativa como motor de ideias e acelerador tecnológico",
  "internet": "A Internet como infraestrutura para a Inteligência Artificial e o conhecimento global",
  "knowyou": "KnowYOU e ACC: inteligência conversacional centrada no humano",
  "software": "Como isto impactou a IA",
  "tech-sem-proposito": "O Contraste com a IA: Propósito Claro e o Poder da Comunicação",
  "watson": "O Despertar do Propósito e a Longa Jornada da Comunicação",
  "kubrick": "A Influência de HAL e a Era da Comunicação Semântica"
};

export const DraggablePreviewPanel = ({
  sectionId,
  onClose,
}: DraggablePreviewPanelProps) => {
  const { content, isLoading, updateContent } = useTooltipContent(sectionId);
  const { toast } = useToast();
  
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  
  const panelRef = useRef<HTMLDivElement>(null);
  const audioPlayerRef = useRef<AudioStreamPlayer | null>(null);

  // Initialize audio player with progress callback
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

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".no-drag")) return;
    
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    setPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  const handlePlayAudio = async () => {
    if (!audioPlayerRef.current) return;

    try {
      if (isPlaying) {
        await audioPlayerRef.current.pause();
        setIsPlaying(false);
      } else {
        // Check if audio URL exists, if not generate it
        let audioUrl = content?.audio_url;
        
        if (!audioUrl && content?.content) {
          setIsGeneratingAudio(true);
          try {
            audioUrl = await generateAudioUrl(content.content);
            
            // Save to database cache
            await updateContent({ audio_url: audioUrl });
            
            toast({
              title: "Áudio gerado",
              description: "O áudio foi gerado e salvo com sucesso.",
            });
          } catch (error) {
            console.error("Error generating audio:", error);
            toast({
              title: "Erro ao gerar áudio",
              description: "Não foi possível gerar o áudio. Tente novamente.",
              variant: "destructive",
            });
            setIsGeneratingAudio(false);
            return;
          } finally {
            setIsGeneratingAudio(false);
          }
        }
        
        if (audioUrl) {
          await audioPlayerRef.current.playAudioFromUrl(audioUrl);
          setIsPlaying(true);
        }
      }
    } catch (error) {
      console.error("Error playing audio:", error);
      toast({
        title: "Erro ao reproduzir áudio",
        description: "Não foi possível reproduzir o áudio. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleStopAudio = () => {
    audioPlayerRef.current?.stop();
    setIsPlaying(false);
    setAudioProgress(0);
  };

  const handleDownloadAudio = () => {
    if (!content?.audio_url) {
      toast({
        title: "Áudio não disponível",
        description: "Este tooltip ainda não possui áudio para download.",
        variant: "destructive",
      });
      return;
    }

    const link = document.createElement('a');
    link.href = content.audio_url;
    link.download = `${content.title.replace(/\s+/g, '-')}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <Card
        ref={panelRef}
        className="fixed z-50 w-[750px] max-h-[80vh] flex flex-col bg-card/95 backdrop-blur-md border-primary/20 shadow-2xl"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      >
        <div
          className="flex items-center justify-between p-4 border-b border-primary/20"
          onMouseDown={handleMouseDown}
          style={{ cursor: isDragging ? "grabbing" : "grab" }}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <h3 className="font-semibold text-foreground">
              Informações
            </h3>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            className="no-drag"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 no-drag">
          <h2 className="text-2xl font-bold text-gradient">
            {content?.title}
          </h2>
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePlayAudio}
                disabled={isGeneratingAudio}
                className="gap-2"
              >
                {isGeneratingAudio ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Gerando...
                  </>
                ) : isPlaying ? (
                  <>
                    <Square className="w-4 h-4" />
                    Pausar
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    {content?.audio_url ? 'Play' : 'Gerar e Reproduzir'}
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleStopAudio}
                disabled={!content?.audio_url || isGeneratingAudio}
                className="gap-2"
              >
                <Square className="w-4 h-4" />
                Stop
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadAudio}
                disabled={!content?.audio_url || isGeneratingAudio}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
            </div>
            
            {/* Progress bar - só aparece quando há áudio */}
            {content?.audio_url && (
              <div className="space-y-1">
                <Progress value={audioProgress} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {Math.floor((audioProgress / 100) * audioDuration / 60)}:
                    {String(Math.floor((audioProgress / 100) * audioDuration % 60)).padStart(2, '0')}
                  </span>
                  <span>
                    {Math.floor(audioDuration / 60)}:
                    {String(Math.floor(audioDuration % 60)).padStart(2, '0')}
                  </span>
                </div>
              </div>
            )}
            
            {/* Mensagem quando não há áudio */}
            {!content?.audio_url && (
              <p className="text-xs text-muted-foreground italic">
                Áudio em breve
              </p>
            )}
          </div>
          
          {/* Carrossel de imagens */}
          <div className="py-4">
            <TooltipImageCarousel sectionId={sectionId} />
          </div>
          
          {/* Subtítulo intermediário */}
          {sectionSubtitles[sectionId] && (
            <div className="border-t border-b border-primary/20 py-3 my-4">
              <h3 className="text-lg font-semibold text-primary/90">
                📌 {sectionSubtitles[sectionId]}
              </h3>
            </div>
          )}
          
          <p className="text-muted-foreground leading-relaxed">
            {content?.content}
          </p>
        </div>
      </Card>
    </>
  );
};
