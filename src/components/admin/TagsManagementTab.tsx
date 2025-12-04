import { useState, useEffect } from "react";
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
import { Tags, Plus, Edit, Trash2, ChevronDown, Loader2, ChevronLeft, ChevronRight, Download, FileText, FileSpreadsheet, FileJson, FileDown, AlertTriangle, Merge, HelpCircle, Sparkles, Search, ArrowUpDown, ArrowUp, ArrowDown, X, Brain, Zap, Upload, TrendingUp, BarChart3, PieChart, ArrowRightLeft, Target, CheckCircle2 } from "lucide-react";
import { exportData, type ExportFormat } from "@/lib/export-utils";
import { AdminTitleWithInfo } from "./AdminTitleWithInfo";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart as RechartsPie, Pie, Legend } from "recharts";
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
  const [filterChat, setFilterChat] = useState<string>("all");
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortColumn, setSortColumn] = useState<"tag_name" | "confidence" | "target_chat">("tag_name");
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

  // Fetch ML merge rules
  const { data: mergeRules, isLoading: isLoadingRules } = useQuery({
    queryKey: ["tag-merge-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tag_merge_rules")
        .select("*")
        .order("merge_count", { ascending: false });
      if (error) throw error;
      return data as Array<{
        id: string;
        source_tag: string;
        canonical_tag: string;
        chat_type: string;
        created_at: string;
        created_by: string | null;
        merge_count: number;
      }>;
    },
  });

  // Fetch chat routing rules
  const { data: chatRoutingRules } = useQuery({
    queryKey: ["chat-routing-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_routing_rules")
        .select("*")
        .order("correction_count", { ascending: false });
      if (error) throw error;
      return data as Array<{
        id: string;
        document_filename_pattern: string;
        suggested_chat: string;
        corrected_chat: string;
        correction_count: number;
        confidence: number;
        created_at: string;
      }>;
    },
  });

  // Fetch ML routing analytics from document_routing_log
  const { data: routingAnalytics } = useQuery({
    queryKey: ["ml-routing-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_routing_log")
        .select("*")
        .in("action_type", ["ml_accepted", "ml_rejected", "chat_change"])
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      
      // Calculate analytics
      const mlAccepted = data?.filter(d => d.action_type === "ml_accepted").length || 0;
      const mlRejected = data?.filter(d => d.action_type === "ml_rejected").length || 0;
      const totalML = mlAccepted + mlRejected;
      const accuracyRate = totalML > 0 ? (mlAccepted / totalML) * 100 : 0;

      // Group by day for time series
      const byDay = data?.reduce((acc, item) => {
        const date = new Date(item.created_at || '').toISOString().split('T')[0];
        if (!acc[date]) acc[date] = { accepted: 0, rejected: 0 };
        if (item.action_type === "ml_accepted") acc[date].accepted++;
        if (item.action_type === "ml_rejected") acc[date].rejected++;
        return acc;
      }, {} as Record<string, { accepted: number; rejected: number }>) || {};

      const timeSeriesData = Object.entries(byDay)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-14) // Last 14 days
        .map(([date, counts]) => ({
          date: date.slice(5), // MM-DD format
          aceitos: counts.accepted,
          rejeitados: counts.rejected,
          total: counts.accepted + counts.rejected,
          taxa: counts.accepted + counts.rejected > 0 
            ? Math.round((counts.accepted / (counts.accepted + counts.rejected)) * 100) 
            : 0
        }));

      return {
        mlAccepted,
        mlRejected,
        totalML,
        accuracyRate,
        timeSeriesData,
        recentLogs: data?.slice(0, 10) || []
      };
    },
  });

  // Delete chat routing rule mutation
  const deleteChatRoutingRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase
        .from("chat_routing_rules")
        .delete()
        .eq("id", ruleId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Regra de roteamento removida");
      queryClient.invalidateQueries({ queryKey: ["chat-routing-rules"] });
    },
    onError: (error: any) => {
      toast.error(`Erro ao remover regra: ${error.message}`);
    },
  });

  // Delete ML rule mutation
  const deleteRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase
        .from("tag_merge_rules")
        .delete()
        .eq("id", ruleId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Regra de aprendizado removida");
      queryClient.invalidateQueries({ queryKey: ["tag-merge-rules"] });
    },
    onError: (error: any) => {
      toast.error(`Erro ao remover regra: ${error.message}`);
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

  // Filter by source and chat
  const filteredParentTags = parentTags.filter((t) => {
    const sourceMatch = filterSource === "all" || t.source === filterSource;
    const chatMatch = filterChat === "all" || t.target_chat === filterChat;
    return sourceMatch && chatMatch;
  });

  const [filterConfidence, setFilterConfidence] = useState<string>("all");
  const [searchTagName, setSearchTagName] = useState("");

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTagName]);

  // Auto-expand parents with matching children when searching
  useEffect(() => {
    if (searchTagName.trim()) {
      const searchLower = searchTagName.toLowerCase().trim();
      const parentsWithMatchingChildren = new Set<string>();
      
      parentTags.forEach(parent => {
        const children = childTagsMap[parent.id] || [];
        const hasMatchingChild = children.some(child => 
          child.tag_name.toLowerCase().includes(searchLower)
        );
        if (hasMatchingChild) {
          parentsWithMatchingChildren.add(parent.id);
        }
      });
      
      setExpandedParents(prev => {
        const newSet = new Set(prev);
        parentsWithMatchingChildren.forEach(id => newSet.add(id));
        return newSet;
      });
    }
  }, [searchTagName, parentTags, childTagsMap]);

  // Apply confidence filter and search (including child tags)
  const confidenceFilteredTags = filteredParentTags.filter((parentTag) => {
    const searchLower = searchTagName.toLowerCase().trim();
    
    // Check if parent tag matches search
    const parentMatch = !searchTagName.trim() || 
      parentTag.tag_name.toLowerCase().includes(searchLower);
    
    // Check if any child tag matches search
    const childTags = childTagsMap[parentTag.id] || [];
    const childMatch = childTags.some(child => 
      child.tag_name.toLowerCase().includes(searchLower)
    );
    
    // Show parent if it matches OR if any child matches
    if (!searchTagName.trim() || parentMatch || childMatch) {
      // Apply confidence filter
      if (filterConfidence === "all") return true;
      const conf = parentTag.confidence ?? 0;
      switch (filterConfidence) {
        case "high": return conf >= 0.7;
        case "medium": return conf >= 0.5 && conf < 0.7;
        case "low": return conf < 0.5;
        default: return true;
      }
    }
    
    return false;
  });

  // Sort tags
  const sortedParentTags = [...confidenceFilteredTags].sort((a, b) => {
    if (sortColumn === "tag_name") {
      const comparison = a.tag_name.localeCompare(b.tag_name);
      return sortDirection === "asc" ? comparison : -comparison;
    } else if (sortColumn === "confidence") {
      const aConf = a.confidence ?? 0;
      const bConf = b.confidence ?? 0;
      return sortDirection === "asc" ? aConf - bConf : bConf - aConf;
    } else if (sortColumn === "target_chat") {
      const aChat = a.target_chat || "";
      const bChat = b.target_chat || "";
      const comparison = aChat.localeCompare(bChat);
      return sortDirection === "asc" ? comparison : -comparison;
    }
    return 0;
  });

  // Handle sort toggle
  const handleSort = (column: "tag_name" | "confidence" | "target_chat") => {
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

  // Detect similar child tags within the same parent
  const similarChildTagsPerParent: {
    parentId: string;
    parentName: string;
    pairs: { tag1: string; tag2: string; id1: string; id2: string; similarity: number }[];
  }[] = [];

  parentTags.forEach(parent => {
    const children = childTagsMap[parent.id] || [];
    if (children.length < 2) return;
    
    const pairs: { tag1: string; tag2: string; id1: string; id2: string; similarity: number }[] = [];
    
    for (let i = 0; i < children.length; i++) {
      for (let j = i + 1; j < children.length; j++) {
        const similarity = calculateSimilarity(children[i].tag_name, children[j].tag_name);
        // Consider similar if >= 60% match but not exact
        if (similarity >= 0.6 && similarity < 1) {
          pairs.push({
            tag1: children[i].tag_name,
            tag2: children[j].tag_name,
            id1: children[i].id,
            id2: children[j].id,
            similarity,
          });
        }
      }
    }
    
    if (pairs.length > 0) {
      pairs.sort((a, b) => b.similarity - a.similarity);
      similarChildTagsPerParent.push({
        parentId: parent.id,
        parentName: parent.tag_name,
        pairs,
      });
    }
  });

  // Total count of child duplicates
  const totalChildDuplicates = similarChildTagsPerParent.reduce(
    (sum, p) => sum + p.pairs.length, 0
  );

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

  // Merge tags mutation with machine learning rule creation
  const mergeTagsMutation = useMutation({
    mutationFn: async ({ targetTagId, sourceTagIds, sourceTagNames, targetTagName, chatType }: { 
      targetTagId: string; 
      sourceTagIds: string[]; 
      sourceTagNames: string[];
      targetTagName: string;
      chatType: string;
    }) => {
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
      
      // Save machine learning rules for each merged tag
      for (const sourceName of sourceTagNames) {
        if (sourceName.toLowerCase() !== targetTagName.toLowerCase()) {
          await supabase
            .from("tag_merge_rules")
            .upsert({
              source_tag: sourceName,
              canonical_tag: targetTagName,
              chat_type: chatType,
              created_by: "admin"
            }, { onConflict: "source_tag,chat_type" });
        }
      }
    },
    onSuccess: () => {
      toast.success("Tags unificadas! Regra de aprendizado criada - a IA não repetirá este erro.");
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
    
    // Get all tag names for the IDs being merged
    const tagsBeingMerged = allTags?.filter(t => mergeDialog.ids.includes(t.id)) || [];
    const targetTag = tagsBeingMerged[0];
    const sourceTags = tagsBeingMerged.slice(1);
    
    if (!targetTag) {
      toast.error("Tag alvo não encontrada");
      return;
    }
    
    // Determine chat type from the tag's target_chat field
    const chatType = targetTag.target_chat || "health";
    
    mergeTagsMutation.mutate({ 
      targetTagId: targetTag.id, 
      sourceTagIds: sourceTags.map(t => t.id),
      sourceTagNames: sourceTags.map(t => t.tag_name),
      targetTagName: targetTag.tag_name,
      chatType
    });
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

      {/* Consolidated Metrics Dashboard */}
      <Card className="p-6 border-primary/30 bg-gradient-to-r from-primary/5 to-purple-500/5">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Dashboard de Métricas - Sistema de Categorização</h3>
        </div>
        
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-background/50 rounded-lg border">
            <div className="text-3xl font-bold text-primary">{parentTags.length}</div>
            <div className="text-sm text-muted-foreground mt-1">Tags Pai</div>
          </div>
          <div className="text-center p-4 bg-background/50 rounded-lg border">
            <div className="text-3xl font-bold text-purple-400">
              {Object.values(childTagsMap).reduce((sum, arr) => sum + arr.length, 0)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">Tags Filhas</div>
          </div>
          <div className="text-center p-4 bg-background/50 rounded-lg border">
            <div className="text-3xl font-bold text-green-400">{mergeRules?.length || 0}</div>
            <div className="text-sm text-muted-foreground mt-1">Regras ML Tags</div>
          </div>
          <div className="text-center p-4 bg-background/50 rounded-lg border">
            <div className="text-3xl font-bold text-cyan-400">{chatRoutingRules?.length || 0}</div>
            <div className="text-sm text-muted-foreground mt-1">Regras ML Chat</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Tag Distribution by Source */}
          <div className="p-4 bg-background/30 rounded-lg border">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Distribuição por Fonte
            </h4>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={[
                      { name: 'IA', value: parentTags.filter(t => t.source === 'ai').length, fill: 'hsl(262, 83%, 58%)' },
                      { name: 'Admin', value: parentTags.filter(t => t.source === 'admin').length, fill: 'hsl(142, 71%, 45%)' },
                      { name: 'Outros', value: parentTags.filter(t => !['ai', 'admin'].includes(t.source || '')).length, fill: 'hsl(220, 70%, 50%)' },
                    ].filter(d => d.value > 0)}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  />
                  <RechartsTooltip />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tag Distribution by Chat */}
          <div className="p-4 bg-background/30 rounded-lg border">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Distribuição por Chat
            </h4>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={[
                      { name: 'Saúde', value: parentTags.filter(t => t.target_chat === 'health').length, fill: 'hsl(142, 71%, 45%)' },
                      { name: 'Estudo', value: parentTags.filter(t => t.target_chat === 'study').length, fill: 'hsl(262, 83%, 58%)' },
                      { name: 'Não definido', value: parentTags.filter(t => !t.target_chat).length, fill: 'hsl(220, 10%, 50%)' },
                    ].filter(d => d.value > 0)}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  />
                  <RechartsTooltip />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ML Summary Stats */}
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground">
                <Zap className="h-4 w-4 inline mr-1 text-green-400" />
                Total aplicações ML Tags: <strong>{mergeRules?.reduce((sum, r) => sum + (r.merge_count || 0), 0) || 0}</strong>
              </span>
              <span className="text-muted-foreground">
                <ArrowRightLeft className="h-4 w-4 inline mr-1 text-cyan-400" />
                Total correções Chat: <strong>{chatRoutingRules?.reduce((sum, r) => sum + (r.correction_count || 0), 0) || 0}</strong>
              </span>
            </div>
            <span className="text-muted-foreground">
              Duplicatas pendentes: <strong className="text-amber-400">{duplicateParentTags.length + semanticDuplicates.length}</strong>
            </span>
          </div>
        </div>
      </Card>

      {/* ML Accuracy Analytics Dashboard */}
      {routingAnalytics && routingAnalytics.totalML > 0 && (
        <Card className="p-6 border-green-500/30 bg-gradient-to-r from-green-500/5 to-emerald-500/5">
          <div className="flex items-center gap-2 mb-6">
            <Target className="h-5 w-5 text-green-400" />
            <h3 className="font-semibold text-lg">Analytics de Acurácia ML - Roteamento de Chat</h3>
          </div>
          
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-background/50 rounded-lg border">
              <div className="text-3xl font-bold text-green-400">
                {routingAnalytics.accuracyRate.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground mt-1">Taxa de Acerto</div>
            </div>
            <div className="text-center p-4 bg-background/50 rounded-lg border">
              <div className="text-3xl font-bold text-emerald-400">{routingAnalytics.mlAccepted}</div>
              <div className="text-sm text-muted-foreground mt-1">Aceitos</div>
            </div>
            <div className="text-center p-4 bg-background/50 rounded-lg border">
              <div className="text-3xl font-bold text-red-400">{routingAnalytics.mlRejected}</div>
              <div className="text-sm text-muted-foreground mt-1">Rejeitados</div>
            </div>
            <div className="text-center p-4 bg-background/50 rounded-lg border">
              <div className="text-3xl font-bold text-cyan-400">{routingAnalytics.totalML}</div>
              <div className="text-sm text-muted-foreground mt-1">Total Sugestões</div>
            </div>
          </div>

          {/* Time series chart */}
          {routingAnalytics.timeSeriesData.length > 0 && (
            <div className="p-4 bg-background/30 rounded-lg border mb-4">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-400" />
                Evolução da Taxa de Acerto (últimos 14 dias)
              </h4>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={routingAnalytics.timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                      formatter={(value: number, name: string) => [
                        value,
                        name === 'aceitos' ? '✅ Aceitos' : name === 'rejeitados' ? '❌ Rejeitados' : name
                      ]}
                    />
                    <Legend />
                    <Bar dataKey="aceitos" fill="hsl(142, 71%, 45%)" name="✅ Aceitos" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="rejeitados" fill="hsl(0, 84%, 60%)" name="❌ Rejeitados" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Recent ML decisions */}
          {routingAnalytics.recentLogs.length > 0 && (
            <div className="p-4 bg-background/30 rounded-lg border">
              <h4 className="text-sm font-medium mb-3">Últimas Decisões ML</h4>
              <div className="space-y-2 max-h-[150px] overflow-y-auto">
                {routingAnalytics.recentLogs.slice(0, 5).map((log: any, idx: number) => (
                  <div 
                    key={idx} 
                    className={`flex items-center justify-between p-2 rounded text-xs ${
                      log.action_type === 'ml_accepted' 
                        ? 'bg-green-500/10 border border-green-500/30' 
                        : 'bg-red-500/10 border border-red-500/30'
                    }`}
                  >
                    <span className="truncate flex-1">{log.document_name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {log.original_category} → {log.final_category}
                      </Badge>
                      {log.action_type === 'ml_accepted' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                      ) : (
                        <X className="h-4 w-4 text-red-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Chat Routing ML Rules Panel */}
      {chatRoutingRules && chatRoutingRules.length > 0 && (
        <Collapsible>
          <Card className="p-4 border-cyan-500/50 bg-gradient-to-r from-cyan-500/5 to-blue-500/5">
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-cyan-400" />
                <h3 className="font-semibold">Regras de Roteamento de Chat (ML)</h3>
                <Badge variant="outline" className="ml-2 bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                  {chatRoutingRules.length} regra(s)
                </Badge>
                <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/30">
                  <Zap className="h-3 w-3 mr-1" />
                  {chatRoutingRules.reduce((sum, r) => sum + (r.correction_count || 0), 0)} correções
                </Badge>
              </div>
              <ChevronDown className="h-4 w-4 transition-transform" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Regras criadas quando você altera o chat de destino de um documento. O sistema aprende padrões de nomes de arquivo.
              </p>

              {/* Chart for chat routing efficiency */}
              {chatRoutingRules.some(r => (r.correction_count || 0) > 0) && (
                <div className="border border-cyan-500/30 rounded-lg p-4 bg-cyan-500/5">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="h-4 w-4 text-cyan-400" />
                    <h4 className="font-medium text-sm">Top 8 padrões mais corrigidos</h4>
                  </div>
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chatRoutingRules
                          .sort((a, b) => (b.correction_count || 0) - (a.correction_count || 0))
                          .slice(0, 8)
                          .map(r => ({
                            name: `${r.document_filename_pattern.slice(0, 12)}${r.document_filename_pattern.length > 12 ? '...' : ''}`,
                            fullPattern: r.document_filename_pattern,
                            correções: r.correction_count || 0,
                            from: r.suggested_chat,
                            to: r.corrected_chat,
                            confidence: Math.round((r.confidence || 0) * 100)
                          }))}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} width={75} />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}
                          formatter={(value: number, _name: string, props: any) => [
                            <span key="value">
                              <strong>{value}</strong> correções
                              <br />
                              <span className="text-muted-foreground text-xs">
                                "{props.payload.fullPattern}"<br />
                                {props.payload.from} → {props.payload.to} ({props.payload.confidence}% confiança)
                              </span>
                            </span>,
                            ''
                          ]}
                        />
                        <Bar dataKey="correções" fill="hsl(187, 71%, 45%)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Rules List */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {chatRoutingRules.map((rule) => (
                  <div 
                    key={rule.id} 
                    className="flex items-center justify-between p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge variant="secondary" className="text-xs font-mono">
                        "{rule.document_filename_pattern}"
                      </Badge>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs bg-red-500/20 text-red-300 border-red-500/30">
                          {rule.suggested_chat === "health" ? "🏥 Saúde" : "📚 Estudo"}
                        </Badge>
                        <span className="text-cyan-400">→</span>
                        <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-300 border-green-500/30">
                          {rule.corrected_chat === "health" ? "🏥 Saúde" : "📚 Estudo"}
                        </Badge>
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className="text-xs bg-blue-500/20 text-blue-300 border-blue-500/30">
                              {rule.correction_count}x | {Math.round((rule.confidence || 0) * 100)}%
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            {rule.correction_count} correções, {Math.round((rule.confidence || 0) * 100)}% confiança
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                      onClick={() => deleteChatRoutingRuleMutation.mutate(rule.id)}
                      disabled={deleteChatRoutingRuleMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Duplicate Detection - Combined Section */}
      {(duplicateParentTags.length > 0 || semanticDuplicates.length > 0 || similarChildTagsPerParent.length > 0) && (
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

          {/* Similar Child Tags within Same Parent */}
          {similarChildTagsPerParent.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="text-xs bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                  <Tags className="h-3 w-3 mr-1" />
                  Filhas Semelhantes
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Tags filhas similares dentro do mesmo pai ({totalChildDuplicates})
                </span>
              </div>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
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
                      {pairs.map(({ tag1, tag2, id1, id2, similarity }, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-cyan-500/5 border border-cyan-500/20 rounded">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="text-xs">{tag1}</Badge>
                            <span className="text-muted-foreground">≈</span>
                            <Badge variant="secondary" className="text-xs">{tag2}</Badge>
                            <Badge variant="outline" className="text-xs">
                              {Math.round(similarity * 100)}%
                            </Badge>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => openMergeDialog(`${tag1} → ${tag2}`, [id1, id2])}
                          >
                            <Merge className="h-4 w-4 mr-1" /> Mesclar
                          </Button>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Machine Learning Rules Panel */}
      {mergeRules && mergeRules.length > 0 && (
        <Collapsible defaultOpen>
          <Card className="p-4 border-purple-500/50 bg-gradient-to-r from-purple-500/5 to-indigo-500/5">
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-400" />
                <h3 className="font-semibold">Regras de Aprendizado de Máquina</h3>
                <Badge variant="outline" className="ml-2 bg-purple-500/20 text-purple-300 border-purple-500/30">
                  {mergeRules.length} regra(s)
                </Badge>
                <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/30">
                  <Zap className="h-3 w-3 mr-1" />
                  {mergeRules.reduce((sum, r) => sum + (r.merge_count || 0), 0)} aplicações
                </Badge>
              </div>
              <ChevronDown className="h-4 w-4 transition-transform" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Regras criadas automaticamente quando tags são mescladas. A IA usa estas regras para evitar criar variações duplicadas.
                </p>
                <div className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Exportar
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => {
                        const exportableRules = mergeRules.map(r => ({
                          source_tag: r.source_tag,
                          canonical_tag: r.canonical_tag,
                          chat_type: r.chat_type,
                          merge_count: r.merge_count || 0,
                          created_at: r.created_at
                        }));
                        const jsonContent = JSON.stringify(exportableRules, null, 2);
                        const blob = new Blob([jsonContent], { type: 'application/json' });
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `ml-rules-backup-${new Date().toISOString().split('T')[0]}.json`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(url);
                        toast.success("Regras ML exportadas com sucesso!");
                      }}>
                        <FileJson className="h-4 w-4 mr-2" /> JSON (Backup)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        exportData({
                          filename: 'ml-rules',
                          data: mergeRules.map(r => ({
                            'Tag Original': r.source_tag,
                            'Tag Canônica': r.canonical_tag,
                            'Chat': r.chat_type === 'health' ? 'Saúde' : 'Estudo',
                            'Aplicações': r.merge_count || 0,
                            'Criado em': new Date(r.created_at).toLocaleDateString('pt-BR')
                          })),
                          format: 'csv'
                        });
                        toast.success("Regras ML exportadas em CSV!");
                      }}>
                        <FileText className="h-4 w-4 mr-2" /> CSV
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.json';
                      input.onchange = async (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (!file) return;
                        try {
                          const text = await file.text();
                          const rules = JSON.parse(text) as Array<{
                            source_tag: string;
                            canonical_tag: string;
                            chat_type: string;
                            merge_count?: number;
                          }>;
                          let imported = 0;
                          for (const rule of rules) {
                            if (rule.source_tag && rule.canonical_tag && rule.chat_type) {
                              const { error } = await supabase
                                .from("tag_merge_rules")
                                .upsert({
                                  source_tag: rule.source_tag,
                                  canonical_tag: rule.canonical_tag,
                                  chat_type: rule.chat_type,
                                  merge_count: rule.merge_count || 0,
                                  created_by: "import"
                                }, { onConflict: "source_tag,chat_type" });
                              if (!error) imported++;
                            }
                          }
                          queryClient.invalidateQueries({ queryKey: ["tag-merge-rules"] });
                          toast.success(`${imported} regra(s) importada(s) com sucesso!`);
                        } catch (error) {
                          toast.error("Erro ao importar: arquivo JSON inválido");
                        }
                      };
                      input.click();
                    }}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Importar
                  </Button>
                </div>
              </div>

              {/* Efficiency Chart */}
              {mergeRules.some(r => (r.merge_count || 0) > 0) && (
                <div className="border border-purple-500/30 rounded-lg p-4 bg-purple-500/5">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="h-4 w-4 text-purple-400" />
                    <h4 className="font-medium text-sm">Eficiência das Regras (Top 10 mais aplicadas)</h4>
                  </div>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={mergeRules
                          .filter(r => (r.merge_count || 0) > 0)
                          .sort((a, b) => (b.merge_count || 0) - (a.merge_count || 0))
                          .slice(0, 10)
                          .map(r => ({
                            name: `${r.source_tag.slice(0, 15)}${r.source_tag.length > 15 ? '...' : ''}`,
                            fullName: r.source_tag,
                            canonical: r.canonical_tag,
                            aplicações: r.merge_count || 0,
                            chatType: r.chat_type
                          }))}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          stroke="hsl(var(--muted-foreground))" 
                          fontSize={11}
                          width={95}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}
                          formatter={(value: number, _name: string, props: any) => [
                            <span key="value">
                              <strong>{value}</strong> aplicações
                              <br />
                              <span className="text-muted-foreground text-xs">
                                "{props.payload.fullName}" → "{props.payload.canonical}"
                              </span>
                            </span>,
                            ''
                          ]}
                        />
                        <Bar dataKey="aplicações" radius={[0, 4, 4, 0]}>
                          {mergeRules
                            .filter(r => (r.merge_count || 0) > 0)
                            .sort((a, b) => (b.merge_count || 0) - (a.merge_count || 0))
                            .slice(0, 10)
                            .map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.chat_type === 'health' ? 'hsl(142, 71%, 45%)' : 'hsl(262, 83%, 58%)'} 
                              />
                            ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded bg-green-500"></span> Saúde
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded bg-purple-500"></span> Estudo
                    </span>
                  </div>
                </div>
              )}

              {/* Rules List */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {mergeRules.map((rule) => (
                  <div 
                    key={rule.id} 
                    className="flex items-center justify-between p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs bg-red-500/20 text-red-300 border-red-500/30 line-through">
                          {rule.source_tag}
                        </Badge>
                        <span className="text-purple-400">→</span>
                        <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-300 border-green-500/30">
                          {rule.canonical_tag}
                        </Badge>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {rule.chat_type === "health" ? "🏥 Saúde" : "📚 Estudo"}
                      </Badge>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className="text-xs bg-blue-500/20 text-blue-300 border-blue-500/30">
                              <Zap className="h-3 w-3 mr-1" />
                              {rule.merge_count || 0}x aplicada
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            Número de vezes que esta regra foi usada pela IA
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                      onClick={() => deleteRuleMutation.mutate(rule.id)}
                      disabled={deleteRuleMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <Label>Origem:</Label>
            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="ai">IA</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label>Chat:</Label>
            <Select value={filterChat} onValueChange={setFilterChat}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="health">Saúde</SelectItem>
                <SelectItem value="study">Estudo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label>Confiança:</Label>
            <Select value={filterConfidence} onValueChange={setFilterConfidence}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="high">Alta (≥70%)</SelectItem>
                <SelectItem value="medium">Média (50-69%)</SelectItem>
                <SelectItem value="low">Baixa (&lt;50%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome da tag..."
              value={searchTagName}
              onChange={(e) => setSearchTagName(e.target.value)}
              className="h-9"
            />
            {searchTagName && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSearchTagName("")}
                className="h-9 w-9 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
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
                  <TableHead>
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("target_chat")}
                      className="flex items-center gap-1 -ml-4 hover:bg-transparent"
                    >
                      Chat
                      {sortColumn === "target_chat" ? (
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
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-400" />
              Unificar Tags + Aprendizado de Máquina
            </DialogTitle>
            <DialogDescription>
              Você está prestes a unificar todas as ocorrências de "{mergeDialog.tagName}". 
              <br /><br />
              <strong>O que acontecerá:</strong>
              <ul className="list-disc pl-5 mt-2">
                <li>A tag mais antiga será mantida como padrão</li>
                <li>Todas as tags filhas serão movidas para a tag mantida</li>
                <li>As tags duplicadas serão removidas</li>
              </ul>
              <br />
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 mt-2">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-purple-400 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <strong className="text-purple-300">Aprendizado de Máquina:</strong>
                    <p className="text-muted-foreground mt-1">
                      Ao mesclar, uma regra será criada automaticamente para impedir que a IA 
                      gere estas variações no futuro. A IA aprenderá a usar sempre a tag padronizada.
                    </p>
                  </div>
                </div>
              </div>
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
