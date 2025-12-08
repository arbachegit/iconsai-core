import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  Merge, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  ChevronDown,
  ChevronRight,
  FileText,
  Sparkles,
  X
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { logTagManagementEvent } from "@/lib/tag-management-logger";
import { getReasonBadge, type ReasonType } from "@/lib/merge-reason-heuristics";
import { BulkMergeConfirmationModal } from "./BulkMergeConfirmationModal";

interface Tag {
  id: string;
  tag_name: string;
  tag_type: string;
  confidence: number | null;
  source: string | null;
  document_id: string;
  parent_tag_id: string | null;
  created_at?: string;
}

interface CandidateTag {
  tag: Tag;
  similarity: number;
  reason: string;
  reasonType: ReasonType;
  documentCount: number;
}

interface SimilarityCluster {
  masterTag: Tag;
  masterDocumentCount: number;
  candidates: CandidateTag[];
}

interface SimilarityReviewPanelProps {
  open: boolean;
  onClose: () => void;
  semanticDuplicates: Array<{
    tag1: string;
    tag2: string;
    similarity: number;
    ids: string[];
  }>;
  allTags: Tag[] | undefined;
}

export const SimilarityReviewPanel = ({
  open,
  onClose,
  semanticDuplicates,
  allTags,
}: SimilarityReviewPanelProps) => {
  const queryClient = useQueryClient();
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set());
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [currentCluster, setCurrentCluster] = useState<SimilarityCluster | null>(null);

  // Build clusters from semantic duplicates
  const clusters = useMemo((): SimilarityCluster[] => {
    if (!semanticDuplicates.length || !allTags?.length) return [];

    const processed = new Set<string>();
    const result: SimilarityCluster[] = [];

    // Group related duplicates into clusters
    for (const dup of semanticDuplicates) {
      if (processed.has(dup.tag1) && processed.has(dup.tag2)) continue;

      // Find the "master" tag - prefer the one with more documents or proper capitalization
      const tag1Instances = allTags.filter(t => t.tag_name === dup.tag1);
      const tag2Instances = allTags.filter(t => t.tag_name === dup.tag2);
      
      const tag1DocCount = new Set(tag1Instances.map(t => t.document_id)).size;
      const tag2DocCount = new Set(tag2Instances.map(t => t.document_id)).size;
      
      // Master tag criteria: more documents, or proper capitalization if equal
      const isMasterTag1 = tag1DocCount > tag2DocCount || 
        (tag1DocCount === tag2DocCount && dup.tag1[0] === dup.tag1[0].toUpperCase());
      
      const masterTagName = isMasterTag1 ? dup.tag1 : dup.tag2;
      const candidateTagName = isMasterTag1 ? dup.tag2 : dup.tag1;
      const masterTag = allTags.find(t => t.tag_name === masterTagName);
      const candidateTag = allTags.find(t => t.tag_name === candidateTagName);

      if (!masterTag || !candidateTag) continue;

      // Determine reason for similarity
      const { text: reasonText, type: reasonType } = getReasonBadge(masterTagName, candidateTagName, dup.similarity);

      // Find or create cluster for this master
      let cluster = result.find(c => c.masterTag.tag_name === masterTagName);
      
      if (!cluster) {
        cluster = {
          masterTag,
          masterDocumentCount: isMasterTag1 ? tag1DocCount : tag2DocCount,
          candidates: [],
        };
        result.push(cluster);
      }

      // Add candidate if not already in cluster
      if (!cluster.candidates.some(c => c.tag.tag_name === candidateTagName)) {
        cluster.candidates.push({
          tag: candidateTag,
          similarity: dup.similarity,
          reason: reasonText,
          reasonType,
          documentCount: isMasterTag1 ? tag2DocCount : tag1DocCount,
        });
      }

      processed.add(dup.tag1);
      processed.add(dup.tag2);
    }

    // Sort clusters by number of candidates (most duplicates first)
    return result.sort((a, b) => b.candidates.length - a.candidates.length);
  }, [semanticDuplicates, allTags]);

  // Toggle candidate selection
  const toggleCandidate = (tagId: string) => {
    const newSelected = new Set(selectedCandidates);
    if (newSelected.has(tagId)) {
      newSelected.delete(tagId);
    } else {
      newSelected.add(tagId);
    }
    setSelectedCandidates(newSelected);
  };

  // Select all candidates in a cluster
  const selectAllInCluster = (cluster: SimilarityCluster, checked: boolean) => {
    const newSelected = new Set(selectedCandidates);
    cluster.candidates.forEach(c => {
      if (checked) {
        newSelected.add(c.tag.id);
      } else {
        newSelected.delete(c.tag.id);
      }
    });
    setSelectedCandidates(newSelected);
  };

  // Check if all candidates in cluster are selected
  const isClusterFullySelected = (cluster: SimilarityCluster) => {
    return cluster.candidates.every(c => selectedCandidates.has(c.tag.id));
  };

  // Toggle cluster expansion
  const toggleCluster = (clusterId: string) => {
    const newExpanded = new Set(expandedClusters);
    if (newExpanded.has(clusterId)) {
      newExpanded.delete(clusterId);
    } else {
      newExpanded.add(clusterId);
    }
    setExpandedClusters(newExpanded);
  };

  // Bulk merge mutation
  const bulkMergeMutation = useMutation({
    mutationFn: async ({ 
      masterId, 
      masterName,
      candidateIds 
    }: { 
      masterId: string; 
      masterName: string;
      candidateIds: string[];
    }) => {
      const results = { 
        success: 0, 
        failed: 0, 
        documentsUpdated: 0,
        errors: [] as { id: string; error: string }[] 
      };


      // Get all tags that will be deleted (by tag_name)
      const candidateTags = allTags?.filter(t => candidateIds.includes(t.id)) || [];
      const candidateNames = [...new Set(candidateTags.map(t => t.tag_name))];

      for (const candidateName of candidateNames) {
        try {
          // Step A: Reassign - For parent tags, update children's parent_tag_id
          const { data: parentTagsToMerge } = await supabase
            .from('document_tags')
            .select('id')
            .eq('tag_name', candidateName)
            .eq('tag_type', 'parent');

          if (parentTagsToMerge && parentTagsToMerge.length > 0) {
            const parentIds = parentTagsToMerge.map(p => p.id);

            // Move child tags to master tag
            const { data: updatedChildren, error: reassignError } = await supabase
              .from('document_tags')
              .update({ parent_tag_id: masterId })
              .in('parent_tag_id', parentIds)
              .select('id');

            if (!reassignError) {
              results.documentsUpdated += updatedChildren?.length || 0;
            }
          }

          // Step B: Delete the source tags (all instances with this name)
          const { error: deleteError } = await supabase
            .from('document_tags')
            .delete()
            .eq('tag_name', candidateName);

          if (deleteError) throw deleteError;

          // Step C: Create ML merge rule
          const { error: ruleError } = await supabase
            .from('tag_merge_rules')
            .upsert({
              source_tag: candidateName,
              canonical_tag: masterName,
              chat_type: 'health', // Default, can be adjusted
              created_by: 'admin',
              merge_count: 1,
            }, {
              onConflict: 'source_tag,chat_type',
            });


          results.success++;
        } catch (error: any) {
          console.error(`[BULK MERGE] Failed for "${candidateName}":`, error.message);
          results.errors.push({ id: candidateName, error: error.message });
          results.failed++;
        }
      }

      // Log the bulk merge event
      await logTagManagementEvent({
        input_state: {
          tags_involved: candidateTags.map(t => ({
            id: t.id,
            name: t.tag_name,
            type: t.tag_type as 'parent' | 'child',
          })),
        },
        action_type: 'merge_parent',
        user_decision: {
          action: 'bulk_merge',
          target_tag_id: masterId,
          target_tag_name: masterName,
          source_tags_removed: candidateNames,
          documents_updated: results.documentsUpdated,
        },
        rationale: `Bulk merge: ${candidateNames.length} tags merged into "${masterName}"`,
      });

      return results;
    },
    onSuccess: (results) => {
      const message = `Merge concluído: ${results.success} tags mescladas, ${results.documentsUpdated} documentos atualizados.${results.failed > 0 ? ` ${results.failed} falhou.` : ''}`;
      toast.success(message);
      
      queryClient.invalidateQueries({ queryKey: ["all-tags"] });
      queryClient.invalidateQueries({ queryKey: ["tag-merge-rules"] });
      setSelectedCandidates(new Set());
      setConfirmModalOpen(false);
    },
    onError: (error: any) => {
      console.error("[BULK MERGE] Error:", error.message);
      toast.error(`Erro no merge: ${error.message}`);
    },
  });

  // Open confirmation modal for a cluster
  const openBulkMergeConfirm = (cluster: SimilarityCluster) => {
    setCurrentCluster(cluster);
    setConfirmModalOpen(true);
  };

  // Execute bulk merge for current cluster
  const executeBulkMerge = () => {
    if (!currentCluster) return;

    const candidateIds = currentCluster.candidates
      .filter(c => selectedCandidates.has(c.tag.id))
      .map(c => c.tag.id);

    if (candidateIds.length === 0) {
      toast.error("Selecione ao menos uma tag candidata para mesclar");
      return;
    }

    bulkMergeMutation.mutate({
      masterId: currentCluster.masterTag.id,
      masterName: currentCluster.masterTag.tag_name,
      candidateIds,
    });
  };

  // Get selected count for a cluster
  const getSelectedCountInCluster = (cluster: SimilarityCluster) => {
    return cluster.candidates.filter(c => selectedCandidates.has(c.tag.id)).length;
  };

  // Get total documents to be affected
  const getTotalAffectedDocs = (cluster: SimilarityCluster) => {
    return cluster.candidates
      .filter(c => selectedCandidates.has(c.tag.id))
      .reduce((sum, c) => sum + c.documentCount, 0);
  };

  // Get reason badge color
  const getReasonBadgeColor = (reasonType: ReasonType) => {
    switch (reasonType) {
      case 'similarity': return 'bg-blue-500/20 text-blue-400 border-blue-400/50';
      case 'case': return 'bg-amber-500/20 text-amber-400 border-amber-400/50';
      case 'typo': return 'bg-red-500/20 text-red-400 border-red-400/50';
      case 'plural': return 'bg-purple-500/20 text-purple-400 border-purple-400/50';
      case 'acronym': return 'bg-cyan-500/20 text-cyan-400 border-cyan-400/50';
      case 'language': return 'bg-emerald-500/20 text-emerald-400 border-emerald-400/50';
      case 'synonym': return 'bg-pink-500/20 text-pink-400 border-pink-400/50';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (!open) return null;

  return (
    <>
      <Card className="border-purple-500/30 bg-gradient-to-br from-purple-950/20 to-background">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            <CardTitle className="text-lg text-purple-300">
              Revisão de Similaridades em Massa
            </CardTitle>
            <Badge variant="outline" className="border-purple-400/50 text-purple-400">
              {clusters.length} clusters
            </Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {clusters.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500/50" />
              <p>Nenhuma similaridade detectada para revisar.</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {clusters.map((cluster, idx) => (
                  <Collapsible
                    key={cluster.masterTag.id}
                    open={expandedClusters.has(cluster.masterTag.id)}
                    onOpenChange={() => toggleCluster(cluster.masterTag.id)}
                  >
                    <Card className="border-muted/50">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-3">
                            {expandedClusters.has(cluster.masterTag.id) ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            
                            {/* Master Tag */}
                            <div className="flex items-center gap-2">
                              <Badge className="bg-green-500/20 text-green-400 border-green-400/50">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Master
                              </Badge>
                              <span className="font-semibold text-foreground">
                                {cluster.masterTag.tag_name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({cluster.masterDocumentCount} docs)
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-amber-400 border-amber-400/50">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {cluster.candidates.length} candidatos
                            </Badge>
                            {getSelectedCountInCluster(cluster) > 0 && (
                              <Badge className="bg-purple-500/20 text-purple-400">
                                {getSelectedCountInCluster(cluster)} selecionados
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="border-t border-muted/30 p-4 space-y-3">
                          {/* Select All */}
                          <div className="flex items-center justify-between pb-2 border-b border-muted/20">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={isClusterFullySelected(cluster)}
                                onCheckedChange={(checked) => selectAllInCluster(cluster, !!checked)}
                              />
                              <span className="text-sm font-medium">Selecionar Todos</span>
                            </div>
                            <Button
                              size="sm"
                              variant="default"
                              disabled={getSelectedCountInCluster(cluster) === 0 || bulkMergeMutation.isPending}
                              onClick={() => openBulkMergeConfirm(cluster)}
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              {bulkMergeMutation.isPending ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Merge className="h-4 w-4 mr-2" />
                              )}
                              Merge & Excluir ({getSelectedCountInCluster(cluster)})
                            </Button>
                          </div>

                          {/* Candidates List */}
                          {cluster.candidates.map((candidate) => (
                            <div
                              key={candidate.tag.id}
                              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                selectedCandidates.has(candidate.tag.id)
                                  ? 'bg-purple-500/10 border-purple-500/30'
                                  : 'bg-muted/20 border-muted/30 hover:bg-muted/30'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  checked={selectedCandidates.has(candidate.tag.id)}
                                  onCheckedChange={() => toggleCandidate(candidate.tag.id)}
                                />
                                <span className="font-medium">{candidate.tag.tag_name}</span>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <FileText className="h-3 w-3" />
                                  {candidate.documentCount} docs
                                </div>
                              </div>
                              
                              {/* Why Badge */}
                              <Badge 
                                variant="outline" 
                                className={getReasonBadgeColor(candidate.reasonType)}
                              >
                                {candidate.reason}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      <BulkMergeConfirmationModal
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={executeBulkMerge}
        isLoading={bulkMergeMutation.isPending}
        masterTagName={currentCluster?.masterTag.tag_name || ''}
        selectedCount={currentCluster ? getSelectedCountInCluster(currentCluster) : 0}
        affectedDocuments={currentCluster ? getTotalAffectedDocs(currentCluster) : 0}
        candidates={currentCluster?.candidates.filter(c => selectedCandidates.has(c.tag.id)) || []}
      />
    </>
  );
};
