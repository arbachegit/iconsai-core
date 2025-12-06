import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Trash2, Sparkles, AlertTriangle } from "lucide-react";
import { logTagManagementEvent, calculateTimeSinceModalOpen } from "@/lib/tag-management-logger";

interface Tag {
  id: string;
  tag_name: string;
  tag_type: string;
  confidence: number | null;
  source: string | null;
  document_id: string;
  parent_tag_id: string | null;
  created_at: string;
  target_chat?: string | null;
}

interface TagDeleteMLModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deleteType: 'parent' | 'child' | 'orphan';
  tags: Tag[];
  similarityScore?: number;
  onComplete?: () => void;
}

export const TagDeleteMLModal = ({
  open,
  onOpenChange,
  deleteType,
  tags,
  similarityScore,
  onComplete
}: TagDeleteMLModalProps) => {
  const [rationale, setRationale] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [modalOpenTime] = useState(Date.now());
  const queryClient = useQueryClient();

  // Reset state when modal opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setRationale("");
      setConfirmDelete(false);
    }
    onOpenChange(newOpen);
  };

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const timeToDecision = calculateTimeSinceModalOpen(modalOpenTime);

      // Log the ML event before deletion
      await logTagManagementEvent({
        input_state: {
          tags_involved: tags.map(t => ({
            id: t.id,
            name: t.tag_name,
            type: deleteType === 'parent' ? 'parent' : 'child',
            parent_id: t.parent_tag_id
          })),
          similarity_score: similarityScore,
          detection_type: similarityScore ? 'semantic' : 'exact'
        },
        action_type: deleteType === 'parent' ? 'delete_parent' : deleteType === 'child' ? 'delete_child' : 'delete_orphan',
        user_decision: {
          source_tags_removed: tags.map(t => t.id),
          action: 'permanent_delete'
        },
        rationale: rationale || 'Exclusão sem justificativa',
        similarity_score: similarityScore,
        time_to_decision_ms: timeToDecision
      });

      // Delete the tags
      const { error } = await supabase
        .from("document_tags")
        .delete()
        .in("id", tags.map(t => t.id));

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${tags.length} tag(s) excluída(s). Decisão registrada para ML.`);
      queryClient.invalidateQueries({ queryKey: ["all-tags"] });
      queryClient.invalidateQueries({ queryKey: ["ml-management-events"] });
      onOpenChange(false);
      onComplete?.();
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    },
  });

  const getTitle = () => {
    switch (deleteType) {
      case 'parent': return 'Excluir Tags Parent Duplicadas';
      case 'child': return 'Excluir Tags Filhas Semelhantes';
      case 'orphan': return 'Excluir Tags Órfãs';
      default: return 'Excluir Tags';
    }
  };

  const getDescription = () => {
    switch (deleteType) {
      case 'parent': return 'Você está prestes a excluir permanentemente tags parent duplicadas ou semelhantes.';
      case 'child': return 'Você está prestes a excluir permanentemente tags filhas semelhantes.';
      case 'orphan': return 'Você está prestes a excluir permanentemente tags órfãs.';
      default: return 'Você está prestes a excluir permanentemente estas tags.';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-400" />
            {getTitle()}
          </DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Tags to delete */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Tags a Excluir:</Label>
            <div className="flex flex-wrap gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              {tags.map(tag => (
                <Badge 
                  key={tag.id} 
                  variant="destructive"
                  className="bg-red-500/20 text-red-300 border-red-500/30"
                >
                  {tag.tag_name}
                </Badge>
              ))}
            </div>
            {similarityScore && (
              <Badge variant="outline" className="mt-2 bg-amber-500/20 text-amber-300 border-amber-500/30">
                {Math.round(similarityScore * 100)}% similaridade
              </Badge>
            )}
          </div>

          {/* Rationale field */}
          <div>
            <Label className="text-sm font-medium mb-2 block">
              Justificativa (obrigatório - para treinamento ML):
            </Label>
            <Textarea
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="Por que você está excluindo estas tags? Ex: 'Tags irrelevantes criadas por erro', 'Duplicatas sem valor'"
              className="h-24"
            />
          </div>

          {/* Confirmation checkbox */}
          <div className="flex items-start gap-3 p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
            <Checkbox
              id="confirm-delete"
              checked={confirmDelete}
              onCheckedChange={(checked) => setConfirmDelete(checked === true)}
              className="mt-0.5"
            />
            <label htmlFor="confirm-delete" className="text-sm cursor-pointer">
              Eu entendo que esta ação é permanente e não pode ser desfeita.
            </label>
          </div>

          {/* ML Info Box */}
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-purple-400 mt-0.5 shrink-0" />
              <div className="text-sm">
                <strong className="text-purple-300">Aprendizado de Máquina:</strong>
                <p className="text-muted-foreground mt-1">
                  Sua decisão de exclusão será registrada para treinar o modelo. 
                  A IA aprenderá a evitar gerar tags semelhantes no futuro.
                </p>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 text-amber-400 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Esta ação não pode ser desfeita.</span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending || !confirmDelete || !rationale.trim()}
          >
            {deleteMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Permanentemente
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
