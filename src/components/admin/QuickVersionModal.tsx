import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GitBranch, Loader2 } from "lucide-react";

interface QuickVersionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const QuickVersionModal = ({ open, onOpenChange }: QuickVersionModalProps) => {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState("");
  const queryClient = useQueryClient();

  const registerVersion = useMutation({
    mutationFn: async () => {
      const filesArray = files
        .split("\n")
        .map(f => f.trim())
        .filter(f => f.length > 0);

      const { data, error } = await supabase.functions.invoke("batch-version-update", {
        body: {
          single: {
            message,
            trigger_type: "CODE_CHANGE",
            files: filesArray,
            date: new Date().toISOString(),
          },
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Versão registrada: ${data.previous_version} → ${data.new_version}`);
      queryClient.invalidateQueries({ queryKey: ["version-control"] });
      queryClient.invalidateQueries({ queryKey: ["current-version"] });
      onOpenChange(false);
      setMessage("");
      setFiles("");
    },
    onError: (error) => {
      toast.error(`Erro ao registrar versão: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error("Por favor, descreva a implementação");
      return;
    }
    registerVersion.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            Registro Rápido de Implementação
          </DialogTitle>
          <DialogDescription>
            Registre uma nova implementação no sistema de versionamento. Incrementa o patch automaticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="version-message">Descrição da Implementação *</Label>
            <Input
              id="version-message"
              placeholder="ex: Fix sidebar navigation, Add notification system"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="version-files">Arquivos Modificados (opcional)</Label>
            <Textarea
              id="version-files"
              placeholder="src/components/Example.tsx&#10;supabase/functions/example/index.ts&#10;..."
              value={files}
              onChange={(e) => setFiles(e.target.value)}
              className="min-h-[100px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Um arquivo por linha. Útil para rastreamento de mudanças.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={registerVersion.isPending}
              className="gap-2"
            >
              {registerVersion.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <GitBranch className="h-4 w-4" />
                  Registrar Versão
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
