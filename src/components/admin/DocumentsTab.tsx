import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Loader2, Trash2, RefreshCw, FileCode, CheckCircle2, XCircle, Clock, Download, Edit, ArrowUpDown, X, Plus, Search, Boxes, Package, BookOpen, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import JSZip from "jszip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

// Configure PDF.js worker with local bundle
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface FileUploadStatus {
  id: string;
  fileName: string;
  fileSize: number;
  status: 'waiting' | 'extracting' | 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  targetChat: string | null;
  details: string;
  totalChunks?: number;
  documentId?: string;
  error?: string;
}

export const DocumentsTab = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [uploadStatuses, setUploadStatuses] = useState<FileUploadStatus[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  
  // Filter and sort states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [chatFilter, setChatFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<"created_at" | "filename" | "total_chunks">("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Tag editing states
  const [editingTagsDoc, setEditingTagsDoc] = useState<any>(null);
  const [newParentTag, setNewParentTag] = useState("");
  const [newChildTag, setNewChildTag] = useState("");
  const [selectedParentForChild, setSelectedParentForChild] = useState<string | null>(null);
  
  // Chunk visualization states
  const [viewChunksDoc, setViewChunksDoc] = useState<any>(null);
  
  // Bulk export states
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [isBulkReprocessing, setIsBulkReprocessing] = useState(false);
  
  // Duplicate detection states
  const [duplicateInfo, setDuplicateInfo] = useState<{
    newFileName: string;
    existingFileName: string;
    existingDocId: string;
    newDocId: string;
  } | null>(null);
  
  // RAG Info Modal state
  const [showRagInfoModal, setShowRagInfoModal] = useState(false);
  
  const queryClient = useQueryClient();

  // Fetch documents
  const { data: documents, isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Extract text from PDF
  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
      fullText += pageText + "\n";
    }
    
    return fullText;
  };

  // Poll document status
  const pollDocumentStatus = async (documentId: string, fileId: string) => {
    const maxAttempts = 30;
    let attempts = 0;
    
    const poll = setInterval(async () => {
      attempts++;
      
      const { data, error } = await supabase
        .from('documents')
        .select('status, target_chat, total_chunks, error_message')
        .eq('id', documentId)
        .single();
      
      if (error || attempts >= maxAttempts) {
        clearInterval(poll);
        setUploadStatuses(prev => prev.map(s => 
          s.id === fileId 
            ? { 
                ...s, 
                status: 'failed', 
                progress: 100, 
                details: error?.message || 'Timeout ao aguardar processamento'
              }
            : s
        ));
        return;
      }
      
      if (data?.status === 'completed') {
        clearInterval(poll);
        setUploadStatuses(prev => prev.map(s => 
          s.id === fileId 
            ? { 
                ...s, 
                status: 'completed', 
                progress: 100,
                targetChat: data.target_chat,
                totalChunks: data.total_chunks,
                details: `Processado com sucesso em ${data.total_chunks} chunks`
              }
            : s
        ));
      } else if (data?.status === 'failed') {
        clearInterval(poll);
        setUploadStatuses(prev => prev.map(s => 
          s.id === fileId 
            ? { 
                ...s, 
                status: 'failed', 
                progress: 100,
                details: `Falha: ${data.error_message || 'Erro desconhecido'}`
              }
            : s
        ));
      } else {
        // Still processing
        setUploadStatuses(prev => prev.map(s => 
          s.id === fileId 
            ? { 
                ...s, 
                progress: Math.min(s.progress + 2, 90),
                details: 'Processando documento...'
              }
            : s
        ));
      }
    }, 2000);
  };

  // Upload and process documents with real-time status
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (selectedFiles.length === 0) throw new Error("Nenhum arquivo selecionado");
      
      setUploading(true);
      
      // Initialize status for all files
      const initialStatuses: FileUploadStatus[] = selectedFiles.map((file, idx) => ({
        id: `file-${Date.now()}-${idx}`,
        fileName: file.name,
        fileSize: file.size,
        status: 'waiting',
        progress: 0,
        targetChat: null,
        details: 'Na fila'
      }));
      
      setUploadStatuses(initialStatuses);
      
      try {
        const documentsData: Array<{document_id: string; full_text: string; title: string}> = [];
        
        // Process each file
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          const fileId = initialStatuses[i].id;
          
          try {
            // Phase 1: Extracting
            setUploadStatuses(prev => prev.map(s => 
              s.id === fileId 
                ? { ...s, status: 'extracting', progress: 10, details: 'Extraindo texto do PDF...' }
                : s
            ));
            
            const extractedText = await extractTextFromPDF(file);
            
            if (extractedText.length < 100) {
              setUploadStatuses(prev => prev.map(s => 
                s.id === fileId 
                  ? { ...s, status: 'failed', progress: 100, details: 'Texto muito curto (mínimo 100 caracteres)' }
                  : s
              ));
              continue;
            }
            
            // Phase 2: Uploading
            setUploadStatuses(prev => prev.map(s => 
              s.id === fileId 
                ? { ...s, status: 'uploading', progress: 40, details: 'Criando registro no banco...' }
                : s
            ));
            
            const { data: documents, error: docError } = await supabase
              .from("documents")
              .insert([{
                filename: file.name,
                original_text: extractedText,
                text_preview: extractedText.substring(0, 500),
                status: "pending",
                target_chat: "general"
              }])
              .select();
            
            const document = documents?.[0];
            
            if (docError || !document) {
              setUploadStatuses(prev => prev.map(s => 
                s.id === fileId 
                  ? { ...s, status: 'failed', progress: 100, details: 'Erro ao criar registro' }
                  : s
              ));
              continue;
            }
            
            // Phase 3: Processing
            setUploadStatuses(prev => prev.map(s => 
              s.id === fileId 
                ? { ...s, status: 'processing', progress: 60, details: 'Aguardando processamento...', documentId: document.id }
                : s
            ));
            
            documentsData.push({
              document_id: document.id,
              full_text: extractedText,
              title: file.name
            });
            
          } catch (error: any) {
            setUploadStatuses(prev => prev.map(s => 
              s.id === fileId 
                ? { ...s, status: 'failed', progress: 100, details: `Erro: ${error.message}` }
                : s
            ));
          }
        }
        
        if (documentsData.length === 0) {
          throw new Error("Nenhum documento válido para processar");
        }
        
        // Send to bulk processing
        const { data: processResult, error: processError } = await supabase.functions.invoke("process-bulk-document", {
          body: { documents_data: documentsData }
        });
        
        if (processError) throw processError;
        
        // Check for duplicates in results
        if (processResult?.results) {
          const duplicates = processResult.results.filter((r: any) => r.status === "duplicate");
          if (duplicates.length > 0) {
            const dup = duplicates[0];
            const newDoc = documentsData.find(d => d.document_id === dup.document_id);
            if (newDoc) {
              setDuplicateInfo({
                newFileName: newDoc.title,
                existingFileName: dup.existing_filename || "Documento existente",
                existingDocId: dup.existing_doc_id,
                newDocId: dup.document_id
              });
              toast.warning("Documento duplicado detectado!");
              return; // Stop processing to show modal
            }
          }
        }
        
        // Start polling for each document
        documentsData.forEach((doc, idx) => {
          const fileId = uploadStatuses.find(s => s.documentId === doc.document_id)?.id;
          if (fileId) {
            pollDocumentStatus(doc.document_id, fileId);
          }
        });
        
        toast.success(`${documentsData.length} documento(s) enviado(s) para processamento!`);
        
      } catch (error: any) {
        console.error("Erro ao processar documentos:", error);
        toast.error(`Erro: ${error.message}`);
      } finally {
        setUploading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setSelectedFiles([]);
    },
    onError: (error: any) => {
      console.error("Erro ao processar documento:", error);
      toast.error(`Erro: ${error.message}`);
    }
  });

  // Delete document
  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase
        .from("documents")
        .delete()
        .eq("id", docId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Documento deletado");
      setSelectedDoc(null);
    }
  });

  // Reprocess failed document
  const reprocessMutation = useMutation({
    mutationFn: async (docId: string) => {
      // 1. Fetch document
      const { data: doc, error: fetchError } = await supabase
        .from("documents")
        .select("*")
        .eq("id", docId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // 2. Clear old data
      await supabase.from("document_chunks").delete().eq("document_id", docId);
      await supabase.from("document_tags").delete().eq("document_id", docId);
      
      // 3. Reset status
      await supabase
        .from("documents")
        .update({ status: "pending", error_message: null })
        .eq("id", docId);
      
      // 4. Reprocess
      const { error: processError } = await supabase.functions.invoke("process-bulk-document", {
        body: {
          documents_data: [{
            document_id: docId,
            full_text: doc.original_text,
            title: doc.filename
          }]
        }
      });
      
      if (processError) throw processError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Documento reprocessado com sucesso!");
    },
    onError: (error: any) => {
      toast.error(`Erro ao reprocessar: ${error.message}`);
    }
  });

  // Generate documentation
  const generateDocsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-documentation');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Documentação gerada: ${data.version}`);
      queryClient.invalidateQueries({ queryKey: ['documentation-versions'] });
    },
    onError: (error: any) => {
      toast.error(`Erro ao gerar documentação: ${error.message}`);
    }
  });
  
  // Handle duplicate - Discard new document
  const handleDiscardDuplicate = async () => {
    if (!duplicateInfo) return;
    
    try {
      await supabase.from("documents").delete().eq("id", duplicateInfo.newDocId);
      toast.info("Documento descartado com sucesso");
      setDuplicateInfo(null);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    } catch (error: any) {
      toast.error(`Erro ao descartar: ${error.message}`);
    }
  };
  
  // Handle duplicate - Replace existing document
  const handleReplaceDuplicate = async () => {
    if (!duplicateInfo) return;
    
    try {
      // 1. Delete old document and its related data
      await supabase.from("document_chunks").delete().eq("document_id", duplicateInfo.existingDocId);
      await supabase.from("document_tags").delete().eq("document_id", duplicateInfo.existingDocId);
      await supabase.from("document_versions").delete().eq("document_id", duplicateInfo.existingDocId);
      await supabase.from("documents").delete().eq("id", duplicateInfo.existingDocId);
      
      // 2. Get new document data and reprocess
      const { data: newDoc, error: fetchError } = await supabase
        .from("documents")
        .select("*")
        .eq("id", duplicateInfo.newDocId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // 3. Reset status and reprocess
      await supabase.from("documents").update({ status: "pending" }).eq("id", duplicateInfo.newDocId);
      
      const { error: processError } = await supabase.functions.invoke("process-bulk-document", {
        body: {
          documents_data: [{
            document_id: newDoc.id,
            full_text: newDoc.original_text,
            title: newDoc.filename
          }]
        }
      });
      
      if (processError) throw processError;
      
      toast.success("Documento substituído com sucesso!");
      setDuplicateInfo(null);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    } catch (error: any) {
      toast.error(`Erro ao substituir: ${error.message}`);
    }
  };

  // Reprocess selected documents
  const handleBulkReprocess = async () => {
    setIsBulkReprocessing(true);
    try {
      const docsToReprocess = documents?.filter(d => 
        selectedDocs.has(d.id) && 
        (d.status === "failed" || d.status === "pending")
      ) || [];
      
      for (const doc of docsToReprocess) {
        await reprocessMutation.mutateAsync(doc.id);
      }
      
      toast.success(`${docsToReprocess.length} documento(s) reprocessado(s)`);
      setSelectedDocs(new Set());
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    } finally {
      setIsBulkReprocessing(false);
    }
  };

  // Reprocess ALL pending/failed documents
  const handleReprocessAllPendingFailed = async () => {
    const pendingFailed = documents?.filter(d => 
      d.status === "failed" || d.status === "pending"
    ) || [];
    
    if (pendingFailed.length === 0) {
      toast.info("Nenhum documento pendente ou falhado encontrado");
      return;
    }
    
    setIsBulkReprocessing(true);
    try {
      for (const doc of pendingFailed) {
        await reprocessMutation.mutateAsync(doc.id);
      }
      toast.success(`${pendingFailed.length} documento(s) reprocessado(s)`);
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    } finally {
      setIsBulkReprocessing(false);
    }
  };

  // Check if document is stuck in processing
  const isStuck = (doc: any) => {
    if (doc.status !== "processing") return false;
    const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
    return new Date(doc.updated_at).getTime() < twoMinutesAgo;
  };

  // Fetch last documentation version
  const { data: lastDocVersion } = useQuery({
    queryKey: ["documentation-versions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentation_versions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    }
  });

  // Fetch tags for selected document
  const { data: tags } = useQuery({
    queryKey: ["document-tags", selectedDoc?.id],
    enabled: !!selectedDoc,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_tags")
        .select("*")
        .eq("document_id", selectedDoc.id)
        .order("tag_type", { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch tags for editing document
  const { data: editingTags, refetch: refetchEditingTags } = useQuery({
    queryKey: ["document-tags-editing", editingTagsDoc?.id],
    enabled: !!editingTagsDoc,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_tags")
        .select("*")
        .eq("document_id", editingTagsDoc.id)
        .order("tag_type", { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch chunks for viewing
  const { data: chunks, isLoading: chunksLoading } = useQuery({
    queryKey: ["document-chunks", viewChunksDoc?.id],
    enabled: !!viewChunksDoc,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_chunks")
        .select("*")
        .eq("document_id", viewChunksDoc.id)
        .order("chunk_index", { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  // RAG Metrics query
  const { data: metrics } = useQuery({
    queryKey: ["rag-quick-metrics"],
    queryFn: async () => {
      const { data: docs } = await supabase.from("documents").select("status, target_chat");
      const { count: chunks } = await supabase.from("document_chunks")
        .select("*", { count: "exact", head: true });
      
      return {
        totalDocs: docs?.length || 0,
        totalChunks: chunks || 0,
        completed: docs?.filter(d => d.status === "completed").length || 0,
        failed: docs?.filter(d => d.status === "failed").length || 0,
        health: docs?.filter(d => d.target_chat === "health").length || 0,
        study: docs?.filter(d => d.target_chat === "study").length || 0,
        general: docs?.filter(d => d.target_chat === "general").length || 0,
      };
    }
  });

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const pdfFiles = files.filter(f => f.type === "application/pdf");
    
    if (pdfFiles.length === 0) {
      toast.error("Por favor, selecione arquivo(s) PDF");
    } else {
      setSelectedFiles(pdfFiles);
      setUploadStatuses([]);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const pdfFiles = files.filter(f => f.type === "application/pdf");
    
    if (pdfFiles.length === 0) {
      toast.error("Por favor, arraste arquivo(s) PDF");
    } else {
      setSelectedFiles(pdfFiles);
      setUploadStatuses([]);
    }
  }, []);

  // Download document as PDF
  const downloadAsPDF = useCallback((doc: any) => {
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 15;
      const maxWidth = pageWidth - margin * 2;
      
      // Title
      pdf.setFontSize(16);
      pdf.text(doc.filename, margin, 20);
      
      // Document text
      pdf.setFontSize(10);
      const lines = pdf.splitTextToSize(doc.original_text || doc.text_preview || "Sem conteúdo", maxWidth);
      
      let y = 35;
      lines.forEach((line: string) => {
        if (y > 280) {
          pdf.addPage();
          y = 20;
        }
        pdf.text(line, margin, y);
        y += 5;
      });
      
      pdf.save(`${doc.filename.replace('.pdf', '')}_exportado.pdf`);
      toast.success("PDF exportado com sucesso!");
    } catch (error: any) {
      toast.error(`Erro ao exportar PDF: ${error.message}`);
    }
  }, []);

  // Add tag mutation
  const addTagMutation = useMutation({
    mutationFn: async ({ documentId, tagName, tagType, parentTagId }: {
      documentId: string;
      tagName: string;
      tagType: string;
      parentTagId?: string | null;
    }) => {
      const { error } = await supabase.from("document_tags").insert({
        document_id: documentId,
        tag_name: tagName,
        tag_type: tagType,
        parent_tag_id: parentTagId,
        source: "admin",
        confidence: 1.0
      });
      if (error) throw error;
    },
    onSuccess: () => {
      refetchEditingTags();
      queryClient.invalidateQueries({ queryKey: ["document-tags"] });
      toast.success("Tag adicionada");
    }
  });

  // Remove tag mutation
  const removeTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      // First remove child tags if it's a parent
      await supabase.from("document_tags").delete().eq("parent_tag_id", tagId);
      // Then remove the tag
      await supabase.from("document_tags").delete().eq("id", tagId);
    },
    onSuccess: () => {
      refetchEditingTags();
      queryClient.invalidateQueries({ queryKey: ["document-tags"] });
      toast.success("Tag removida");
    }
  });

  // Export selected documents as ZIP
  const exportSelectedAsZip = useCallback(async () => {
    if (selectedDocs.size === 0) {
      toast.error("Nenhum documento selecionado");
      return;
    }

    setIsExporting(true);
    try {
      const zip = new JSZip();
      const docs = documents?.filter(d => selectedDocs.has(d.id)) || [];

      for (const doc of docs) {
        // Generate PDF for each document
        const pdf = new jsPDF();
        const pageWidth = pdf.internal.pageSize.getWidth();
        const margin = 15;
        const maxWidth = pageWidth - margin * 2;
        
        // Title
        pdf.setFontSize(16);
        pdf.text(doc.filename, margin, 20);
        
        // Document text
        pdf.setFontSize(10);
        const lines = pdf.splitTextToSize(doc.original_text || doc.text_preview || "Sem conteúdo", maxWidth);
        
        let y = 35;
        lines.forEach((line: string) => {
          if (y > 280) {
            pdf.addPage();
            y = 20;
          }
          pdf.text(line, margin, y);
          y += 5;
        });
        
        // Add to ZIP
        const pdfBlob = pdf.output('blob');
        zip.file(`${doc.filename.replace('.pdf', '')}_exportado.pdf`, pdfBlob);
      }

      // Generate and download ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `documentos_exportados_${new Date().toISOString().split('T')[0]}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`${docs.length} documento(s) exportados com sucesso!`);
      setSelectedDocs(new Set());
    } catch (error: any) {
      toast.error(`Erro ao exportar: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  }, [selectedDocs, documents]);

  // Filtered and sorted documents
  const filteredDocuments = useMemo(() => {
    let filtered = documents || [];
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(d => 
        d.filename?.toLowerCase().includes(query) ||
        d.original_text?.toLowerCase().includes(query) ||
        d.text_preview?.toLowerCase().includes(query) ||
        d.ai_summary?.toLowerCase().includes(query)
      );
    }
    
    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(d => d.status === statusFilter);
    }
    
    // Chat filter
    if (chatFilter !== "all") {
      filtered = filtered.filter(d => d.target_chat?.toLowerCase() === chatFilter);
    }
    
    // Sorting
    filtered = [...filtered].sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      
      if (sortField === "created_at") {
        const aVal = a.created_at;
        const bVal = b.created_at;
        return (new Date(aVal).getTime() - new Date(bVal).getTime()) * direction;
      }
      
      if (sortField === "filename") {
        return (a.filename || "").localeCompare(b.filename || "") * direction;
      }
      
      if (sortField === "total_chunks") {
        return ((a.total_chunks || 0) - (b.total_chunks || 0)) * direction;
      }
      
      return 0;
    });
    
    return filtered;
  }, [documents, statusFilter, chatFilter, sortField, sortDirection, searchQuery]);

  // Toggle document selection
  const toggleDocSelection = useCallback((docId: string) => {
    setSelectedDocs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(docId)) {
        newSet.delete(docId);
      } else {
        newSet.add(docId);
      }
      return newSet;
    });
  }, []);

  // Select all filtered documents
  const selectAllFiltered = useCallback(() => {
    if (selectedDocs.size === filteredDocuments?.length) {
      setSelectedDocs(new Set());
    } else {
      setSelectedDocs(new Set(filteredDocuments?.map(d => d.id) || []));
    }
  }, [filteredDocuments, selectedDocs.size]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const getStatusIcon = (status: FileUploadStatus['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'waiting': return <Clock className="h-4 w-4 text-muted-foreground" />;
      default: return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    }
  };

  const getStatusBadgeVariant = (status: FileUploadStatus['status']) => {
    switch (status) {
      case 'completed': return 'default';
      case 'failed': return 'destructive';
      case 'processing': return 'secondary';
      default: return 'outline';
    }
  };

  const getChatBadgeColor = (chat: string | null) => {
    switch (chat?.toUpperCase()) {
      case 'HEALTH': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'STUDY': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'GENERAL': return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      default: return '';
    }
  };

  const parentTags = tags?.filter(t => t.tag_type === "parent") || [];
  const childTags = tags?.filter(t => t.tag_type === "child") || [];
  
  const editingParentTags = editingTags?.filter(t => t.tag_type === "parent") || [];
  const editingChildTags = editingTags?.filter(t => t.tag_type === "child") || [];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">Documentos RAG</h2>
          
          {/* RAG Info Button com círculo, ícone Lightbulb e pulsing dot */}
          <button
            onClick={() => setShowRagInfoModal(true)}
            className="relative flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border border-amber-500/30 hover:from-amber-500/30 hover:to-yellow-500/30 transition-all duration-300 group"
            title="Resumo da Engenharia RAG"
          >
            <Lightbulb className="h-5 w-5 text-amber-500 group-hover:text-amber-400 transition-colors" />
            
            {/* Green pulsing dot - posicionado na parte externa do círculo */}
            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
          </button>
        </div>
        <p className="text-muted-foreground mt-2">
          Gerencie documentos para o sistema de Recuperação Aumentada por Geração
        </p>
      </div>

      {/* RAG Metrics Summary */}
      {metrics && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">📊 Resumo RAG</h3>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold text-primary">{metrics.totalDocs}</div>
              <div className="text-sm text-muted-foreground mt-1">📄 Documentos</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold text-primary">{metrics.totalChunks}</div>
              <div className="text-sm text-muted-foreground mt-1">📦 Chunks</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold text-green-600">{metrics.totalDocs > 0 ? Math.round((metrics.completed / metrics.totalDocs) * 100) : 0}%</div>
              <div className="text-sm text-muted-foreground mt-1">✅ Sucesso</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold text-destructive">{metrics.failed}</div>
              <div className="text-sm text-muted-foreground mt-1">❌ Falhas</div>
            </div>
          </div>
          <div className="flex gap-4 justify-center text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                🏥 Health: {metrics.health}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                📚 Study: {metrics.study}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/20">
                📄 General: {metrics.general}
              </Badge>
            </div>
          </div>
        </Card>
      )}

      {/* Documentation Generation Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Documentação Automática</h3>
            <p className="text-sm text-muted-foreground">
              Gerar/atualizar documentação técnica do sistema
            </p>
          </div>
          <Button 
            onClick={() => generateDocsMutation.mutate()}
            disabled={generateDocsMutation.isPending}
          >
            {generateDocsMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <FileCode className="mr-2 h-4 w-4" />
                Gerar Documentação
              </>
            )}
          </Button>
        </div>
        
        {lastDocVersion && (
          <div className="mt-4 text-sm text-muted-foreground">
            Última versão: {lastDocVersion.version} - {new Date(lastDocVersion.created_at).toLocaleDateString()}
          </div>
        )}
      </Card>

      {/* Upload Section with Drag-and-Drop */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <label className="block mb-2 text-sm font-medium">
              Upload de Documentos PDF - Auto-categorização via IA
            </label>
            
            {/* Drag and Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "relative border-2 border-dashed rounded-lg p-12 text-center transition-colors",
                isDragging 
                  ? "border-primary bg-primary/5" 
                  : "border-muted-foreground/25 hover:border-primary/50",
                uploading && "opacity-50 pointer-events-none"
              )}
            >
              <div className="flex flex-col items-center gap-4">
                <Upload className={cn(
                  "h-12 w-12 transition-colors",
                  isDragging ? "text-primary" : "text-muted-foreground"
                )} />
                <div>
                  <p className="text-lg font-medium mb-1">
                    📄 Arraste arquivos PDF aqui
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">ou</p>
                  <Button 
                    variant="outline" 
                    size="lg"
                    onClick={() => document.getElementById('file-input')?.click()}
                    disabled={uploading}
                  >
                    Escolher Arquivos
                  </Button>
                  <input
                    id="file-input"
                    type="file"
                    accept=".pdf"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={uploading}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Aceita múltiplos PDFs • Auto-categorização via IA
                </p>
              </div>
            </div>
          </div>

          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">{selectedFiles.length} arquivo(s) selecionado(s):</p>
              {selectedFiles.map((file, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm flex-1">{file.name}</span>
                  <Badge variant="outline">{(file.size / 1024).toFixed(2)} KB</Badge>
                </div>
              ))}
            </div>
          )}

          <Button
            onClick={() => uploadMutation.mutate()}
            disabled={selectedFiles.length === 0 || uploading}
            className="w-full"
            size="lg"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando {selectedFiles.length} documento(s)...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Enviar e Processar
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Real-time Upload Status Table */}
      {uploadStatuses.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Status de Upload</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[35%]">Nome do Arquivo</TableHead>
                <TableHead className="w-[15%]">Status</TableHead>
                <TableHead className="w-[20%]">Progresso</TableHead>
                <TableHead className="w-[12%]">Chat Destino</TableHead>
                <TableHead className="w-[18%]">Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uploadStatuses.map((fileStatus) => (
                <TableRow key={fileStatus.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(fileStatus.status)}
                      <span className="truncate">{fileStatus.fileName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(fileStatus.status)}>
                      {fileStatus.status === 'waiting' && 'Aguardando'}
                      {fileStatus.status === 'extracting' && 'Extraindo'}
                      {fileStatus.status === 'uploading' && 'Enviando'}
                      {fileStatus.status === 'processing' && 'Processando'}
                      {fileStatus.status === 'completed' && 'Concluído'}
                      {fileStatus.status === 'failed' && 'Falhou'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {fileStatus.status !== 'completed' && fileStatus.status !== 'failed' ? (
                      <div className="space-y-1">
                        <Progress value={fileStatus.progress} className="h-2" />
                        <span className="text-xs text-muted-foreground">{fileStatus.progress}%</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {fileStatus.progress}%
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {fileStatus.targetChat ? (
                      <Badge variant="outline" className={getChatBadgeColor(fileStatus.targetChat)}>
                        {fileStatus.targetChat === 'health' && '🏥 HEALTH'}
                        {fileStatus.targetChat === 'study' && '📚 STUDY'}
                        {fileStatus.targetChat === 'general' && '📄 GENERAL'}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      "text-xs",
                      fileStatus.status === 'completed' ? "text-green-600" : 
                      fileStatus.status === 'failed' ? "text-destructive" : 
                      "text-muted-foreground"
                    )}>
                      {fileStatus.details}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Documents Table */}
      <Card className="p-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Documentos</h3>
          
          {/* Search and Filters */}
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, conteúdo ou resumo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Filters Row */}
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label className="text-sm font-medium mb-2 block">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="completed">Completo</SelectItem>
                    <SelectItem value="failed">Falha</SelectItem>
                    <SelectItem value="processing">Processando</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1">
                <Label className="text-sm font-medium mb-2 block">Chat Destino</Label>
                <Select value={chatFilter} onValueChange={setChatFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="health">Health</SelectItem>
                    <SelectItem value="study">Study</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                variant="outline" 
                onClick={() => {
                  setStatusFilter("all");
                  setChatFilter("all");
                  setSearchQuery("");
                  setSortField("created_at");
                  setSortDirection("desc");
                }}
              >
                🔄 Limpar Filtros
              </Button>
              
              <Button 
                variant="outline"
                onClick={handleReprocessAllPendingFailed}
                disabled={isBulkReprocessing}
              >
                {isBulkReprocessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reprocessando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reprocessar Pendentes/Falhados
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {/* Bulk Actions Bar */}
          {selectedDocs.size > 0 && (
            <div className="flex items-center gap-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <span className="text-sm font-medium">
                {selectedDocs.size} documento(s) selecionado(s)
              </span>
              <Button 
                variant="default"
                size="sm"
                onClick={exportSelectedAsZip}
                disabled={isExporting}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <Package className="mr-2 h-4 w-4" />
                    Exportar ZIP
                  </>
                )}
              </Button>
              <Button 
                variant="secondary"
                size="sm"
                onClick={handleBulkReprocess}
                disabled={isBulkReprocessing}
              >
                {isBulkReprocessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reprocessando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reprocessar Selecionados
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDocs(new Set())}
              >
                Limpar Seleção
              </Button>
            </div>
          )}
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : filteredDocuments && filteredDocuments.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectedDocs.size === filteredDocuments.length && filteredDocuments.length > 0}
                    onCheckedChange={selectAllFiltered}
                  />
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleSort("filename")}
                >
                  <div className="flex items-center gap-2">
                    Nome
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Chat</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleSort("total_chunks")}
                >
                  <div className="flex items-center gap-2">
                    Chunks
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleSort("created_at")}
                >
                  <div className="flex items-center gap-2">
                    Data
                    <ArrowUpDown className="h-4 w-4" />
                  </div>
                </TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.map((doc) => (
                <TableRow 
                  key={doc.id}
                  className="hover:bg-muted/50"
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedDocs.has(doc.id)}
                      onCheckedChange={() => toggleDocSelection(doc.id)}
                    />
                  </TableCell>
                  <TableCell 
                    className="font-medium cursor-pointer"
                    onClick={() => setSelectedDoc(doc)}
                  >
                    {doc.filename}
                  </TableCell>
                  <TableCell onClick={() => setSelectedDoc(doc)}>
                    <Badge variant={
                      isStuck(doc) ? "destructive" :
                      doc.status === "completed" ? "default" :
                      doc.status === "failed" ? "destructive" :
                      "secondary"
                    }>
                      {isStuck(doc) ? "⚠️ TRAVADO" : doc.status}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={() => setSelectedDoc(doc)}>
                    <Badge variant="outline">{doc.target_chat || "pendente"}</Badge>
                  </TableCell>
                  <TableCell onClick={() => setSelectedDoc(doc)}>
                    {doc.implementation_status && (
                      <Badge variant={
                        doc.implementation_status === "ready" ? "default" :
                        doc.implementation_status === "needs_review" ? "secondary" :
                        "outline"
                      }>
                        {doc.implementation_status}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell onClick={() => setSelectedDoc(doc)}>{doc.total_chunks}</TableCell>
                  <TableCell onClick={() => setSelectedDoc(doc)}>{new Date(doc.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadAsPDF(doc);
                        }}
                        title="Download PDF"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {(doc.status === "failed" || doc.status === "pending") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            reprocessMutation.mutate(doc.id);
                          }}
                          disabled={reprocessMutation.isPending}
                          title="Reprocessar"
                        >
                          <RefreshCw className={cn("h-4 w-4", reprocessMutation.isPending && "animate-spin")} />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(doc.id);
                        }}
                        title="Deletar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum documento encontrado
          </div>
        )}
        </div>
      </Card>

      {/* Document Details */}
      {selectedDoc && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">{selectedDoc.filename}</h3>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline">{selectedDoc.target_chat || "não categorizado"}</Badge>
                  {selectedDoc.implementation_status && (
                    <Badge variant={
                      selectedDoc.implementation_status === "ready" ? "default" :
                      selectedDoc.implementation_status === "needs_review" ? "secondary" :
                      "outline"
                    }>
                      {selectedDoc.implementation_status}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedDoc.total_words} palavras • {selectedDoc.total_chunks} chunks
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setViewChunksDoc(selectedDoc)}
                >
                  <Boxes className="h-4 w-4 mr-2" />
                  Ver Chunks
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setEditingTagsDoc(selectedDoc)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Tags
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedDoc(null)}>
                  Fechar
                </Button>
              </div>
            </div>

            {selectedDoc.ai_summary && (
              <div>
                <h4 className="font-medium mb-2">Resumo (Auto-gerado)</h4>
                <p className="text-sm text-muted-foreground">{selectedDoc.ai_summary}</p>
              </div>
            )}

            {parentTags.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Tags</h4>
                <div className="space-y-2">
                  {parentTags.map((parent) => (
                    <div key={parent.id}>
                      <Badge className="mb-1">{parent.tag_name}</Badge>
                      <div className="ml-4 flex flex-wrap gap-1">
                        {childTags
                          .filter(c => c.parent_tag_id === parent.id)
                          .map(child => (
                            <Badge key={child.id} variant="outline" className="text-xs">
                              {child.tag_name}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedDoc.text_preview && (
              <div>
                <h4 className="font-medium mb-2">Preview</h4>
                <p className="text-sm text-muted-foreground font-mono bg-muted p-3 rounded">
                  {selectedDoc.text_preview}...
                </p>
              </div>
            )}

            {/* Similar Documents Section */}
            <div>
              <h4 className="font-medium mb-2">📊 Documentos Similares</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Baseado em tags compartilhadas e conteúdo semântico
              </p>
              <div className="space-y-2">
                {documents
                  ?.filter(d => 
                    d.id !== selectedDoc.id && 
                    d.status === "completed" &&
                    d.target_chat === selectedDoc.target_chat
                  )
                  .slice(0, 5)
                  .map(doc => (
                    <div 
                      key={doc.id}
                      className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedDoc(doc)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{doc.filename}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {doc.total_chunks} chunks
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {doc.target_chat}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                {documents?.filter(d => 
                  d.id !== selectedDoc.id && 
                  d.status === "completed" &&
                  d.target_chat === selectedDoc.target_chat
                ).length === 0 && (
                  <p className="text-sm text-muted-foreground italic">
                    Nenhum documento similar encontrado
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Tag Editing Dialog */}
      {editingTagsDoc && (
        <Dialog open={!!editingTagsDoc} onOpenChange={(open) => !open && setEditingTagsDoc(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Tags - {editingTagsDoc.filename}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Parent Tags Section */}
              <div>
                <h4 className="font-semibold mb-3">📂 CATEGORIAS PRINCIPAIS</h4>
                <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/30 min-h-[60px]">
                  {editingParentTags.map((tag) => (
                    <Badge key={tag.id} className="flex items-center gap-2 px-3 py-1">
                      {tag.tag_name}
                      <button
                        onClick={() => removeTagMutation.mutate(tag.id)}
                        className="hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Nova categoria"
                    value={newParentTag}
                    onChange={(e) => setNewParentTag(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newParentTag.trim()) {
                        addTagMutation.mutate({
                          documentId: editingTagsDoc.id,
                          tagName: newParentTag.trim(),
                          tagType: "parent"
                        });
                        setNewParentTag("");
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (newParentTag.trim()) {
                        addTagMutation.mutate({
                          documentId: editingTagsDoc.id,
                          tagName: newParentTag.trim(),
                          tagType: "parent"
                        });
                        setNewParentTag("");
                      }
                    }}
                    disabled={!newParentTag.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Child Tags Section */}
              <div>
                <h4 className="font-semibold mb-3">🏷️ TAGS (por categoria)</h4>
                {editingParentTags.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    Adicione categorias principais primeiro
                  </p>
                ) : (
                  <div className="space-y-4">
                    {editingParentTags.map((parent) => (
                      <div key={parent.id} className="border rounded-lg p-3">
                        <div className="font-medium text-sm mb-2">{parent.tag_name}:</div>
                        <div className="flex flex-wrap gap-2 mb-2 min-h-[40px]">
                          {editingChildTags
                            .filter(c => c.parent_tag_id === parent.id)
                            .map(child => (
                              <Badge key={child.id} variant="outline" className="flex items-center gap-2 text-xs px-2 py-1">
                                {child.tag_name}
                                <button
                                  onClick={() => removeTagMutation.mutate(child.id)}
                                  className="hover:text-destructive"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Nova tag"
                            value={selectedParentForChild === parent.id ? newChildTag : ""}
                            onFocus={() => setSelectedParentForChild(parent.id)}
                            onChange={(e) => setNewChildTag(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && newChildTag.trim()) {
                                addTagMutation.mutate({
                                  documentId: editingTagsDoc.id,
                                  tagName: newChildTag.trim(),
                                  tagType: "child",
                                  parentTagId: parent.id
                                });
                                setNewChildTag("");
                              }
                            }}
                            className="text-sm"
                          />
                          <Button
                            size="sm"
                            onClick={() => {
                              if (newChildTag.trim() && selectedParentForChild === parent.id) {
                                addTagMutation.mutate({
                                  documentId: editingTagsDoc.id,
                                  tagName: newChildTag.trim(),
                                  tagType: "child",
                                  parentTagId: parent.id
                                });
                                setNewChildTag("");
                              }
                            }}
                            disabled={!newChildTag.trim() || selectedParentForChild !== parent.id}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setEditingTagsDoc(null);
                setNewParentTag("");
                setNewChildTag("");
                setSelectedParentForChild(null);
              }}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Chunk Visualization Dialog */}
      {viewChunksDoc && (
        <Dialog open={!!viewChunksDoc} onOpenChange={(open) => !open && setViewChunksDoc(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Chunks do Documento - {viewChunksDoc.filename}</DialogTitle>
            </DialogHeader>
            
            {chunksLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : chunks && chunks.length > 0 ? (
              <ScrollArea className="h-[60vh] pr-4">
                <div className="space-y-4">
                  {chunks.map((chunk, idx) => (
                    <Card key={chunk.id} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Chunk #{chunk.chunk_index + 1}</Badge>
                          <Badge variant="secondary">{chunk.word_count} palavras</Badge>
                          {chunk.embedding ? (
                            <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                              ✓ Embedding
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              ✗ Sem Embedding
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-sm bg-muted p-3 rounded font-mono max-h-[200px] overflow-y-auto">
                        {chunk.content.substring(0, 300)}
                        {chunk.content.length > 300 && "..."}
                      </div>
                      
                      {chunk.metadata && typeof chunk.metadata === 'object' && Object.keys(chunk.metadata).length > 0 && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          <span className="font-medium">Metadata:</span> {JSON.stringify(chunk.metadata, null, 2)}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum chunk encontrado para este documento
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewChunksDoc(null)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Duplicate Detection Modal */}
      {duplicateInfo && (
        <Dialog open={!!duplicateInfo} onOpenChange={() => setDuplicateInfo(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                ⚠️ Documento Duplicado Detectado
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm">
                O arquivo <strong className="text-primary">{duplicateInfo.newFileName}</strong> possui conteúdo idêntico ao documento existente:
              </p>
              <div className="p-3 bg-muted rounded-lg border border-border">
                <p className="font-semibold text-sm">{duplicateInfo.existingFileName}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                O que deseja fazer?
              </p>
            </div>
            <DialogFooter className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleDiscardDuplicate}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Descartar Novo
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleReplaceDuplicate}
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Substituir Existente
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* RAG Engineering Info Modal */}
      <Dialog open={showRagInfoModal} onOpenChange={setShowRagInfoModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl">
              <Lightbulb className="h-6 w-6 text-amber-500" />
              Resumo da Engenharia RAG Implementada e Siglas
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 text-sm">
            {/* Introdução */}
            <p className="text-muted-foreground leading-relaxed">
              O sistema de <strong>Geração Aumentada por Recuperação (RAG, Retrieval-Augmented Generation)</strong> foi construído como uma <em>Biblioteca Digital Inteligente e Auto-organizada</em> com foco em estabilidade e qualidade de dados.
            </p>
            
            {/* Fase 1 */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
                <span className="bg-primary/10 p-1 rounded">📥</span>
                Fase 1: Ingestão de Dados de Alta Qualidade (ETL - Extract, Transform, Load)
              </h3>
              <p className="text-muted-foreground">
                A fase de ingestão garante a qualidade dos dados antes da indexação, usando inteligência e automação.
              </p>
              
              <div className="grid gap-4 pl-4 border-l-2 border-primary/30">
                <div>
                  <h4 className="font-medium text-amber-500">🛡️ Prevenção de Corrupção</h4>
                  <p className="text-muted-foreground text-xs mt-1">
                    A extração do texto de PDFs é feita no <strong>Frontend (navegador)</strong> usando <code className="bg-muted px-1 rounded">pdfjs-dist</code>, uma prática de segurança crucial para evitar a corrupção de caracteres.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium text-blue-500">🤖 Validação Inteligente</h4>
                  <p className="text-muted-foreground text-xs mt-1">
                    O sistema usa o <strong>SLM (Small Language Model - KnowYOU)</strong> para classificar automaticamente o contexto (<Badge variant="outline" className="text-xs">HEALTH</Badge>, <Badge variant="outline" className="text-xs">STUDY</Badge> - as suas IAs inseridas no sistema) e verifica a legibilidade do documento antes de prosseguir.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium text-green-500">✂️ Chunking Otimizado</h4>
                  <p className="text-muted-foreground text-xs mt-1">
                    O texto é fragmentado em partes de <strong>750 palavras</strong> com <strong>180 palavras de sobreposição</strong>, otimizando a recuperação do contexto.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium text-purple-500">🔢 Indexação Vetorial</h4>
                  <p className="text-muted-foreground text-xs mt-1">
                    Cada fragmento é convertido em um vetor (<strong>Embedding</strong>) e indexado no Postgres com a extensão <code className="bg-muted px-1 rounded">pgvector</code> para busca semântica.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium text-red-500">🔄 Estabilidade Ativa (Cleanup)</h4>
                  <p className="text-muted-foreground text-xs mt-1">
                    Um <strong>Cron Job</strong> (agendador de tarefas) verifica documentos travados no status 'processing' e os reclassifica como 'pending' automaticamente, permitindo o reprocessamento e garantindo a estabilidade.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Fase 2 */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
                <span className="bg-primary/10 p-1 rounded">🔍</span>
                Fase 2: Recuperação Segura e Fundamentada (Retrieval)
              </h3>
              <p className="text-muted-foreground">
                A fase de busca é projetada para precisão e rastreabilidade.
              </p>
              
              <div className="grid gap-4 pl-4 border-l-2 border-primary/30">
                <div>
                  <h4 className="font-medium text-cyan-500">🔗 Busca Híbrida</h4>
                  <p className="text-muted-foreground text-xs mt-1">
                    A pesquisa é feita combinando <strong>similaridade vetorial</strong> (buscando significado) com filtros por <strong>Metadados</strong> (<code className="bg-muted px-1 rounded">target_chat</code> e <code className="bg-muted px-1 rounded">Tags</code>) para garantir que a resposta venha apenas do contexto relevante (ex: apenas documentos de 'Health' para o Chat Health).
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium text-emerald-500">📚 Geração Fundamentada</h4>
                  <p className="text-muted-foreground text-xs mt-1">
                    O <strong>LLM (Gemini 3.0)</strong> e/ou o <strong>SLM (KnowYOU)</strong> são forçados a usar os chunks de contexto recuperados para fundamentar a resposta, prevenindo "alucinações" e garantindo a precisão.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium text-orange-500">📊 Observabilidade</h4>
                  <p className="text-muted-foreground text-xs mt-1">
                    O sistema registra logs de <strong>Latência</strong> e <strong>Taxa de Sucesso</strong> das buscas para o Dashboard de <strong>RAG (Retrieval-Augmented Generation) Analytics</strong>.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Infográfico */}
            <div className="mt-6 p-4 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-lg border">
              <h4 className="font-semibold mb-3 text-center">📈 Fluxo RAG - Infográfico</h4>
              <div className="bg-card p-4 rounded-lg">
                <svg viewBox="0 0 800 600" className="w-full h-auto">
                  {/* ETL Phase */}
                  <g>
                    <rect x="50" y="50" width="150" height="200" rx="8" fill="hsl(var(--primary))" opacity="0.1" stroke="hsl(var(--primary))" strokeWidth="2"/>
                    <text x="125" y="80" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="16" fontWeight="bold">📥 Fase 1: ETL</text>
                    
                    <text x="125" y="110" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="12">PDF Upload</text>
                    <text x="125" y="130" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="12">↓</text>
                    <text x="125" y="150" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="12">pdfjs-dist</text>
                    <text x="125" y="170" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="12">↓</text>
                    <text x="125" y="190" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="12">Validação SLM</text>
                    <text x="125" y="210" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="12">↓</text>
                    <text x="125" y="230" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="12">Chunking</text>
                  </g>
                  
                  {/* Arrow to Database */}
                  <path d="M 200 150 L 280 300" stroke="hsl(var(--primary))" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)"/>
                  
                  {/* Database */}
                  <g>
                    <ellipse cx="350" cy="350" rx="80" ry="40" fill="hsl(var(--secondary))" opacity="0.2" stroke="hsl(var(--secondary))" strokeWidth="2"/>
                    <text x="350" y="340" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="14" fontWeight="bold">pgvector</text>
                    <text x="350" y="360" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="12">Postgres DB</text>
                  </g>
                  
                  {/* Arrow to Retrieval */}
                  <path d="M 430 350 L 550 200" stroke="hsl(var(--primary))" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)"/>
                  
                  {/* Retrieval Phase */}
                  <g>
                    <rect x="550" y="50" width="200" height="200" rx="8" fill="hsl(var(--accent))" opacity="0.1" stroke="hsl(var(--accent))" strokeWidth="2"/>
                    <text x="650" y="80" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="16" fontWeight="bold">🔍 Fase 2: Retrieval</text>
                    
                    <text x="650" y="110" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="12">Query</text>
                    <text x="650" y="130" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="12">↓</text>
                    <text x="650" y="150" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="12">Busca Híbrida</text>
                    <text x="650" y="170" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="12">↓</text>
                    <text x="650" y="190" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="12">Top-K Chunks</text>
                    <text x="650" y="210" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="12">↓</text>
                    <text x="650" y="230" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="12">LLM/SLM</text>
                  </g>
                  
                  {/* Arrow definitions */}
                  <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                      <polygon points="0 0, 10 3, 0 6" fill="hsl(var(--primary))" />
                    </marker>
                  </defs>
                </svg>
              </div>
            </div>
            
            {/* Glossário de Siglas */}
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-semibold mb-2">📖 Glossário de Siglas</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><strong>RAG</strong> - Retrieval-Augmented Generation</div>
                <div><strong>ETL</strong> - Extract, Transform, Load</div>
                <div><strong>LLM</strong> - Large Language Model</div>
                <div><strong>SLM</strong> - Small Language Model</div>
                <div><strong>Embedding</strong> - Representação vetorial de texto</div>
                <div><strong>Chunk</strong> - Fragmento de documento</div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRagInfoModal(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};