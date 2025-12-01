import { useState, useEffect, useRef } from "react";
import { X, Play, StopCircle, Download, FileDown, Shield, Cpu, KeyRound, MessageCircle, Network, GitBranch, Globe, Users, Brain, Sparkles, FileText, MessageSquare, Rocket } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileHistoryCarousel } from "./MobileHistoryCarousel";
import { cn } from "@/lib/utils";
import { generateAudioUrl } from "@/lib/audio-player";
import { useTranslation } from "react-i18next";
import jsPDF from 'jspdf';

interface AIHistoryPanelProps {
  onClose: () => void;
}

// Nova estrutura de dados: 13 eventos históricos
const TIMELINE_EVENTS = [
  { id: 'talos', date: 'c. 3000 a.C. - 1200 a.C.', icon: Shield, era: 'bronze' },
  { id: 'turing-machine', date: '1936', icon: Cpu, era: 'compute' },
  { id: 'enigma', date: '1940-1945', icon: KeyRound, era: 'war' },
  { id: 'turing-test', date: '1950', icon: MessageCircle, era: 'philosophy' },
  { id: 'arpanet', date: '1969', icon: Network, era: 'internet' },
  { id: 'tcpip', date: '1974', icon: GitBranch, era: 'protocol' },
  { id: 'www', date: '1989', icon: Globe, era: 'web' },
  { id: 'social', date: '2004', icon: Users, era: 'social' },
  { id: 'watson', date: '2011', icon: Brain, era: 'watson' },
  { id: 'openai', date: '2015', icon: Sparkles, era: 'openai' },
  { id: 'gpt3', date: '2020', icon: FileText, era: 'gpt' },
  { id: 'chatgpt', date: '2022', icon: MessageSquare, era: 'chatgpt' },
  { id: 'current', date: 'Atualidade', icon: Rocket, era: 'current' }
];

