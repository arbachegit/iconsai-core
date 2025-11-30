import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Loader2, Trash2, RefreshCw, FileCode, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

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
        const { error: processError } = await supabase.functions.invoke("process-bulk-document", {
          body: { documents_data: documentsData }
        });
        
        if (processError) throw processError;
        
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Documentos RAG</h2>
        <p className="text-muted-foreground">
          Gerencie documentos para o sistema de Recuperação Aumentada por Geração
        </p>
      </div>

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
        <h3 className="text-lg font-semibold mb-4">Documentos</h3>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : documents && documents.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Chat</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Chunks</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow 
                  key={doc.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedDoc(doc)}
                >
                  <TableCell className="font-medium">{doc.filename}</TableCell>
                  <TableCell>
                    <Badge variant={
                      doc.status === "completed" ? "default" :
                      doc.status === "failed" ? "destructive" :
                      "secondary"
                    }>
                      {doc.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{doc.target_chat || "pendente"}</Badge>
                  </TableCell>
                  <TableCell>
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
                  <TableCell>{doc.total_chunks}</TableCell>
                  <TableCell>{new Date(doc.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {doc.status === "failed" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            reprocessMutation.mutate(doc.id);
                          }}
                          disabled={reprocessMutation.isPending}
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
              <Button variant="outline" size="sm" onClick={() => setSelectedDoc(null)}>
                Fechar
              </Button>
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
          </div>
        </Card>
      )}
    </div>
  );
};