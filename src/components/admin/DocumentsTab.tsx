import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Loader2, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import * as pdfjsLib from "pdfjs-dist";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export const DocumentsTab = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetChat, setTargetChat] = useState<"health" | "study" | "general">("health");
  const [uploading, setUploading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
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

  // Upload and process document
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("Nenhum arquivo selecionado");
      
      setUploading(true);
      
      try {
        // Extract text from PDF
        console.log("Extraindo texto do PDF...");
        const extractedText = await extractTextFromPDF(selectedFile);
        
        if (extractedText.length < 100) {
          throw new Error("Texto extraído muito curto (mínimo 100 caracteres)");
        }
        
        console.log(`Texto extraído: ${extractedText.length} caracteres`);
        
        // Create document record
        const { data: document, error: docError } = await supabase
          .from("documents")
          .insert({
            filename: selectedFile.name,
            original_text: extractedText,
            text_preview: extractedText.substring(0, 500),
            target_chat: targetChat,
            status: "pending"
          })
          .select()
          .single();
        
        if (docError) throw docError;
        
        console.log("Documento criado:", document.id);
        
        // Process document in background
        const processPromises = [
          supabase.functions.invoke("process-document-with-text", {
            body: { 
              documentId: document.id, 
              text: extractedText,
              filename: selectedFile.name,
              targetChat: targetChat
            }
          }),
          supabase.functions.invoke("suggest-document-tags", {
            body: { documentId: document.id, text: extractedText }
          }),
          supabase.functions.invoke("generate-document-summary", {
            body: { documentId: document.id, text: extractedText }
          })
        ];
        
        await Promise.all(processPromises);
        
        toast.success("Documento enviado com sucesso!");
        setSelectedFile(null);
        
      } finally {
        setUploading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
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
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setSelectedFile(file);
    } else {
      toast.error("Por favor, selecione um arquivo PDF");
    }
  }, []);

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

      {/* Upload Section */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block mb-2 text-sm font-medium">Selecionar PDF</label>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="block w-full text-sm border rounded-lg cursor-pointer"
                disabled={uploading}
              />
            </div>
            
            <div className="w-48">
              <label className="block mb-2 text-sm font-medium">Chat Alvo</label>
              <Select value={targetChat} onValueChange={(v: any) => setTargetChat(v)} disabled={uploading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="health">Saúde</SelectItem>
                  <SelectItem value="study">Estudo</SelectItem>
                  <SelectItem value="general">Geral</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedFile && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <FileText className="h-5 w-5" />
              <span className="text-sm">{selectedFile.name}</span>
              <Badge>{(selectedFile.size / 1024).toFixed(2)} KB</Badge>
            </div>
          )}

          <Button
            onClick={() => uploadMutation.mutate()}
            disabled={!selectedFile || uploading}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
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
                    <Badge variant="outline">{doc.target_chat}</Badge>
                  </TableCell>
                  <TableCell>{doc.total_chunks}</TableCell>
                  <TableCell>{new Date(doc.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
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
                <p className="text-sm text-muted-foreground">
                  {selectedDoc.total_words} palavras • {selectedDoc.total_chunks} chunks
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedDoc(null)}>
                Fechar
              </Button>
            </div>

            {selectedDoc.ai_summary && (
              <div>
                <h4 className="font-medium mb-2">Resumo</h4>
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