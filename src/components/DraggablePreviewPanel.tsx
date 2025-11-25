import { useState, useRef, useEffect } from "react";
import { X, Play, Square, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useTooltipContent } from "@/hooks/useTooltipContent";
import { useToast } from "@/hooks/use-toast";

interface DraggablePreviewPanelProps {
  sectionId: string;
  onClose: () => void;
}

export const DraggablePreviewPanel = ({
  sectionId,
  onClose,
}: DraggablePreviewPanelProps) => {
  const { content, isLoading } = useTooltipContent(sectionId);
  const { toast } = useToast();
  
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  
  const panelRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  const handlePlayAudio = () => {
    if (!content?.audio_url) {
      toast({
        title: "Áudio não disponível",
        description: "Este tooltip ainda não possui áudio.",
        variant: "destructive",
      });
      return;
    }

    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio(content.audio_url);
        
        // Setup audio event listeners
        audioRef.current.onended = () => {
          setIsPlaying(false);
          setAudioProgress(0);
        };
        
        audioRef.current.onloadedmetadata = () => {
          setAudioDuration(audioRef.current?.duration || 0);
        };
        
        audioRef.current.ontimeupdate = () => {
          if (audioRef.current) {
            const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
            setAudioProgress(progress);
          }
        };
      }
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleStopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setAudioProgress(0);
    }
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
        className="fixed z-50 w-[500px] max-h-[600px] flex flex-col bg-card/95 backdrop-blur-md border-primary/20 shadow-2xl"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          cursor: isDragging ? "grabbing" : "grab",
        }}
      >
        <div
          className="flex items-center justify-between p-4 border-b border-primary/20"
          onMouseDown={handleMouseDown}
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
                disabled={!content?.audio_url}
                className="gap-2"
              >
                <Play className="w-4 h-4" />
                {isPlaying ? "Pausar" : "Play"}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleStopAudio}
                disabled={!content?.audio_url}
                className="gap-2"
              >
                <Square className="w-4 h-4" />
                Stop
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadAudio}
                disabled={!content?.audio_url}
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
          
          <p className="text-muted-foreground leading-relaxed">
            {content?.content}
          </p>
        </div>
      </Card>
    </>
  );
};
