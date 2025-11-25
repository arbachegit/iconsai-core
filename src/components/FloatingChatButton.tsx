import { MessageCircle } from "lucide-react";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { useEffect } from "react";
import { debugLog } from "@/lib/environment";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

interface FloatingChatButtonProps {
  onClick: () => void;
}

export const FloatingChatButton = ({ onClick }: FloatingChatButtonProps) => {
  const flags = useFeatureFlags();

  useEffect(() => {
    debugLog.mount("FloatingChatButton", { flags });
  }, []);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onClick}
            className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-gradient-to-br from-primary via-secondary to-accent shadow-2xl shadow-primary/40 hover:shadow-primary/60 hover:scale-110 transition-all duration-500"
            aria-label="Converse com o KnowYOU"
          >
            <MessageCircle className="w-8 h-8 text-primary-foreground" />
            
            {/* Bolinha verde pulsante com efeito de ondas */}
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 shadow-lg shadow-green-500/50"></span>
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="bg-card border-border text-foreground">
          <p className="font-semibold">Converse com o KnowYOU</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
