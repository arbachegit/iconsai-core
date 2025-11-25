import { HelpCircle } from "lucide-react";
import { useState } from "react";
import { DraggablePreviewPanel } from "./DraggablePreviewPanel";

interface TooltipIconProps {
  sectionId: string;
}

export const TooltipIcon = ({ sectionId }: TooltipIconProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-10 h-10 rounded-full 
          bg-primary/20 hover:bg-primary/40 
          border border-primary/50 hover:border-primary/80
          shadow-lg shadow-primary/40 hover:shadow-primary/60 hover:shadow-xl
          flex items-center justify-center 
          transition-all duration-300 hover:scale-110 
          animate-pulse-slow
          relative overflow-hidden
          before:absolute before:inset-0 before:rounded-full 
          before:bg-gradient-to-br before:from-primary/30 before:to-transparent 
          before:animate-pulse flex-shrink-0"
        aria-label="Abrir informações"
      >
        <HelpCircle className="w-6 h-6 text-primary relative z-10" />
      </button>

      {isOpen && (
        <DraggablePreviewPanel
          sectionId={sectionId}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
};
