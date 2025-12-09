import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tags, Plus, Edit, Trash2, ChevronDown, Loader2, ChevronLeft, ChevronRight, Download, FileText, FileSpreadsheet, FileJson, FileDown, AlertTriangle, Merge, HelpCircle, Sparkles, Search, ArrowUpDown, ArrowUp, ArrowDown, X, Brain, Zap, Upload, TrendingUp, BarChart3, PieChart, ArrowRightLeft, Target, FolderOpen, FolderTree, Tag, XCircle, Info, Eye } from "lucide-react";
import { useRef } from "react";
import { exportData, type ExportFormat } from "@/lib/export-utils";
import { AdminTitleWithInfo } from "./AdminTitleWithInfo";
import { TaxonomyFlowDiagram } from "./TaxonomyFlowDiagram";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart as RechartsPie, Pie } from "recharts";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { OrphanedTagsPanel } from "./OrphanedTagsPanel";
import { TagConflictResolutionModal } from "./TagConflictResolutionModal";
import { logTagManagementEvent } from "@/lib/tag-management-logger";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDebounce } from "@/hooks/useDebounce";

// Optimized sub-components
import { VirtualizedTagsTable } from "./tags/VirtualizedTagsTable";
import { DuplicatesPanel } from "./tags/DuplicatesPanel";
import { MetricsDashboard } from "./tags/MetricsDashboard";
import { TagFilters } from "./tags/TagFilters";
import { useTagsData } from "./tags/useTagsData";
import { useSimilarityCalculations } from "./tags/useSimilarityCalculations";
import { TagUnificationSuggestionsModal } from "./tags/TagUnificationSuggestionsModal";
import { SimilarityReviewPanel } from "./tags/SimilarityReviewPanel";

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
  synonyms?: string[] | null;
}

