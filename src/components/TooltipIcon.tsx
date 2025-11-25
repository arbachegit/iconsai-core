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
        
        {/* Bolinha verde pulsante - externa ao círculo maior do botão */}
        <span className="absolute -top-2 -right-2 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-90"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 shadow-xl shadow-green-500/70"></span>
        </span>
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
