import { Play, Square, Download, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "react-i18next";

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
  
  if (!audioUrl) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleCopy = async () => {
    if (messageContent && onCopy) {
      onCopy();
    }
  };

  return (
    <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-border/30">
      {/* Layout 100% horizontal: [Play] [Stop] [Download] [Copy] | [Data] [Hora] [Local] */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Play */}
        <Button
          size="sm"
          variant="ghost"
          onClick={isPlaying ? onStop : onPlay}
          className="h-7 w-7 p-0"
          title={isPlaying ? t("chat.stop") : t("chat.play")}
        >
          {isPlaying ? (
            <Square className="h-3.5 w-3.5" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
        </Button>

        {/* Stop */}
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

        {/* Download */}
        {onDownload && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onDownload}
            className="h-7 w-7 p-0"
            title={t("chat.download")}
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        )}

        {/* Copy */}
        {onCopy && messageContent && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            className="h-7 w-7 p-0"
            title={t("chat.copy")}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        )}

        {/* Separador visual */}
        <span className="h-4 w-px bg-border/50 mx-1" />

        {/* Data */}
        {timestamp && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            📅 {timestamp.toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </span>
        )}

        {/* Hora */}
        {timestamp && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            🕐 {timestamp.toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}

        {/* Localização */}
        {location && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            📍 {location}
          </span>
        )}
      </div>

      {/* Progress bar (linha abaixo quando tocando) */}
      {isPlaying && duration > 0 && (
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
