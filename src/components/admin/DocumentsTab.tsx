import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Loader2, Trash2, RefreshCw, FileCode, CheckCircle2, XCircle, Clock, Download, Edit, ArrowUpDown, X, Plus, Search, Boxes, Package, BookOpen, Lightbulb, HelpCircle, Heart, GraduationCap, Eye, Settings2, AlertTriangle, RotateCcw, Table2 as TableIcon } from "lucide-react";
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
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { RagFlowDiagram } from "./RagFlowDiagram";

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
  const [readabilityFilter, setReadabilityFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<"created_at" | "filename" | "total_chunks" | "status" | "target_chat" | "is_inserted" | "inserted_in_chat" | "readability_score">("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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
    similarityScore?: number;
    newTextPreview?: string;
    existingTextPreview?: string;
  } | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  // Text preview before processing states
  const [previewFiles, setPreviewFiles] = useState<Array<{
    file: File;
    extractedText: string;
    charCount: number;
    wordCount: number;
    validRatio: number;
    letterCount: number;
  }>>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  // Document AI OCR toggle
  const [useDocumentAI, setUseDocumentAI] = useState(false);

  // Retry with custom validation parameters
  const [retryDoc, setRetryDoc] = useState<any>(null);
  const [retryParams, setRetryParams] = useState({
    minTextLength: 50,
    validCharRatio: 0.5,
    minLetterCount: 30
  });

  // Function to highlight text differences between two strings
  const highlightTextDifferences = (text1: string, text2: string): { highlighted1: React.ReactNode; highlighted2: React.ReactNode } => {
    const words1 = text1.split(/\s+/);
    const words2 = text2.split(/\s+/);
    const set1 = new Set(words1.map(w => w.toLowerCase()));
    const set2 = new Set(words2.map(w => w.toLowerCase()));
    
    const highlighted1 = words1.map((word, idx) => {
      const isUnique = !set2.has(word.toLowerCase());
      return (
        <span key={idx}>
          {isUnique ? (
            <span className="bg-green-500/30 text-green-300 px-0.5 rounded">{word}</span>
          ) : (
            word
          )}{' '}
        </span>
      );
    });
    
    const highlighted2 = words2.map((word, idx) => {
      const isUnique = !set1.has(word.toLowerCase());
      return (
        <span key={idx}>
          {isUnique ? (
            <span className="bg-amber-500/30 text-amber-300 px-0.5 rounded">{word}</span>
          ) : (
            word
          )}{' '}
        </span>
      );
    });
    
    return { highlighted1, highlighted2 };
  };

  // RAG Info Modal state
  const [showRagInfoModal, setShowRagInfoModal] = useState(false);

  // Tags modal state
  const [tagsModalDoc, setTagsModalDoc] = useState<any>(null);

  // Manual insertion modal state
  const [insertionModalDoc, setInsertionModalDoc] = useState<any>(null);
  const queryClient = useQueryClient();

  // Fetch documents
  const {
    data: documents,
    isLoading
  } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("documents").select("*").order("created_at", {
        ascending: false
      });
      if (error) throw error;
      return data;
    }
  });

  // Extract text from PDF with improved OCR handling
  const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
    }).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Improved text reconstruction with better spacing
      let lastY: number | null = null;
      const pageLines: string[] = [];
      let currentLine = "";
      
      textContent.items.forEach((item: any) => {
        if (item.str) {
          // Detect line breaks based on Y position
          const itemY = item.transform?.[5];
          if (lastY !== null && itemY !== undefined && Math.abs(itemY - lastY) > 5) {
            if (currentLine.trim()) {
              pageLines.push(currentLine.trim());
            }
            currentLine = "";
          }
          currentLine += item.str + " ";
          lastY = itemY;
        }
      });
      
      if (currentLine.trim()) {
        pageLines.push(currentLine.trim());
      }
      
      fullText += pageLines.join("\n") + "\n\n";
    }
    
    // Clean up extra whitespace while preserving structure
    return fullText
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
  };

  // Extract text from PDF using Google Document AI (for tables)
  const extractTextWithDocumentAI = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    const { data, error } = await supabase.functions.invoke('extract-pdf-document-ai', {
      body: {
        pdf_base64: base64,
        filename: file.name
      }
    });

    if (error) {
      console.error('Document AI error:', error);
      throw new Error(`Document AI failed: ${error.message}`);
    }

    if (!data.success) {
      throw new Error(data.error || 'Document AI processing failed');
    }

    console.log(`Document AI stats: ${data.statistics?.tableCount} tables, ${data.statistics?.totalTableRows} rows`);
    
    return data.text;
  };

  // Poll document status
  const pollDocumentStatus = async (documentId: string, fileId: string) => {
    const maxAttempts = 30;
    let attempts = 0;
    const poll = setInterval(async () => {
      attempts++;
      const {
        data,
        error
      } = await supabase.from('documents').select('status, target_chat, total_chunks, error_message').eq('id', documentId).single();
      if (error || attempts >= maxAttempts) {
        clearInterval(poll);
        setUploadStatuses(prev => prev.map(s => s.id === fileId ? {
          ...s,
          status: 'failed',
          progress: 100,
          details: error?.message || 'Timeout ao aguardar processamento'
        } : s));
        return;
      }
      if (data?.status === 'completed') {
        clearInterval(poll);
        setUploadStatuses(prev => prev.map(s => s.id === fileId ? {
          ...s,
          status: 'completed',
          progress: 100,
          targetChat: data.target_chat,
          totalChunks: data.total_chunks,
          details: `Processado com sucesso em ${data.total_chunks} chunks`
        } : s));
      } else if (data?.status === 'failed') {
        clearInterval(poll);
        setUploadStatuses(prev => prev.map(s => s.id === fileId ? {
          ...s,
          status: 'failed',
          progress: 100,
          details: `Falha: ${data.error_message || 'Erro desconhecido'}`
        } : s));
      } else {
        // Still processing
        setUploadStatuses(prev => prev.map(s => s.id === fileId ? {
          ...s,
          progress: Math.min(s.progress + 2, 90),
          details: 'Processando documento...'
        } : s));
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
        const documentsData: Array<{
          document_id: string;
          full_text: string;
          title: string;
          fileId: string;
        }> = [];

        // Process each file
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          const fileId = initialStatuses[i].id;
          try {
            // Phase 1: Extracting
            setUploadStatuses(prev => prev.map(s => s.id === fileId ? {
              ...s,
              status: 'extracting',
              progress: 10,
              details: useDocumentAI ? 'Extraindo com Google Document AI (tabelas)...' : 'Extraindo texto do PDF...'
            } : s));
            const extractedText = useDocumentAI 
              ? await extractTextWithDocumentAI(file)
              : await extractTextFromPDF(file);
            if (extractedText.length < 100) {
              setUploadStatuses(prev => prev.map(s => s.id === fileId ? {
                ...s,
                status: 'failed',
                progress: 100,
                details: 'Texto muito curto (mínimo 100 caracteres)'
              } : s));
              continue;
            }

            // Phase 2: Uploading
            setUploadStatuses(prev => prev.map(s => s.id === fileId ? {
              ...s,
              status: 'uploading',
              progress: 40,
              details: 'Criando registro no banco...'
            } : s));
            const {
              data: documents,
              error: docError
            } = await supabase.from("documents").insert([{
              filename: file.name,
              original_text: extractedText,
              text_preview: extractedText.substring(0, 500),
              status: "pending",
              target_chat: "general"
            }]).select();
            const document = documents?.[0];
            if (docError || !document) {
              setUploadStatuses(prev => prev.map(s => s.id === fileId ? {
                ...s,
                status: 'failed',
                progress: 100,
                details: 'Erro ao criar registro'
              } : s));
              continue;
            }

            // Phase 3: Processing
            setUploadStatuses(prev => prev.map(s => s.id === fileId ? {
              ...s,
              status: 'processing',
              progress: 60,
              details: 'Aguardando processamento...',
              documentId: document.id
            } : s));
            documentsData.push({
              document_id: document.id,
              full_text: extractedText,
              title: file.name,
              fileId: fileId
            });
          } catch (error: any) {
            setUploadStatuses(prev => prev.map(s => s.id === fileId ? {
              ...s,
              status: 'failed',
              progress: 100,
              details: `Erro: ${error.message}`
            } : s));
          }
        }
        if (documentsData.length === 0) {
          throw new Error("Nenhum documento válido para processar");
        }

        // Send to bulk processing
        const {
          data: processResult,
          error: processError
        } = await supabase.functions.invoke("process-bulk-document", {
          body: {
            documents_data: documentsData
          }
        });
        if (processError) throw processError;

        // Process results immediately - handle failures and duplicates
        const failedDocIds = new Set<string>();
        const duplicateDocIds = new Set<string>();
        
        if (processResult?.results) {
          // Update UI immediately for failed documents
          const failures = processResult.results.filter((r: any) => r.status === "failed");
          failures.forEach((fail: any) => {
            failedDocIds.add(fail.document_id);
            const docData = documentsData.find(d => d.document_id === fail.document_id);
            if (docData) {
              setUploadStatuses(prev => prev.map(s => s.id === docData.fileId ? {
                ...s,
                status: 'failed',
                progress: 100,
                details: `❌ ${fail.error || 'Erro desconhecido'}`,
                error: fail.error
              } : s));
            }
          });
          
          // Show toast for failures
          if (failures.length > 0) {
            toast.error(`${failures.length} documento(s) falharam na validação`);
          }

          // Check for duplicates
          const duplicates = processResult.results.filter((r: any) => r.status === "duplicate");
          if (duplicates.length > 0) {
            const dup = duplicates[0];
            duplicateDocIds.add(dup.document_id);
            const newDoc = documentsData.find(d => d.document_id === dup.document_id);
            if (newDoc) {
              setUploadStatuses(prev => prev.map(s => s.id === newDoc.fileId ? {
                ...s,
                status: 'failed',
                progress: 100,
                details: `⚠️ Duplicata: ${dup.existing_filename}`
              } : s));
              
              // Fetch existing document text preview
              const { data: existingDoc } = await supabase
                .from("documents")
                .select("text_preview, original_text")
                .eq("id", dup.existing_doc_id)
                .single();
              
              // Fetch new document text preview
              const { data: newDocData } = await supabase
                .from("documents")
                .select("text_preview, original_text")
                .eq("id", dup.document_id)
                .single();
              
              setDuplicateInfo({
                newFileName: newDoc.title,
                existingFileName: dup.existing_filename || "Documento existente",
                existingDocId: dup.existing_doc_id,
                newDocId: dup.document_id,
                similarityScore: dup.similarity_score,
                newTextPreview: newDocData?.text_preview || newDocData?.original_text?.substring(0, 1000) || "",
                existingTextPreview: existingDoc?.text_preview || existingDoc?.original_text?.substring(0, 1000) || ""
              });
              setShowComparison(false);
              toast.warning("Documento duplicado detectado!");
              return; // Stop processing to show modal
            }
          }
        }

        // Start polling ONLY for documents that didn't fail or get marked as duplicates
        documentsData.forEach((doc) => {
          if (!failedDocIds.has(doc.document_id) && !duplicateDocIds.has(doc.document_id)) {
            pollDocumentStatus(doc.document_id, doc.fileId);
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
      queryClient.invalidateQueries({
        queryKey: ["documents"]
      });
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
      const {
        error
      } = await supabase.from("documents").delete().eq("id", docId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["documents"]
      });
      toast.success("Documento deletado");
      setSelectedDoc(null);
    }
  });

  // Reprocess failed document
  const reprocessMutation = useMutation({
    mutationFn: async (docId: string) => {
      // 1. Fetch document
      const {
        data: doc,
        error: fetchError
      } = await supabase.from("documents").select("*").eq("id", docId).single();
      if (fetchError) throw fetchError;

      // 2. Clear old data
      await supabase.from("document_chunks").delete().eq("document_id", docId);
      await supabase.from("document_tags").delete().eq("document_id", docId);

      // 3. Reset status
      await supabase.from("documents").update({
        status: "pending",
        error_message: null
      }).eq("id", docId);

      // 4. Reprocess
      const {
        error: processError
      } = await supabase.functions.invoke("process-bulk-document", {
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
      queryClient.invalidateQueries({
        queryKey: ["documents"]
      });
      toast.success("Documento reprocessado com sucesso!");
    },
    onError: (error: any) => {
      toast.error(`Erro ao reprocessar: ${error.message}`);
    }
  });

  // Generate documentation
  const generateDocsMutation = useMutation({
    mutationFn: async () => {
      const {
        data,
        error
      } = await supabase.functions.invoke('generate-documentation');
      if (error) throw error;
      return data;
    },
    onSuccess: data => {
      toast.success(`Documentação gerada: ${data.version}`);
      queryClient.invalidateQueries({
        queryKey: ['documentation-versions']
      });
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
      queryClient.invalidateQueries({
        queryKey: ["documents"]
      });
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
      const {
        data: newDoc,
        error: fetchError
      } = await supabase.from("documents").select("*").eq("id", duplicateInfo.newDocId).single();
      if (fetchError) throw fetchError;

      // 3. Reset status and reprocess
      await supabase.from("documents").update({
        status: "pending"
      }).eq("id", duplicateInfo.newDocId);
      const {
        error: processError
      } = await supabase.functions.invoke("process-bulk-document", {
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
      queryClient.invalidateQueries({
        queryKey: ["documents"]
      });
    } catch (error: any) {
      toast.error(`Erro ao substituir: ${error.message}`);
    }
  };

  // Reprocess selected documents
  const handleBulkReprocess = async () => {
    setIsBulkReprocessing(true);
    try {
      const docsToReprocess = documents?.filter(d => selectedDocs.has(d.id) && (d.status === "failed" || d.status === "pending")) || [];
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
    const pendingFailed = documents?.filter(d => d.status === "failed" || d.status === "pending") || [];
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
  const {
    data: lastDocVersion
  } = useQuery({
    queryKey: ["documentation-versions"],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("documentation_versions").select("*").order("created_at", {
        ascending: false
      }).limit(1).single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    }
  });

  // Fetch tags for selected document
  const {
    data: tags
  } = useQuery({
    queryKey: ["document-tags", selectedDoc?.id],
    enabled: !!selectedDoc,
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("document_tags").select("*").eq("document_id", selectedDoc.id).order("tag_type", {
        ascending: true
      });
      if (error) throw error;
      return data;
    }
  });

  // Fetch tags for editing document
  const {
    data: editingTags,
    refetch: refetchEditingTags
  } = useQuery({
    queryKey: ["document-tags-editing", editingTagsDoc?.id],
    enabled: !!editingTagsDoc,
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("document_tags").select("*").eq("document_id", editingTagsDoc.id).order("tag_type", {
        ascending: true
      });
      if (error) throw error;
      return data;
    }
  });

  // Fetch all tags for quick access in table
  const {
    data: allTags
  } = useQuery({
    queryKey: ["all-document-tags"],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("document_tags").select("*");
      if (error) throw error;
      return data;
    }
  });

  // Helper: Get top parent tag for a document
  const getTopParentTag = useCallback((documentId: string) => {
    if (!allTags) return null;
    const docTags = allTags.filter(t => t.document_id === documentId && t.tag_type === "parent");
    if (docTags.length === 0) return null;

    // Return tag with highest confidence
    return docTags.sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0];
  }, [allTags]);

  // Fetch chunks for viewing
  const {
    data: chunks,
    isLoading: chunksLoading
  } = useQuery({
    queryKey: ["document-chunks", viewChunksDoc?.id],
    enabled: !!viewChunksDoc,
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("document_chunks").select("*").eq("document_id", viewChunksDoc.id).order("chunk_index", {
        ascending: true
      });
      if (error) throw error;
      return data;
    }
  });

  // RAG Metrics query
  const {
    data: metrics
  } = useQuery({
    queryKey: ["rag-quick-metrics"],
    queryFn: async () => {
      const {
        data: docs
      } = await supabase.from("documents").select("status, target_chat");
      const {
        count: chunks
      } = await supabase.from("document_chunks").select("*", {
        count: "exact",
        head: true
      });
      return {
        totalDocs: docs?.length || 0,
        totalChunks: chunks || 0,
        completed: docs?.filter(d => d.status === "completed").length || 0,
        failed: docs?.filter(d => d.status === "failed").length || 0,
        health: docs?.filter(d => d.target_chat === "health").length || 0,
        study: docs?.filter(d => d.target_chat === "study").length || 0,
        general: docs?.filter(d => d.target_chat === "general").length || 0
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

  // Analyze text quality
  const analyzeTextQuality = (text: string) => {
    const validChars = text.match(/[\p{L}\p{N}\s.,;:!?'"()\-–—]/gu)?.length || 0;
    const letterCount = text.match(/\p{L}/gu)?.length || 0;
    return {
      charCount: text.length,
      wordCount: text.split(/\s+/).filter(w => w.length > 0).length,
      validRatio: text.length > 0 ? validChars / text.length : 0,
      letterCount
    };
  };

  // Extract and preview files before processing
  const handlePreviewExtraction = useCallback(async () => {
    if (selectedFiles.length === 0) return;
    setIsExtracting(true);
    
    const previews: typeof previewFiles = [];
    for (const file of selectedFiles) {
      try {
        const text = await extractTextFromPDF(file);
        const analysis = analyzeTextQuality(text);
        previews.push({
          file,
          extractedText: text,
          ...analysis
        });
      } catch (error: any) {
        previews.push({
          file,
          extractedText: `Erro na extração: ${error.message}`,
          charCount: 0,
          wordCount: 0,
          validRatio: 0,
          letterCount: 0
        });
      }
    }
    
    setPreviewFiles(previews);
    setShowPreviewModal(true);
    setIsExtracting(false);
  }, [selectedFiles, extractTextFromPDF]);

  // Retry failed document with custom validation parameters
  const retryWithParamsMutation = useMutation({
    mutationFn: async ({ docId, params }: { docId: string; params: typeof retryParams }) => {
      const { data: doc, error: fetchError } = await supabase
        .from("documents")
        .select("*")
        .eq("id", docId)
        .single();
      if (fetchError) throw fetchError;

      // Clear old data
      await supabase.from("document_chunks").delete().eq("document_id", docId);
      await supabase.from("document_tags").delete().eq("document_id", docId);

      // Reset status
      await supabase.from("documents").update({
        status: "pending",
        error_message: null
      }).eq("id", docId);

      // Reprocess with custom validation params
      const { error: processError } = await supabase.functions.invoke("process-bulk-document", {
        body: {
          documents_data: [{
            document_id: docId,
            full_text: doc.original_text,
            title: doc.filename
          }],
          validation_params: {
            min_text_length: params.minTextLength,
            valid_char_ratio: params.validCharRatio,
            min_letter_count: params.minLetterCount
          }
        }
      });
      if (processError) throw processError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Documento reprocessado com parâmetros ajustados!");
      setRetryDoc(null);
    },
    onError: (error: any) => {
      toast.error(`Erro ao reprocessar: ${error.message}`);
    }
  });

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
    mutationFn: async ({
      documentId,
      tagName,
      tagType,
      parentTagId
    }: {
      documentId: string;
      tagName: string;
      tagType: string;
      parentTagId?: string | null;
    }) => {
      const {
        error
      } = await supabase.from("document_tags").insert({
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
      queryClient.invalidateQueries({
        queryKey: ["document-tags"]
      });
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
      queryClient.invalidateQueries({
        queryKey: ["document-tags"]
      });
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
      const zipBlob = await zip.generateAsync({
        type: 'blob'
      });
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
      filtered = filtered.filter(d => d.filename?.toLowerCase().includes(query) || d.original_text?.toLowerCase().includes(query) || d.text_preview?.toLowerCase().includes(query) || d.ai_summary?.toLowerCase().includes(query));
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(d => d.status === statusFilter);
    }

    // Chat filter
    if (chatFilter !== "all") {
      filtered = filtered.filter(d => d.target_chat?.toLowerCase() === chatFilter);
    }

    // Readability filter
    if (readabilityFilter !== "all") {
      if (readabilityFilter === "high") {
        filtered = filtered.filter(d => d.readability_score !== null && d.readability_score >= 0.8);
      } else if (readabilityFilter === "medium") {
        filtered = filtered.filter(d => d.readability_score !== null && d.readability_score >= 0.5 && d.readability_score < 0.8);
      } else if (readabilityFilter === "low") {
        filtered = filtered.filter(d => d.readability_score !== null && d.readability_score < 0.5);
      } else if (readabilityFilter === "unscored") {
        filtered = filtered.filter(d => d.readability_score === null);
      }
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
      if (sortField === "status") {
        return (a.status || "").localeCompare(b.status || "") * direction;
      }
      if (sortField === "target_chat") {
        return (a.target_chat || "").localeCompare(b.target_chat || "") * direction;
      }
      if (sortField === "is_inserted") {
        return ((a.is_inserted ? 1 : 0) - (b.is_inserted ? 1 : 0)) * direction;
      }
      if (sortField === "inserted_in_chat") {
        return (a.inserted_in_chat || "").localeCompare(b.inserted_in_chat || "") * direction;
      }
      if (sortField === "readability_score") {
        return ((a.readability_score || 0) - (b.readability_score || 0)) * direction;
      }
      return 0;
    });
    return filtered;
  }, [documents, statusFilter, chatFilter, readabilityFilter, sortField, sortDirection, searchQuery]);

  // Pagination calculations
  const totalPages = Math.ceil((filteredDocuments?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDocuments = filteredDocuments?.slice(startIndex, endIndex) || [];

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, chatFilter, readabilityFilter, searchQuery]);

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
    setCurrentPage(1); // Reset pagination
  };
  const getStatusIcon = (status: FileUploadStatus['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'waiting':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    }
  };
  const getStatusBadgeVariant = (status: FileUploadStatus['status']) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'processing':
        return 'secondary';
      default:
        return 'outline';
    }
  };
  const getChatBadgeColor = (chat: string | null) => {
    switch (chat?.toUpperCase()) {
      case 'HEALTH':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'STUDY':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'GENERAL':
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      default:
        return '';
    }
  };
  const parentTags = tags?.filter(t => t.tag_type === "parent") || [];
  const childTags = tags?.filter(t => t.tag_type === "child") || [];
  const editingParentTags = editingTags?.filter(t => t.tag_type === "parent") || [];
  const editingChildTags = editingTags?.filter(t => t.tag_type === "child") || [];

  // Manual insertion mutation
  const manualInsertMutation = useMutation({
    mutationFn: async ({
      docId,
      targetChat
    }: {
      docId: string;
      targetChat: string;
    }) => {
      // 1. Atualizar documento
      const {
        error
      } = await supabase.from("documents").update({
        is_inserted: true,
        inserted_in_chat: targetChat,
        inserted_at: new Date().toISOString(),
        redirected_from: 'general'
      }).eq("id", docId);
      if (error) throw error;

      // 2. Registrar log de roteamento
      const {
        data: doc
      } = await supabase.from("documents").select("filename, target_chat").eq("id", docId).single();
      await supabase.from("document_routing_log").insert({
        document_id: docId,
        document_name: doc?.filename || 'Documento',
        original_category: doc?.target_chat || 'general',
        final_category: targetChat,
        action_type: 'manual_redirect',
        session_id: `admin-${Date.now()}`,
        scope_changed: true,
        disclaimer_shown: true,
        metadata: {
          manual_insertion: true,
          admin_action: true
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["documents"]
      });
      toast.success("Documento inserido no chat com sucesso!");
      setInsertionModalDoc(null);
    },
    onError: (error: any) => {
      toast.error(`Erro ao inserir: ${error.message}`);
    }
  });
  return <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">Documentos RAG</h2>
          
          {/* RAG Info Button com círculo, ícone Lightbulb e pulsing dot */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={() => setShowRagInfoModal(true)} className="relative flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border border-amber-500/30 hover:from-amber-500/30 hover:to-yellow-500/30 transition-all duration-300 group">
                  <Lightbulb className="h-5 w-5 text-amber-500 group-hover:text-amber-400 transition-colors" />
                  
                  {/* Green pulsing dot - posicionado na parte externa do círculo */}
                  <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Resumo da Engenharia RAG</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <p className="text-muted-foreground mt-2">
          Gerencie documentos para o sistema de Recuperação Aumentada por Geração
        </p>
      </div>

      {/* RAG Metrics Summary */}
      {metrics && <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Boxes className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Resumo RAG</h3>
          </div>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold text-primary">{metrics.totalDocs}</div>
              <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground mt-1">
                <FileText className="h-4 w-4" />
                Documentos
              </div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold text-primary">{metrics.totalChunks}</div>
              <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground mt-1">
                <Package className="h-4 w-4" />
                Chunks
              </div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold text-green-600">{metrics.totalDocs > 0 ? Math.round(metrics.completed / metrics.totalDocs * 100) : 0}%</div>
              <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground mt-1">
                <CheckCircle2 className="h-4 w-4" />
                Sucesso
              </div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-3xl font-bold text-destructive">{metrics.failed}</div>
              <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground mt-1">
                <XCircle className="h-4 w-4" />
                Falhas
              </div>
            </div>
          </div>
          <div className="flex gap-4 justify-center text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                <Heart className="h-3.5 w-3.5 mr-1" />
                Health: {metrics.health}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                <GraduationCap className="h-3.5 w-3.5 mr-1" />
                Study: {metrics.study}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/20">
                <FileText className="h-3.5 w-3.5 mr-1" />
                General: {metrics.general}
              </Badge>
            </div>
          </div>
        </Card>}

      {/* Documentation Generation Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Documentação Automática</h3>
            <p className="text-sm text-muted-foreground">
              Gerar/atualizar documentação técnica do sistema
            </p>
          </div>
          <Button onClick={() => generateDocsMutation.mutate()} disabled={generateDocsMutation.isPending}>
            {generateDocsMutation.isPending ? <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </> : <>
                <FileCode className="mr-2 h-4 w-4" />
                Gerar Documentação
              </>}
          </Button>
        </div>
        
        {lastDocVersion && <div className="mt-4 text-sm text-muted-foreground">
            Última versão: {lastDocVersion.version} - {new Date(lastDocVersion.created_at).toLocaleDateString()}
          </div>}
      </Card>

      {/* Upload Section with Drag-and-Drop */}
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <label className="block mb-2 text-sm font-medium">
              Upload de Documentos PDF - Auto-categorização via IA
            </label>
            
            {/* Drag and Drop Zone */}
            <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className={cn("relative border-2 border-dashed rounded-lg p-12 text-center transition-colors", isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50", uploading && "opacity-50 pointer-events-none")}>
              <div className="flex flex-col items-center gap-4">
                <Upload className={cn("h-12 w-12 transition-colors", isDragging ? "text-primary" : "text-muted-foreground")} />
                <div>
                  <p className="text-lg font-medium mb-1">
                    📄 Arraste arquivos PDF aqui
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">ou</p>
                  <Button variant="outline" size="lg" onClick={() => document.getElementById('file-input')?.click()} disabled={uploading}>
                    Escolher Arquivos
                  </Button>
                  <input id="file-input" type="file" accept=".pdf" multiple onChange={handleFileSelect} className="hidden" disabled={uploading} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Aceita múltiplos PDFs • Auto-categorização via IA
                </p>
              </div>
            </div>
          </div>

          {selectedFiles.length > 0 && <div className="space-y-2">
              <p className="text-sm font-medium">{selectedFiles.length} arquivo(s) selecionado(s):</p>
              {selectedFiles.map((file, idx) => <div key={idx} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm flex-1">{file.name}</span>
                  <Badge variant="outline">{(file.size / 1024).toFixed(2)} KB</Badge>
                </div>)}
            </div>}

          {/* Document AI Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-400/30">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <TableIcon className="h-4 w-4 text-blue-400" />
                <span className="font-medium">Google Document AI</span>
                <Badge variant="outline" className="text-xs bg-blue-500/20 border-blue-400/50">OCR Avançado</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Extração precisa de tabelas e dados estruturados. Recomendado para PDFs com tabelas complexas.
              </p>
            </div>
            <Switch
              checked={useDocumentAI}
              onCheckedChange={setUseDocumentAI}
            />
          </div>

          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={handlePreviewExtraction} 
              disabled={selectedFiles.length === 0 || uploading || isExtracting}
              className="flex-1"
              size="lg"
            >
              {isExtracting ? <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Extraindo texto...
              </> : <>
                <Eye className="mr-2 h-4 w-4" />
                Preview do Texto
              </>}
            </Button>
            
            <Button onClick={() => uploadMutation.mutate()} disabled={selectedFiles.length === 0 || uploading} className="flex-1" size="lg">
              {uploading ? <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </> : <>
                  <Upload className="mr-2 h-4 w-4" />
                  Enviar e Processar
                </>}
            </Button>
          </div>
        </div>
      </Card>

      {/* Real-time Upload Status Table */}
      {uploadStatuses.length > 0 && <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Status de Upload</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30%]">Nome do Arquivo</TableHead>
                <TableHead className="w-[12%]">Status</TableHead>
                <TableHead className="w-[40%]">Progresso</TableHead>
                <TableHead className="w-[18%]">Chat Destino</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uploadStatuses.map(fileStatus => <TableRow key={fileStatus.id}>
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
                      <div className="flex items-center gap-3">
                        <div className="flex-1 space-y-1">
                          <Progress value={fileStatus.progress} className="h-2" />
                          <span className="text-xs text-muted-foreground">{fileStatus.progress}%</span>
                        </div>
                        <span className="text-xs text-primary font-medium whitespace-nowrap animate-pulse">
                          {fileStatus.details}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {fileStatus.progress}%
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {fileStatus.targetChat ? <Badge variant="outline" className={getChatBadgeColor(fileStatus.targetChat)}>
                        {fileStatus.targetChat === 'health' && (
                          <span className="flex items-center gap-1.5">
                            <Heart className="h-3.5 w-3.5" />
                            HEALTH
                          </span>
                        )}
                        {fileStatus.targetChat === 'study' && (
                          <span className="flex items-center gap-1.5">
                            <GraduationCap className="h-3.5 w-3.5" />
                            STUDY
                          </span>
                        )}
                        {fileStatus.targetChat === 'general' && (
                          <span className="flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5" />
                            GENERAL
                          </span>
                        )}
                      </Badge> : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                </TableRow>)}
            </TableBody>
          </Table>
        </Card>}

      {/* Documents Table */}
      <Card className="p-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Documentos</h3>
          
          {/* Search and Filters */}
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome, conteúdo ou resumo..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
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
              
              <div className="flex-1">
                <Label className="text-sm font-medium mb-2 block">Legibilidade</Label>
                <Select value={readabilityFilter} onValueChange={setReadabilityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="high">
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        Alta (≥80%)
                      </span>
                    </SelectItem>
                    <SelectItem value="medium">
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                        Média (50-79%)
                      </span>
                    </SelectItem>
                    <SelectItem value="low">
                      <span className="flex items-center gap-2">
                        <XCircle className="h-3.5 w-3.5 text-red-500" />
                        Baixa (&lt;50%)
                      </span>
                    </SelectItem>
                    <SelectItem value="unscored">Sem pontuação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button variant="outline" onClick={() => {
              setStatusFilter("all");
              setChatFilter("all");
              setReadabilityFilter("all");
              setSearchQuery("");
              setSortField("created_at");
              setSortDirection("desc");
            }}>
                <X className="mr-2 h-4 w-4" />
                Limpar Filtros
              </Button>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" onClick={handleReprocessAllPendingFailed} disabled={isBulkReprocessing}>
                      {isBulkReprocessing ? <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Reprocessando...
                        </> : <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Reprocessar Pendentes/Falhados
                        </>}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-sm">Reprocessar todos os documentos com status pendente ou falhado</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          
          {/* Bulk Actions Bar */}
          {selectedDocs.size > 0 && <div className="flex items-center gap-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <span className="text-sm font-medium">
                {selectedDocs.size} documento(s) selecionado(s)
              </span>
              <Button variant="default" size="sm" onClick={exportSelectedAsZip} disabled={isExporting}>
                {isExporting ? <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exportando...
                  </> : <>
                    <Package className="mr-2 h-4 w-4" />
                    Exportar ZIP
                  </>}
              </Button>
              <Button variant="secondary" size="sm" onClick={handleBulkReprocess} disabled={isBulkReprocessing}>
                {isBulkReprocessing ? <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reprocessando...
                  </> : <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reprocessar Selecionados
                  </>}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedDocs(new Set())}>
                Limpar Seleção
              </Button>
            </div>}
        
        {isLoading ? <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div> : filteredDocuments && filteredDocuments.length > 0 ? <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox checked={selectedDocs.size === filteredDocuments.length && filteredDocuments.length > 0} onCheckedChange={selectAllFiltered} />
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort("filename")}>
                  <div className="flex items-center gap-2">
                    Nome
                    <ArrowUpDown className={cn("h-4 w-4", sortField === "filename" && "text-primary")} />
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort("status")}>
                  <div className="flex items-center gap-2">
                    Status
                    <ArrowUpDown className={cn("h-4 w-4", sortField === "status" && "text-primary")} />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">Estado atual do processamento do documento</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort("target_chat")}>
                  <div className="flex items-center gap-2">
                    Chat
                    <ArrowUpDown className={cn("h-4 w-4", sortField === "target_chat" && "text-primary")} />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">Chat de destino detectado automaticamente pela IA</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort("inserted_in_chat")}>
                  <div className="flex items-center gap-2">
                    Chat Inserido
                    <ArrowUpDown className={cn("h-4 w-4", sortField === "inserted_in_chat" && "text-primary")} />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">Chat onde o documento foi efetivamente inserido</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort("is_inserted")}>
                  <div className="flex items-center gap-2">
                    Inserido
                    <ArrowUpDown className={cn("h-4 w-4", sortField === "is_inserted" && "text-primary")} />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">Indica se o documento já foi inserido em algum chat</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    TAG Principal
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">Categoria principal identificada pela IA</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-2">
                    Estado
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">Estado de implementação: ready, needs_review, incomplete</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort("total_chunks")}>
                  <div className="flex items-center gap-2">
                    Chunks
                    <ArrowUpDown className={cn("h-4 w-4", sortField === "total_chunks" && "text-primary")} />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">Quantidade de fragmentos do documento para busca RAG</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort("readability_score")}>
                  <div className="flex items-center gap-2">
                    Legibilidade
                    <ArrowUpDown className={cn("h-4 w-4", sortField === "readability_score" && "text-primary")} />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">Percentual de qualidade e clareza do texto extraído do documento.</p>
                          <p className="text-xs mt-1">🟢 80-100%: Alta | 🔵 60-79%: Boa | 🟡 40-59%: Moderada | 🔴 0-39%: Baixa</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => toggleSort("created_at")}>
                  <div className="flex items-center gap-2">
                    Data
                    <ArrowUpDown className={cn("h-4 w-4", sortField === "created_at" && "text-primary")} />
                  </div>
                </TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedDocuments.map(doc => <TableRow key={doc.id} className="hover:bg-muted/50">
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Checkbox checked={selectedDocs.has(doc.id)} onCheckedChange={() => toggleDocSelection(doc.id)} />
                  </TableCell>
                  <TableCell className="font-medium">
                    <Popover>
                      <PopoverTrigger asChild>
                        <span className="cursor-pointer text-primary hover:underline">
                          {doc.filename}
                        </span>
                      </PopoverTrigger>
                      <PopoverContent className="w-96 p-4" side="right">
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="h-5 w-5 text-primary" />
                          <h4 className="font-semibold text-sm truncate">{doc.filename}</h4>
                        </div>
                        
                        {/* Resumo AI */}
                        <div className="mb-4">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Resumo</p>
                          <ScrollArea className="h-32">
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {doc.ai_summary || "Resumo não disponível"}
                            </p>
                          </ScrollArea>
                        </div>
                        
                        {/* Status atual */}
                        <div className="flex items-center gap-2 mb-4">
                          <Badge variant="outline">{doc.target_chat}</Badge>
                          {doc.is_inserted && <Badge className="bg-green-500">Inserido em {doc.inserted_in_chat}</Badge>}
                        </div>
                        
                        {/* Botões de ação - apenas se não estiver inserido */}
                        {!doc.is_inserted && <div className="grid grid-cols-2 gap-2">
                            <Button size="sm" variant="outline" onClick={() => manualInsertMutation.mutate({
                        docId: doc.id,
                        targetChat: 'health'
                      })} className="flex items-center gap-2" disabled={manualInsertMutation.isPending}>
                              <Heart className="h-4 w-4 text-red-500" />
                              Health
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => manualInsertMutation.mutate({
                        docId: doc.id,
                        targetChat: 'study'
                      })} className="flex items-center gap-2" disabled={manualInsertMutation.isPending}>
                              <GraduationCap className="h-4 w-4 text-blue-500" />
                              Study
                            </Button>
                          </div>}
                        
                        {/* Link para detalhes completos */}
                        
                      </PopoverContent>
                    </Popover>
                  </TableCell>
                  <TableCell onClick={() => setSelectedDoc(doc)}>
                    <Badge variant={isStuck(doc) ? "destructive" : doc.status === "completed" ? "default" : doc.status === "failed" ? "destructive" : "secondary"}>
                      {isStuck(doc) ? (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          TRAVADO
                        </span>
                      ) : doc.status}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={() => setSelectedDoc(doc)}>
                    <Badge variant="outline">{doc.target_chat || "pendente"}</Badge>
                  </TableCell>
                  <TableCell onClick={e => !doc.is_inserted && e.stopPropagation()}>
                    {doc.is_inserted && doc.inserted_in_chat ? <Badge className={getChatBadgeColor(doc.inserted_in_chat)}>
                        {doc.inserted_in_chat}
                      </Badge> : <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="sm" onClick={e => {
                              e.stopPropagation();
                              setInsertionModalDoc(doc);
                            }} className="h-8 w-8 p-0 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10 border-blue-500/30">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-sm">Inserir manualmente em um chat (Health ou Study)</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>}
                  </TableCell>
                  <TableCell onClick={() => setSelectedDoc(doc)} className="text-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="inline-flex">
                            {doc.is_inserted ? <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" /> : <XCircle className="h-5 w-5 text-gray-400 mx-auto" />}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">{doc.is_inserted ? "Documento inserido em um chat" : "Documento ainda não inserido"}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell onClick={() => setSelectedDoc(doc)}>
                    <Button variant="ghost" size="sm" onClick={e => {
                  e.stopPropagation();
                  setTagsModalDoc(doc);
                }} className="h-auto p-1">
                      {(() => {
                    const topTag = getTopParentTag(doc.id);
                    return topTag ? <Badge variant="secondary" className="text-xs">
                            {topTag.tag_name}
                          </Badge> : <span className="text-xs text-muted-foreground">—</span>;
                  })()}
                    </Button>
                  </TableCell>
                  <TableCell onClick={() => setSelectedDoc(doc)}>
                    {doc.implementation_status && <Badge variant={doc.implementation_status === "ready" ? "default" : doc.implementation_status === "needs_review" ? "secondary" : "outline"}>
                        {doc.implementation_status}
                      </Badge>}
                  </TableCell>
                  <TableCell onClick={() => setSelectedDoc(doc)}>{doc.total_chunks}</TableCell>
                  <TableCell onClick={() => setSelectedDoc(doc)}>
                    {doc.readability_score !== null ? <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${doc.readability_score >= 0.8 ? 'bg-green-500' : doc.readability_score >= 0.6 ? 'bg-blue-500' : doc.readability_score >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                        <span className={`font-medium ${doc.readability_score >= 0.8 ? 'text-green-500' : doc.readability_score >= 0.6 ? 'text-blue-500' : doc.readability_score >= 0.4 ? 'text-yellow-500' : 'text-red-500'}`}>
                          {Math.round(doc.readability_score * 100)}%
                        </span>
                      </div> : <Badge variant="outline" className="text-xs flex items-center gap-1">
                        {doc.is_readable ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" />
                            Legível
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3" />
                            Ilegível
                          </>
                        )}
                      </Badge>}
                  </TableCell>
                  <TableCell onClick={() => setSelectedDoc(doc)}>{new Date(doc.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={e => {
                              e.stopPropagation();
                              downloadAsPDF(doc);
                            }}>
                              <Download className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-sm">Baixar documento como PDF</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {(doc.status === "failed" || doc.status === "pending") && <>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={e => {
                                e.stopPropagation();
                                reprocessMutation.mutate(doc.id);
                              }} disabled={reprocessMutation.isPending}>
                                <RefreshCw className={cn("h-4 w-4", reprocessMutation.isPending && "animate-spin")} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-sm">Reprocessar documento</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={e => {
                                e.stopPropagation();
                                setRetryParams({ minTextLength: 50, validCharRatio: 0.5, minLetterCount: 30 });
                                setRetryDoc(doc);
                              }}>
                                <Settings2 className="h-4 w-4 text-amber-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-sm">Reprocessar com parâmetros ajustados</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </>}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={e => {
                              e.stopPropagation();
                              deleteMutation.mutate(doc.id);
                            }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-sm">Deletar documento permanentemente</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>)}
            </TableBody>
          </Table> : <div className="text-center py-8 text-muted-foreground">
            Nenhum documento encontrado
          </div>}
        
        {/* Pagination Controls */}
        {filteredDocuments && filteredDocuments.length > 0 && <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <p className="text-sm text-muted-foreground">
                  Mostrando {startIndex + 1}-{Math.min(endIndex, filteredDocuments.length)} de {filteredDocuments.length} documentos
                </p>
                
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Por página:</Label>
                  <Select value={itemsPerPage.toString()} onValueChange={v => {
                  setItemsPerPage(Number(v));
                  setCurrentPage(1);
                }}>
                    <SelectTrigger className="w-[80px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {totalPages > 1 && <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                    </PaginationItem>
                    
                    {Array.from({
                  length: totalPages
                }, (_, i) => i + 1).filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1).map((page, idx, arr) => <>
                          {idx > 0 && arr[idx - 1] !== page - 1 && <PaginationItem key={`ellipsis-${page}`}>
                              <PaginationEllipsis />
                            </PaginationItem>}
                          <PaginationItem key={page}>
                            <PaginationLink onClick={() => setCurrentPage(page)} isActive={currentPage === page} className="cursor-pointer">
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        </>)}
                    
                    <PaginationItem>
                      <PaginationNext onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>}
            </div>
          </div>}
        </div>
      </Card>

      {/* Document Details */}
      {selectedDoc && <Card className="p-6">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">{selectedDoc.filename}</h3>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline">{selectedDoc.target_chat || "não categorizado"}</Badge>
                  {selectedDoc.implementation_status && <Badge variant={selectedDoc.implementation_status === "ready" ? "default" : selectedDoc.implementation_status === "needs_review" ? "secondary" : "outline"}>
                      {selectedDoc.implementation_status}
                    </Badge>}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedDoc.total_words} palavras • {selectedDoc.total_chunks} chunks
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setViewChunksDoc(selectedDoc)}>
                  <Boxes className="h-4 w-4 mr-2" />
                  Ver Chunks
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditingTagsDoc(selectedDoc)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Tags
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedDoc(null)}>
                  Fechar
                </Button>
              </div>
            </div>

            {selectedDoc.ai_summary && <div>
                <h4 className="font-medium mb-2">Resumo (Auto-gerado)</h4>
                <p className="text-sm text-muted-foreground">{selectedDoc.ai_summary}</p>
              </div>}

            {parentTags.length > 0 && <div>
                <h4 className="font-medium mb-2">Tags</h4>
                <div className="space-y-2">
                  {parentTags.map(parent => <div key={parent.id}>
                      <Badge className="mb-1">{parent.tag_name}</Badge>
                      <div className="ml-4 flex flex-wrap gap-1">
                        {childTags.filter(c => c.parent_tag_id === parent.id).map(child => <Badge key={child.id} variant="outline" className="text-xs">
                              {child.tag_name}
                            </Badge>)}
                      </div>
                    </div>)}
                </div>
              </div>}

            {selectedDoc.text_preview && <div>
                <h4 className="font-medium mb-2">Preview</h4>
                <p className="text-sm text-muted-foreground font-mono bg-muted p-3 rounded">
                  {selectedDoc.text_preview}...
                </p>
              </div>}

            {/* Similar Documents Section */}
            <div>
              <h4 className="font-medium mb-2">📊 Documentos Similares</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Baseado em tags compartilhadas e conteúdo semântico
              </p>
              <div className="space-y-2">
                {documents?.filter(d => d.id !== selectedDoc.id && d.status === "completed" && d.target_chat === selectedDoc.target_chat).slice(0, 5).map(doc => <div key={doc.id} className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => setSelectedDoc(doc)}>
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
                    </div>)}
                {documents?.filter(d => d.id !== selectedDoc.id && d.status === "completed" && d.target_chat === selectedDoc.target_chat).length === 0 && <p className="text-sm text-muted-foreground italic">
                    Nenhum documento similar encontrado
                  </p>}
              </div>
            </div>
          </div>
        </Card>}

      {/* Tag Editing Dialog */}
      {editingTagsDoc && <Dialog open={!!editingTagsDoc} onOpenChange={open => !open && setEditingTagsDoc(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Tags - {editingTagsDoc.filename}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Parent Tags Section */}
              <div>
                <h4 className="font-semibold mb-3">📂 CATEGORIAS PRINCIPAIS</h4>
                <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/30 min-h-[60px]">
                  {editingParentTags.map(tag => <Badge key={tag.id} className="flex items-center gap-2 px-3 py-1">
                      {tag.tag_name}
                      <button onClick={() => removeTagMutation.mutate(tag.id)} className="hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>)}
                </div>
                
                <div className="flex gap-2 mt-2">
                  <Input placeholder="Nova categoria" value={newParentTag} onChange={e => setNewParentTag(e.target.value)} onKeyPress={e => {
                if (e.key === 'Enter' && newParentTag.trim()) {
                  addTagMutation.mutate({
                    documentId: editingTagsDoc.id,
                    tagName: newParentTag.trim(),
                    tagType: "parent"
                  });
                  setNewParentTag("");
                }
              }} />
                  <Button size="sm" onClick={() => {
                if (newParentTag.trim()) {
                  addTagMutation.mutate({
                    documentId: editingTagsDoc.id,
                    tagName: newParentTag.trim(),
                    tagType: "parent"
                  });
                  setNewParentTag("");
                }
              }} disabled={!newParentTag.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Child Tags Section */}
              <div>
                <h4 className="font-semibold mb-3">🏷️ TAGS (por categoria)</h4>
                {editingParentTags.length === 0 ? <p className="text-sm text-muted-foreground italic">
                    Adicione categorias principais primeiro
                  </p> : <div className="space-y-4">
                    {editingParentTags.map(parent => <div key={parent.id} className="border rounded-lg p-3">
                        <div className="font-medium text-sm mb-2">{parent.tag_name}:</div>
                        <div className="flex flex-wrap gap-2 mb-2 min-h-[40px]">
                          {editingChildTags.filter(c => c.parent_tag_id === parent.id).map(child => <Badge key={child.id} variant="outline" className="flex items-center gap-2 text-xs px-2 py-1">
                                {child.tag_name}
                                <button onClick={() => removeTagMutation.mutate(child.id)} className="hover:text-destructive">
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>)}
                        </div>
                        <div className="flex gap-2">
                          <Input placeholder="Nova tag" value={selectedParentForChild === parent.id ? newChildTag : ""} onFocus={() => setSelectedParentForChild(parent.id)} onChange={e => setNewChildTag(e.target.value)} onKeyPress={e => {
                    if (e.key === 'Enter' && newChildTag.trim()) {
                      addTagMutation.mutate({
                        documentId: editingTagsDoc.id,
                        tagName: newChildTag.trim(),
                        tagType: "child",
                        parentTagId: parent.id
                      });
                      setNewChildTag("");
                    }
                  }} className="text-sm" />
                          <Button size="sm" onClick={() => {
                    if (newChildTag.trim() && selectedParentForChild === parent.id) {
                      addTagMutation.mutate({
                        documentId: editingTagsDoc.id,
                        tagName: newChildTag.trim(),
                        tagType: "child",
                        parentTagId: parent.id
                      });
                      setNewChildTag("");
                    }
                  }} disabled={!newChildTag.trim() || selectedParentForChild !== parent.id}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>)}
                  </div>}
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
        </Dialog>}

      {/* Chunk Visualization Dialog */}
      {viewChunksDoc && <Dialog open={!!viewChunksDoc} onOpenChange={open => !open && setViewChunksDoc(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Chunks do Documento - {viewChunksDoc.filename}</DialogTitle>
            </DialogHeader>
            
            {chunksLoading ? <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div> : chunks && chunks.length > 0 ? <ScrollArea className="h-[60vh] pr-4">
                <div className="space-y-4">
                  {chunks.map((chunk, idx) => <Card key={chunk.id} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Chunk #{chunk.chunk_index + 1}</Badge>
                          <Badge variant="secondary">{chunk.word_count} palavras</Badge>
                          {chunk.embedding ? <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                              ✓ Embedding
                            </Badge> : <Badge variant="destructive">
                              ✗ Sem Embedding
                            </Badge>}
                        </div>
                      </div>
                      
                      <div className="text-sm bg-muted p-3 rounded font-mono max-h-[200px] overflow-y-auto">
                        {chunk.content.substring(0, 300)}
                        {chunk.content.length > 300 && "..."}
                      </div>
                      
                      {chunk.metadata && typeof chunk.metadata === 'object' && Object.keys(chunk.metadata).length > 0 && <div className="mt-2 text-xs text-muted-foreground">
                          <span className="font-medium">Metadata:</span> {JSON.stringify(chunk.metadata, null, 2)}
                        </div>}
                    </Card>)}
                </div>
              </ScrollArea> : <div className="text-center py-8 text-muted-foreground">
                Nenhum chunk encontrado para este documento
              </div>}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewChunksDoc(null)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>}
      
      {/* Duplicate Detection Modal */}
      {duplicateInfo && <Dialog open={!!duplicateInfo} onOpenChange={() => { setDuplicateInfo(null); setShowComparison(false); }}>
          <DialogContent className={cn("transition-all duration-300", showComparison ? "max-w-4xl" : "max-w-lg")}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                ⚠️ Documento Duplicado Detectado
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm">
                O arquivo <strong className="text-primary">{duplicateInfo.newFileName}</strong> possui conteúdo {duplicateInfo.similarityScore ? `${duplicateInfo.similarityScore}% similar` : "idêntico"} ao documento existente:
              </p>
              <div className="p-3 bg-muted rounded-lg border border-border">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">{duplicateInfo.existingFileName}</p>
                  {duplicateInfo.similarityScore && (
                    <Badge variant="secondary">
                      {duplicateInfo.similarityScore}% similar
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Toggle comparison button */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowComparison(!showComparison)}
                className="w-full text-muted-foreground hover:text-foreground"
              >
                <FileText className="h-4 w-4 mr-2" />
                {showComparison ? "Ocultar comparação" : "Ver comparação lado-a-lado"}
              </Button>
              
              {/* Side-by-side comparison with highlighted differences */}
              {showComparison && (() => {
                const { highlighted1, highlighted2 } = highlightTextDifferences(
                  duplicateInfo.newTextPreview || "",
                  duplicateInfo.existingTextPreview || ""
                );
                return (
                  <div className="space-y-3 mt-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <span className="w-3 h-3 bg-green-500/30 rounded"></span>
                        Texto exclusivo do novo
                      </span>
                      <span className="inline-flex items-center gap-1 ml-4">
                        <span className="w-3 h-3 bg-amber-500/30 rounded"></span>
                        Texto exclusivo do existente
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                            Novo
                          </Badge>
                          <span className="text-xs text-muted-foreground truncate">{duplicateInfo.newFileName}</span>
                        </div>
                        <ScrollArea className="h-[250px] rounded-lg border border-green-500/30 bg-green-500/5 p-3">
                          <div className="text-xs font-mono whitespace-pre-wrap text-muted-foreground">
                            {duplicateInfo.newTextPreview ? highlighted1 : "Preview não disponível"}
                          </div>
                        </ScrollArea>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30">
                            Existente
                          </Badge>
                          <span className="text-xs text-muted-foreground truncate">{duplicateInfo.existingFileName}</span>
                        </div>
                        <ScrollArea className="h-[250px] rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                          <div className="text-xs font-mono whitespace-pre-wrap text-muted-foreground">
                            {duplicateInfo.existingTextPreview ? highlighted2 : "Preview não disponível"}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>
                  </div>
                );
              })()}
              
              <p className="text-sm text-muted-foreground">
                O que deseja fazer?
              </p>
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={handleDiscardDuplicate} className="flex-1">
                <X className="h-4 w-4 mr-2" />
                Excluir Inserção
              </Button>
              <Button variant="destructive" onClick={handleReplaceDuplicate} className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Substituir Existente
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>}

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
            <div className="mt-6">
              <h4 className="font-semibold mb-3 text-center">📈 Fluxo RAG - Infográfico Interativo</h4>
              <RagFlowDiagram />
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

      {/* Tags Modal */}
      <Dialog open={!!tagsModalDoc} onOpenChange={open => !open && setTagsModalDoc(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>🏷️ Tags de "{tagsModalDoc?.filename}"</DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="h-96">
            {(() => {
            const docTags = allTags?.filter(t => t.document_id === tagsModalDoc?.id) || [];
            const parents = docTags.filter(t => t.tag_type === "parent");
            const children = docTags.filter(t => t.tag_type === "child");
            return <div className="space-y-4">
                  {parents.length > 0 ? parents.map(parent => <div key={parent.id} className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="text-sm">{parent.tag_name}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {Math.round((parent.confidence || 0) * 100)}% confiança
                          </span>
                        </div>
                        <div className="ml-4 flex flex-wrap gap-1">
                          {children.filter(c => c.parent_tag_id === parent.id).map(child => <Badge key={child.id} variant="outline" className="text-xs">
                              {child.tag_name} ({Math.round((child.confidence || 0) * 100)}%)
                            </Badge>)}
                        </div>
                      </div>) : <p className="text-center text-muted-foreground">Nenhuma tag encontrada</p>}
                </div>;
          })()}
          </ScrollArea>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setTagsModalDoc(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal de Inserção Manual */}
      <Dialog open={!!insertionModalDoc} onOpenChange={open => !open && setInsertionModalDoc(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Inserir Documento em Chat</DialogTitle>
            <p className="text-sm text-muted-foreground mt-2">
              "{insertionModalDoc?.filename}" está categorizado como <Badge>General</Badge>
            </p>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="text-sm">Escolha em qual chat este documento será inserido:</p>
            
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-20 flex-col gap-2 border-purple-500/30 hover:border-purple-500 hover:bg-purple-500/10" onClick={() => manualInsertMutation.mutate({
              docId: insertionModalDoc?.id,
              targetChat: 'health'
            })} disabled={manualInsertMutation.isPending}>
                <span className="text-2xl">🏥</span>
                <span className="font-medium">Health</span>
                <span className="text-xs text-muted-foreground">Saúde</span>
              </Button>
              
              <Button variant="outline" className="h-20 flex-col gap-2 border-blue-500/30 hover:border-blue-500 hover:bg-blue-500/10" onClick={() => manualInsertMutation.mutate({
              docId: insertionModalDoc?.id,
              targetChat: 'study'
            })} disabled={manualInsertMutation.isPending}>
                <span className="text-2xl">📚</span>
                <span className="font-medium">Study</span>
                <span className="text-xs text-muted-foreground">Estudo</span>
              </Button>
            </div>
            
            <div className="border-t pt-4">
              <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setInsertionModalDoc(null)}>
                Manter como General (não inserir)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Text Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Preview do Texto Extraído
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Revise a qualidade da extração antes de processar
            </p>
          </DialogHeader>
          
          <ScrollArea className="flex-1 max-h-[60vh]">
            <div className="space-y-4 pr-4">
              {previewFiles.map((preview, idx) => {
                const isValid = preview.charCount >= 50 && preview.validRatio >= 0.5 && preview.letterCount >= 30;
                return (
                  <Card key={idx} className={cn(
                    "p-4",
                    isValid ? "border-green-500/30" : "border-red-500/30"
                  )}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="font-medium">{preview.file.name}</span>
                        {isValid ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Válido
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Pode falhar
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-2 mb-3 text-xs">
                      <div className="p-2 bg-muted rounded text-center">
                        <div className="font-bold">{preview.charCount.toLocaleString()}</div>
                        <div className="text-muted-foreground">caracteres</div>
                      </div>
                      <div className="p-2 bg-muted rounded text-center">
                        <div className="font-bold">{preview.wordCount.toLocaleString()}</div>
                        <div className="text-muted-foreground">palavras</div>
                      </div>
                      <div className={cn(
                        "p-2 rounded text-center",
                        preview.validRatio >= 0.5 ? "bg-green-500/10" : "bg-red-500/10"
                      )}>
                        <div className="font-bold">{Math.round(preview.validRatio * 100)}%</div>
                        <div className="text-muted-foreground">chars válidos</div>
                      </div>
                      <div className={cn(
                        "p-2 rounded text-center",
                        preview.letterCount >= 30 ? "bg-green-500/10" : "bg-red-500/10"
                      )}>
                        <div className="font-bold">{preview.letterCount.toLocaleString()}</div>
                        <div className="text-muted-foreground">letras</div>
                      </div>
                    </div>
                    
                    <ScrollArea className="h-32 rounded border bg-muted/30 p-2">
                      <pre className="text-xs whitespace-pre-wrap font-mono">
                        {preview.extractedText.substring(0, 2000)}
                        {preview.extractedText.length > 2000 && "..."}
                      </pre>
                    </ScrollArea>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
          
          <DialogFooter className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowPreviewModal(false)}>
              Fechar
            </Button>
            <Button 
              onClick={() => {
                setShowPreviewModal(false);
                uploadMutation.mutate();
              }} 
              disabled={uploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              Processar {previewFiles.length} arquivo(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Retry with Custom Parameters Modal */}
      <Dialog open={!!retryDoc} onOpenChange={open => !open && setRetryDoc(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-amber-500" />
              Reprocessar com Parâmetros Ajustados
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              "{retryDoc?.filename}" falhou na validação. Ajuste os parâmetros para tentar novamente.
            </p>
          </DialogHeader>
          
          {retryDoc?.error_message && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <div className="flex items-start gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <span className="text-red-400">{retryDoc.error_message}</span>
              </div>
            </div>
          )}
          
          <div className="space-y-5 py-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-sm">Tamanho mínimo do texto</Label>
                <span className="text-sm font-mono bg-muted px-2 py-1 rounded">{retryParams.minTextLength} chars</span>
              </div>
              <Slider
                value={[retryParams.minTextLength]}
                onValueChange={([value]) => setRetryParams(p => ({ ...p, minTextLength: value }))}
                min={10}
                max={200}
                step={10}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">Documentos com menos caracteres serão rejeitados</p>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-sm">Proporção de caracteres válidos</Label>
                <span className="text-sm font-mono bg-muted px-2 py-1 rounded">{Math.round(retryParams.validCharRatio * 100)}%</span>
              </div>
              <Slider
                value={[retryParams.validCharRatio * 100]}
                onValueChange={([value]) => setRetryParams(p => ({ ...p, validCharRatio: value / 100 }))}
                min={20}
                max={90}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">Textos com muitos caracteres especiais ou corrompidos serão rejeitados</p>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-sm">Mínimo de letras</Label>
                <span className="text-sm font-mono bg-muted px-2 py-1 rounded">{retryParams.minLetterCount} letras</span>
              </div>
              <Slider
                value={[retryParams.minLetterCount]}
                onValueChange={([value]) => setRetryParams(p => ({ ...p, minLetterCount: value }))}
                min={5}
                max={100}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">Documentos sem texto substantivo (só números/símbolos) serão rejeitados</p>
            </div>
            
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">
                <strong>Dica:</strong> Reduza os valores se o documento for uma digitalização de baixa qualidade ou conter muitas tabelas/gráficos.
              </p>
            </div>
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setRetryDoc(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => retryWithParamsMutation.mutate({ docId: retryDoc.id, params: retryParams })}
              disabled={retryWithParamsMutation.isPending}
            >
              {retryWithParamsMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Reprocessando...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reprocessar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
};