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
import { Tags, Plus, Edit, Trash2, ChevronDown, Loader2, ChevronLeft, ChevronRight, Download, FileText, FileSpreadsheet, FileJson, FileDown, AlertTriangle, Merge, HelpCircle } from "lucide-react";
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
  const [formData, setFormData] = useState({
    tag_name: "",
    tag_type: "",
    confidence: 0.85,
    source: "admin",
    parent_tag_id: null as string | null,
  });

  const queryClient = useQueryClient();

  // Fetch all tags
  const { data: allTags, isLoading } = useQuery({
    queryKey: ["all-tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_tags")
        .select("*")
        .order("tag_name", { ascending: true });

      if (error) throw error;
      return data as Tag[];
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

  // Detect duplicates
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

  // Pagination
  const totalPages = Math.ceil(filteredParentTags.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedParentTags = filteredParentTags.slice(startIndex, startIndex + itemsPerPage);

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

      {/* Duplicate Detection */}
      {duplicateParentTags.length > 0 && (
        <Card className="p-4 border-yellow-500/50 bg-yellow-500/5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <h3 className="font-semibold">Tags Duplicadas Detectadas</h3>
          </div>
          <div className="space-y-2">
            {duplicateParentTags.map(({ tag_name, count, ids }) => (
              <div key={tag_name} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                <span className="text-sm">"{tag_name}" - {count}x ocorrências</span>
                <Button size="sm" variant="outline" onClick={() => openMergeDialog(tag_name, ids)}>
                  <Merge className="h-4 w-4 mr-1" /> Unificar
                </Button>
              </div>
            ))}
          </div>
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

      {/* Tags List */}
      <Card className="p-6">
        <div className="space-y-4">
          {paginatedParentTags.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Nenhuma tag encontrada
            </div>
          ) : (
            paginatedParentTags.map((parent) => (
              <Collapsible
                key={parent.id}
                open={expandedParents.has(parent.id)}
                onOpenChange={() => toggleExpanded(parent.id)}
              >
                <Card className="border-primary/20">
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${
                                expandedParents.has(parent.id) ? "rotate-180" : ""
                              }`}
                            />
                          </Button>
                        </CollapsibleTrigger>
                        <div>
                          <div className="font-semibold text-lg">{parent.tag_name}</div>
                          <div className="text-sm text-muted-foreground">
                            Tipo: {parent.tag_type}
                          </div>
                        </div>
                        <Badge variant={parent.source === "ai" ? "secondary" : "default"}>
                          {parent.source}
                        </Badge>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="flex items-center gap-1">
                                <Badge variant="outline">
                                  {Math.round((parent.confidence || 0) * 100)}% confiança
                                </Badge>
                                <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[300px]">
                              <p className="font-semibold">Grau de Confiança</p>
                              <p className="text-sm">Representa a certeza da IA (0-100%) ao classificar este documento com esta tag.</p>
                              <ul className="text-sm mt-1 list-disc pl-4">
                                <li>90-100%: Altamente relevante</li>
                                <li>70-89%: Relevante</li>
                                <li>50-69%: Parcialmente relevante</li>
                                <li>&lt;50%: Baixa relevância</li>
                              </ul>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openCreateDialog(false, parent.id)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(parent)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteDialog({ open: true, tagId: parent.id })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <CollapsibleContent className="mt-4">
                      {childTagsMap[parent.id]?.length > 0 ? (
                        <div className="ml-12 space-y-2">
                          {childTagsMap[parent.id].map((child) => (
                            <div
                              key={child.id}
                              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <div className="text-sm font-medium">{child.tag_name}</div>
                                <Badge variant="outline" className="text-xs">
                                  {child.tag_type}
                                </Badge>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="flex items-center gap-1">
                                        <Badge variant="outline" className="text-xs">
                                          {Math.round((child.confidence || 0) * 100)}%
                                        </Badge>
                                        <HelpCircle className="h-2.5 w-2.5 text-muted-foreground cursor-help" />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-[300px]">
                                      <p className="font-semibold">Grau de Confiança</p>
                                      <p className="text-sm">Certeza da IA (0-100%) ao classificar com esta tag.</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditDialog(child)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteDialog({ open: true, tagId: child.id })}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="ml-12 text-sm text-muted-foreground">
                          Nenhuma tag filha
                        </div>
                      )}
                    </CollapsibleContent>
                  </div>
                </Card>
              </Collapsible>
            ))
          )}
        </div>

        {/* Pagination Controls */}
        {filteredParentTags.length > 0 && (
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
                {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredParentTags.length)} de {filteredParentTags.length}
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
