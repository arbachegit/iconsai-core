import { useState, useRef, useEffect } from "react";
import { X, Play, Pause, Edit2, Save } from "lucide-react";
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

    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio(content.audio_url);
        audioRef.current.onended = () => setIsPlaying(false);
      }
      audioRef.current.play();
      setIsPlaying(true);
    }
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

        <div className="flex items-center justify-between p-4 border-t border-primary/20 no-drag gap-2">
          {content?.audio_url && (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePlayAudio}
              className="gap-2"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4" />
                  Pausar
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Ouvir
                </>
              )}
            </Button>
          )}
          
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
      </Card>
    </>
  );
};
