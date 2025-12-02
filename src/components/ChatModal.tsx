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
          className="w-full max-w-4xl bg-card/95 backdrop-blur-md rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.1)] border-t-2 border-l-2 border-t-white/20 border-l-white/20 border-r border-b border-r-black/30 border-b-black/30 pointer-events-auto animate-in zoom-in-95 duration-300"
          style={{
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Chat Content */}
          <div className="p-3 h-[750px]">
            <ChatStudy onClose={handleClose} />
          </div>
        </div>
      </div>
    </>
  );
};
