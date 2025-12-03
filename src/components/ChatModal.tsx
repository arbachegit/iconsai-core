import { X, GripHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatStudy from "@/components/ChatStudy";
import { useRef, useEffect, useState } from "react";

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChatModal = ({ isOpen, onClose }: ChatModalProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

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

  // Reset position when modal opens
  useEffect(() => {
    if (isOpen) {
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  // Esc key handler
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen]);

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (modalRef.current) {
      setIsDragging(true);
      dragOffset.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y
      };
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.current.x,
          y: e.clientY - dragOffset.current.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

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
          ref={modalRef}
          className="w-full max-w-[986px] bg-card/95 backdrop-blur-md rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.1)] border-t-2 border-l-2 border-t-white/20 border-l-white/20 border-r border-b border-r-black/30 border-b-black/30 pointer-events-auto animate-in zoom-in-95 duration-300"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) translateZ(0)`,
            backfaceVisibility: 'hidden',
            cursor: isDragging ? 'grabbing' : 'default'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag Handle */}
          <div
            onMouseDown={handleMouseDown}
            className="flex items-center justify-center py-1.5 cursor-grab active:cursor-grabbing border-b border-white/10 rounded-t-2xl bg-gradient-to-b from-white/5 to-transparent hover:from-white/10 transition-colors"
          >
            <GripHorizontal className="h-5 w-5 text-muted-foreground/50" />
          </div>

          {/* Chat Content */}
          <div className="p-3 h-[825px]">
            <ChatStudy onClose={handleClose} />
          </div>
        </div>
      </div>
    </>
  );
};