export const AIHistoryPanel = ({ onClose }: AIHistoryPanelProps) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [position, setPosition] = useState({ x: window.innerWidth / 2 - 550, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [eventImages, setEventImages] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState(true);
  const [currentEventId, setCurrentEventId] = useState("talos");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const eventRefs = useRef<Record<string, HTMLDivElement | null>>({});
  
  // Traduções dos eventos da linha do tempo
  const timelineData = TIMELINE_EVENTS.map(event => ({
    ...event,
    title: t(`aiHistory.timeline.${event.id}.title`),
    description: t(`aiHistory.timeline.${event.id}.description`)
  }));

  // Texto completo para áudio (concatenação de todos os eventos)
  const fullText = timelineData.map(event => 
    `${event.date} - ${event.title}. ${event.description}`
  ).join('\n\n');

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

  // Timestamps de cada evento no áudio (distribuídos uniformemente)
  const eventTimestamps = TIMELINE_EVENTS.map((event, idx) => ({
    id: event.id,
    startTime: idx * 20, // ~20 segundos por evento
    endTime: (idx + 1) * 20
  }));

  // Carregar imagens dos eventos (executar apenas UMA VEZ)
  useEffect(() => {
    const loadImages = async () => {
      setLoadingImages(true);
      const images: Record<string, string> = {};

      for (const event of TIMELINE_EVENTS) {
        try {
          const { data, error } = await supabase.functions.invoke('generate-history-image', {
            body: { eraId: event.id }
          });

          if (error) throw error;
          if (data?.imageUrl) {
            images[event.id] = data.imageUrl;
            console.log(`Evento ${event.id}: ${data.fromCache ? 'cache' : 'gerado'}`);
          }
        } catch (error) {
          console.error(`Erro ao carregar imagem do evento ${event.id}:`, error);
        }
      }

      setEventImages(images);
      setLoadingImages(false);
    };

    loadImages();
  }, []); // Rodar apenas uma vez
  
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
  
  // Função para pular para um evento específico
  const handleJumpToEvent = (eventId: string) => {
    setCurrentEventId(eventId);
    
    // Scroll para o evento (desktop)
    if (!isMobile && eventRefs.current[eventId]) {
      eventRefs.current[eventId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
    
    // Se áudio existir, pula para o timestamp do evento
    if (audioRef.current) {
      const eventTimestamp = eventTimestamps.find(e => e.id === eventId);
      if (eventTimestamp) {
        audioRef.current.currentTime = eventTimestamp.startTime;
      }
    }
  };

  // Auto-scroll sincronizado com áudio
  useEffect(() => {
    if (!isPlaying) return;

    const currentEvent = eventTimestamps.find(
      (event) => currentTime >= event.startTime && currentTime < event.endTime
    );

    if (currentEvent && currentEvent.id !== currentEventId) {
      setCurrentEventId(currentEvent.id);
      
      // Desktop: scroll suave para a seção
      if (!isMobile && eventRefs.current[currentEvent.id]) {
        eventRefs.current[currentEvent.id]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
      // Mobile: o carousel já sincroniza via props currentEventId
    }
  }, [currentTime, isPlaying, isMobile, currentEventId]);
  
  // Exportar para PDF
  const exportTimelineToPDF = () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    // Título
    pdf.setFontSize(20);
    pdf.text(t('aiHistory.title'), 20, 20);
    
    // Subtítulo
    pdf.setFontSize(12);
    pdf.text('De Talos à Febre da IA', 20, 30);
    
    let yPosition = 45;
    
    timelineData.forEach((event, idx) => {
      // Nova página se necessário
      if (yPosition > 270) {
        pdf.addPage();
        yPosition = 20;
      }
      
      // Data
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(event.date, 20, yPosition);
      
      // Título
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text(event.title, 20, yPosition + 6);
      
      // Descrição
      pdf.setFontSize(9);
      pdf.setTextColor(60, 60, 60);
      const splitText = pdf.splitTextToSize(event.description, 170);
      pdf.text(splitText, 20, yPosition + 12);
      
      yPosition += 20 + (splitText.length * 4);
    });
    
    pdf.save('linha-do-tempo-ia.pdf');
  };

  // Renderização mobile
  if (isMobile) {
    return (
      <Drawer open={true} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="h-[90vh]">
          <div className="p-4 space-y-4 h-full flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                {t('aiHistory.timeline.title')}
              </h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            {/* Badge Navigation */}
            <ScrollArea className="w-full">
              <div className="flex gap-2 pb-2">
                {TIMELINE_EVENTS.map((event) => {
                  const Icon = event.icon;
                  return (
                    <Badge
                      key={event.id}
                      variant={currentEventId === event.id ? "default" : "outline"}
                      className="cursor-pointer whitespace-nowrap flex items-center gap-1 shrink-0"
                      onClick={() => handleJumpToEvent(event.id)}
                    >
                      <Icon className="w-3 h-3" />
                      {event.date}
                    </Badge>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Audio Controls */}
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Button onClick={handlePlayAudio} disabled={isPlaying} size="sm" variant="outline">
                  <Play className="w-4 h-4 mr-1" />
                  {t('audio.play')}
                </Button>
                <Button onClick={handleStopAudio} disabled={!isPlaying} size="sm" variant="outline">
                  <StopCircle className="w-4 h-4 mr-1" />
                  {t('audio.stop')}
                </Button>
                <Button onClick={handleDownloadAudio} disabled={!audioRef.current} size="sm" variant="outline">
                  <Download className="w-4 h-4 mr-1" />
                  {t('audio.download')}
                </Button>
                <Button onClick={exportTimelineToPDF} size="sm" variant="outline">
                  <FileDown className="w-4 h-4 mr-1" />
                  PDF
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
              events={timelineData}
              currentEventId={currentEventId}
              eventImages={eventImages}
              loadingImages={loadingImages}
              onEventSelect={handleJumpToEvent}
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
        className="fixed z-50 w-[1100px] h-[85vh] overflow-hidden bg-background/95 backdrop-blur-md border-primary/20 shadow-2xl animate-scale-in"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onMouseDown={handleMouseDown}
      >
        <div className="relative p-6 h-full flex flex-col">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 z-10"
          >
            <X className="w-5 h-5" />
          </Button>

          <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            {t('aiHistory.timeline.title')}
          </h2>

          {/* Badge Navigation */}
          <div className="flex items-center justify-center gap-2 mb-4 flex-wrap flex-shrink-0">
            {TIMELINE_EVENTS.map((event) => {
              const Icon = event.icon;
              return (
                <Badge
                  key={event.id}
                  variant={currentEventId === event.id ? "default" : "outline"}
                  className="cursor-pointer whitespace-nowrap flex items-center gap-1"
                  onClick={() => handleJumpToEvent(event.id)}
                >
                  <Icon className="w-3 h-3" />
                  <span className="text-xs">{event.date}</span>
                </Badge>
              );
            })}
          </div>

          {/* Audio Controls */}
          <div className="mb-4 p-4 rounded-lg bg-muted/50 border border-border flex-shrink-0">
             <div className="flex items-center gap-3 mb-2">
              <Button
                onClick={handlePlayAudio}
                disabled={isPlaying}
                size="sm"
                variant="outline"
              >
                <Play className="w-4 h-4 mr-2" />
                {t('audio.play')}
              </Button>
              <Button
                onClick={handleStopAudio}
                disabled={!isPlaying}
                size="sm"
                variant="outline"
              >
                <StopCircle className="w-4 h-4 mr-2" />
                {t('audio.stop')}
              </Button>
              <Button
                onClick={handleDownloadAudio}
                disabled={!audioRef.current}
                size="sm"
                variant="outline"
              >
                <Download className="w-4 h-4 mr-2" />
                {t('audio.download')}
              </Button>
              <Button
                onClick={exportTimelineToPDF}
                size="sm"
                variant="outline"
              >
                <FileDown className="w-4 h-4 mr-2" />
                PDF
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

          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-4 pr-4">
              {timelineData.map((event) => {
                const Icon = event.icon;
                const eraConfig = TIMELINE_EVENTS.find(e => e.id === event.id);
                return (
                  <div
                    key={event.id}
                    ref={(el) => (eventRefs.current[event.id] = el)}
                    className={cn(
                      "relative pl-12 border-l-2 transition-all duration-500 pb-3",
                      currentEventId === event.id
                        ? "border-primary bg-primary/5 scale-[1.01]"
                        : "border-primary/30"
                    )}
                  >
                    <div
                      className="absolute -left-6 top-0 w-9 h-9 rounded-full flex items-center justify-center shadow-lg bg-primary"
                    >
                      <Icon className="w-4 h-4 text-primary-foreground" />
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-mono text-muted-foreground">{event.date}</span>
                        </div>
                        <h3 className="text-lg font-bold text-primary mb-1.5">
                          {event.title}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-snug">
                          {event.description}
                        </p>
                      </div>

                      {/* Imagem do evento */}
                      <div className="w-48 flex-shrink-0">
                        <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-muted/50 border border-border">
                          {loadingImages ? (
                            <Skeleton className="w-full h-full" />
                          ) : eventImages[event.id] ? (
                            <img
                              src={eventImages[event.id]}
                              alt={event.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Icon className="w-12 h-12 text-muted-foreground/50" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </Card>
    </>
  );
};
