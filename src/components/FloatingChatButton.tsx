import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatModal } from "@/components/ChatModal";

export const FloatingChatButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 overflow-hidden" style={{ contain: "layout" }}>
        <Button
          onClick={() => setIsOpen(true)}
          size="icon"
          className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary via-secondary to-accent shadow-2xl hover:shadow-primary/50 transition-all duration-300 group"
          aria-label="Fale com o KnowYOU"
        >
          {/* Glow rings */}
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 via-secondary/30 to-accent/30 blur-xl" />
          
          {/* Icon */}
          <MessageCircle className="w-10 h-10 relative z-10 text-primary-foreground" />
          
          {/* Green pulsating dot with frequency waves */}
          <div className="absolute -top-1 -right-1 z-20">
            <div className="relative w-5 h-5">
              {/* Wave circles emanating outward */}
              <div className="absolute inset-0 rounded-full bg-green-400/60 animate-ping" style={{ animationDuration: '1.5s' }} />
              <div className="absolute inset-0 rounded-full bg-green-400/40 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.3s' }} />
              <div className="absolute inset-0 rounded-full bg-green-400/20 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.6s' }} />
              
              {/* Core pulsating green circle */}
              <div className="absolute inset-0 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50" />
            </div>
          </div>
        </Button>
      </div>

      <ChatModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};
