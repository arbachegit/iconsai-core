import { Play, Square, Download, Copy, Check, Calendar, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface AudioControlsProps {
  audioUrl?: string;
  isPlaying: boolean;
  currentTime?: number;
  duration?: number;
  timestamp?: Date;
  location?: string;
  messageContent?: string;
  onPlay: () => void;
  onStop: () => void;
  onDownload?: () => void;
  onCopy?: () => void;
}

export function AudioControls({
  audioUrl,
  isPlaying,
  currentTime = 0,
  duration = 0,
  timestamp,
  location,
  messageContent,
  onPlay,
  onStop,
  onDownload,
  onCopy,
}: AudioControlsProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleCopy = async () => {
    if (messageContent) {
      try {
        await navigator.clipboard.writeText(messageContent);
        setCopied(true);
        toast({
          title: t("chat.copied"),
          duration: 2000,
        });
        if (onCopy) onCopy();
        
        // Reset após 2 segundos
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        toast({
          title: t("chat.copyFailed"),
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-border/30">
      {/* Layout 100% horizontal: [Play] [Stop] [Download] [Copy] | [Data] [Hora] [Local] */}
      <div className="flex items-center gap-2 flex-wrap">
      {/* Play - SEMPRE aparece */}
        <Button
          size="sm"
          variant="ghost"
          onClick={onPlay}
          className="h-7 w-7 p-0"
          title={t("chat.play")}
          disabled={isPlaying}
        >
          <Play className="h-3.5 w-3.5" />
        </Button>

        {/* Stop - SEMPRE aparece */}
        <Button
          size="sm"
          variant="ghost"
          onClick={onStop}
          className="h-7 w-7 p-0"
          title={t("chat.stop")}
          disabled={!isPlaying}
        >
          <Square className="h-3.5 w-3.5" />
        </Button>

        {/* Download - SEMPRE aparece (desabilitado se não houver áudio) */}
        <Button
          size="sm"
          variant="ghost"
          onClick={onDownload}
          className="h-7 w-7 p-0"
          title={t("chat.download")}
          disabled={!audioUrl}
        >
          <Download className="h-3.5 w-3.5" />
        </Button>

        {/* Copy - SEMPRE aparece */}
        {messageContent && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            className={`h-7 w-7 p-0 transition-all duration-200 ${
              copied ? "text-green-500 scale-110" : ""
            }`}
            title={t("chat.copy")}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 animate-scale-in" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        )}

        {/* Separador visual */}
        <span className="h-4 w-px bg-border/50 mx-1" />

        {/* Data */}
        {timestamp && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {timestamp.toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </span>
        )}

        {/* Hora */}
        {timestamp && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timestamp.toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}

        {/* Localização */}
        {location && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {location}
          </span>
        )}
      </div>

      {/* Progress bar (linha abaixo quando tocando) */}
      {isPlaying && audioUrl && duration > 0 && (
        <div className="flex items-center gap-2 mt-1">
          <Progress value={progress} className="h-1 flex-1" />
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      )}
    </div>
  );
}
