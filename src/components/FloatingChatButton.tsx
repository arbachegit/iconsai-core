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
      {/* Container with overflow-hidden to prevent layout expansion */}
      <div className="fixed bottom-6 right-6 z-50 overflow-hidden" style={{ contain: 'layout' }}>
        <Button
          onClick={() => setIsOpen(true)}
          size="icon"
          className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary via-secondary to-accent shadow-2xl hover:shadow-primary/50 transition-all duration-300 group"
          aria-label={t('floatingButton.tooltip')}
        >
          {/* Glow rings - contained within parent */}
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 via-secondary/30 to-accent/30 blur-xl" />
          
          {/* Icon */}
          <MessageCircle className="w-10 h-10 relative z-10 text-primary-foreground" />
          
          {/* Green pulsating dot with frequency waves - positioned within button bounds */}
          <div className="absolute -top-1 -right-1 z-20 w-6 h-6 flex items-center justify-center">
            {/* Core pulsating green circle */}
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/60 border-2 border-green-400" />
            {/* Single subtle wave */}
            <div className="absolute w-6 h-6 rounded-full bg-green-400/30 animate-ping" 
                 style={{ animationDuration: '2s' }} />
          </div>
        </Button>
      </div>

      <ChatModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};
