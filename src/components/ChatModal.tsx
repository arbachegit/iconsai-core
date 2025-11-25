import { X } from "lucide-react";
import { Button } from "./ui/button";
import { ChatKnowYOU } from "./ChatKnowYOU";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";

interface ChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ChatModal = ({ open, onOpenChange }: ChatModalProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:w-[600px] p-0 flex flex-col bg-background/95 backdrop-blur-xl border-l border-border/50"
      >
        <SheetHeader className="px-6 py-4 border-b border-border/50 bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-2xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Converse com o KnowYOU
              </SheetTitle>
              <SheetDescription className="text-muted-foreground mt-1">
                Seu assistente especializado em IA e saúde
              </SheetDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="rounded-full hover:bg-primary/10"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </SheetHeader>
        
        <div className="flex-1 overflow-hidden">
          <ChatKnowYOU variant="modal" />
        </div>
      </SheetContent>
    </Sheet>
  );
};
