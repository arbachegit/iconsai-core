import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { FileText, ChevronDown, Loader2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Document {
  id: string;
  filename: string;
  target_chat: string;
  ai_summary: string | null;
  status: string;
  implementation_status: string | null;
  created_at: string;
  total_chunks: number | null;
  total_words: number | null;
}

interface DocumentTag {
  id: string;
  tag_name: string;
  tag_type: string;
  confidence: number | null;
  parent_tag_id: string | null;
  document_id: string;
}

export const DocumentAnalysisTab = () => {
  const [filterChat, setFilterChat] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());

  // Fetch documents
  const { data: documents, isLoading: docsLoading } = useQuery({
    queryKey: ["documents-analysis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Document[];
    },
  });

  // Fetch all tags
  const { data: allTags, isLoading: tagsLoading } = useQuery({
    queryKey: ["document-tags-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_tags")
        .select("*");

      if (error) throw error;
      return data as DocumentTag[];
    },
  });

  // Group tags by document
  const tagsByDocument = allTags?.reduce((acc, tag) => {
    if (!acc[tag.document_id]) {
      acc[tag.document_id] = [];
    }
    acc[tag.document_id].push(tag);
    return acc;
  }, {} as Record<string, DocumentTag[]>) || {};

  // Filter documents
  const filteredDocs = documents?.filter((doc) => {
    const matchesChat = filterChat === "all" || doc.target_chat === filterChat;
    const matchesStatus = filterStatus === "all" || doc.implementation_status === filterStatus;
    const matchesSearch = doc.filename.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesChat && matchesStatus && matchesSearch;
  }) || [];

  const toggleExpanded = (docId: string) => {
    setExpandedDocs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(docId)) {
        newSet.delete(docId);
      } else {
        newSet.add(docId);
      }
      return newSet;
    });
  };

  const getChatBadgeVariant = (chat: string) => {
    switch (chat) {
      case "health":
        return "default";
      case "study":
        return "secondary";
      case "general":
        return "outline";
      default:
        return "outline";
    }
  };

  const getStatusBadgeVariant = (status: string | null) => {
    switch (status) {
      case "ready":
        return "default";
      case "needs_review":
        return "secondary";
      case "incomplete":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getParentTags = (docTags: DocumentTag[]) => {
    return docTags.filter((t) => !t.parent_tag_id);
  };

  const getChildTags = (docTags: DocumentTag[], parentId: string) => {
    return docTags.filter((t) => t.parent_tag_id === parentId);
  };

  if (docsLoading || tagsLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6" />
          Análise de Documentos
        </h2>
        <p className="text-muted-foreground mt-1">
          Visualização detalhada de documentos com resumos AI, tags e status
        </p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Buscar</Label>
            <Input
              placeholder="Nome do documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <Label>Chat Destino</Label>
            <Select value={filterChat} onValueChange={setFilterChat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="health">Saúde</SelectItem>
                <SelectItem value="study">Estudo</SelectItem>
                <SelectItem value="general">Geral</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status de Implementação</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ready">Pronto</SelectItem>
                <SelectItem value="needs_review">Precisa Revisão</SelectItem>
                <SelectItem value="incomplete">Incompleto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Documents List */}
      <div className="space-y-4">
        {filteredDocs.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            Nenhum documento encontrado
          </Card>
        ) : (
          filteredDocs.map((doc) => {
            const docTags = tagsByDocument[doc.id] || [];
            const parentTags = getParentTags(docTags);

            return (
              <Collapsible
                key={doc.id}
                open={expandedDocs.has(doc.id)}
                onOpenChange={() => toggleExpanded(doc.id)}
              >
                <Card className="border-primary/20">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="mt-1">
                            <ChevronDown
                              className={`h-4 w-4 transition-transform ${
                                expandedDocs.has(doc.id) ? "rotate-180" : ""
                              }`}
                            />
                          </Button>
                        </CollapsibleTrigger>
                        <div className="flex-1">
                          <div className="font-semibold text-lg mb-2">{doc.filename}</div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={getChatBadgeVariant(doc.target_chat)}>
                              {doc.target_chat === "health" ? "🏥 Saúde" : doc.target_chat === "study" ? "📚 Estudo" : "📄 Geral"}
                            </Badge>
                            {doc.implementation_status && (
                              <Badge variant={getStatusBadgeVariant(doc.implementation_status)}>
                                {doc.implementation_status === "ready" ? "✓ Pronto" : 
                                 doc.implementation_status === "needs_review" ? "⚠ Precisa Revisão" : 
                                 "✗ Incompleto"}
                              </Badge>
                            )}
                            <Badge variant="outline">
                              {doc.total_chunks || 0} chunks
                            </Badge>
                            <Badge variant="outline">
                              {doc.total_words || 0} palavras
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    <CollapsibleContent className="mt-4 space-y-4">
                      {/* AI Summary */}
                      {doc.ai_summary && (
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <h4 className="font-semibold mb-2">📝 Resumo AI</h4>
                          <p className="text-sm text-muted-foreground">{doc.ai_summary}</p>
                        </div>
                      )}

                      {/* Tags Hierarchy */}
                      {parentTags.length > 0 && (
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            Tags Hierárquicas
                          </h4>
                          <div className="space-y-3">
                            {parentTags.map((parent) => {
                              const children = getChildTags(docTags, parent.id);
                              return (
                                <div key={parent.id} className="border-l-2 border-primary/30 pl-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="default">{parent.tag_name}</Badge>
                                    <span className="text-xs text-muted-foreground">
                                      ({parent.tag_type})
                                    </span>
                                    <Badge variant="outline" className="text-xs">
                                      {Math.round((parent.confidence || 0) * 100)}%
                                    </Badge>
                                  </div>
                                  {children.length > 0 && (
                                    <div className="flex items-center gap-2 flex-wrap ml-4">
                                      {children.map((child) => (
                                        <Badge key={child.id} variant="secondary" className="text-xs">
                                          {child.tag_name}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Metadata */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Data:</span>
                          <div className="font-mono">
                            {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Status:</span>
                          <div>{doc.status}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Chunks:</span>
                          <div>{doc.total_chunks || 0}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Palavras:</span>
                          <div>{doc.total_words || 0}</div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Card>
              </Collapsible>
            );
          })
        )}
      </div>
    </div>
  );
};
