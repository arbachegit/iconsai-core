import { X, History, Save } from "lucide-react";
import { Button } from "./ui/button";
import { ChatKnowYOU } from "./ChatKnowYOU";
import { ConversationHistory } from "./ConversationHistory";
import { useChatKnowYOU } from "@/hooks/useChatKnowYOU";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

interface ChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ChatModal = ({ open, onOpenChange }: ChatModalProps) => {
  const [chatKey, setChatKey] = useState(0);
  const chatHook = useChatKnowYOU({ chatType: "company" }); // Chat modal = dados da empresa

  const handleLoadConversation = (sessionId: string, messages: any[]) => {
    chatHook.loadConversation(sessionId, messages);
  };

  const handleSaveConversation = async () => {
    await chatHook.saveConversation();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:w-[900px] h-[90vh] p-0 flex flex-col bg-background/95 backdrop-blur-xl border-l border-border/50"
      >
        <SheetHeader className="px-6 py-4 border-b border-border/50 bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-lg font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Converse com o KnowYOU
              </SheetTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSaveConversation}
                className="rounded-full hover:bg-primary/10"
                title="Salvar conversa"
              >
                <Save className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="rounded-full hover:bg-primary/10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </SheetHeader>
        
        <div className="flex-1 overflow-hidden flex">
          <Tabs defaultValue="chat" className="flex-1 flex flex-col">
            <TabsList className="mx-6 mt-4 grid w-auto grid-cols-2 bg-muted/50">
              <TabsTrigger value="chat" className="gap-2">
                <span>Chat</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="w-4 h-4" />
                <span>Histórico</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="chat" className="flex-1 overflow-hidden mt-0">
              <ChatKnowYOU key={chatKey} variant="modal" chatHook={chatHook} />
            </TabsContent>
            
            <TabsContent value="history" className="flex-1 overflow-hidden mt-0">
              <ConversationHistory 
                onLoadConversation={(sessionId, messages) => {
                  handleLoadConversation(sessionId, messages);
                  // Switch back to chat tab after loading
                  const chatTab = document.querySelector('[value="chat"]') as HTMLButtonElement;
                  chatTab?.click();
                }}
                currentSessionId={chatHook.sessionId}
              />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
};
