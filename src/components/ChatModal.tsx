import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatStudy from "@/components/ChatStudy";
import { useRef, useEffect } from "react";

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChatModal = ({ isOpen, onClose }: ChatModalProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleClose = () => {
    // Stop any audio playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    // Broadcast stop audio event FIRST
    window.dispatchEvent(new CustomEvent('stopAllAudio'));
    
    // Small delay to ensure event is processed before unmounting
    requestAnimationFrame(() => {
      onClose();
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-300"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="w-full max-w-4xl bg-card/95 backdrop-blur-md rounded-2xl shadow-2xl border border-primary/20 pointer-events-auto animate-in zoom-in-95 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border/50">
            <h2 className="text-xl font-bold text-gradient">Fale com o KnowYOU</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Chat Content */}
          <div className="p-4 h-[600px]">
            <ChatStudy />
          </div>
        </div>
      </div>
    </>
  );
};
