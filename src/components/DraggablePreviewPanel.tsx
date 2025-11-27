import { useState, useRef, useEffect } from "react";
import { X, Play, Square, Download, Edit2, Save } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
  const { content, isLoading, updateContent } = useTooltipContent(sectionId);
  const { toast } = useToast();
  
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isEditMode, setIsEditMode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedContent, setEditedContent] = useState("");
  
  const panelRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (content) {
      setEditedTitle(content.title);
      setEditedContent(content.content);
    }
  }, [content]);

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

    if (!audioRef.current) {
      audioRef.current = new Audio(content.audio_url);
      audioRef.current.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };
      audioRef.current.ontimeupdate = () => {
        setCurrentTime(audioRef.current?.currentTime || 0);
      };
      audioRef.current.onloadedmetadata = () => {
        setDuration(audioRef.current?.duration || 0);
      };
    }
    
    audioRef.current.play();
    setIsPlaying(true);
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
    if (content?.audio_url) {
      const link = document.createElement('a');
      link.href = content.audio_url;
      link.download = `tooltip-${sectionId}-audio.mp3`;
      link.click();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSave = async () => {
    try {
      await updateContent({
        title: editedTitle,
        content: editedContent,
      });
      
      toast({
        title: "Salvo com sucesso",
        description: "O conteúdo do tooltip foi atualizado.",
      });
      
      setIsEditMode(false);
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível atualizar o tooltip.",
        variant: "destructive",
      });
    }
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
              {isEditMode ? "Editar Tooltip" : "Informações"}
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
          {isEditMode ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Título
                </label>
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="bg-background/50"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Conteúdo
                </label>
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  rows={10}
                  className="bg-background/50 resize-none"
                />
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gradient">
                {content?.title}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {content?.content}
              </p>
            </>
          )}
        </div>

        <div className="border-t border-primary/20 no-drag">
          {content?.audio_url && (
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePlayAudio}
                  disabled={isPlaying}
                  className="gap-2"
                >
                  <Play className="w-4 h-4" />
                  Play
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStopAudio}
                  disabled={!isPlaying}
                  className="gap-2"
                >
                  <Square className="w-4 h-4" />
                  Stop
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadAudio}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              </div>
              
              {/* Progress bar */}
              <div className="space-y-1">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-200"
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
          
          <div className="flex items-center justify-end p-4 border-t border-primary/20 gap-2">
          {isEditMode ? (
            <Button
              size="sm"
              onClick={handleSave}
              className="gap-2 ml-auto"
            >
              <Save className="w-4 h-4" />
              Salvar
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditMode(true)}
              className="gap-2 ml-auto"
            >
              <Edit2 className="w-4 h-4" />
              Editar
            </Button>
          )}
          </div>
        </div>
      </Card>
    </>
  );
};
