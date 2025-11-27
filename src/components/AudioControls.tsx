import { Play, Square, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface AudioControlsProps {
  audioUrl?: string;
  isPlaying: boolean;
  currentTime?: number;
  duration?: number;
  onPlay: () => void;
  onStop: () => void;
  onDownload?: () => void;
}

export function AudioControls({
  audioUrl,
  isPlaying,
  currentTime = 0,
  duration = 0,
  onPlay,
  onStop,
  onDownload,
}: AudioControlsProps) {
  if (!audioUrl) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-2 mt-2">
      <Button
        size="sm"
        variant="ghost"
        onClick={isPlaying ? onStop : onPlay}
        className="h-8 w-8 p-0"
      >
        {isPlaying ? (
          <Square className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>

      {duration > 0 && (
        <div className="flex-1 flex flex-col gap-1">
          <Progress value={progress} className="h-1" />
          <div className="text-xs text-muted-foreground">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
      )}

      {onDownload && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onDownload}
          className="h-8 w-8 p-0"
        >
          <Download className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
