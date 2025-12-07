import React, { memo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Merge, Sparkles, Trash2, XCircle, ChevronDown, Tags } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface Tag {
  id: string;
  tag_name: string;
  tag_type: string;
  confidence: number | null;
  source: string | null;
  document_id: string;
  parent_tag_id: string | null;
}

interface DuplicateGroup {
  tag_name: string;
  count: number;
  ids: string[];
}

interface SemanticDuplicate {
  tag1: string;
  tag2: string;
  similarity: number;
  ids: string[];
}

interface SimilarChildPair {
  tag1: string;
  tag2: string;
  id1: string;
  id2: string;
  similarity: number;
}

interface SimilarChildGroup {
  parentId: string;
  parentName: string;
  pairs: SimilarChildPair[];
}

interface DuplicatesPanelProps {
  duplicateParentTags: DuplicateGroup[];
  semanticDuplicates: SemanticDuplicate[];
  similarChildTagsPerParent: SimilarChildGroup[];
  onOpenConflictModal: (type: 'parent' | 'semantic' | 'child', ids: string[], similarity?: number) => void;
  onDelete: (ids: string[], tagName: string) => void;
  onRejectDuplicate: (ids: string[], tagName: string, type: 'parent' | 'semantic' | 'child') => void;
}

export const DuplicatesPanel = memo(({
  duplicateParentTags,
  semanticDuplicates,
  similarChildTagsPerParent,
  onOpenConflictModal,
  onDelete,
  onRejectDuplicate,
}: DuplicatesPanelProps) => {
  const [openSections, setOpenSections] = useState({
    exact: false,
    semantic: false,
    children: false,
  });

  const totalChildDuplicates = similarChildTagsPerParent.reduce(
    (sum, p) => sum + p.pairs.length, 0
  );

  if (duplicateParentTags.length === 0 && semanticDuplicates.length === 0 && similarChildTagsPerParent.length === 0) {
    return null;
  }

  return (
    <Card className="p-4 border-amber-500/50 bg-amber-500/5">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        <h3 className="font-semibold">
          Duplicatas Detectadas
          <Badge variant="outline" className="ml-2">
            {duplicateParentTags.length + semanticDuplicates.length + totalChildDuplicates}
          </Badge>
        </h3>
      </div>
      
      {/* Exact Duplicates - Collapsible */}
      {duplicateParentTags.length > 0 && (
        <Collapsible 
          open={openSections.exact} 
          onOpenChange={(open) => setOpenSections(prev => ({ ...prev, exact: open }))}
          className="mb-4"
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-red-500/10 border border-red-500/30 rounded hover:bg-red-500/20 transition-colors cursor-pointer">
            <div className="flex items-center gap-2">
              <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", !openSections.exact && "-rotate-90")} />
              <Badge variant="destructive" className="text-xs">Exatas</Badge>
              <span className="text-sm text-muted-foreground">Tags com nome idêntico</span>
              <Badge variant="outline" className="text-xs">{duplicateParentTags.length}</Badge>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-2">
            {duplicateParentTags.map(({ tag_name, count, ids }) => (
              <div key={tag_name} className="flex items-center justify-between p-2 bg-red-500/10 border border-red-500/30 rounded">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">"{tag_name}"</span>
                  <Badge variant="outline" className="text-xs">{count}x</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button 
                    size="sm" 
                    variant="ghost"
                    className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
                    onClick={() => onRejectDuplicate(ids, tag_name, 'parent')}
                  >
                    <XCircle className="h-4 w-4 mr-1" /> Não Unificar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onOpenConflictModal('parent', ids)}>
                    <Merge className="h-4 w-4 mr-1" /> Unificar
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onDelete(ids, tag_name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Semantic Duplicates - Collapsible */}
      {semanticDuplicates.length > 0 && (
        <Collapsible 
          open={openSections.semantic} 
          onOpenChange={(open) => setOpenSections(prev => ({ ...prev, semantic: open }))}
          className="mb-4"
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-purple-500/10 border border-purple-500/30 rounded hover:bg-purple-500/20 transition-colors cursor-pointer">
            <div className="flex items-center gap-2">
              <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", !openSections.semantic && "-rotate-90")} />
              <Badge className="text-xs bg-purple-500/20 text-purple-300 border-purple-500/30">
                <Sparkles className="h-3 w-3 mr-1" />
                Semânticas
              </Badge>
              <span className="text-sm text-muted-foreground">Tags com significado similar</span>
              <Badge variant="outline" className="text-xs">{semanticDuplicates.length}</Badge>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-2 max-h-[300px] overflow-y-auto">
            {semanticDuplicates.slice(0, 15).map(({ tag1, tag2, similarity, ids }, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-purple-500/10 border border-purple-500/30 rounded">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">"{tag1}"</span>
                  <span className="text-muted-foreground">≈</span>
                  <span className="text-sm font-medium">"{tag2}"</span>
                  <Badge variant="outline" className="text-xs">
                    {Math.round(similarity * 100)}% similar
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button 
                    size="sm" 
                    variant="ghost"
                    className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
                    onClick={() => onRejectDuplicate(ids, `${tag1} / ${tag2}`, 'semantic')}
                  >
                    <XCircle className="h-4 w-4 mr-1" /> Não Mesclar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onOpenConflictModal('semantic', ids, similarity)}>
                    <Merge className="h-4 w-4 mr-1" /> Mesclar
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onDelete(ids, `${tag1} / ${tag2}`)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {semanticDuplicates.length > 15 && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                +{semanticDuplicates.length - 15} outras duplicatas semânticas
              </p>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Similar Child Tags - Collapsible */}
      {similarChildTagsPerParent.length > 0 && (
        <Collapsible 
          open={openSections.children} 
          onOpenChange={(open) => setOpenSections(prev => ({ ...prev, children: open }))}
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-cyan-500/10 border border-cyan-500/30 rounded hover:bg-cyan-500/20 transition-colors cursor-pointer">
            <div className="flex items-center gap-2">
              <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", !openSections.children && "-rotate-90")} />
              <Badge className="text-xs bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                <Tags className="h-3 w-3 mr-1" />
                Filhas Semelhantes
              </Badge>
              <span className="text-sm text-muted-foreground">
                Tags filhas similares dentro do mesmo pai
              </span>
              <Badge variant="outline" className="text-xs">{totalChildDuplicates}</Badge>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-3 max-h-[400px] overflow-y-auto">
            {similarChildTagsPerParent.map(({ parentId, parentName, pairs }) => (
              <Collapsible key={parentId}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 bg-cyan-500/10 border border-cyan-500/30 rounded hover:bg-cyan-500/20 transition-colors">
                  <div className="flex items-center gap-2">
                    <ChevronDown className="h-4 w-4 transition-transform" />
                    <span className="font-medium">{parentName}</span>
                    <Badge variant="outline" className="text-xs">
                      {pairs.length} par(es)
                    </Badge>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-6 pt-2 space-y-2">
                  {pairs.map((pair, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-cyan-500/5 border border-cyan-500/20 rounded">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs">{pair.tag1}</Badge>
                        <span className="text-muted-foreground">≈</span>
                        <Badge variant="secondary" className="text-xs">{pair.tag2}</Badge>
                        <Badge variant="outline" className="text-xs">
                          {Math.round(pair.similarity * 100)}%
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
                          onClick={() => onRejectDuplicate([pair.id1, pair.id2], `${pair.tag1} / ${pair.tag2}`, 'child')}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => onOpenConflictModal('child', [pair.id1, pair.id2], pair.similarity)}
                        >
                          <Merge className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => onDelete([pair.id1, pair.id2], `${pair.tag1} / ${pair.tag2}`)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </Card>
  );
});

DuplicatesPanel.displayName = "DuplicatesPanel";
