import { Card, CardContent } from "@/components/ui/card";
import { Bot, Settings } from "lucide-react";

export function AIChat() {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 flex flex-col items-center text-center space-y-4">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-xl font-semibold">Chat IA</h3>
          <p className="text-muted-foreground">
            Configuração será feita posteriormente
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-4">
            <Settings className="h-4 w-4" />
            <span>Interface pronta para integração futura</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
