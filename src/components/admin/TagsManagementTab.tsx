import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tags, Plus, Edit, Trash2, ChevronDown, Loader2, ChevronLeft, ChevronRight, Download, FileText, FileSpreadsheet, FileJson, FileDown, AlertTriangle, Merge, HelpCircle, Sparkles, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { exportData, type ExportFormat } from "@/lib/export-utils";
import { AdminTitleWithInfo } from "./AdminTitleWithInfo";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

export const TagsManagementTab = () => {
  const [editDialog, setEditDialog] = useState<{ open: boolean; tag: Tag | null; isParent: boolean }>({
    open: false,
    tag: null,
    isParent: true,
  });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; tagId: string | null }>({
    open: false,
    tagId: null,
  });
  const [mergeDialog, setMergeDialog] = useState<{ open: boolean; tagName: string; ids: string[] }>({
    open: false,
    tagName: "",
    ids: [],
  });
  const [filterSource, setFilterSource] = useState<string>("all");
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortColumn, setSortColumn] = useState<"tag_name" | "confidence">("tag_name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [formData, setFormData] = useState({
    tag_name: "",
    tag_type: "",
    confidence: 0.85,
    source: "admin",
    parent_tag_id: null as string | null,
  });

  const queryClient = useQueryClient();

  // Fetch all tags with document target_chat
  const { data: allTags, isLoading } = useQuery({
    queryKey: ["all-tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_tags")
        .select(`
          *,
          documents:document_id (target_chat)
        `)
        .order("tag_name", { ascending: true });

      if (error) throw error;
      
      // Flatten the target_chat from nested documents object
      return (data || []).map((tag: any) => ({
        ...tag,
        target_chat: tag.documents?.target_chat || null,
      })) as Tag[];
    },
  });

  // Group tags by parent
  const parentTags = allTags?.filter((t) => !t.parent_tag_id) || [];
  const childTagsMap = allTags?.reduce((acc, tag) => {
    if (tag.parent_tag_id) {
      if (!acc[tag.parent_tag_id]) {
        acc[tag.parent_tag_id] = [];
      }
      acc[tag.parent_tag_id].push(tag);
    }
    return acc;
  }, {} as Record<string, Tag[]>) || {};

  // Filter by source
  const filteredParentTags = filterSource === "all" 
    ? parentTags 
    : parentTags.filter((t) => t.source === filterSource);

  // Sort tags
  const sortedParentTags = [...filteredParentTags].sort((a, b) => {
    if (sortColumn === "tag_name") {
      const comparison = a.tag_name.localeCompare(b.tag_name);
      return sortDirection === "asc" ? comparison : -comparison;
    } else {
      const aConf = a.confidence ?? 0;
      const bConf = b.confidence ?? 0;
      return sortDirection === "asc" ? aConf - bConf : bConf - aConf;
    }
  });

  // Handle sort toggle
  const handleSort = (column: "tag_name" | "confidence") => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Levenshtein distance for semantic similarity
  const levenshteinDistance = (a: string, b: string): number => {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  };

  const calculateSimilarity = (a: string, b: string): number => {
    const normalized1 = a.toLowerCase().replace(/[^a-záàâãéêíóôõúç\s]/gi, '').trim();
    const normalized2 = b.toLowerCase().replace(/[^a-záàâãéêíóôõúç\s]/gi, '').trim();
    const maxLen = Math.max(normalized1.length, normalized2.length);
    if (maxLen === 0) return 1;
    const distance = levenshteinDistance(normalized1, normalized2);
    return 1 - (distance / maxLen);
  };

  // Detect exact duplicates
  const duplicateParentTags = parentTags.reduce((acc, tag) => {
    const existing = acc.find((item) => item.tag_name === tag.tag_name);
    if (existing) {
      existing.count += 1;
      existing.ids.push(tag.id);
    } else {
      acc.push({ tag_name: tag.tag_name, count: 1, ids: [tag.id] });
    }
    return acc;
  }, [] as { tag_name: string; count: number; ids: string[] }[]).filter((item) => item.count > 1);

  // Detect semantic duplicates (similar but not identical)
  const semanticDuplicates: { tag1: string; tag2: string; similarity: number; ids: string[] }[] = [];
  const uniqueTagNames = [...new Set(parentTags.map(t => t.tag_name))];
  
  for (let i = 0; i < uniqueTagNames.length; i++) {
    for (let j = i + 1; j < uniqueTagNames.length; j++) {
      const similarity = calculateSimilarity(uniqueTagNames[i], uniqueTagNames[j]);
      // Consider similar if >= 70% match but not exact
      if (similarity >= 0.7 && similarity < 1) {
        const tag1Ids = parentTags.filter(t => t.tag_name === uniqueTagNames[i]).map(t => t.id);
        const tag2Ids = parentTags.filter(t => t.tag_name === uniqueTagNames[j]).map(t => t.id);
        semanticDuplicates.push({
          tag1: uniqueTagNames[i],
          tag2: uniqueTagNames[j],
          similarity,
          ids: [...tag1Ids, ...tag2Ids],
        });
      }
    }
  }

  // Sort by similarity descending
  semanticDuplicates.sort((a, b) => b.similarity - a.similarity);

  // Pagination
  const totalPages = Math.ceil(sortedParentTags.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedParentTags = sortedParentTags.slice(startIndex, startIndex + itemsPerPage);

  // Create tag mutation
  const createTagMutation = useMutation({
    mutationFn: async (tagData: typeof formData) => {
      const { data, error } = await supabase
        .from("document_tags")
        .insert([{
          tag_name: tagData.tag_name,
          tag_type: tagData.tag_type,
          confidence: tagData.confidence,
          source: tagData.source,
          parent_tag_id: tagData.parent_tag_id,
          document_id: "00000000-0000-0000-0000-000000000000", // Placeholder for admin tags
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Tag criada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["all-tags"] });
      setEditDialog({ open: false, tag: null, isParent: true });
      resetForm();
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar tag: ${error.message}`);
    },
  });

  // Update tag mutation
  const updateTagMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Tag> & { id: string }) => {
      const { data, error } = await supabase
        .from("document_tags")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Tag atualizada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["all-tags"] });
      setEditDialog({ open: false, tag: null, isParent: true });
      resetForm();
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar tag: ${error.message}`);
    },
  });

  // Delete tag mutation
  const deleteTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase
        .from("document_tags")
        .delete()
        .eq("id", tagId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tag deletada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["all-tags"] });
      setDeleteDialog({ open: false, tagId: null });
    },
    onError: (error: any) => {
      toast.error(`Erro ao deletar tag: ${error.message}`);
    },
  });

  // Merge tags mutation
  const mergeTagsMutation = useMutation({
    mutationFn: async ({ targetTagId, sourceTagIds }: { targetTagId: string; sourceTagIds: string[] }) => {
      // Move all child tags to target
      for (const sourceId of sourceTagIds) {
        await supabase
          .from("document_tags")
          .update({ parent_tag_id: targetTagId })
          .eq("parent_tag_id", sourceId);
      }
      
      // Delete duplicate parent tags
      await supabase
        .from("document_tags")
        .delete()
        .in("id", sourceTagIds);
    },
    onSuccess: () => {
      toast.success("Tags unificadas com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["all-tags"] });
      setMergeDialog({ open: false, tagName: "", ids: [] });
    },
    onError: (error: any) => {
      toast.error(`Erro ao unificar tags: ${error.message}`);
    },
  });

  const openMergeDialog = (tagName: string, ids: string[]) => {
    setMergeDialog({ open: true, tagName, ids });
  };

  const handleMerge = () => {
    if (mergeDialog.ids.length < 2) {
      toast.error("Selecione pelo menos 2 tags para unificar");
      return;
    }
    
    const targetTagId = mergeDialog.ids[0]; // Keep the first (oldest) tag
    const sourceTagIds = mergeDialog.ids.slice(1); // Remove duplicates
    
    mergeTagsMutation.mutate({ targetTagId, sourceTagIds });
  };

  const resetForm = () => {
    setFormData({
      tag_name: "",
      tag_type: "",
      confidence: 0.85,
      source: "admin",
      parent_tag_id: null,
    });
  };

  const openCreateDialog = (isParent: boolean, parentId?: string) => {
    resetForm();
    if (!isParent && parentId) {
      setFormData((prev) => ({ ...prev, parent_tag_id: parentId }));
    }
    setEditDialog({ open: true, tag: null, isParent });
  };

  const openEditDialog = (tag: Tag) => {
    setFormData({
      tag_name: tag.tag_name,
      tag_type: tag.tag_type,
      confidence: tag.confidence || 0.85,
      source: tag.source || "admin",
      parent_tag_id: tag.parent_tag_id,
    });
    setEditDialog({ open: true, tag, isParent: !tag.parent_tag_id });
  };

  const handleSubmit = () => {
    if (!formData.tag_name.trim() || !formData.tag_type.trim()) {
      toast.error("Nome e tipo são obrigatórios");
      return;
    }

    if (editDialog.tag) {
      updateTagMutation.mutate({ id: editDialog.tag.id, ...formData });
    } else {
      createTagMutation.mutate(formData);
    }
  };

  const toggleExpanded = (parentId: string) => {
    setExpandedParents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(parentId)) {
        newSet.delete(parentId);
      } else {
        newSet.add(parentId);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleExport = async (format: ExportFormat) => {
    const exportColumns = [
      { key: 'tag_name', label: 'Nome da Tag' },
      { key: 'tag_type', label: 'Tipo' },
      { key: 'parent', label: 'Tag Pai' },
      { key: 'confidence', label: 'Confiança' },
      { key: 'source', label: 'Fonte' },
    ];

    const exportableData = parentTags.flatMap(parent => {
      const childrenData = (childTagsMap[parent.id] || []).map(child => ({
        tag_name: child.tag_name,
        tag_type: child.tag_type,
        parent: parent.tag_name,
        confidence: child.confidence?.toFixed(2) || 'N/A',
        source: child.source || 'N/A',
      }));

      return [
        {
          tag_name: parent.tag_name,
          tag_type: parent.tag_type,
          parent: '-',
          confidence: parent.confidence?.toFixed(2) || 'N/A',
          source: parent.source || 'N/A',
        },
        ...childrenData,
      ];
    });

    try {
      await exportData({
        filename: 'tags',
        data: exportableData,
        format,
        columns: exportColumns,
      });
      toast.success(`Dados exportados em formato ${format.toUpperCase()}`);
    } catch (error) {
      toast.error("Erro ao exportar dados");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <AdminTitleWithInfo
            title="Gerenciamento de Tags"
            level="h2"
            icon={Tags}
            tooltipText="CRUD completo de tags"
            infoContent={
              <>
                <p>Gerencie tags hierárquicas do sistema RAG.</p>
                <p className="mt-2">Crie, edite, delete e unifique tags parent/child para categorização de documentos.</p>
              </>
            }
          />
          <p className="text-muted-foreground mt-1">
            CRUD completo para tags hierárquicas do sistema RAG
          </p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <FileText className="h-4 w-4 mr-2" /> CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('json')}>
                <FileJson className="h-4 w-4 mr-2" /> JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                <FileDown className="h-4 w-4 mr-2" /> PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => openCreateDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Criar Tag Pai
          </Button>
        </div>
      </div>

      {/* Duplicate Detection - Combined Section */}
      {(duplicateParentTags.length > 0 || semanticDuplicates.length > 0) && (
        <Card className="p-4 border-amber-500/50 bg-amber-500/5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h3 className="font-semibold">
              Duplicatas Detectadas
              <Badge variant="outline" className="ml-2">
                {duplicateParentTags.length + semanticDuplicates.length}
              </Badge>
            </h3>
          </div>
          
          {/* Exact Duplicates */}
          {duplicateParentTags.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="destructive" className="text-xs">Exatas</Badge>
                <span className="text-sm text-muted-foreground">Tags com nome idêntico</span>
              </div>
              <div className="space-y-2">
                {duplicateParentTags.map(({ tag_name, count, ids }) => (
                  <div key={tag_name} className="flex items-center justify-between p-2 bg-red-500/10 border border-red-500/30 rounded">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">"{tag_name}"</span>
                      <Badge variant="outline" className="text-xs">{count}x</Badge>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => openMergeDialog(tag_name, ids)}>
                      <Merge className="h-4 w-4 mr-1" /> Unificar
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Semantic Duplicates */}
          {semanticDuplicates.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="text-xs bg-purple-500/20 text-purple-300 border-purple-500/30">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Semânticas
                </Badge>
                <span className="text-sm text-muted-foreground">Tags com significado similar</span>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
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
                    <Button size="sm" variant="outline" onClick={() => openMergeDialog(`${tag1} → ${tag2}`, ids)}>
                      <Merge className="h-4 w-4 mr-1" /> Mesclar
                    </Button>
                  </div>
                ))}
                {semanticDuplicates.length > 15 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    +{semanticDuplicates.length - 15} outras duplicatas semânticas
                  </p>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <Label>Filtrar por origem:</Label>
          <Select value={filterSource} onValueChange={setFilterSource}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="ai">IA</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Tags Table */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Tags Extraídas dos Documentos</h3>
        
        {paginatedParentTags.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            Nenhuma tag encontrada
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("tag_name")}
                      className="flex items-center gap-1 -ml-4 hover:bg-transparent"
                    >
                      Nome da Tag
                      {sortColumn === "tag_name" ? (
                        sortDirection === "asc" ? (
                          <ArrowUp className="h-4 w-4" />
                        ) : (
                          <ArrowDown className="h-4 w-4" />
                        )
                      ) : (
                        <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Chat</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("confidence")}
                      className="flex items-center gap-1 -ml-4 hover:bg-transparent"
                    >
                      Confiança
                      {sortColumn === "confidence" ? (
                        sortDirection === "asc" ? (
                          <ArrowUp className="h-4 w-4" />
                        ) : (
                          <ArrowDown className="h-4 w-4" />
                        )
                      ) : (
                        <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedParentTags.map((parent) => (
                  <>
                    <TableRow key={parent.id} className="group">
                      <TableCell>
                        {childTagsMap[parent.id]?.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpanded(parent.id)}
                            className="h-6 w-6 p-0"
                          >
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${
                                expandedParents.has(parent.id) ? "rotate-180" : ""
                              }`}
                            />
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{parent.tag_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {parent.tag_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={parent.source === "ai" ? "secondary" : "default"} className="text-xs">
                          {parent.source}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {parent.target_chat && (
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              parent.target_chat === "health" 
                                ? "border-emerald-500/50 text-emerald-400" 
                                : "border-blue-500/50 text-blue-400"
                            }`}
                          >
                            {parent.target_chat === "health" ? "Saúde" : "Estudo"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="flex items-center gap-1">
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${
                                    (parent.confidence || 0) >= 0.7 
                                      ? "border-green-500/50 text-green-400" 
                                      : (parent.confidence || 0) >= 0.5 
                                        ? "border-yellow-500/50 text-yellow-400"
                                        : "border-red-500/50 text-red-400"
                                  }`}
                                >
                                  {Math.round((parent.confidence || 0) * 100)}%
                                </Badge>
                                <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[300px]">
                              <p className="font-semibold">Grau de Confiança</p>
                              <p className="text-sm">Representa a certeza da IA ao classificar este documento.</p>
                              <ul className="text-sm mt-1 list-disc pl-4">
                                <li className="text-green-400">≥70%: Incluída nos scope_topics</li>
                                <li className="text-yellow-400">50-69%: Relevância média</li>
                                <li className="text-red-400">&lt;50%: Baixa relevância</li>
                              </ul>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openCreateDialog(false, parent.id)}
                            className="h-7 w-7 p-0"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(parent)}
                            className="h-7 w-7 p-0"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteDialog({ open: true, tagId: parent.id })}
                            className="h-7 w-7 p-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {/* Child Tags Rows */}
                    {expandedParents.has(parent.id) && childTagsMap[parent.id]?.map((child) => (
                      <TableRow key={child.id} className="bg-muted/30 group">
                        <TableCell></TableCell>
                        <TableCell className="pl-8 text-sm text-muted-foreground">
                          ↳ {child.tag_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {child.tag_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={child.source === "ai" ? "secondary" : "default"} className="text-xs">
                            {child.source}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {child.target_chat && (
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                child.target_chat === "health" 
                                  ? "border-emerald-500/50 text-emerald-400" 
                                  : "border-blue-500/50 text-blue-400"
                              }`}
                            >
                              {child.target_chat === "health" ? "Saúde" : "Estudo"}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              (child.confidence || 0) >= 0.7 
                                ? "border-green-500/50 text-green-400" 
                                : (child.confidence || 0) >= 0.5 
                                  ? "border-yellow-500/50 text-yellow-400"
                                  : "border-red-500/50 text-red-400"
                            }`}
                          >
                            {Math.round((child.confidence || 0) * 100)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(child)}
                              className="h-7 w-7 p-0"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteDialog({ open: true, tagId: child.id })}
                              className="h-7 w-7 p-0"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination Controls */}
        {sortedParentTags.length > 0 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Itens por página:</span>
              <Select value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {startIndex + 1}-{Math.min(startIndex + itemsPerPage, sortedParentTags.length)} de {sortedParentTags.length}
              </span>
              <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => !open && setEditDialog({ open: false, tag: null, isParent: true })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editDialog.tag ? "Editar Tag" : `Criar Tag ${editDialog.isParent ? "Pai" : "Filha"}`}
            </DialogTitle>
            <DialogDescription>
              Preencha os campos para {editDialog.tag ? "atualizar" : "criar"} a tag
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome da Tag</Label>
              <Input
                value={formData.tag_name}
                onChange={(e) => setFormData({ ...formData, tag_name: e.target.value })}
                placeholder="ex: Cardiologia"
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Input
                value={formData.tag_type}
                onChange={(e) => setFormData({ ...formData, tag_type: e.target.value })}
                placeholder="ex: medical_specialty"
              />
            </div>
            <div>
              <Label>Confiança (0-1)</Label>
              <Input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={formData.confidence}
                onChange={(e) => setFormData({ ...formData, confidence: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <Label>Origem</Label>
              <Select value={formData.source} onValueChange={(val) => setFormData({ ...formData, source: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ai">IA</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, tag: null, isParent: true })}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={createTagMutation.isPending || updateTagMutation.isPending}>
              {(createTagMutation.isPending || updateTagMutation.isPending) ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, tagId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja deletar esta tag? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, tagId: null })}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteDialog.tagId && deleteTagMutation.mutate(deleteDialog.tagId)}
              disabled={deleteTagMutation.isPending}
            >
              {deleteTagMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deletando...
                </>
              ) : (
                "Deletar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Tags Dialog */}
      <Dialog open={mergeDialog.open} onOpenChange={(open) => !open && setMergeDialog({ open: false, tagName: "", ids: [] })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unificar Tags Duplicadas</DialogTitle>
            <DialogDescription>
              Você está prestes a unificar todas as ocorrências de "{mergeDialog.tagName}". 
              <br /><br />
              <strong>O que acontecerá:</strong>
              <ul className="list-disc pl-5 mt-2">
                <li>A tag mais antiga será mantida</li>
                <li>Todas as tags filhas serão movidas para a tag mantida</li>
                <li>As tags duplicadas serão removidas</li>
              </ul>
              <br />
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeDialog({ open: false, tagName: "", ids: [] })}>
              Cancelar
            </Button>
            <Button
              onClick={handleMerge}
              disabled={mergeTagsMutation.isPending}
            >
              {mergeTagsMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Unificando...
                </>
              ) : (
                <>
                  <Merge className="h-4 w-4 mr-2" />
                  Unificar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
