import { Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "react-i18next";

interface FloatingAudioPlayerProps {
  isVisible: boolean;
  currentTime: number;
  duration: number;
  onStop: () => void;
  onClose: () => void;
}

export function FloatingAudioPlayer({
  isVisible,
  currentTime,
  duration,
  onStop,
  onClose,
}: FloatingAudioPlayerProps) {
  const { t } = useTranslation();

  if (!isVisible) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card/95 backdrop-blur-md border border-border rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-4 flex items-center gap-3 animate-in slide-in-from-bottom min-w-[300px]">
      <div className="flex-1 flex flex-col gap-2">
        <Progress value={progress} className="h-1" />
        <span className="text-xs text-muted-foreground">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={onStop}
        className="h-8 w-8 p-0"
        title={t("chat.miniPlayer.stop")}
      >
        <Square className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={onClose}
        className="h-8 w-8 p-0"
        title={t("chat.miniPlayer.close")}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
