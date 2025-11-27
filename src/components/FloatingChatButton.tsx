import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatModal } from "@/components/ChatModal";

export const FloatingChatButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50" style={{ contain: "paint" }}>
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
          <div className="absolute -top-2 -right-2 z-20">
            <div className="relative w-8 h-8 flex items-center justify-center">
              {/* Frequency wave layers - emanating outward with increasing sizes */}
              <div className="absolute w-8 h-8 rounded-full bg-green-400/50 animate-ping" 
                   style={{ animationDuration: '1.5s' }} />
              <div className="absolute w-10 h-10 -top-1 -left-1 rounded-full bg-green-400/40 animate-ping" 
                   style={{ animationDuration: '2s', animationDelay: '0.3s' }} />
              <div className="absolute w-12 h-12 -top-2 -left-2 rounded-full bg-green-400/30 animate-ping" 
                   style={{ animationDuration: '2.5s', animationDelay: '0.6s' }} />
              <div className="absolute w-14 h-14 -top-3 -left-3 rounded-full bg-green-400/20 animate-ping" 
                   style={{ animationDuration: '3s', animationDelay: '0.9s' }} />
              
              {/* Core pulsating green circle - solid center */}
              <div className="w-4 h-4 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/60 border-2 border-green-400" />
            </div>
          </div>
        </Button>
      </div>

      <ChatModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};
