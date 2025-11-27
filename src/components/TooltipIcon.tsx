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
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-primary/10 hover:bg-primary/20 border border-primary/30 flex items-center justify-center transition-all hover:scale-110 animate-pulse-slow group"
        aria-label="Abrir informações"
      >
        <HelpCircle className="w-5 h-5 text-primary" />
        
        {/* Green pulsating dot - positioned externally */}
        <div className="absolute -top-1 -right-1 z-20">
          <div className="relative">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50" />
            <div className="absolute inset-0 rounded-full bg-green-400 animate-ping" />
          </div>
        </div>
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
