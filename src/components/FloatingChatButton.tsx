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
          <Button
            onClick={onClick}
            className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-gradient-to-br from-primary via-secondary to-accent shadow-2xl shadow-primary/40 hover:shadow-primary/60 hover:scale-110 transition-all duration-500 animate-pulse-slow group"
            aria-label="Converse com o KnowYOU"
          >
            <div className="absolute inset-0 rounded-full bg-primary/30 blur-2xl animate-pulse group-hover:bg-primary/50 transition-all duration-500" />
            <MessageCircle className="w-8 h-8 text-primary-foreground relative z-10 group-hover:scale-110 transition-transform duration-300" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="bg-card border-border text-foreground">
          <p className="font-semibold">Converse com o KnowYOU</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
