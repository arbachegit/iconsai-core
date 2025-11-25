import { MessageCircle } from "lucide-react";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface FloatingChatButtonProps {
  onClick: () => void;
}

export const FloatingChatButton = ({ onClick }: FloatingChatButtonProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="fixed bottom-6 right-6 z-50 overflow-hidden rounded-full" style={{ contain: 'layout' }}>
            <Button
              onClick={onClick}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-primary via-secondary to-accent shadow-2xl shadow-primary/40 hover:shadow-primary/60 hover:scale-110 transition-all duration-500 group animate-bounce-subtle"
              aria-label="Converse com o KnowYOU"
            >
              {/* Múltiplos anéis de glow - simplificados */}
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-ping" />
              <div className="absolute inset-[-8px] rounded-full bg-primary/10 blur-lg animate-pulse" />
              <div className="absolute inset-[-16px] rounded-full border-2 border-primary/30 animate-[ping_2s_ease-out_infinite]" />
              
              {/* Ícone maior com glow */}
              <MessageCircle className="w-10 h-10 text-primary-foreground relative z-10 group-hover:scale-110 transition-transform duration-300 drop-shadow-[0_0_8px_rgba(0,217,255,0.6)]" />
              
              {/* Badge de notificação animado */}
              <span className="absolute top-1 right-1 w-3 h-3 bg-accent rounded-full animate-ping" />
              <span className="absolute top-1 right-1 w-3 h-3 bg-accent rounded-full" />
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="bg-card border-border text-foreground">
          <p className="font-semibold">Converse com o KnowYOU</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
