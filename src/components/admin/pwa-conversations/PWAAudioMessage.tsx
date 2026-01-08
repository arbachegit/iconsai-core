import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import type { PWAConversationMessage } from '@/types/pwa-conversations';
import { Play, Pause, Share2, FileText, Download } from 'lucide-react';
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
  const [progress, setProgress] = useState(0);
  const [showTranscription, setShowTranscription] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isUser = message.role === 'user';
  const bgColor = isUser ? 'bg-muted' : 'bg-primary/10';
  const alignment = isUser ? 'mr-auto' : 'ml-auto';

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    } else if (message.audio_url) {
      // Criar audio element se não existir
      const audio = new Audio(message.audio_url);
      audioRef.current = audio;
      
      audio.addEventListener('timeupdate', () => {
        const percent = (audio.currentTime / audio.duration) * 100;
        setProgress(percent);
      });
      
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setProgress(0);
      });
      
      audio.play();
      setIsPlaying(true);
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
      link.click();
      toast.success('Download iniciado!');
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex flex-col ${alignment} max-w-[80%] ${isSummary ? 'w-full max-w-full' : ''}`}>
      <div className={`${bgColor} rounded-xl p-3 ${isSummary ? 'border-2' : ''}`} 
           style={{ borderColor: isSummary ? moduleColor : undefined }}>
        {/* Player Controls */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            style={{ backgroundColor: moduleColor + '20', color: moduleColor }}
            onClick={handlePlayPause}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </Button>
          
          <div className="flex-1">
            <Slider
              value={[progress]}
              max={100}
              step={1}
              className="cursor-pointer"
              onValueChange={(value) => {
                if (audioRef.current) {
                  const newTime = (value[0] / 100) * audioRef.current.duration;
                  audioRef.current.currentTime = newTime;
                  setProgress(value[0]);
                }
              }}
            />
            <span className="text-xs text-muted-foreground mt-1">
              {formatDuration(message.audio_duration_seconds)}
            </span>
          </div>
        </div>

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

      {/* Timestamp */}
      <span className={`text-xs text-muted-foreground mt-1 ${isUser ? 'text-left' : 'text-right'}`}>
        {new Date(message.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
};
