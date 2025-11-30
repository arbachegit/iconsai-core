import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, GraduationCap, Settings } from "lucide-react";

interface DocumentRoutingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: {
    id: string;
    filename: string;
    suggestedTags: string[];
  } | null;
  onRedirect: (category: 'health' | 'study' | 'general') => void;
}

export function DocumentRoutingModal({
  open,
  onOpenChange,
  document,
  onRedirect,
}: DocumentRoutingModalProps) {
  if (!document) return null;

  const handleRedirect = (category: 'health' | 'study' | 'general') => {
    onRedirect(category);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            📄 Documento Requer Definição de Destino
          </DialogTitle>
          <DialogDescription>
            O documento "{document.filename}" foi classificado como General. Escolha onde aplicá-lo para ativar os guardrails apropriados:
          </DialogDescription>
        </DialogHeader>
        
        {/* Display suggested tags */}
        {document.suggestedTags.length > 0 && (
          <div className="my-4">
            <p className="text-sm text-muted-foreground mb-2">Tags sugeridas:</p>
            <div className="flex flex-wrap gap-2">
              {document.suggestedTags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Redirect options */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <Button
            onClick={() => handleRedirect('health')}
            variant="outline"
            className="flex flex-col items-center gap-2 h-auto py-4"
          >
            <Heart className="h-6 w-6 text-red-500" />
            <span className="text-sm font-semibold">Health</span>
            <span className="text-xs text-muted-foreground text-center">
              Saúde e medicina
            </span>
          </Button>
          
          <Button
            onClick={() => handleRedirect('study')}
            variant="outline"
            className="flex flex-col items-center gap-2 h-auto py-4"
          >
            <GraduationCap className="h-6 w-6 text-blue-500" />
            <span className="text-sm font-semibold">Study</span>
            <span className="text-xs text-muted-foreground text-center">
              KnowRISK e ACC
            </span>
          </Button>
          
          <Button
            onClick={() => handleRedirect('general')}
            variant="secondary"
            className="flex flex-col items-center gap-2 h-auto py-4"
          >
            <Settings className="h-6 w-6 text-gray-500" />
            <span className="text-sm font-semibold">General</span>
            <span className="text-xs text-muted-foreground text-center">
              Manter como está
            </span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}