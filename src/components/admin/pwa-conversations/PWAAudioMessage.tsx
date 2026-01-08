import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import type { PWAConversationMessage } from '@/types/pwa-conversations';
import { Play, Pause, Share2, FileText, Download, AlertCircle, Loader2, Volume2, User, Bot, MessageSquare, Tag } from 'lucide-react';
import { toast } from 'sonner';

interface PWAAudioMessageProps {
  message: PWAConversationMessage;
  moduleColor: string;
  isSummary?: boolean;
  taxonomyTags?: string[];
}

export const PWAAudioMessage = ({ 
  message, 
  moduleColor, 
  isSummary = false,
  taxonomyTags = []
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
  
  // PRD: Agente=ESQUERDA (mr-auto), Usuario=DIREITA (ml-auto)
  const alignment = isUser ? 'ml-auto' : 'mr-auto';
  
  // PRD: Agente=VERDE CLARO, Usuario=BRANCO
  const bgColor = isUser 
    ? 'bg-white dark:bg-slate-50' 
    : 'bg-green-200 dark:bg-green-300';
  
  const borderColor = isUser 
    ? 'border-l-4 border-l-slate-400' 
    : 'border-l-4 border-l-green-500';

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

  const handleShareAudio = () => {
    if (message.audio_url) {
      navigator.clipboard.writeText(message.audio_url);
      toast.success('Link do audio copiado');
    }
  };

  const handleShareTranscription = () => {
    const text = message.transcription || message.content || '';
    if (text) {
      navigator.clipboard.writeText(text);
      toast.success('Transcricao copiada');
    } else {
      toast.error('Transcricao nao disponivel');
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

  // Taxonomias no header (max 6 palavras conforme PRD)
  const displayTags = taxonomyTags.slice(0, 6);

  // SEM AUDIO = apenas texto
  if (!hasAudio) {
    return (
      <div className={`rounded-lg p-3 max-w-[75%] ${alignment} ${bgColor} ${borderColor} text-slate-900`}>
        {/* Header com taxonomia (max 6) */}
        {displayTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {displayTags.map((tag, i) => (
              <Badge key={i} variant="outline" className="text-xs gap-1 bg-white/50">
                <Tag className="w-2.5 h-2.5" />
                {tag}
              </Badge>
            ))}
          </div>
        )}
        
        <div className="text-sm">
          <p className="whitespace-pre-wrap">
            {message.content || message.transcription || 'Sem conteudo'}
          </p>
        </div>
        
        <div className="flex items-center gap-1 mt-2 text-xs text-slate-600">
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
    <div className={`rounded-lg p-3 max-w-[75%] ${alignment} ${bgColor} ${borderColor} text-slate-900`}>
      {/* Header com taxonomia (max 6) - PRD */}
      {displayTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {displayTags.map((tag, i) => (
            <Badge key={i} variant="outline" className="text-xs gap-1 bg-white/50">
              <Tag className="w-2.5 h-2.5" />
              {tag}
            </Badge>
          ))}
        </div>
      )}
      
      <div className="space-y-2">
        {/* Player Controls */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full shrink-0 bg-white/50 hover:bg-white/70"
            onClick={handlePlayPause}
            disabled={isLoading || hasError}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> 
             : hasError ? <AlertCircle className="w-5 h-5 text-red-600" /> 
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
            <div className="flex justify-between text-xs text-slate-600">
              <span>{formatDuration((progress / 100) * duration)}</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>
          
          <Volume2 className="w-4 h-4 text-slate-600 shrink-0" />
        </div>

        {hasError && (
          <div className="flex items-center gap-2 text-xs text-red-600">
            <AlertCircle className="w-3 h-3" />
            <span>Erro ao carregar audio</span>
          </div>
        )}

        {/* Transcricao */}
        {showTranscription && (
          <div className="mt-2 p-2 bg-white/50 rounded text-sm">
            {message.transcription || message.content || 'Transcricao nao disponivel'}
          </div>
        )}

        {/* Footer com 4 botoes (PRD) */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleShareAudio} title="Compartilhar Audio">
            <Share2 className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleShareTranscription} title="Compartilhar Transcricao">
            <MessageSquare className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowTranscription(!showTranscription)} title="Ver Transcricao">
            <FileText className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDownload} title="Download">
            <Download className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Indicador de role */}
      <div className="flex items-center gap-1 mt-2 text-xs text-slate-600">
        {isUser ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
        <span>{isUser ? 'Usuario' : 'Assistente'}</span>
        <span>|</span>
        <span>{new Date(message.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  );
};
