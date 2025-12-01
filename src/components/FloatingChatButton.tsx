import { useState, useEffect } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatModal } from "@/components/ChatModal";
import { useTranslation } from "react-i18next";

export const FloatingChatButton = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  // Broadcast stop audio event when modal closes
  useEffect(() => {
    if (!isOpen) {
      window.dispatchEvent(new CustomEvent('stopAllAudio'));
    }
  }, [isOpen]);

  return (
    <>
      {/* Container without overflow-hidden to allow waves to be visible */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          size="icon"
          className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary via-secondary to-accent shadow-2xl hover:shadow-primary/50 transition-all duration-300 group"
          aria-label={t('floatingButton.tooltip')}
        >
          {/* Glow rings - contained within parent */}
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 via-secondary/30 to-accent/30 blur-xl" />
          
          {/* Tooltip animado - slide da direita para esquerda */}
          <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 pointer-events-none">
            <div className="bg-gradient-to-r from-primary to-secondary text-primary-foreground px-4 py-2 rounded-lg whitespace-nowrap font-medium shadow-lg">
              {t('floatingButton.tooltip')}
            </div>
            {/* Seta apontando para o botão */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full">
              <div className="border-8 border-transparent border-l-secondary" />
            </div>
          </div>

          {/* Icon */}
          <MessageCircle className="w-12 h-12 relative z-10 text-primary-foreground" />
          
          {/* Green pulsating dot with sequential frequency waves */}
          <div className="absolute -top-1 -right-1 z-20 w-8 h-8 flex items-center justify-center">
            {/* Core pulsating green circle */}
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/60 border-2 border-green-400" />
            
            {/* Sequential waves - each with different delay */}
            <div 
              className="absolute w-5 h-5 rounded-full border-2 border-green-400/50 animate-ping" 
              style={{ animationDuration: '2s', animationDelay: '0s' }} 
            />
            <div 
              className="absolute w-6 h-6 rounded-full border-2 border-green-400/40 animate-ping" 
              style={{ animationDuration: '2s', animationDelay: '0.4s' }} 
            />
            <div 
              className="absolute w-7 h-7 rounded-full border-2 border-green-400/30 animate-ping" 
              style={{ animationDuration: '2s', animationDelay: '0.8s' }} 
            />
            <div 
              className="absolute w-8 h-8 rounded-full border-2 border-green-400/20 animate-ping" 
              style={{ animationDuration: '2s', animationDelay: '1.2s' }} 
            />
          </div>
        </Button>
      </div>

      <ChatModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};
