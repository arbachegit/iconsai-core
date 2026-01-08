import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import type { PWAConversationMessage } from '@/types/pwa-conversations';
import { Play, Pause, Share2, FileText, Download, AlertCircle, Loader2, Volume2, User, Bot } from 'lucide-react';
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
  
  // CORES DIFERENCIADAS: user=cinza escuro, assistant=cor do modulo
  const bgStyle = isUser 
    ? { backgroundColor: '#e2e8f0' }
    : { backgroundColor: moduleColor + '18' };
    
  const borderStyle = isUser 
    ? { borderLeft: '4px solid #64748b' }
    : { borderLeft: `4px solid ${moduleColor}` };
    
  const alignment = isUser ? 'mr-auto' : 'ml-auto';

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const initAudio = () => {
    if (!message.audio_url || audioRef.current) return;
    
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
      console.error('[PWAAudioMessage] Erro ao carregar audio:', message.audio_url);
      setHasError(true);
      setIsLoading(false);
      toast.error('Erro ao carregar audio');
    });
    
    audio.addEventListener('canplay', () => setIsLoading(false));
  };

  const handlePlayPause = () => {
    if (!message.audio_url) {
      toast.error('Audio nao disponivel');
      return;
    }
    
    if (!audioRef.current) {
      initAudio();
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play()
            .then(() => setIsPlaying(true))
            .catch(() => toast.error('Erro ao reproduzir'));
        }
      }, 100);
      return;
    }
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(() => toast.error('Erro ao reproduzir'));
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
      toast.success('Link copiado');
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

  // SEM AUDIO = apenas texto
  if (!hasAudio) {
    return (
      <div 
        className={`rounded-lg p-3 max-w-[85%] ${alignment}`}
        style={{ ...bgStyle, ...borderStyle }}
      >
        <div className="text-sm">
          <p className="whitespace-pre-wrap text-foreground">
            {message.content || message.transcription || 'Sem conteudo'}
          </p>
        </div>
        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
          {isUser ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
          <span>{isUser ? 'Usuario' : 'Assistente'}</span>
          <span>|</span>
          <span>{new Date(message.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
    );
  }

  // COM AUDIO = player completo
  return (
    <div 
      className={`rounded-lg p-3 max-w-[85%] ${alignment}`}
      style={{ ...bgStyle, ...borderStyle }}
    >
      <div className="space-y-2">
        {/* Player Controls */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full shrink-0"
            onClick={handlePlayPause}
            disabled={isLoading || hasError}
            style={{ backgroundColor: moduleColor + '20' }}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> 
             : hasError ? <AlertCircle className="w-5 h-5 text-destructive" /> 
             : isPlaying ? <Pause className="w-5 h-5" /> 
             : <Play className="w-5 h-5" />}
          </Button>
          
          <div className="flex-1 space-y-1">
            <Slider
              value={[progress]}
              onValueChange={handleSeek}
              max={100}
              step={0.1}
              className="cursor-pointer"
              disabled={hasError}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {formatDuration((progress / 100) * duration)}
              </span>
              <span>
                {formatDuration(duration)}
              </span>
            </div>
          </div>
          
          <Volume2 className="w-4 h-4 text-muted-foreground shrink-0" />
        </div>

        {hasError && (
          <div className="flex items-center gap-2 text-xs text-destructive">
            <AlertCircle className="w-3 h-3" />
            <span>Erro ao carregar audio</span>
          </div>
        )}

        {/* Transcricao */}
        {showTranscription && (
          <div className="mt-2 p-2 bg-background/50 rounded text-sm">
            {message.transcription || message.content || 'Transcricao nao disponivel'}
          </div>
        )}

        {/* Botoes de acao */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleShare} title="Compartilhar">
            <Share2 className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowTranscription(!showTranscription)} title="Transcricao">
            <FileText className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDownload} title="Download">
            <Download className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Indicador de role */}
      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
        {isUser ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
        <span>{isUser ? 'Usuario' : 'Assistente'}</span>
        <span>|</span>
        <span>{new Date(message.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  );
};
