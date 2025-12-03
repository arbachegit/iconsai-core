import { GripHorizontal, Move } from "lucide-react";
import ChatStudy from "@/components/ChatStudy";
import { useRef, useEffect, useState, useCallback } from "react";

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChatModal = ({ isOpen, onClose }: ChatModalProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const rafRef = useRef<number | null>(null);
  const currentPos = useRef({ x: 0, y: 0 });

  const handleClose = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    window.dispatchEvent(new CustomEvent('stopAllAudio'));
    requestAnimationFrame(() => {
      onClose();
    });
  }, [onClose]);

  // Reset position when modal opens
  useEffect(() => {
    if (isOpen) {
      setPosition({ x: 0, y: 0 });
      currentPos.current = { x: 0, y: 0 };
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
  }, [isOpen, handleClose]);

  // Drag start
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    dragStart.current = {
      x: clientX,
      y: clientY,
      posX: currentPos.current.x,
      posY: currentPos.current.y
    };
  }, []);

  // Drag move and end handlers with RAF for smooth 60fps updates
  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      
      const deltaX = clientX - dragStart.current.x;
      const deltaY = clientY - dragStart.current.y;
      
      const newX = dragStart.current.posX + deltaX;
      const newY = dragStart.current.posY + deltaY;
      
      // Cancel previous RAF to prevent queue buildup
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      
      // Use RAF for smooth 60fps updates
      rafRef.current = requestAnimationFrame(() => {
        currentPos.current = { x: newX, y: newY };
        setPosition({ x: newX, y: newY });
      });
    };

    const handleEnd = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      setIsDragging(false);
    };

    // Mouse events
    document.addEventListener('mousemove', handleMove, { passive: false });
    document.addEventListener('mouseup', handleEnd);
    // Touch events
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
    document.addEventListener('touchcancel', handleEnd);

    // Disable text selection during drag
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
      document.removeEventListener('touchcancel', handleEnd);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging]);

  // Double-click to reset position
  const handleDoubleClick = useCallback(() => {
    setPosition({ x: 0, y: 0 });
    currentPos.current = { x: 0, y: 0 };
  }, []);

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
          className={`w-full max-w-[986px] bg-card/95 backdrop-blur-md rounded-2xl border-t-2 border-l-2 border-t-white/20 border-l-white/20 border-r border-b border-r-black/30 border-b-black/30 pointer-events-auto animate-in zoom-in-95 duration-300 ${
            isDragging 
              ? 'shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_0_2px_rgba(139,92,246,0.3)] scale-[1.01]' 
              : 'shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.1)]'
          }`}
          style={{
            transform: `translate3d(${position.x}px, ${position.y}px, 0) ${isDragging ? 'scale(1.01)' : 'scale(1)'}`,
            transition: isDragging ? 'box-shadow 0.2s ease, scale 0.1s ease' : 'transform 0.25s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.3s ease',
            willChange: 'transform'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag Handle - Extended area */}
          <div
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
            onDoubleClick={handleDoubleClick}
            className={`flex items-center justify-center py-3 cursor-grab rounded-t-2xl select-none touch-none ${
              isDragging 
                ? 'cursor-grabbing bg-gradient-to-b from-primary/20 to-primary/5' 
                : 'bg-gradient-to-b from-white/5 to-transparent hover:from-primary/10'
            } transition-all duration-200`}
          >
            <div className={`flex items-center gap-3 px-6 py-1 rounded-full ${
              isDragging ? 'bg-primary/20' : 'bg-white/5 hover:bg-white/10'
            } transition-colors duration-200`}>
              <GripHorizontal className={`h-4 w-4 ${isDragging ? 'text-primary' : 'text-muted-foreground/50'} transition-colors`} />
              <Move className={`h-4 w-4 ${isDragging ? 'text-primary animate-pulse' : 'text-muted-foreground/40'} transition-colors`} />
              <GripHorizontal className={`h-4 w-4 ${isDragging ? 'text-primary' : 'text-muted-foreground/50'} transition-colors`} />
            </div>
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