export const TagsManagementTab = () => {
  const [editDialog, setEditDialog] = useState<{ open: boolean; tag: Tag | null; isParent: boolean }>({
    open: false,
    tag: null,
    isParent: true,
  });
  // deleteDialog state removed - now using deleteConfirmModal with justification
  // mergeDialog removed - now using TagConflictResolutionModal with justification reasons
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterChat, setFilterChat] = useState<string>("all");
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
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
  const { settings: adminSettings, updateSettings } = useAdminSettings();
  
  // ML Alert configuration state - MOVED TO MLDashboardTab
  
  // Conflict resolution modal state
  const [conflictModal, setConflictModal] = useState<{
    open: boolean;
    type: 'parent' | 'child' | 'semantic';
    tags: Tag[];
    similarityScore?: number;
  }>({ open: false, type: 'parent', tags: [] });
  
  // Unification suggestions modal state
  const [suggestionsModalOpen, setSuggestionsModalOpen] = useState(false);
  
  // Similarity Review Panel state
  const [similarityReviewOpen, setSimilarityReviewOpen] = useState(false);
  // Import taxonomy state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreviewOpen, setImportPreviewOpen] = useState(false);
  const [importData, setImportData] = useState<{
    parentCount: number;
    childCount: number;
    rulesCount: number;
    rawData: any;
    parents: { name: string; childCount: number }[];
    validationErrors: string[];
    validationWarnings: string[];
    conflicts: { name: string; type: 'parent' | 'child'; existingId: string }[];
  } | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [isImporting, setIsImporting] = useState(false);
  
  // Delete confirmation modal state with 9 Data Science reasons
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    open: boolean;
    ids: string[];
    tagName: string;
    tagType: 'parent' | 'child';
    totalInstances: number; // Total instances of this tag name across all documents
    isLoadingCount: boolean;
    deleteScope: 'single' | 'all'; // NEW: Scope of deletion
    documentId?: string;           // NEW: Document ID for single deletion
    documentFilename?: string;     // NEW: Document filename for UI
    reasons: {
      generic: boolean;        // Stopwords
      outOfDomain: boolean;    // Irrelevância de domínio
      properName: boolean;     // Alta cardinalidade
      isYear: boolean;         // Dados temporais
      isPhrase: boolean;       // Length excessivo
      typo: boolean;           // Erro de grafia
      variation: boolean;      // Plural/Singular/Sinônimo
      isolatedVerb: boolean;   // Verbo isolado
      pii: boolean;            // Dado sensível
    };
  }>({
    open: false,
    ids: [],
    tagName: '',
    tagType: 'parent',
    totalInstances: 0,
    isLoadingCount: false,
    deleteScope: 'all',
    documentId: undefined,
    documentFilename: undefined,
    reasons: {
      generic: false,
      outOfDomain: false,
      properName: false,
      isYear: false,
      isPhrase: false,
      typo: false,
      variation: false,
      isolatedVerb: false,
      pii: false,
    },
  });

  // BULK Delete modal state - for deleting multiple tags at once with shared reasoning
  const [bulkDeleteModal, setBulkDeleteModal] = useState<{
    open: boolean;
    selectedTagIds: string[];
    tagNames: string[];
    totalDocumentsAffected: number;
    isLoadingCount: boolean;
    isDeleting: boolean;
    reasons: {
      generic: boolean;
      outOfDomain: boolean;
      properName: boolean;
      isYear: boolean;
      isPhrase: boolean;
      typo: boolean;
      variation: boolean;
      isolatedVerb: boolean;
      pii: boolean;
    };
  }>({
    open: false,
    selectedTagIds: [],
    tagNames: [],
    totalDocumentsAffected: 0,
    isLoadingCount: false,
    isDeleting: false,
    reasons: {
      generic: false,
      outOfDomain: false,
      properName: false,
      isYear: false,
      isPhrase: false,
      typo: false,
      variation: false,
      isolatedVerb: false,
      pii: false,
    },
  });
  
  // ML Alert state sync - MOVED TO MLDashboardTab

  // Fetch all tags with document target_chat - with staleTime for caching
  const { data: allTags, isLoading } = useQuery({
    queryKey: ["all-tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_tags")
        .select(`
          *,
          documents:document_id (target_chat, filename)
        `)
        .order("tag_name", { ascending: true });

      if (error) throw error;
      
      // Flatten the target_chat and filename from nested documents object
      return (data || []).map((tag: any) => ({
        ...tag,
        target_chat: tag.documents?.target_chat || null,
        document_filename: tag.documents?.filename || null,
      })) as (Tag & { document_filename: string | null })[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes cache
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
  });

  // Fetch ML merge rules - with staleTime
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
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Fetch chat routing rules - with staleTime
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
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
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

  // ML Alert functions - MOVED TO MLDashboardTab

  // Open delete confirmation modal - fetches count of all instances
  const openDeleteConfirmModal = async (ids: string[], tagName: string, documentId?: string) => {
    // Determine if it's a parent or child tag
    const tag = allTags?.find(t => ids.includes(t.id));
    const tagType: 'parent' | 'child' = tag?.parent_tag_id ? 'child' : 'parent';
    
    // Open modal immediately with loading state
    setDeleteConfirmModal({
      open: true,
      ids,
      tagName,
      tagType,
      totalInstances: 0,
      isLoadingCount: true,
      deleteScope: 'all', // Default to delete all
      documentId,
      documentFilename: undefined,
      reasons: {
        generic: false,
        outOfDomain: false,
        properName: false,
        isYear: false,
        isPhrase: false,
        typo: false,
        variation: false,
        isolatedVerb: false,
        pii: false,
      },
    });
    
    // Fetch total count of tags with this name and document filename in parallel
    const [countResult, docResult] = await Promise.all([
      supabase
        .from('document_tags')
        .select('*', { count: 'exact', head: true })
        .eq('tag_name', tagName),
      documentId 
        ? supabase.from('documents').select('filename').eq('id', documentId).single()
        : Promise.resolve({ data: null, error: null }),
    ]);
      
    setDeleteConfirmModal(prev => ({
      ...prev,
      totalInstances: countResult.count || ids.length,
      documentFilename: docResult.data?.filename,
      isLoadingCount: false,
    }));
  };

  // Confirm delete tags - respects scope (single or all)
  const confirmDeleteTags = async () => {
    const { tagName, tagType, totalInstances, reasons, deleteScope, ids, documentFilename } = deleteConfirmModal;
    
    try {
      // Build readable reasons list
      const reasonLabels: string[] = [];
      if (reasons.generic) reasonLabels.push('Termo genérico (Stopwords)');
      if (reasons.outOfDomain) reasonLabels.push('Irrelevância de domínio');
      if (reasons.properName) reasonLabels.push('Nome próprio (High Cardinality)');
      if (reasons.isYear) reasonLabels.push('Dado temporal (Ano)');
      if (reasons.isPhrase) reasonLabels.push('Frase (Length excessivo)');
      if (reasons.typo) reasonLabels.push('Erro de grafia');
      if (reasons.variation) reasonLabels.push('Variação (Plural/Sinônimo)');
      if (reasons.isolatedVerb) reasonLabels.push('Verbo isolado');
      if (reasons.pii) reasonLabels.push('Dado sensível (PII)');
      
      if (deleteScope === 'single') {
        // Delete only the specific instance by ID
        const { error } = await supabase
          .from('document_tags')
          .delete()
          .in('id', ids);
          
        if (error) throw error;
        
        await logTagManagementEvent({
          input_state: { 
            tags_involved: [{ id: ids[0], name: tagName, type: tagType }],
          },
          action_type: 'delete_orphan',
          user_decision: { 
            action: 'delete_single_instance', 
            source_tags_removed: [tagName],
            deletion_reasons: reasons,
          },
          rationale: `Exclusão de instância única de "${tagName}" do documento "${documentFilename || 'unknown'}". Motivos: ${reasonLabels.join(', ')}`,
        });
        
        toast.success(`Tag "${tagName}" removida deste documento`);
      } else {
        // Delete ALL instances (existing behavior)
        
        // Check if this is a semantic duplicate (composite name with " / ")
        const isSemanticDuplicate = tagName.includes(' / ');
        const tagNamesToDelete = isSemanticDuplicate 
          ? tagName.split(' / ').map(n => n.trim())
          : [tagName];
        
        // For each tag name to delete
        for (const nameToDelete of tagNamesToDelete) {
          // If deleting a parent tag, first orphan all child tags that reference it
          if (tagType === 'parent') {
            const { data: parentTagsToDelete } = await supabase
              .from('document_tags')
              .select('id')
              .eq('tag_name', nameToDelete)
              .eq('tag_type', 'parent');
              
            if (parentTagsToDelete && parentTagsToDelete.length > 0) {
              const parentIds = parentTagsToDelete.map(p => p.id);
              
              // Move child tags to Orphaned Zone
              const { error: orphanError } = await supabase
                .from('document_tags')
                .update({ parent_tag_id: null })
                .in('parent_tag_id', parentIds);
                
              if (orphanError) {
                console.warn('Warning: Could not orphan child tags:', orphanError);
              }
            }
          }
          
          // Delete ALL instances of this tag by name
          const { error } = await supabase
            .from('document_tags')
            .delete()
            .eq('tag_name', nameToDelete);
            
          if (error) throw error;
        }
        
        await logTagManagementEvent({
          input_state: { 
            tags_involved: [{ id: 'all', name: tagName, type: tagType }],
          },
          action_type: 'delete_orphan',
          user_decision: { 
            action: `delete_all_instances_${totalInstances}`, 
            source_tags_removed: [tagName],
            deletion_reasons: reasons,
          },
          rationale: `Exclusão de TODAS as ${totalInstances} instância(s) de "${tagName}". Motivos: ${reasonLabels.join(', ')}`,
        });
        
        toast.success(`Tag "${tagName}" removida de ${totalInstances} documento(s)`);
      }
      
      queryClient.invalidateQueries({ queryKey: ['all-tags'] });
      queryClient.invalidateQueries({ queryKey: ['chat-config'] });
      
      // Close modal and reset state
      setDeleteConfirmModal({
        open: false,
        ids: [],
        tagName: '',
        tagType: 'parent',
        totalInstances: 0,
        isLoadingCount: false,
        deleteScope: 'all',
        documentId: undefined,
        documentFilename: undefined,
        reasons: {
          generic: false,
          outOfDomain: false,
          properName: false,
          isYear: false,
          isPhrase: false,
          typo: false,
          variation: false,
          isolatedVerb: false,
          pii: false,
        },
      });
    } catch (error: any) {
      toast.error(`Erro ao excluir tags: ${error.message}`);
    }
  };

  // BULK DELETE: Open modal with selected tags
  const openBulkDeleteModal = async () => {
    const selectedTagData = allTags?.filter(t => selectedTags.has(t.id)) || [];
    const uniqueTagNames = [...new Set(selectedTagData.map(t => t.tag_name))];
    const selectedIds = Array.from(selectedTags);
    
    // Open modal immediately with loading state
    setBulkDeleteModal({
      open: true,
      selectedTagIds: selectedIds,
      tagNames: uniqueTagNames,
      totalDocumentsAffected: 0,
      isLoadingCount: true,
      isDeleting: false,
      reasons: {
        generic: false,
        outOfDomain: false,
        properName: false,
        isYear: false,
        isPhrase: false,
        typo: false,
        variation: false,
        isolatedVerb: false,
        pii: false,
      },
    });
    
    // Calculate total affected documents
    let totalAffected = 0;
    for (const tagName of uniqueTagNames) {
      const { count } = await supabase
        .from('document_tags')
        .select('*', { count: 'exact', head: true })
        .eq('tag_name', tagName);
      totalAffected += count || 0;
    }
    
    setBulkDeleteModal(prev => ({
      ...prev,
      totalDocumentsAffected: totalAffected,
      isLoadingCount: false,
    }));
  };

  // BULK DELETE: Execute batch deletion with shared reasoning
  const confirmBulkDelete = async () => {
    const { tagNames, reasons, totalDocumentsAffected } = bulkDeleteModal;
    
    // Build reason labels for audit
    const reasonLabels: string[] = [];
    if (reasons.generic) reasonLabels.push('Termo genérico (Stopwords)');
    if (reasons.outOfDomain) reasonLabels.push('Irrelevância de domínio');
    if (reasons.properName) reasonLabels.push('Nome próprio (High Cardinality)');
    if (reasons.isYear) reasonLabels.push('Dado temporal (Ano)');
    if (reasons.isPhrase) reasonLabels.push('Frase (Length excessivo)');
    if (reasons.typo) reasonLabels.push('Erro de grafia');
    if (reasons.variation) reasonLabels.push('Variação (Plural/Sinônimo)');
    if (reasons.isolatedVerb) reasonLabels.push('Verbo isolado');
    if (reasons.pii) reasonLabels.push('Dado sensível (PII)');
    
    setBulkDeleteModal(prev => ({ ...prev, isDeleting: true }));
    
    try {
      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];
      
      // Process each unique tag name
      for (const tagName of tagNames) {
        try {
          // First, find all parent tags with this name to orphan their children
          const { data: parentTagsToDelete } = await supabase
            .from('document_tags')
            .select('id')
            .eq('tag_name', tagName)
            .eq('tag_type', 'parent');
            
          if (parentTagsToDelete && parentTagsToDelete.length > 0) {
            const parentIds = parentTagsToDelete.map(p => p.id);
            
            // Move child tags to Orphaned Zone
            const { error: orphanError } = await supabase
              .from('document_tags')
              .update({ parent_tag_id: null })
              .in('parent_tag_id', parentIds);
              
            if (orphanError) {
              console.warn('[BULK DELETE] Warning: Could not orphan child tags:', orphanError);
            }
          }
          
          // Delete ALL instances of this tag by name
          const { error } = await supabase
            .from('document_tags')
            .delete()
            .eq('tag_name', tagName);
            
          if (error) throw error;
          
          successCount++;
        } catch (error: any) {
          console.error(`[BULK DELETE ERROR] Failed for ${tagName}:`, error);
          errors.push(`${tagName}: ${error.message}`);
          failedCount++;
          // Continue processing others - don't stop on error
        }
      }
      
      // Log the bulk action
      await logTagManagementEvent({
        input_state: {
          tags_involved: tagNames.map(name => ({ 
            id: 'bulk', 
            name, 
            type: 'parent' as const
          })),
        },
        action_type: 'bulk_delete_orphans',
        user_decision: {
          deleted_count: successCount,
          failed_count: failedCount,
          documents_updated: totalDocumentsAffected,
          deletion_reasons: reasons,
        },
        rationale: `Exclusão em massa de ${successCount} tags (${totalDocumentsAffected} documentos). Motivos: ${reasonLabels.join(', ')}${failedCount > 0 ? `. Falhou: ${failedCount}` : ''}`,
      });
      
      // Show appropriate toast
      if (failedCount === 0) {
        toast.success(`${successCount} tags excluídas com sucesso de ${totalDocumentsAffected} documentos. Motivo: ${reasonLabels.join(', ')}`);
      } else {
        toast.warning(`${successCount} tags excluídas, ${failedCount} falharam. Verifique o console para detalhes.`);
      }
      
      // Clear selection and refresh
      setSelectedTags(new Set());
      queryClient.invalidateQueries({ queryKey: ['all-tags'] });
      queryClient.invalidateQueries({ queryKey: ['chat-config'] });
      
      // Close modal and reset state
      setBulkDeleteModal({
        open: false,
        selectedTagIds: [],
        tagNames: [],
        totalDocumentsAffected: 0,
        isLoadingCount: false,
        isDeleting: false,
        reasons: {
          generic: false,
          outOfDomain: false,
          properName: false,
          isYear: false,
          isPhrase: false,
          typo: false,
          variation: false,
          isolatedVerb: false,
          pii: false,
        },
      });
      
    } catch (error: any) {
      console.error("[BULK DELETE ERROR]", error);
      toast.error(`Erro ao excluir tags: ${error.message}`);
      setBulkDeleteModal(prev => ({ ...prev, isDeleting: false }));
    }
  };

  const [filterConfidence, setFilterConfidence] = useState<string>("all");
  const [searchInput, setSearchInput] = useState("");
  
  // Debounce search input by 300ms for performance
  const debouncedSearchTagName = useDebounce(searchInput, 300);
  const isSearching = searchInput !== debouncedSearchTagName;

  // Use memoized hook for all tag calculations - using debounced search
  const {
    parentTags,
    childTagsMap,
    sortedParentTags,
    paginatedParentTags,
    totalPages,
    childTagsCount,
    documentCountByTagName,
  } = useTagsData({
    allTags,
    filterSource,
    filterChat,
    filterConfidence,
    searchTagName: debouncedSearchTagName,
    sortColumn,
    sortDirection,
    currentPage,
    itemsPerPage,
  });

  // Use memoized similarity calculations from hook
  const { 
    duplicateParentTags, 
    semanticDuplicates, 
    similarChildTagsPerParent, 
    totalChildDuplicates,
    orphanedTags 
  } = useSimilarityCalculations(allTags, parentTags, childTagsMap);

  // Reset page when debounced search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTagName]);

  // Auto-expand parents with matching children when searching (using debounced value)
  useEffect(() => {
    if (debouncedSearchTagName.trim()) {
      const searchLower = debouncedSearchTagName.toLowerCase().trim();
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
  }, [debouncedSearchTagName, parentTags, childTagsMap]);

  // Handle sort toggle - memoized
  const handleSort = useCallback((column: "tag_name" | "confidence" | "target_chat") => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  }, [sortColumn]);

  // Toggle expanded - memoized
  const toggleExpanded = useCallback((parentId: string) => {
    setExpandedParents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(parentId)) {
        newSet.delete(parentId);
      } else {
        newSet.add(parentId);
      }
      return newSet;
    });
  }, []);

  // Toggle select single tag - memoized
  const toggleSelectTag = useCallback((tagId: string) => {
    setSelectedTags(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tagId)) {
        newSet.delete(tagId);
      } else {
        newSet.add(tagId);
      }
      return newSet;
    });
  }, []);

  // Select/Deselect all tags - memoized
  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      const allIds: string[] = [];
      sortedParentTags.forEach(parent => {
        allIds.push(parent.id);
        (childTagsMap[parent.id] || []).forEach(child => allIds.push(child.id));
      });
      setSelectedTags(new Set(allIds));
    } else {
      setSelectedTags(new Set());
    }
  }, [sortedParentTags, childTagsMap]);

  const startIndex = (currentPage - 1) * itemsPerPage;

  // Export taxonomy with multiple formats
  const handleExportTaxonomy = async (format: ExportFormat) => {
    // Prepare tabular data for CSV, Excel, PDF
    const taxonomyData = parentTags.flatMap(parent => {
      const children = childTagsMap[parent.id] || [];
      if (children.length === 0) {
        return [{
          parent_name: parent.tag_name,
          child_name: '-',
          parent_synonyms: (parent.synonyms || []).join(', ') || '-',
          child_synonyms: '-',
        }];
      }
      return children.map(child => ({
        parent_name: parent.tag_name,
        child_name: child.tag_name,
        parent_synonyms: (parent.synonyms || []).join(', ') || '-',
        child_synonyms: (child.synonyms || []).join(', ') || '-',
      }));
    });

    const taxonomyColumns = [
      { key: 'parent_name', label: 'Tag Pai' },
      { key: 'child_name', label: 'Tag Filha' },
      { key: 'parent_synonyms', label: 'Sinônimos (Pai)' },
      { key: 'child_synonyms', label: 'Sinônimos (Filha)' },
    ];

    if (format === 'json') {
      // JSON: hierarchical structure for reimport
      const taxonomy = {
        version: "1.0",
        exported_at: new Date().toISOString(),
        taxonomy: parentTags.map(parent => ({
          id: parent.id,
          name: parent.tag_name,
          type: "parent",
          synonyms: parent.synonyms || [],
          children: (childTagsMap[parent.id] || []).map(child => ({
            id: child.id,
            name: child.tag_name,
            synonyms: child.synonyms || []
          }))
        })),
        merge_rules: mergeRules || [],
        orphaned_children: orphanedTags.map(t => ({ id: t.id, name: t.tag_name }))
      };
      
      const blob = new Blob([JSON.stringify(taxonomy, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `taxonomy-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } else {
      // CSV, Excel, PDF: tabular format
      await exportData({
        filename: 'taxonomy',
        data: taxonomyData,
        format,
        columns: taxonomyColumns,
      });
    }
    
    await logTagManagementEvent({
      input_state: { tags_involved: [] },
      action_type: 'export_taxonomy',
      user_decision: { exported_count: parentTags.length, format }
    });
    
    toast.success(`Taxonomia exportada em ${format.toUpperCase()}!`);
  };

  // Open conflict resolution modal
  const openConflictModal = useCallback((type: 'parent' | 'child' | 'semantic', tagIds: string[], similarity?: number) => {
    // Validação: verificar se allTags está carregado
    if (!allTags || allTags.length === 0) {
      toast.error("Aguarde o carregamento das tags antes de unificar");
      return;
    }
    
    const tagsForModal = allTags.filter(t => tagIds.includes(t.id));
    
    // Validação: verificar se as tags foram encontradas
    if (tagsForModal.length === 0) {
      toast.error("Não foi possível encontrar as tags selecionadas");
      console.error("[TAG MERGE DEBUG] Tags não encontradas:", { 
        tagIds, 
        allTagsCount: allTags.length,
        allTagIds: allTags.slice(0, 10).map(t => t.id)
      });
      return;
    }
    
    setConflictModal({ open: true, type, tags: tagsForModal, similarityScore: similarity });
  }, [allTags]);

  // Reject duplicate (log decision without merging)
  const handleRejectDuplicate = useCallback(async (ids: string[], tagName: string, type: 'parent' | 'semantic' | 'child') => {
    await logTagManagementEvent({
      input_state: {
        tags_involved: ids.map(id => ({ id, name: tagName, type: type === 'parent' ? 'parent' as const : 'child' as const })),
        detection_type: type === 'parent' ? 'exact' : type === 'semantic' ? 'semantic' : 'child_similarity'
      },
      action_type: 'reject_duplicate',
      user_decision: { 
        action: 'reject_duplicate',
        source_tags_removed: [] // No tags removed when rejecting
      },
      rationale: `Duplicata rejeitada diretamente da lista: ${tagName} (tipo: ${type})`,
    });
    toast.info("Duplicata rejeitada. Decisão registrada para ML.");
  }, []);

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

  // Delete tag mutation (used by confirmDeleteTags via direct supabase call)
  // Keeping for potential future use but removing dialog reference
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
    },
    onError: (error: any) => {
      toast.error(`Erro ao deletar tag: ${error.message}`);
    },
  });

  // Merge tags mutation with machine learning rule creation
  const mergeTagsMutation = useMutation({
    mutationFn: async ({ targetTagId, sourceTagIds, sourceTagNames, targetTagName, chatType, documentsAffected }: { 
      targetTagId: string; 
      sourceTagIds: string[]; 
      sourceTagNames: string[];
      targetTagName: string;
      chatType: string;
      documentsAffected?: Array<{ document_id: string; document_filename: string }>;
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
      
      // Log tag modifications for each affected document
      if (documentsAffected && documentsAffected.length > 0) {
        for (const doc of documentsAffected) {
          for (const sourceName of sourceTagNames) {
            if (sourceName.toLowerCase() !== targetTagName.toLowerCase()) {
              await supabase
                .from("tag_modification_logs")
                .insert({
                  document_id: doc.document_id,
                  document_filename: doc.document_filename,
                  original_tag_name: sourceName,
                  new_tag_name: targetTagName,
                  modification_type: "merge",
                  chat_type: chatType,
                  created_by: "admin"
                });
            }
          }
        }
      }
    },
    onSuccess: () => {
      toast.success("Tags unificadas! Regra de aprendizado criada - a IA não repetirá este erro.");
      queryClient.invalidateQueries({ queryKey: ["all-tags"] });
      queryClient.invalidateQueries({ queryKey: ["tag-modification-logs"] });
      queryClient.invalidateQueries({ queryKey: ["tag-modification-logs-for-indicators"] });
      // merge dialog state removed - modal closes automatically via TagConflictResolutionModal
    },
    onError: (error: any) => {
      toast.error(`Erro ao unificar tags: ${error.message}`);
    },
  });

  // openMergeDialog and handleMerge removed - now using TagConflictResolutionModal with 7 justification reasons

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

  // Schema validation function
  const validateTaxonomySchema = (data: any): { isValid: boolean; errors: string[]; warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Required fields
    if (!data.version) errors.push("Campo 'version' ausente");
    if (!data.taxonomy) errors.push("Campo 'taxonomy' ausente");
    if (data.taxonomy && !Array.isArray(data.taxonomy)) errors.push("'taxonomy' deve ser um array");
    
    // Validate each parent
    data.taxonomy?.forEach((parent: any, i: number) => {
      if (!parent.name) errors.push(`Parent ${i+1}: campo 'name' ausente`);
      if (parent.children && !Array.isArray(parent.children)) {
        errors.push(`Parent '${parent.name}': 'children' deve ser um array`);
      }
      // Validate children
      parent.children?.forEach((child: any, j: number) => {
        if (!child.name) errors.push(`Parent '${parent.name}' -> Child ${j+1}: campo 'name' ausente`);
      });
    });
    
    // Validate merge rules if present
    if (data.merge_rules && !Array.isArray(data.merge_rules)) {
      warnings.push("'merge_rules' deve ser um array");
    }
    data.merge_rules?.forEach((rule: any, i: number) => {
      if (!rule.source_tag) warnings.push(`Regra ML ${i+1}: 'source_tag' ausente`);
      if (!rule.canonical_tag) warnings.push(`Regra ML ${i+1}: 'canonical_tag' ausente`);
    });
    
    return { isValid: errors.length === 0, errors, warnings };
  };

  // Handle import taxonomy file selection
  const handleImportTaxonomy = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target?.result as string);
        
        // Validate schema
        const validation = validateTaxonomySchema(jsonData);
        
        if (!validation.isValid) {
          toast.error(`Arquivo JSON inválido: ${validation.errors[0]}`);
        }

        // Count items
        const parentCount = jsonData.taxonomy?.length || 0;
        const childCount = jsonData.taxonomy?.reduce((sum: number, parent: any) => 
          sum + (parent.children?.length || 0), 0) || 0;
        const rulesCount = jsonData.merge_rules?.length || 0;
        
        // Build parents list for preview
        const parents = (jsonData.taxonomy || []).map((p: any) => ({
          name: p.name || 'Sem nome',
          childCount: p.children?.length || 0
        }));
        
        // Detect conflicts with existing tags
        const conflicts: { name: string; type: 'parent' | 'child'; existingId: string }[] = [];
        (jsonData.taxonomy || []).forEach((parent: any) => {
          const existingParent = parentTags.find(t => t.tag_name.toLowerCase() === parent.name?.toLowerCase());
          if (existingParent) {
            conflicts.push({ name: parent.name, type: 'parent', existingId: existingParent.id });
          }
          (parent.children || []).forEach((child: any) => {
            const existingChild = allTags?.find(t => 
              t.tag_name.toLowerCase() === child.name?.toLowerCase() && t.parent_tag_id
            );
            if (existingChild) {
              conflicts.push({ name: child.name, type: 'child', existingId: existingChild.id });
            }
          });
        });

        setImportData({
          parentCount,
          childCount,
          rulesCount,
          rawData: jsonData,
          parents,
          validationErrors: validation.errors,
          validationWarnings: validation.warnings,
          conflicts
        });
        setImportPreviewOpen(true);
      } catch (err) {
        toast.error("Erro ao ler arquivo JSON - formato inválido");
      }
    };
    reader.readAsText(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Execute import
  const executeImport = async () => {
    if (!importData?.rawData) return;
    
    setIsImporting(true);
    try {
      const { taxonomy, merge_rules } = importData.rawData;
      
      // If replace mode, delete existing tags first
      if (importMode === 'replace') {
        const { error: deleteError } = await supabase
          .from("document_tags")
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all
        
        if (deleteError) throw deleteError;
      }

      // Get a valid document_id for the tags
      const { data: docs } = await supabase
        .from("documents")
        .select("id")
        .limit(1);
      
      const defaultDocId = docs?.[0]?.id;
      if (!defaultDocId) {
        toast.error("Nenhum documento encontrado para vincular tags");
        return;
      }

      // Import parent tags
      for (const parent of taxonomy || []) {
        const { data: parentData, error: parentError } = await supabase
          .from("document_tags")
          .upsert({
            tag_name: parent.name,
            tag_type: 'parent',
            source: 'import',
            confidence: parent.confidence || 0.85,
            document_id: defaultDocId,
            synonyms: parent.synonyms || []
          }, { onConflict: 'tag_name,document_id' })
          .select()
          .single();

        if (parentError && !parentError.message.includes('duplicate')) {
          console.error("Error importing parent:", parentError);
          continue;
        }

        // Import children for this parent
        const parentId = parentData?.id;
        if (parentId && parent.children) {
          for (const child of parent.children) {
            await supabase
              .from("document_tags")
              .upsert({
                tag_name: child.name,
                tag_type: 'child',
                source: 'import',
                confidence: child.confidence || 0.80,
                document_id: defaultDocId,
                parent_tag_id: parentId,
                synonyms: child.synonyms || []
              }, { onConflict: 'tag_name,document_id' });
          }
        }
      }

      // Import merge rules
      for (const rule of merge_rules || []) {
        await supabase
          .from("tag_merge_rules")
          .upsert({
            source_tag: rule.source_tag,
            canonical_tag: rule.canonical_tag,
            chat_type: rule.chat_type || 'health',
            merge_count: rule.merge_count || 1
          }, { onConflict: 'source_tag,canonical_tag,chat_type' });
      }

      toast.success(`Taxonomia importada: ${importData.parentCount} parents, ${importData.childCount} children`);
      queryClient.invalidateQueries({ queryKey: ["all-tags"] });
      queryClient.invalidateQueries({ queryKey: ["tag-merge-rules"] });
      setImportPreviewOpen(false);
      setImportData(null);
    } catch (error: any) {
      toast.error(`Erro na importação: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Banner informativo - ML movido para Auditoria */}
      <div className="p-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 rounded-lg flex items-center gap-3">
        <Brain className="h-5 w-5 text-indigo-400 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">
            <strong className="text-indigo-300">Métricas de Machine Learning</strong> foram movidas para{" "}
            <strong className="text-indigo-300">Auditoria → Machine Learning ML</strong> para melhor organização e governança.
          </p>
        </div>
        <Badge variant="outline" className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 flex-shrink-0">
          <ArrowRightLeft className="h-3 w-3 mr-1" />
          Realocado
        </Badge>
      </div>

      {/* Título */}
      <AdminTitleWithInfo
        title="Gerenciamento de Tags"
        level="h2"
        icon={Tags}
        tooltipText="Sistema de categorização hierárquica"
        infoContent={
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            {/* Introdução */}
            <div>
              <h5 className="font-bold text-primary mb-2">Sistema de Gerenciamento de Tags</h5>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Controle centralizado da taxonomia hierárquica (Parent/Child) usada para 
                categorizar documentos no sistema RAG e definir escopos de busca.
              </p>
            </div>

            {/* Estrutura Hierárquica */}
            <div className="bg-muted/30 rounded-lg p-3">
              <h5 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <FolderTree className="h-4 w-4 text-primary" />
                Estrutura Hierárquica
              </h5>
              <div className="text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <Tags className="h-3.5 w-3.5 text-purple-400 mt-0.5 flex-shrink-0" />
                  <span><strong>Tags Parent (Pai)</strong> - Categorias principais (ex: Saúde, Tecnologia)</span>
                </div>
                <div className="flex items-start gap-2 ml-4">
                  <Tag className="h-3.5 w-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <span><strong>Tags Child (Filha)</strong> - Subcategorias vinculadas a um pai (ex: Cardiologia, IA)</span>
                </div>
                <div className="flex items-start gap-2 ml-4">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                  <span><strong>Tags Órfãs</strong> - Filhas sem pai atribuído (requerem adoção ou exclusão)</span>
                </div>
              </div>
            </div>

            {/* Sistema de Detecção de Duplicatas */}
            <div>
              <h5 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Search className="h-4 w-4 text-primary" />
                Detecção Semântica de Duplicatas
              </h5>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-primary/10">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-semibold">Tipo</th>
                      <th className="px-2 py-1.5 text-left font-semibold">Threshold</th>
                      <th className="px-2 py-1.5 text-left font-semibold">Exemplo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr>
                      <td className="px-2 py-1.5 font-medium text-primary">Exato</td>
                      <td className="px-2 py-1.5">100%</td>
                      <td className="px-2 py-1.5">"Saúde" = "Saúde"</td>
                    </tr>
                    <tr className="bg-muted/20">
                      <td className="px-2 py-1.5 font-medium text-primary">Semântico Parent</td>
                      <td className="px-2 py-1.5">70%+</td>
                      <td className="px-2 py-1.5">"Financeiro" ~ "Finanças"</td>
                    </tr>
                    <tr>
                      <td className="px-2 py-1.5 font-medium text-primary">Semântico Child</td>
                      <td className="px-2 py-1.5">60%+</td>
                      <td className="px-2 py-1.5">"Cardiologia" ~ "Cardio"</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Fluxos de Merge */}
            <div className="bg-muted/30 rounded-lg p-3">
              <h5 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Merge className="h-4 w-4 text-primary" />
                Fluxos de Unificação (Merge)
              </h5>
              <div className="text-xs space-y-3">
                <div className="bg-card/50 rounded p-2">
                  <div className="font-semibold text-cyan-400 mb-1">Merge de Tags Child</div>
                  <p className="text-muted-foreground">Unifica filhas e força seleção do Parent destino</p>
                </div>
                <div className="bg-card/50 rounded p-2">
                  <div className="font-semibold text-purple-400 mb-1">Merge de Tags Parent</div>
                  <p className="text-muted-foreground">Coherence Check: escolhe quais filhos migram ou viram órfãs</p>
                </div>
              </div>
            </div>

            {/* ML Learning Loop with Diagram */}
            <div>
              <h5 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                Fluxo de Taxonomia com ML
              </h5>
              <TaxonomyFlowDiagram />
              <p className="text-xs text-muted-foreground mt-2">
                Cada decisão de merge/reject é logada em <code className="bg-primary/20 px-1 rounded">tag_management_events</code> para treinar futuros modelos de detecção de duplicatas.
              </p>
            </div>

            {/* Import/Export */}
            <div className="bg-muted/30 rounded-lg p-3">
              <h5 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-primary" />
                Importar / Exportar Taxonomia
              </h5>
              <div className="text-xs space-y-2 text-muted-foreground">
                <div className="flex items-start gap-2">
                  <Download className="h-3.5 w-3.5 text-green-400 mt-0.5 flex-shrink-0" />
                  <span><strong>Exportar</strong> - Baixa JSON completo com hierarquia, sinônimos e regras ML</span>
                </div>
                <div className="flex items-start gap-2">
                  <Upload className="h-3.5 w-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <span><strong>Importar</strong> - Carrega JSON, valida schema, oferece preview antes de aplicar</span>
                </div>
              </div>
            </div>
          </div>
        }
      />

      {/* Botões de Ação */}
      <div className="flex justify-between items-start">
        {/* Lado Esquerdo - Grid 2x2 */}
        <div className="grid grid-cols-2 gap-2">
          {/* Linha 1: Taxonomia */}
          <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Importar Taxonomia
          </Button>
          <input 
            type="file" 
            ref={fileInputRef} 
            accept=".json" 
            className="hidden" 
            onChange={handleImportTaxonomy} 
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Download className="h-4 w-4 mr-2" />
                Exportar Taxonomia
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-popover border">
              <DropdownMenuItem onClick={() => handleExportTaxonomy('json')}>
                <FileJson className="h-4 w-4 mr-2" /> JSON (Estrutura Completa)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportTaxonomy('xlsx')}>
                <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportTaxonomy('csv')}>
                <FileText className="h-4 w-4 mr-2" /> CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportTaxonomy('pdf')}>
                <FileDown className="h-4 w-4 mr-2" /> PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Linha 2: Tags individuais */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Upload className="h-4 w-4 mr-2" />
                Importar Tag
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-popover border">
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <FileJson className="h-4 w-4 mr-2" /> JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <FileSpreadsheet className="h-4 w-4 mr-2" /> CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Download className="h-4 w-4 mr-2" />
                Exportar Tag
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-popover border">
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
        </div>
        
        {/* Lado Direito - Botões de ação */}
        <div className="flex flex-col gap-2 justify-end" style={{ height: 'calc(2 * 32px + 8px)' }}>
          <Button 
            variant="outline" 
            onClick={() => setSuggestionsModalOpen(true)} 
            className="gap-2 border-purple-500/50 hover:bg-purple-500/10"
            disabled={isLoading}
          >
            <Sparkles className="h-4 w-4 text-purple-400" />
            Sugerir Unificações
          </Button>
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

      {/* ML sections moved to MLDashboardTab (Auditoria) */}


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

      {/* Orphaned Tags Panel */}
      <OrphanedTagsPanel 
        orphanedTags={orphanedTags} 
        parentTags={parentTags.map(p => ({ id: p.id, tag_name: p.tag_name }))} 
      />

      {/* Duplicate Detection Panel */}
      <DuplicatesPanel
        duplicateParentTags={duplicateParentTags}
        semanticDuplicates={semanticDuplicates}
        similarChildTagsPerParent={similarChildTagsPerParent}
        onOpenConflictModal={openConflictModal}
        onDelete={openDeleteConfirmModal}
        onRejectDuplicate={handleRejectDuplicate}
      />

      {/* Bulk Similarity Review Button */}
      {semanticDuplicates.length > 0 && !similarityReviewOpen && (
        <Card className="p-4 border-purple-500/30 bg-gradient-to-r from-purple-500/5 to-indigo-500/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-purple-400" />
              <div>
                <h3 className="font-semibold text-sm">Revisão em Massa de Similaridades</h3>
                <p className="text-xs text-muted-foreground">
                  {semanticDuplicates.length} pares de tags similares detectados
                </p>
              </div>
            </div>
            <Button 
              onClick={() => setSimilarityReviewOpen(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Revisar Similaridades
            </Button>
          </div>
        </Card>
      )}

      {/* Similarity Review Panel */}
      <SimilarityReviewPanel
        open={similarityReviewOpen}
        onClose={() => setSimilarityReviewOpen(false)}
        semanticDuplicates={semanticDuplicates}
        allTags={allTags}
      />

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

      {/* Filters - Optimized Component with Debounce */}
      <TagFilters
        filterSource={filterSource}
        filterChat={filterChat}
        filterConfidence={filterConfidence}
        searchInputValue={searchInput}
        isSearching={isSearching}
        onFilterSourceChange={setFilterSource}
        onFilterChatChange={setFilterChat}
        onFilterConfidenceChange={setFilterConfidence}
        onSearchChange={setSearchInput}
      />

      {/* Tags Table - Virtualized Component */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Tags Extraídas dos Documentos</h3>
          <span className="text-sm text-muted-foreground">
            {sortedParentTags.length} tags pai
          </span>
        </div>
        
        {/* Bulk Actions Bar */}
        {selectedTags.size > 0 && (
          <div className="bg-muted/50 border rounded-lg p-3 mb-4 flex items-center justify-between animate-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-sm">
                {selectedTags.size} tag(s) selecionada(s)
              </Badge>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedTags(new Set())}
              >
                <X className="h-4 w-4 mr-1" />
                Limpar seleção
              </Button>
            </div>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={openBulkDeleteModal}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir Selecionadas ({selectedTags.size})
            </Button>
          </div>
        )}
        
        <VirtualizedTagsTable
          parentTags={sortedParentTags}
          childTagsMap={childTagsMap}
          expandedParents={expandedParents}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          searchTagName={debouncedSearchTagName}
          selectedTags={selectedTags}
          documentCountMap={documentCountByTagName}
          onToggleExpanded={toggleExpanded}
          onSort={handleSort}
          onCreateChild={(parentId) => openCreateDialog(false, parentId)}
          onEdit={openEditDialog}
          onDelete={openDeleteConfirmModal}
          onToggleSelect={toggleSelectTag}
          onSelectAll={handleSelectAll}
        />
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

      {/* Delete Dialog - Removed, now using deleteConfirmModal with justification */}

      {/* Old Merge Tags Dialog removed - now using TagConflictResolutionModal with 7 justification reasons */}

      {/* Conflict Resolution Modal */}
      <TagConflictResolutionModal
        open={conflictModal.open}
        onOpenChange={(open) => setConflictModal(prev => ({ ...prev, open }))}
        conflictType={conflictModal.type}
        tags={conflictModal.tags}
        childTagsMap={childTagsMap}
        parentTags={parentTags}
        similarityScore={conflictModal.similarityScore}
        onComplete={() => setConflictModal({ open: false, type: 'parent', tags: [] })}
      />

      {/* Import Preview Modal - Enhanced */}
      <Dialog open={importPreviewOpen} onOpenChange={setImportPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Preview de Importação de Taxonomia
            </DialogTitle>
            <DialogDescription>
              Revise os dados e validação antes de confirmar
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 flex-1 overflow-y-auto pr-2">
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-muted/30 rounded-lg border">
                <div className="text-2xl font-bold text-primary">{importData?.parentCount || 0}</div>
                <div className="text-sm text-muted-foreground">Tags Parent</div>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg border">
                <div className="text-2xl font-bold text-purple-400">{importData?.childCount || 0}</div>
                <div className="text-sm text-muted-foreground">Tags Child</div>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg border">
                <div className="text-2xl font-bold text-green-400">{importData?.rulesCount || 0}</div>
                <div className="text-sm text-muted-foreground">Regras ML</div>
              </div>
            </div>

            {/* Validation Errors */}
            {importData?.validationErrors && importData.validationErrors.length > 0 && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle className="h-4 w-4 text-red-400" />
                  <span className="font-semibold text-red-400">Erros de Validação ({importData.validationErrors.length})</span>
                </div>
                <ul className="text-xs space-y-1 text-red-300 max-h-24 overflow-y-auto">
                  {importData.validationErrors.map((err, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-red-400">-</span>
                      {err}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Validation Warnings */}
            {importData?.validationWarnings && importData.validationWarnings.length > 0 && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <span className="font-semibold text-amber-400">Avisos ({importData.validationWarnings.length})</span>
                </div>
                <ul className="text-xs space-y-1 text-amber-300 max-h-24 overflow-y-auto">
                  {importData.validationWarnings.map((warn, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-amber-400">-</span>
                      {warn}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Conflicts Detected */}
            {importData?.conflicts && importData.conflicts.length > 0 && (
              <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4 text-purple-400" />
                  <span className="font-semibold text-purple-400">Conflitos com Existentes ({importData.conflicts.length})</span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  Tags que já existem no sistema. No modo "Mesclar", serão atualizadas.
                </p>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                  {importData.conflicts.slice(0, 20).map((conflict, i) => (
                    <Badge key={i} variant="outline" className={`text-xs ${conflict.type === 'parent' ? 'border-purple-400/50 text-purple-300' : 'border-cyan-400/50 text-cyan-300'}`}>
                      {conflict.name}
                    </Badge>
                  ))}
                  {importData.conflicts.length > 20 && (
                    <Badge variant="outline" className="text-xs">+{importData.conflicts.length - 20} mais</Badge>
                  )}
                </div>
              </div>
            )}

            {/* Tags Preview List */}
            {importData?.parents && importData.parents.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 bg-muted/20 rounded-lg border hover:bg-muted/30 transition-colors">
                  <Eye className="h-4 w-4" />
                  <span className="font-medium text-sm">Preview de Tags a Importar</span>
                  <ChevronDown className="h-4 w-4 ml-auto" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <ScrollArea className="h-48 rounded-lg border p-2">
                    <div className="space-y-2">
                      {importData.parents.map((parent, i) => (
                        <div key={i} className="p-2 bg-muted/20 rounded">
                          <div className="flex items-center gap-2">
                            <FolderTree className="h-3.5 w-3.5 text-purple-400" />
                            <span className="font-medium text-sm">{parent.name}</span>
                            {parent.childCount > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {parent.childCount} filha{parent.childCount > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CollapsibleContent>
              </Collapsible>
            )}
            
            {/* Import Mode Selection */}
            <div className="space-y-2">
              <Label>Modo de Importação</Label>
              <Select value={importMode} onValueChange={(v: 'merge' | 'replace') => setImportMode(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="merge">
                    <div className="flex items-center gap-2">
                      <Merge className="h-4 w-4" />
                      Mesclar com existentes
                    </div>
                  </SelectItem>
                  <SelectItem value="replace">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                      Substituir tudo
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {importMode === 'replace' && (
                <p className="text-xs text-amber-400">
                  Todas as tags existentes serão removidas antes da importação
                </p>
              )}
            </div>
          </div>
          
          <DialogFooter className="mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => setImportPreviewOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={executeImport} 
              disabled={isImporting || (importData?.validationErrors?.length || 0) > 0}
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Confirmar Importação
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal with 9 Data Science Justification Options */}
      <AlertDialog 
        open={deleteConfirmModal.open} 
        onOpenChange={(open) => !open && setDeleteConfirmModal(prev => ({ ...prev, open: false }))}
      >
        <AlertDialogContent className="max-w-lg max-h-[90vh]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Confirmar Exclusão de Tag
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                {deleteConfirmModal.isLoadingCount ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Calculando documentos afetados...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p>
                      Você está prestes a excluir a tag "<strong>{deleteConfirmModal.tagName}</strong>".
                    </p>
                    
                    {deleteConfirmModal.totalInstances > 1 && (
                      <div className="p-3 bg-muted/50 border border-border rounded-lg">
                        <p className="text-sm font-medium mb-2">Escolha o escopo da exclusão:</p>
                        <div className="space-y-2">
                          {/* Option: Single instance only */}
                          {deleteConfirmModal.documentId && (
                            <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                              deleteConfirmModal.deleteScope === 'single' 
                                ? 'border-primary bg-primary/10' 
                                : 'border-border hover:bg-muted/30'
                            }`}>
                              <input 
                                type="radio" 
                                name="deleteScope" 
                                value="single"
                                checked={deleteConfirmModal.deleteScope === 'single'}
                                onChange={() => setDeleteConfirmModal(prev => ({ ...prev, deleteScope: 'single' }))}
                                className="mt-0.5"
                              />
                              <div>
                                <span className="font-medium text-sm text-foreground">Apenas deste documento</span>
                                <p className="text-xs text-muted-foreground">
                                  Remove "{deleteConfirmModal.tagName}" apenas de "{deleteConfirmModal.documentFilename || 'documento selecionado'}"
                                </p>
                              </div>
                            </label>
                          )}
                          
                          {/* Option: All instances */}
                          <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            deleteConfirmModal.deleteScope === 'all' 
                              ? 'border-destructive bg-destructive/10' 
                              : 'border-destructive/50 hover:bg-destructive/5'
                          }`}>
                            <input 
                              type="radio" 
                              name="deleteScope" 
                              value="all"
                              checked={deleteConfirmModal.deleteScope === 'all'}
                              onChange={() => setDeleteConfirmModal(prev => ({ ...prev, deleteScope: 'all' }))}
                              className="mt-0.5"
                            />
                            <div>
                              <span className="font-medium text-sm text-destructive">Todas as {deleteConfirmModal.totalInstances} ocorrências</span>
                              <p className="text-xs text-muted-foreground">
                                Remove "{deleteConfirmModal.tagName}" de TODOS os documentos
                              </p>
                            </div>
                          </label>
                        </div>
                      </div>
                    )}
                    
                    {deleteConfirmModal.deleteScope === 'all' && deleteConfirmModal.totalInstances > 1 && (
                      <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                        <p className="text-destructive text-sm font-semibold flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          Esta tag será removida de {deleteConfirmModal.totalInstances} documento(s)
                        </p>
                      </div>
                    )}
                    
                    {deleteConfirmModal.tagType === 'parent' && deleteConfirmModal.deleteScope === 'all' && (
                      <p className="text-xs text-muted-foreground">
                        Tags filhas associadas serão movidas para a Zona de Órfãos.
                      </p>
                    )}
                  </div>
                )}
                
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                  <p className="text-amber-200 text-sm font-medium mb-3">
                    ⚠️ Para confirmar a exclusão, selecione pelo menos um motivo:
                  </p>
                  
                  <ScrollArea className="h-[320px] pr-3">
                    <div className="space-y-2">
                      {/* 1. Termo genérico (Stopwords) */}
                      <div className="flex items-start gap-3 p-2 rounded bg-background/50 hover:bg-background/80 transition-colors">
                        <Checkbox
                          id="reason-generic"
                          checked={deleteConfirmModal.reasons.generic}
                          onCheckedChange={(checked) => 
                            setDeleteConfirmModal(prev => ({ 
                              ...prev, 
                              reasons: { ...prev.reasons, generic: checked === true }
                            }))
                          }
                        />
                        <label htmlFor="reason-generic" className="cursor-pointer flex-1">
                          <span className="font-medium text-foreground text-sm">Termo genérico</span>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Stopwords que não agregam valor de predição
                          </p>
                        </label>
                      </div>
                      
                      {/* 2. Não se encaixa nas categorias (Out-of-domain) */}
                      <div className="flex items-start gap-3 p-2 rounded bg-background/50 hover:bg-background/80 transition-colors">
                        <Checkbox
                          id="reason-out-of-domain"
                          checked={deleteConfirmModal.reasons.outOfDomain}
                          onCheckedChange={(checked) => 
                            setDeleteConfirmModal(prev => ({ 
                              ...prev, 
                              reasons: { ...prev.reasons, outOfDomain: checked === true }
                            }))
                          }
                        />
                        <label htmlFor="reason-out-of-domain" className="cursor-pointer flex-1">
                          <span className="font-medium text-foreground text-sm">Não se encaixa nas categorias</span>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Irrelevância de domínio (Out-of-domain)
                          </p>
                        </label>
                      </div>
                      
                      {/* 3. Nome próprio (High Cardinality) */}
                      <div className="flex items-start gap-3 p-2 rounded bg-background/50 hover:bg-background/80 transition-colors">
                        <Checkbox
                          id="reason-proper-name"
                          checked={deleteConfirmModal.reasons.properName}
                          onCheckedChange={(checked) => 
                            setDeleteConfirmModal(prev => ({ 
                              ...prev, 
                              reasons: { ...prev.reasons, properName: checked === true }
                            }))
                          }
                        />
                        <label htmlFor="reason-proper-name" className="cursor-pointer flex-1">
                          <span className="font-medium text-foreground text-sm">Nome próprio</span>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Alta cardinalidade - cria matriz esparsa
                          </p>
                        </label>
                      </div>
                      
                      {/* 4. É um ano (Dados temporais) */}
                      <div className="flex items-start gap-3 p-2 rounded bg-background/50 hover:bg-background/80 transition-colors">
                        <Checkbox
                          id="reason-is-year"
                          checked={deleteConfirmModal.reasons.isYear}
                          onCheckedChange={(checked) => 
                            setDeleteConfirmModal(prev => ({ 
                              ...prev, 
                              reasons: { ...prev.reasons, isYear: checked === true }
                            }))
                          }
                        />
                        <label htmlFor="reason-is-year" className="cursor-pointer flex-1">
                          <span className="font-medium text-foreground text-sm">É um ano</span>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Dados temporais devem ser variáveis contínuas
                          </p>
                        </label>
                      </div>
                      
                      {/* 5. É uma frase (Length excessivo) */}
                      <div className="flex items-start gap-3 p-2 rounded bg-background/50 hover:bg-background/80 transition-colors">
                        <Checkbox
                          id="reason-is-phrase"
                          checked={deleteConfirmModal.reasons.isPhrase}
                          onCheckedChange={(checked) => 
                            setDeleteConfirmModal(prev => ({ 
                              ...prev, 
                              reasons: { ...prev.reasons, isPhrase: checked === true }
                            }))
                          }
                        />
                        <label htmlFor="reason-is-phrase" className="cursor-pointer flex-1">
                          <span className="font-medium text-foreground text-sm">É uma frase, não palavra-chave</span>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Ensina IA a detectar length excessivo
                          </p>
                        </label>
                      </div>
                      
                      {/* 6. Erro de digitação/grafia (Fuzzy matching) */}
                      <div className="flex items-start gap-3 p-2 rounded bg-background/50 hover:bg-background/80 transition-colors">
                        <Checkbox
                          id="reason-typo"
                          checked={deleteConfirmModal.reasons.typo}
                          onCheckedChange={(checked) => 
                            setDeleteConfirmModal(prev => ({ 
                              ...prev, 
                              reasons: { ...prev.reasons, typo: checked === true }
                            }))
                          }
                        />
                        <label htmlFor="reason-typo" className="cursor-pointer flex-1">
                          <span className="font-medium text-foreground text-sm">Erro de digitação/grafia</span>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Sugere fuzzy matching para correções futuras
                          </p>
                        </label>
                      </div>
                      
                      {/* 7. Variação Plural/Singular/Sinônimo (Lemmatization) */}
                      <div className="flex items-start gap-3 p-2 rounded bg-background/50 hover:bg-background/80 transition-colors">
                        <Checkbox
                          id="reason-variation"
                          checked={deleteConfirmModal.reasons.variation}
                          onCheckedChange={(checked) => 
                            setDeleteConfirmModal(prev => ({ 
                              ...prev, 
                              reasons: { ...prev.reasons, variation: checked === true }
                            }))
                          }
                        />
                        <label htmlFor="reason-variation" className="cursor-pointer flex-1">
                          <span className="font-medium text-foreground text-sm">Variação (Plural/Singular/Sinônimo)</span>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Ensina lemmatization - reduzir à raiz
                          </p>
                        </label>
                      </div>
                      
                      {/* 8. Verbo/Ação isolada */}
                      <div className="flex items-start gap-3 p-2 rounded bg-background/50 hover:bg-background/80 transition-colors">
                        <Checkbox
                          id="reason-isolated-verb"
                          checked={deleteConfirmModal.reasons.isolatedVerb}
                          onCheckedChange={(checked) => 
                            setDeleteConfirmModal(prev => ({ 
                              ...prev, 
                              reasons: { ...prev.reasons, isolatedVerb: checked === true }
                            }))
                          }
                        />
                        <label htmlFor="reason-isolated-verb" className="cursor-pointer flex-1">
                          <span className="font-medium text-foreground text-sm">Verbo/Ação isolada</span>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Verbos soltos não classificam - precisam substantivo
                          </p>
                        </label>
                      </div>
                      
                      {/* 9. Dado sensível (PII) */}
                      <div className="flex items-start gap-3 p-2 rounded bg-background/50 hover:bg-background/80 transition-colors">
                        <Checkbox
                          id="reason-pii"
                          checked={deleteConfirmModal.reasons.pii}
                          onCheckedChange={(checked) => 
                            setDeleteConfirmModal(prev => ({ 
                              ...prev, 
                              reasons: { ...prev.reasons, pii: checked === true }
                            }))
                          }
                        />
                        <label htmlFor="reason-pii" className="cursor-pointer flex-1">
                          <span className="font-medium text-foreground text-sm text-red-400">Dado sensível (PII)</span>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            CPF, Telefone, E-mail - bloquear por segurança
                          </p>
                        </label>
                      </div>
                    </div>
                  </ScrollArea>
                </div>
                
                {!Object.values(deleteConfirmModal.reasons).some(v => v) && (
                  <p className="text-xs text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Escolha ao menos um motivo para excluir
                  </p>
                )}
                
                <p className="text-xs text-muted-foreground">
                  Esta ação é <strong>irreversível</strong> e será registrada no log de atividades.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteTags}
              disabled={!Object.values(deleteConfirmModal.reasons).some(v => v)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir Tag
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* BULK Delete Confirmation Modal with Batch Reasoning */}
      <AlertDialog 
        open={bulkDeleteModal.open} 
        onOpenChange={(open) => !open && setBulkDeleteModal(prev => ({ ...prev, open: false }))}
      >
        <AlertDialogContent className="max-w-lg max-h-[90vh]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Excluindo {bulkDeleteModal.tagNames.length} Tags em Massa
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                {bulkDeleteModal.isLoadingCount ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Calculando documentos afetados...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p>
                      Você está prestes a excluir <strong>{bulkDeleteModal.tagNames.length}</strong> tag(s) únicas.
                    </p>
                    
                    {/* Tags to be deleted */}
                    <div className="p-3 bg-muted/50 border border-border rounded-lg">
                      <p className="text-sm font-medium mb-2">Tags a serem excluídas:</p>
                      <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                        {bulkDeleteModal.tagNames.slice(0, 15).map((name, i) => (
                          <Badge key={i} variant="outline" className="text-xs border-destructive/50 text-destructive">
                            {name}
                          </Badge>
                        ))}
                        {bulkDeleteModal.tagNames.length > 15 && (
                          <Badge variant="outline" className="text-xs">+{bulkDeleteModal.tagNames.length - 15} mais</Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Impact summary */}
                    <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                      <p className="text-destructive text-sm font-semibold flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Impacto: {bulkDeleteModal.totalDocumentsAffected} documento(s) serão atualizados
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Tags filhas associadas serão movidas para a Zona de Órfãos.
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                  <p className="text-amber-200 text-sm font-medium mb-3">
                    ⚠️ Selecione o motivo da exclusão (aplica-se a TODAS as tags):
                  </p>
                  
                  <ScrollArea className="h-[280px] pr-3">
                    <div className="space-y-2">
                      {/* 1. Termo genérico (Stopwords) */}
                      <div className="flex items-start gap-3 p-2 rounded bg-background/50 hover:bg-background/80 transition-colors">
                        <Checkbox
                          id="bulk-reason-generic"
                          checked={bulkDeleteModal.reasons.generic}
                          onCheckedChange={(checked) => 
                            setBulkDeleteModal(prev => ({ 
                              ...prev, 
                              reasons: { ...prev.reasons, generic: checked === true }
                            }))
                          }
                        />
                        <label htmlFor="bulk-reason-generic" className="cursor-pointer flex-1">
                          <span className="font-medium text-foreground text-sm">Termo genérico</span>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Stopwords que não agregam valor de predição
                          </p>
                        </label>
                      </div>
                      
                      {/* 2. Não se encaixa nas categorias (Out-of-domain) */}
                      <div className="flex items-start gap-3 p-2 rounded bg-background/50 hover:bg-background/80 transition-colors">
                        <Checkbox
                          id="bulk-reason-out-of-domain"
                          checked={bulkDeleteModal.reasons.outOfDomain}
                          onCheckedChange={(checked) => 
                            setBulkDeleteModal(prev => ({ 
                              ...prev, 
                              reasons: { ...prev.reasons, outOfDomain: checked === true }
                            }))
                          }
                        />
                        <label htmlFor="bulk-reason-out-of-domain" className="cursor-pointer flex-1">
                          <span className="font-medium text-foreground text-sm">Não se encaixa nas categorias</span>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Irrelevância de domínio (Out-of-domain)
                          </p>
                        </label>
                      </div>
                      
                      {/* 3. Nome próprio (High Cardinality) */}
                      <div className="flex items-start gap-3 p-2 rounded bg-background/50 hover:bg-background/80 transition-colors">
                        <Checkbox
                          id="bulk-reason-proper-name"
                          checked={bulkDeleteModal.reasons.properName}
                          onCheckedChange={(checked) => 
                            setBulkDeleteModal(prev => ({ 
                              ...prev, 
                              reasons: { ...prev.reasons, properName: checked === true }
                            }))
                          }
                        />
                        <label htmlFor="bulk-reason-proper-name" className="cursor-pointer flex-1">
                          <span className="font-medium text-foreground text-sm">Nome próprio</span>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Alta cardinalidade - cria matriz esparsa
                          </p>
                        </label>
                      </div>
                      
                      {/* 4. É um ano (Dados temporais) */}
                      <div className="flex items-start gap-3 p-2 rounded bg-background/50 hover:bg-background/80 transition-colors">
                        <Checkbox
                          id="bulk-reason-is-year"
                          checked={bulkDeleteModal.reasons.isYear}
                          onCheckedChange={(checked) => 
                            setBulkDeleteModal(prev => ({ 
                              ...prev, 
                              reasons: { ...prev.reasons, isYear: checked === true }
                            }))
                          }
                        />
                        <label htmlFor="bulk-reason-is-year" className="cursor-pointer flex-1">
                          <span className="font-medium text-foreground text-sm">É um ano</span>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Dados temporais devem ser variáveis contínuas
                          </p>
                        </label>
                      </div>
                      
                      {/* 5. É uma frase (Length excessivo) */}
                      <div className="flex items-start gap-3 p-2 rounded bg-background/50 hover:bg-background/80 transition-colors">
                        <Checkbox
                          id="bulk-reason-is-phrase"
                          checked={bulkDeleteModal.reasons.isPhrase}
                          onCheckedChange={(checked) => 
                            setBulkDeleteModal(prev => ({ 
                              ...prev, 
                              reasons: { ...prev.reasons, isPhrase: checked === true }
                            }))
                          }
                        />
                        <label htmlFor="bulk-reason-is-phrase" className="cursor-pointer flex-1">
                          <span className="font-medium text-foreground text-sm">É uma frase, não palavra-chave</span>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Ensina IA a detectar length excessivo
                          </p>
                        </label>
                      </div>
                      
                      {/* 6. Erro de digitação/grafia (Fuzzy matching) */}
                      <div className="flex items-start gap-3 p-2 rounded bg-background/50 hover:bg-background/80 transition-colors">
                        <Checkbox
                          id="bulk-reason-typo"
                          checked={bulkDeleteModal.reasons.typo}
                          onCheckedChange={(checked) => 
                            setBulkDeleteModal(prev => ({ 
                              ...prev, 
                              reasons: { ...prev.reasons, typo: checked === true }
                            }))
                          }
                        />
                        <label htmlFor="bulk-reason-typo" className="cursor-pointer flex-1">
                          <span className="font-medium text-foreground text-sm">Erro de digitação/grafia</span>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Sugere fuzzy matching para correções futuras
                          </p>
                        </label>
                      </div>
                      
                      {/* 7. Variação Plural/Singular/Sinônimo (Lemmatization) */}
                      <div className="flex items-start gap-3 p-2 rounded bg-background/50 hover:bg-background/80 transition-colors">
                        <Checkbox
                          id="bulk-reason-variation"
                          checked={bulkDeleteModal.reasons.variation}
                          onCheckedChange={(checked) => 
                            setBulkDeleteModal(prev => ({ 
                              ...prev, 
                              reasons: { ...prev.reasons, variation: checked === true }
                            }))
                          }
                        />
                        <label htmlFor="bulk-reason-variation" className="cursor-pointer flex-1">
                          <span className="font-medium text-foreground text-sm">Variação (Plural/Singular/Sinônimo)</span>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Ensina lemmatization - reduzir à raiz
                          </p>
                        </label>
                      </div>
                      
                      {/* 8. Verbo/Ação isolada */}
                      <div className="flex items-start gap-3 p-2 rounded bg-background/50 hover:bg-background/80 transition-colors">
                        <Checkbox
                          id="bulk-reason-isolated-verb"
                          checked={bulkDeleteModal.reasons.isolatedVerb}
                          onCheckedChange={(checked) => 
                            setBulkDeleteModal(prev => ({ 
                              ...prev, 
                              reasons: { ...prev.reasons, isolatedVerb: checked === true }
                            }))
                          }
                        />
                        <label htmlFor="bulk-reason-isolated-verb" className="cursor-pointer flex-1">
                          <span className="font-medium text-foreground text-sm">Verbo/Ação isolada</span>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Verbos soltos não classificam - precisam substantivo
                          </p>
                        </label>
                      </div>
                      
                      {/* 9. Dado sensível (PII) */}
                      <div className="flex items-start gap-3 p-2 rounded bg-background/50 hover:bg-background/80 transition-colors">
                        <Checkbox
                          id="bulk-reason-pii"
                          checked={bulkDeleteModal.reasons.pii}
                          onCheckedChange={(checked) => 
                            setBulkDeleteModal(prev => ({ 
                              ...prev, 
                              reasons: { ...prev.reasons, pii: checked === true }
                            }))
                          }
                        />
                        <label htmlFor="bulk-reason-pii" className="cursor-pointer flex-1">
                          <span className="font-medium text-foreground text-sm text-red-400">Dado sensível (PII)</span>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            CPF, Telefone, E-mail - bloquear por segurança
                          </p>
                        </label>
                      </div>
                    </div>
                  </ScrollArea>
                </div>
                
                {!Object.values(bulkDeleteModal.reasons).some(v => v) && (
                  <p className="text-xs text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Escolha ao menos um motivo para excluir
                  </p>
                )}
                
                <p className="text-xs text-muted-foreground">
                  Esta ação é <strong>irreversível</strong> e será registrada no log de atividades.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleteModal.isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              disabled={!Object.values(bulkDeleteModal.reasons).some(v => v) || bulkDeleteModal.isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkDeleteModal.isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Confirmar Exclusão em Massa
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Sugestões de Unificação */}
      <TagUnificationSuggestionsModal
        open={suggestionsModalOpen}
        onOpenChange={setSuggestionsModalOpen}
        parentTags={parentTags}
        childTagsMap={childTagsMap}
        orphanedTags={orphanedTags}
        onMerge={(type, ids, similarity) => {
          setSuggestionsModalOpen(false);
          openConflictModal(type, ids, similarity);
        }}
        onReject={handleRejectDuplicate}
        onAdoptOrphan={async (orphanId, parentId) => {
          try {
            const { error } = await supabase
              .from("document_tags")
              .update({ parent_tag_id: parentId })
              .eq("id", orphanId);
            
            if (error) throw error;
            
            const orphan = orphanedTags.find(o => o.id === orphanId);
            const parent = parentTags.find(p => p.id === parentId);
            
            await logTagManagementEvent({
              input_state: {
                tags_involved: [{
                  id: orphanId,
                  name: orphan?.tag_name || 'unknown',
                  type: 'child',
                  parent_id: null
                }]
              },
              action_type: 'adopt_orphan',
              user_decision: {
                target_tag_id: orphanId,
                target_tag_name: orphan?.tag_name,
                target_parent_id: parentId,
                target_parent_name: parent?.tag_name,
                action: 'adopted_from_suggestion_modal'
              },
            });
            
            toast.success(`"${orphan?.tag_name}" adotada por "${parent?.tag_name}"`);
            queryClient.invalidateQueries({ queryKey: ["all-tags"] });
          } catch (error: any) {
            toast.error(`Erro ao adotar tag: ${error.message}`);
          }
        }}
      />
    </div>
  );
};

export default TagsManagementTab;
