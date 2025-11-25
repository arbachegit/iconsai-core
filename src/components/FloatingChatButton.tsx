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
            <span className="absolute top-0 right-0 w-3 h-3 bg-accent rounded-full border-2 border-background" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="bg-card border-border text-foreground">
          <p className="font-semibold">Converse com o KnowYOU</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
