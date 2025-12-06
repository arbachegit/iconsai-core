import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { AlertTriangle, ChevronDown, FolderOpen, Loader2, ArrowRight, Users, Trash2 } from "lucide-react";
import { logTagManagementEvent } from "@/lib/tag-management-logger";

interface OrphanedTag {
  id: string;
  tag_name: string;
  tag_type: string;
  confidence: number | null;
  source: string | null;
  document_id: string;
  parent_tag_id: string | null;
  created_at: string;
}

interface ParentTag {
  id: string;
  tag_name: string;
}

interface OrphanedTagsPanelProps {
  orphanedTags: OrphanedTag[];
  parentTags: ParentTag[];
}

export const OrphanedTagsPanel = ({ orphanedTags, parentTags }: OrphanedTagsPanelProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedParents, setSelectedParents] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingType, setProcessingType] = useState<'adopt' | 'delete' | null>(null);
  const queryClient = useQueryClient();

  const isProcessing = processingId !== null;

  const reassignMutation = useMutation({
    mutationFn: async ({ tagId, newParentId, tagName, parentName }: { 
      tagId: string; 
      newParentId: string;
      tagName: string;
      parentName: string;
    }) => {
      const startTime = Date.now();
      
      const { error } = await supabase
        .from("document_tags")
        .update({ parent_tag_id: newParentId })
        .eq("id", tagId);

      if (error) throw error;

      await logTagManagementEvent({
        input_state: {
          tags_involved: [{
            id: tagId,
            name: tagName,
            type: 'child',
            parent_id: null
          }]
        },
        action_type: 'adopt_orphan',
        user_decision: {
          target_tag_id: tagId,
          target_tag_name: tagName,
          target_parent_id: newParentId,
          target_parent_name: parentName
        },
        time_to_decision_ms: Date.now() - startTime
      });
    },
    onSuccess: () => {
      toast.success("Tag reatribuída com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["all-tags"] });
      setProcessingId(null);
      setProcessingType(null);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao reatribuir tag: ${error.message}`);
      setProcessingId(null);
      setProcessingType(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ tagId, tagName }: { tagId: string; tagName: string }) => {
      const startTime = Date.now();
      
      const { error } = await supabase
        .from("document_tags")
        .delete()
        .eq("id", tagId);

      if (error) throw error;

      await logTagManagementEvent({
        input_state: {
          tags_involved: [{ id: tagId, name: tagName, type: 'child', parent_id: null }]
        },
        action_type: 'delete_orphan',
        user_decision: {
          target_tag_id: tagId,
          target_tag_name: tagName,
          action: 'permanently_deleted'
        },
        time_to_decision_ms: Date.now() - startTime
      });
    },
    onSuccess: () => {
      toast.success("Tag órfã excluída permanentemente!");
      queryClient.invalidateQueries({ queryKey: ["all-tags"] });
      setProcessingId(null);
      setProcessingType(null);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir tag: ${error.message}`);
      setProcessingId(null);
      setProcessingType(null);
    },
  });

  const handleReassign = (tag: OrphanedTag) => {
    const newParentId = selectedParents[tag.id];
    if (!newParentId) {
      toast.error("Selecione um parent tag primeiro");
      return;
    }

    const parentTag = parentTags.find(p => p.id === newParentId);
    if (!parentTag) return;

    setProcessingId(tag.id);
    setProcessingType('adopt');
    reassignMutation.mutate({ 
      tagId: tag.id, 
      newParentId,
      tagName: tag.tag_name,
      parentName: parentTag.tag_name
    });
  };

  const handleDelete = (tag: OrphanedTag) => {
    setProcessingId(tag.id);
    setProcessingType('delete');
    deleteMutation.mutate({ tagId: tag.id, tagName: tag.tag_name });
  };

  if (orphanedTags.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="p-4 border-orange-500/50 bg-gradient-to-r from-orange-500/5 to-amber-500/5">
        <CollapsibleTrigger className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-orange-400" />
            <h3 className="font-semibold">Zona de Tags Órfãs</h3>
            <Badge variant="outline" className="ml-2 bg-orange-500/20 text-orange-300 border-orange-500/30">
              <Users className="h-3 w-3 mr-1" />
              {orphanedTags.length} órfã(s)
            </Badge>
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-4">
          <p className="text-sm text-muted-foreground mb-4">
            Tags filhas sem parent válido. Reatribua-as a um parent tag existente ou exclua permanentemente.
          </p>

          <div className={`space-y-3 max-h-[300px] overflow-y-auto transition-opacity ${isProcessing ? 'opacity-60' : ''}`}>
            {orphanedTags.map((tag) => (
              <div 
                key={tag.id} 
                className="flex items-center justify-between gap-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <AlertTriangle className="h-4 w-4 text-orange-400 shrink-0" />
                  <span className="text-sm font-medium truncate">{tag.tag_name}</span>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {tag.source || "N/A"}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Select
                    value={selectedParents[tag.id] || ""}
                    onValueChange={(value) => setSelectedParents(prev => ({ ...prev, [tag.id]: value }))}
                    disabled={isProcessing}
                  >
                    <SelectTrigger className="w-[180px] h-8 text-xs">
                      <SelectValue placeholder="Selecionar parent..." />
                    </SelectTrigger>
                    <SelectContent>
                      {parentTags.map((parent) => (
                        <SelectItem key={parent.id} value={parent.id} className="text-xs">
                          {parent.tag_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReassign(tag)}
                    disabled={!selectedParents[tag.id] || isProcessing}
                    className="h-8 px-3 text-xs border-green-500/50 text-green-400 hover:bg-green-500/20"
                  >
                    {processingId === tag.id && processingType === 'adopt' ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <ArrowRight className="h-3 w-3 mr-1" />
                        Adotar
                      </>
                    )}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(tag)}
                    disabled={isProcessing}
                    className="h-8 w-8 p-0 border-red-500/50 text-red-400 hover:bg-red-500/20"
                  >
                    {processingId === tag.id && processingType === 'delete' ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
