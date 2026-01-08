import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import type { PWAConversationMessage } from '@/types/pwa-conversations';
import { Play, Pause, Share2, FileText, Download, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PWAAudioMessageProps {
  message: PWAConversationMessage;
  moduleColor: string;
  isSummary?: boolean;
}

export const PWAAudioMessage = ({ 
  message, 
  moduleColor, 
  isSummary = false 
}: PWAAudioMessageProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(message.audio_duration_seconds || 0);
  const [showTranscription, setShowTranscription] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isUser = message.role === 'user';
  const hasAudio = !!message.audio_url;
  
  // CORES DIFERENCIADAS: user=cinza, assistant=cor do módulo
  const bgStyle = isUser 
    ? { backgroundColor: 'hsl(var(--muted))' }
    : { backgroundColor: moduleColor + '15' };
    
  const borderStyle = isUser 
    ? { borderRight: '3px solid hsl(var(--muted-foreground) / 0.4)' }
    : { borderLeft: `3px solid ${moduleColor}` };
    
  const alignment = isUser ? 'mr-auto' : 'ml-auto';

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handlePlayPause = () => {
    if (!message.audio_url) {
      toast.error('Áudio não disponível');
      return;
    }
    
    if (!audioRef.current) {
      setIsLoading(true);
      setHasError(false);
      
      const audio = new Audio(message.audio_url);
      audioRef.current = audio;
      
      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration);
        setIsLoading(false);
      });
      
      audio.addEventListener('timeupdate', () => {
        if (audio.duration) {
          setProgress((audio.currentTime / audio.duration) * 100);
        }
      });
      
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setProgress(0);
      });
      
      audio.addEventListener('error', () => {
        console.error('[PWAAudioMessage] Erro ao carregar áudio');
        setHasError(true);
        setIsLoading(false);
        toast.error('Erro ao carregar áudio');
      });
      
      audio.addEventListener('canplay', () => setIsLoading(false));
    }
    
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(() => toast.error('Erro ao reproduzir'));
      }
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current?.duration) {
      audioRef.current.currentTime = (value[0] / 100) * audioRef.current.duration;
      setProgress(value[0]);
    }
  };

  const handleShare = () => {
    if (message.audio_url) {
      navigator.clipboard.writeText(message.audio_url);
      toast.success('Link copiado!');
    }
  };

  const handleDownload = () => {
    if (message.audio_url) {
      const link = document.createElement('a');
      link.href = message.audio_url;
      link.download = `audio-${message.id}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // SEM ÁUDIO = apenas texto
  if (!hasAudio) {
    return (
      <div className={`flex flex-col ${alignment} max-w-[80%] ${isSummary ? 'w-full max-w-full' : ''}`}>
        <div 
          className="rounded-xl p-3"
          style={{ ...bgStyle, ...borderStyle }}
        >
          <p className="text-sm">
            {message.content || message.transcription || 'Sem conteúdo'}
          </p>
        </div>
        <div className={`flex items-center gap-2 mt-1 text-xs text-muted-foreground ${isUser ? 'justify-start' : 'justify-end'}`}>
          <span>{isUser ? '👤 Usuário' : '🤖 Assistente'}</span>
          <span>•</span>
          <span>{new Date(message.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
    );
  }

  // COM ÁUDIO = player completo
  return (
    <div className={`flex flex-col ${alignment} max-w-[80%] ${isSummary ? 'w-full max-w-full' : ''}`}>
      <div 
        className={`rounded-xl p-3 ${isSummary ? 'border-2' : ''}`}
        style={{ ...bgStyle, ...borderStyle, borderColor: isSummary ? moduleColor : undefined }}
      >
        {/* Player Controls */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full flex-shrink-0"
            style={{ backgroundColor: moduleColor + '20', color: moduleColor }}
            onClick={handlePlayPause}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> 
             : hasError ? <AlertCircle className="w-5 h-5" /> 
             : isPlaying ? <Pause className="w-5 h-5" /> 
             : <Play className="w-5 h-5" />}
          </Button>
          
          <div className="flex-1 min-w-0">
            <Slider
              value={[progress]}
              max={100}
              step={1}
              className="cursor-pointer"
              onValueChange={handleSeek}
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-muted-foreground">
                {formatDuration((progress / 100) * duration)}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDuration(duration)}
              </span>
            </div>
          </div>
        </div>

        {hasError && (
          <div className="mt-2 text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Erro ao carregar áudio
          </div>
        )}

        {/* Transcription */}
        {showTranscription && (
          <div className="mt-3 p-2 bg-background/50 rounded-lg text-sm">
            {message.transcription || message.content || 'Transcrição não disponível'}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-1 mt-2 justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleShare}
            title="Compartilhar"
          >
            <Share2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setShowTranscription(!showTranscription)}
            title="Ver transcrição"
          >
            <FileText className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleDownload}
            title="Download"
          >
            <Download className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Role indicator and timestamp */}
      <div className={`flex items-center gap-2 mt-1 text-xs text-muted-foreground ${isUser ? 'justify-start' : 'justify-end'}`}>
        <span>{isUser ? '👤 Usuário' : '🤖 Assistente'}</span>
        <span>•</span>
        <span>{new Date(message.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  );
};
