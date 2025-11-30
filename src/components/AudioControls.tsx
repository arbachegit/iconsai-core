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
      {/* Controles de áudio principais */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={isPlaying ? onStop : onPlay}
          className="h-8 w-8 p-0"
          title={isPlaying ? t("chat.stop") : t("chat.play")}
        >
          {isPlaying ? (
            <Square className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={onStop}
          className="h-8 w-8 p-0"
          title={t("chat.stop")}
          disabled={!isPlaying}
        >
          <Square className="h-4 w-4" />
        </Button>

        {onDownload && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onDownload}
            className="h-8 w-8 p-0"
            title={t("chat.download")}
          >
            <Download className="h-4 w-4" />
          </Button>
        )}

        {onCopy && messageContent && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            className="h-8 w-8 p-0"
            title={t("chat.copy")}
          >
            <Copy className="h-4 w-4" />
          </Button>
        )}

        {/* Metadados */}
        <div className="flex-1 flex items-center justify-end gap-3 text-xs text-muted-foreground">
          {timestamp && (
            <span>
              {timestamp.toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
          {location && (
            <span className="flex items-center gap-1">
              📍 {location}
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {duration > 0 && (
        <div className="flex flex-col gap-1">
          <Progress value={progress} className="h-1" />
          <div className="text-xs text-muted-foreground">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
      )}
    </div>
  );
}
