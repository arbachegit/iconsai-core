import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, AlertTriangle, CheckCircle2, XCircle, Settings, FileText, Search, BookOpen, Heart, Tag as TagIcon, RefreshCw, Volume2, Plus, Trash2, Code, ChevronDown, Info, ArrowUpDown } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { AdminTitleWithInfo } from "./AdminTitleWithInfo";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
interface ChatConfig {
  id: string;
  chat_type: "study" | "health";
  match_threshold: number;
  match_count: number;
  scope_topics: string[];
  rejection_message: string;
  system_prompt_base: string;
  rag_priority_instruction: string | null;
  total_documents: number;
  total_chunks: number;
  last_document_added: string | null;
  health_status: "ok" | "warning" | "error";
  health_issues: any[];
  document_tags_data: Array<{
    tag_name: string;
    tag_type: "parent" | "child";
    avg_confidence: number;
    count: number;
  }>;
  phonetic_map: Record<string, string>;
  created_at: string;
  updated_at: string;
}
export function ChatScopeConfigTab() {
  const {
    toast
  } = useToast();
  const [studyConfig, setStudyConfig] = useState<ChatConfig | null>(null);
  const [healthConfig, setHealthConfig] = useState<ChatConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingChat, setEditingChat] = useState<"study" | "health" | null>(null);
  const [testQuery, setTestQuery] = useState("");
  const [testResults, setTestResults] = useState<any>(null);
  const [testingChat, setTestingChat] = useState<"study" | "health">("study");
  const [phoneticStudyOpen, setPhoneticStudyOpen] = useState(false);
  const [phoneticHealthOpen, setPhoneticHealthOpen] = useState(false);
  const [showJsonDialog, setShowJsonDialog] = useState<"study" | "health" | null>(null);
  const [newTerm, setNewTerm] = useState("");
  const [newPronunciation, setNewPronunciation] = useState("");
  const [addingTermFor, setAddingTermFor] = useState<"study" | "health" | null>(null);
  const [studySearchTerm, setStudySearchTerm] = useState("");
  const [healthSearchTerm, setHealthSearchTerm] = useState("");
  const [studyScopeOpen, setStudyScopeOpen] = useState(false);
  const [healthScopeOpen, setHealthScopeOpen] = useState(false);
  const [studyTagsOpen, setStudyTagsOpen] = useState(false);
  const [healthTagsOpen, setHealthTagsOpen] = useState(false);
  const [studyTagsSortColumn, setStudyTagsSortColumn] = useState<'tag_name' | 'confidence'>('tag_name');
  const [studyTagsSortAsc, setStudyTagsSortAsc] = useState(true);
  const [healthTagsSortColumn, setHealthTagsSortColumn] = useState<'tag_name' | 'confidence'>('tag_name');
  const [healthTagsSortAsc, setHealthTagsSortAsc] = useState(true);
  useEffect(() => {
    fetchConfigs();
  }, []);
  const fetchConfigs = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("chat_config").select("*").order("chat_type");
      if (error) throw error;
      const study = data.find(c => c.chat_type === "study") as ChatConfig | undefined;
      const health = data.find(c => c.chat_type === "health") as ChatConfig | undefined;
      setStudyConfig(study || null);
      setHealthConfig(health || null);

      // Calculate health issues
      if (study) calculateHealthIssues(study);
      if (health) calculateHealthIssues(health);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar configurações",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const calculateHealthIssues = async (config: ChatConfig) => {
    const issues: any[] = [];

    // Check threshold
    if (config.match_threshold > 0.3) {
      issues.push({
        type: "warning",
        message: `Threshold muito alto (${config.match_threshold}) pode causar rejeições falsas`
      });
    }

    // Check match count
    if (config.match_count < 3) {
      issues.push({
        type: "warning",
        message: `Match count baixo (${config.match_count}) pode perder contexto`
      });
    }

    // Check documents
    if (config.total_documents === 0) {
      issues.push({
        type: "error",
        message: "Nenhum documento disponível para este chat"
      });
    } else if (config.total_documents < 3) {
      issues.push({
        type: "warning",
        message: `Apenas ${config.total_documents} documento(s) disponível(is)`
      });
    }

    // Check unreadable documents
    const {
      data: unreadableDocs
    } = await supabase.from("documents").select("id").eq("target_chat", config.chat_type).eq("is_readable", false);
    if (unreadableDocs && unreadableDocs.length > 0) {
      issues.push({
        type: "warning",
        message: `${unreadableDocs.length} documento(s) ilegível(is)`
      });
    }

    // Update health status
    const status = issues.some(i => i.type === "error") ? "error" : issues.some(i => i.type === "warning") ? "warning" : "ok";
    await supabase.from("chat_config").update({
      health_status: status,
      health_issues: issues
    }).eq("id", config.id);

    // Update local state
    if (config.chat_type === "study") {
      setStudyConfig({
        ...config,
        health_status: status,
        health_issues: issues
      });
    } else {
      setHealthConfig({
        ...config,
        health_status: status,
        health_issues: issues
      });
    }
  };
  const updateConfig = async (chatType: "study" | "health", updates: Partial<ChatConfig>) => {
    try {
      const {
        error
      } = await supabase.from("chat_config").update(updates).eq("chat_type", chatType);
      if (error) throw error;
      toast({
        title: "Configuração atualizada",
        description: `Chat de ${chatType === "study" ? "Estudo" : "Saúde"} atualizado com sucesso`
      });
      fetchConfigs();
      setEditingChat(null);
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar configuração",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const testRAGSearch = async () => {
    if (!testQuery.trim()) return;
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke("search-documents", {
        body: {
          query: testQuery,
          targetChat: testingChat,
          matchThreshold: testingChat === "study" ? studyConfig?.match_threshold : healthConfig?.match_threshold,
          matchCount: testingChat === "study" ? studyConfig?.match_count : healthConfig?.match_count
        }
      });
      if (error) throw error;
      setTestResults(data);
      toast({
        title: "Teste concluído",
        description: `${data.results?.length || 0} chunks encontrados`
      });
    } catch (error: any) {
      toast({
        title: "Erro no teste",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ok":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };
  const renderChatCard = (config: ChatConfig | null, title: string, icon: React.ReactNode) => {
    if (!config) return null;
    const isEditing = editingChat === config.chat_type;
    return <Card className="flex-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {icon}
              <CardTitle>{title}</CardTitle>
              {getStatusIcon(config.health_status)}
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditingChat(isEditing ? null : config.chat_type)}>
              <Settings className="h-4 w-4 mr-2" />
              {isEditing ? "Cancelar" : "Editar"}
            </Button>
          </div>
          <CardDescription>
            {config.total_documents} documentos • {config.total_chunks} chunks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Health Issues */}
          {config.health_issues && config.health_issues.length > 0 && <div className="space-y-2">
              {config.health_issues.map((issue: any, idx: number) => <div key={idx} className={`flex items-start gap-2 p-2 rounded-lg ${issue.type === "error" ? "bg-red-50 dark:bg-red-950" : "bg-yellow-50 dark:bg-yellow-950"}`}>
                  {issue.type === "error" ? <XCircle className="h-4 w-4 text-red-500 mt-0.5" /> : <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />}
                  <p className="text-sm text-black dark:text-white">{issue.message}</p>
                </div>)}
            </div>}

          {/* RAG Configuration */}
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Match Threshold</Label>
              {isEditing ? <div className="flex items-center gap-4 mt-2">
                  <Slider value={[config.match_threshold]} onValueChange={v => {
                const updated = config.chat_type === "study" ? studyConfig : healthConfig;
                if (updated) {
                  const setter = config.chat_type === "study" ? setStudyConfig : setHealthConfig;
                  setter({
                    ...updated,
                    match_threshold: v[0]
                  });
                }
              }} min={0.05} max={0.5} step={0.05} className="flex-1" />
                  <span className="text-sm font-mono">{config.match_threshold.toFixed(2)}</span>
                </div> : <p className="text-sm text-muted-foreground mt-1">{config.match_threshold}</p>}
            </div>

            <div>
              <Label className="text-sm font-medium">Match Count</Label>
              {isEditing ? <Input type="number" value={config.match_count} onChange={e => {
              const updated = config.chat_type === "study" ? studyConfig : healthConfig;
              if (updated) {
                const setter = config.chat_type === "study" ? setStudyConfig : setHealthConfig;
                setter({
                  ...updated,
                  match_count: parseInt(e.target.value) || 3
                });
              }
            }} min={3} max={10} className="mt-1" /> : <p className="text-sm text-muted-foreground mt-1">{config.match_count}</p>}
            </div>
          </div>

          {/* Scope Topics */}
          <Collapsible 
            open={config.chat_type === "study" ? studyScopeOpen : healthScopeOpen}
            onOpenChange={config.chat_type === "study" ? setStudyScopeOpen : setHealthScopeOpen}
          >
            <Card className="border-2 border-primary/20">
              <CardHeader className="pb-3">
                <CollapsibleTrigger asChild>
                  <button className="flex items-center justify-between w-full group">
                    <CardTitle className="text-base flex items-center gap-2 cursor-pointer">
                      Escopo Permitido (Auto-Gerado)
                      <Badge variant="outline" className="text-xs">
                        {config.scope_topics.length}
                      </Badge>
                    </CardTitle>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                      (config.chat_type === "study" ? studyScopeOpen : healthScopeOpen) ? "rotate-180" : ""
                    }`} />
                  </button>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  {(() => {
                    // Group topics by first letter
                    const sortedTopics = [...config.scope_topics].sort((a, b) => 
                      a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
                    );
                    const groupedTopics: Record<string, string[]> = {};
                    sortedTopics.forEach(topic => {
                      const firstLetter = topic.charAt(0).toUpperCase();
                      if (!groupedTopics[firstLetter]) {
                        groupedTopics[firstLetter] = [];
                      }
                      groupedTopics[firstLetter].push(topic);
                    });
                    const letters = Object.keys(groupedTopics).sort();
                    
                    return (
                      <div className="space-y-2">
                        {letters.map(letter => (
                          <div key={letter} className="space-y-1">
                            <span className="text-xs font-bold text-primary">{letter}</span>
                            <div className="flex flex-wrap gap-1.5 ml-2">
                              {groupedTopics[letter].map((topic, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {topic}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                        {config.scope_topics.length === 0 && (
                          <p className="text-xs text-muted-foreground">Nenhum escopo definido</p>
                        )}
                      </div>
                    );
                  })()}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Tags Extraídas dos Documentos */}
          {config.document_tags_data && config.document_tags_data.length > 0 && (
            <Collapsible 
              open={config.chat_type === "study" ? studyTagsOpen : healthTagsOpen}
              onOpenChange={config.chat_type === "study" ? setStudyTagsOpen : setHealthTagsOpen}
            >
              <Card className="border-2 border-primary/20">
                <CardHeader className="pb-3">
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center justify-between w-full group">
                      <CardTitle className="text-base flex items-center gap-2 cursor-pointer">
                        <TagIcon className="h-4 w-4" />
                        Tags Extraídas dos Documentos
                        <Badge variant="outline" className="text-xs">
                          {config.document_tags_data.length}
                        </Badge>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {config.total_documents} docs
                        </Badge>
                      </CardTitle>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                        (config.chat_type === "study" ? studyTagsOpen : healthTagsOpen) ? "rotate-180" : ""
                      }`} />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {/* Search Field */}
                    <div className="relative mt-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar tags..."
                        value={config.chat_type === "study" ? studySearchTerm : healthSearchTerm}
                        onChange={(e) => config.chat_type === "study" ? setStudySearchTerm(e.target.value) : setHealthSearchTerm(e.target.value)}
                        className="pl-9 h-9"
                      />
                    </div>
                  </CollapsibleContent>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    {/* Parent Tags Table */}
                    {(() => {
                      const searchTerm = config.chat_type === "study" ? studySearchTerm : healthSearchTerm;
                      const sortColumn = config.chat_type === "study" ? studyTagsSortColumn : healthTagsSortColumn;
                      const sortAsc = config.chat_type === "study" ? studyTagsSortAsc : healthTagsSortAsc;
                      const setSortColumn = config.chat_type === "study" ? setStudyTagsSortColumn : setHealthTagsSortColumn;
                      const setSortAsc = config.chat_type === "study" ? setStudyTagsSortAsc : setHealthTagsSortAsc;
                      
                      const handleSort = (column: 'tag_name' | 'confidence') => {
                        if (sortColumn === column) {
                          setSortAsc(!sortAsc);
                        } else {
                          setSortColumn(column);
                          setSortAsc(true);
                        }
                      };
                      
                      const allParentTags = config.document_tags_data
                        .filter(t => t.tag_type === "parent")
                        .filter(t => !searchTerm || t.tag_name.toLowerCase().includes(searchTerm.toLowerCase()))
                        .sort((a, b) => {
                          if (sortColumn === 'tag_name') {
                            const result = a.tag_name.localeCompare(b.tag_name, 'pt-BR');
                            return sortAsc ? result : -result;
                          } else {
                            const result = a.avg_confidence - b.avg_confidence;
                            return sortAsc ? result : -result;
                          }
                        });
                      const totalParentTags = config.document_tags_data.filter(t => t.tag_type === "parent").length;
                      const lowConfCount = allParentTags.filter(t => t.avg_confidence < 0.7).length;
                      
                      return (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold flex items-center gap-2">
                              <BookOpen className="h-4 w-4" />
                              Tags Parent ({allParentTags.length}{searchTerm ? ` de ${totalParentTags}` : ''})
                            </Label>
                            {lowConfCount > 0 && (
                              <Badge variant="outline" className="text-xs flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {lowConfCount} com baixa confiança
                              </Badge>
                            )}
                          </div>
                          
                          {allParentTags.length > 0 ? (
                            <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleSort('tag_name')}
                                        className="h-8 px-2 -ml-2"
                                      >
                                        Nome da Tag
                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                      </Button>
                                    </TableHead>
                                    <TableHead>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleSort('confidence')}
                                        className="h-8 px-2 -ml-2"
                                      >
                                        Confiança
                                        <ArrowUpDown className="ml-2 h-4 w-4" />
                                      </Button>
                                    </TableHead>
                                    <TableHead className="w-[60px] text-center">Escopo</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {allParentTags.map((tag, idx) => {
                                    const isInScope = tag.avg_confidence >= 0.7;
                                    return (
                                      <TableRow key={idx}>
                                        <TableCell className="font-medium">
                                          {tag.tag_name}
                                          {tag.count > 1 && (
                                            <span className="ml-1 text-xs text-muted-foreground">×{tag.count}</span>
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          <Badge 
                                            variant="outline" 
                                            className={`text-xs ${
                                              tag.avg_confidence >= 0.7 
                                                ? "border-green-500/50 text-green-400" 
                                                : tag.avg_confidence >= 0.5 
                                                  ? "border-yellow-500/50 text-yellow-400"
                                                  : "border-red-500/50 text-red-400"
                                            }`}
                                          >
                                            {(tag.avg_confidence * 100).toFixed(0)}%
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Info className={`h-4 w-4 mx-auto cursor-help ${
                                                  isInScope ? "text-green-400" : "text-muted-foreground"
                                                }`} />
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                {isInScope ? (
                                                  <p className="text-xs">
                                                    <span className="font-semibold text-green-400">Incluída no escopo</span>
                                                    <br />
                                                    Escopo: {tag.tag_name}
                                                  </p>
                                                ) : (
                                                  <p className="text-xs">
                                                    <span className="font-semibold text-yellow-400">Não incluída no escopo</span>
                                                    <br />
                                                    Confiança abaixo de 70%
                                                  </p>
                                                )}
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          ) : searchTerm ? (
                            <p className="text-xs text-muted-foreground text-center py-2">
                              Nenhuma tag parent encontrada para "{searchTerm}"
                            </p>
                          ) : null}
                        </div>
                      );
                    })()}

                    <Separator />

                    {/* Child Tags */}
                    {(() => {
                      const searchTerm = config.chat_type === "study" ? studySearchTerm : healthSearchTerm;
                      const allChildTags = config.document_tags_data
                        .filter(t => t.tag_type === "child")
                        .filter(t => !searchTerm || t.tag_name.toLowerCase().includes(searchTerm.toLowerCase()))
                        .sort((a, b) => a.tag_name.localeCompare(b.tag_name, 'pt-BR'));
                      const totalChildTags = config.document_tags_data.filter(t => t.tag_type === "child").length;
                      if (totalChildTags === 0) return null;
                      return (
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Tags Child ({allChildTags.length}{searchTerm ? ` de ${totalChildTags}` : ''})
                          </Label>
                          <div className="p-3 bg-muted/50 rounded-lg max-h-40 overflow-y-auto">
                            <div className="flex flex-wrap gap-1.5">
                              {allChildTags.map((tag, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {tag.tag_name}
                                </Badge>
                              ))}
                              {searchTerm && allChildTags.length === 0 && (
                                <p className="text-xs text-muted-foreground text-center w-full py-2">
                                  Nenhuma tag child encontrada para "{searchTerm}"
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Statistics */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                      <span className="flex items-center gap-1">
                        <RefreshCw className="h-3 w-3" />
                        Última atualização: {new Date(config.updated_at).toLocaleString('pt-BR')}
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => {
                        toast({
                          title: "Atualizando tags...",
                          description: "Recalculando escopo com base nos documentos"
                        });
                        updateConfig(config.chat_type, config);
                      }} className="h-7 text-xs flex items-center gap-1">
                        <RefreshCw className="h-3 w-3" />
                        Forçar Atualização
                      </Button>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Rejection Message */}
          {isEditing ? <div>
              <Label className="text-sm font-medium">Mensagem de Rejeição</Label>
              <Textarea value={config.rejection_message} onChange={e => {
            const updated = config.chat_type === "study" ? studyConfig : healthConfig;
            if (updated) {
              const setter = config.chat_type === "study" ? setStudyConfig : setHealthConfig;
              setter({
                ...updated,
                rejection_message: e.target.value
              });
            }
          }} className="mt-1" rows={3} />
            </div> : null}

          {isEditing && <Button onClick={() => updateConfig(config.chat_type, config)} className="w-full">
              Salvar Alterações
            </Button>}
        </CardContent>
      </Card>;
  };
  if (loading) {
    return <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando configurações...</p>
      </div>;
  }
  return <div className="space-y-6">
      <div>
        <AdminTitleWithInfo title="Configurações de Chat & Delimitações" level="h2" icon={MessageSquare} tooltipText="Clique para ver explicação detalhada do sistema RAG" infoContent={
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            {/* Introdução */}
            <div>
              <h5 className="font-bold text-primary mb-2">Sistema de Delimitação RAG</h5>
              <p className="text-xs leading-relaxed">
                O sistema RAG (Retrieval-Augmented Generation) usa documentos processados para criar um escopo dinâmico 
                que delimita o que os assistentes de IA podem responder e quais imagens podem gerar.
              </p>
            </div>

            {/* Fluxo de Dados */}
            <div className="bg-muted/30 rounded-lg p-3">
              <h5 className="font-semibold text-sm mb-2 text-primary">📊 Fluxo de Dados</h5>
              <div className="text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-primary font-bold">1.</span>
                  <span><strong>Upload de Documento</strong> → IA extrai tags (parent + child)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary font-bold">2.</span>
                  <span><strong>Tags Parent ≥70%</strong> → Viram <code className="bg-primary/20 px-1 rounded">scope_topics</code></span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary font-bold">3.</span>
                  <span><strong>Todas as Tags</strong> → Armazenadas em <code className="bg-primary/20 px-1 rounded">document_tags_data</code></span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary font-bold">4.</span>
                  <span><strong>System Prompt</strong> → Recebe escopo para delimitar respostas</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary font-bold">5.</span>
                  <span><strong>Geração de Imagens</strong> → Valida prompt contra keywords permitidas</span>
                </div>
              </div>
            </div>

            {/* Tabela de Funções */}
            <div>
              <h5 className="font-semibold text-sm mb-2 text-primary">📋 Tabela de Funções</h5>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-primary/10">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-semibold">Campo</th>
                      <th className="px-2 py-1.5 text-left font-semibold">Função</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr>
                      <td className="px-2 py-1.5 font-medium text-primary">scope_topics</td>
                      <td className="px-2 py-1.5">Tags parent com confiança ≥70%. Definem os temas principais permitidos no chat.</td>
                    </tr>
                    <tr className="bg-muted/20">
                      <td className="px-2 py-1.5 font-medium text-primary">document_tags_data</td>
                      <td className="px-2 py-1.5">Todas as tags extraídas (parent + child) com metadados. Usadas na validação de imagens.</td>
                    </tr>
                    <tr>
                      <td className="px-2 py-1.5 font-medium text-primary">phonetic_map</td>
                      <td className="px-2 py-1.5">Dicionário de pronúncias. Normaliza termos técnicos antes do Text-to-Speech.</td>
                    </tr>
                    <tr className="bg-muted/20">
                      <td className="px-2 py-1.5 font-medium text-primary">match_threshold</td>
                      <td className="px-2 py-1.5">Limiar de similaridade vetorial (0.15 padrão). Abaixo disso, busca por keywords.</td>
                    </tr>
                    <tr>
                      <td className="px-2 py-1.5 font-medium text-primary">match_count</td>
                      <td className="px-2 py-1.5">Quantidade de chunks retornados pela busca RAG (5 padrão).</td>
                    </tr>
                    <tr className="bg-muted/20">
                      <td className="px-2 py-1.5 font-medium text-primary">rejection_message</td>
                      <td className="px-2 py-1.5">Mensagem exibida quando usuário pergunta fora do escopo permitido.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Onde é Usado */}
            <div className="bg-muted/30 rounded-lg p-3">
              <h5 className="font-semibold text-sm mb-2 text-primary">🎯 Onde Cada Campo é Usado</h5>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-card/50 rounded p-2">
                  <div className="font-semibold text-cyan-400 mb-1">System Prompt</div>
                  <ul className="space-y-0.5 text-muted-foreground">
                    <li>• scope_topics</li>
                    <li>• rejection_message</li>
                  </ul>
                </div>
                <div className="bg-card/50 rounded p-2">
                  <div className="font-semibold text-emerald-400 mb-1">Geração de Imagens</div>
                  <ul className="space-y-0.5 text-muted-foreground">
                    <li>• scope_topics</li>
                    <li>• document_tags_data</li>
                  </ul>
                </div>
                <div className="bg-card/50 rounded p-2">
                  <div className="font-semibold text-amber-400 mb-1">Text-to-Speech</div>
                  <ul className="space-y-0.5 text-muted-foreground">
                    <li>• phonetic_map</li>
                  </ul>
                </div>
                <div className="bg-card/50 rounded p-2">
                  <div className="font-semibold text-purple-400 mb-1">Busca RAG</div>
                  <ul className="space-y-0.5 text-muted-foreground">
                    <li>• match_threshold</li>
                    <li>• match_count</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Diferença entre Chats */}
            <div>
              <h5 className="font-semibold text-sm mb-2 text-primary">🔀 Diferença entre os Chats</h5>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="border border-blue-500/30 rounded-lg p-2 bg-blue-500/5">
                  <div className="font-bold text-blue-400 mb-1 flex items-center gap-1">
                    <BookOpen className="h-3 w-3" /> Chat de Estudo
                  </div>
                  <p className="text-muted-foreground">Focado em KnowRISK, ACC, KnowYOU e conteúdo técnico de IA.</p>
                </div>
                <div className="border border-rose-500/30 rounded-lg p-2 bg-rose-500/5">
                  <div className="font-bold text-rose-400 mb-1 flex items-center gap-1">
                    <Heart className="h-3 w-3" /> Chat de Saúde
                  </div>
                  <p className="text-muted-foreground">Focado em saúde, medicina e Hospital Moinhos de Vento.</p>
                </div>
              </div>
            </div>

            {/* Nota importante */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">
              <p className="text-xs text-amber-200">
                <strong>⚠️ Importante:</strong> O escopo é auto-gerado a partir dos documentos RAG. 
                Adicionar novos documentos automaticamente expande os temas permitidos.
              </p>
            </div>
          </div>
        } />
        <p className="text-muted-foreground mt-1">
          Gerencie as delimitações e configurações RAG de cada assistente
        </p>
      </div>

      {/* RAG Test Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Teste de Busca RAG
          </CardTitle>
          <CardDescription>Teste se uma query retorna contexto dos documentos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder="Digite uma query para testar..." value={testQuery} onChange={e => setTestQuery(e.target.value)} onKeyPress={e => e.key === "Enter" && testRAGSearch()} className="flex-1" />
            <select value={testingChat} onChange={e => setTestingChat(e.target.value as "study" | "health")} className="border rounded-md px-3 py-2 text-black dark:text-white">
              <option value="study">Study</option>
              <option value="health">Health</option>
            </select>
            <Button onClick={testRAGSearch}>
              <Search className="h-4 w-4 mr-2" />
              Testar
            </Button>
          </div>

          {testResults && <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">
                  {testResults.results?.length || 0} chunks encontrados
                </span>
                {testResults.analytics?.top_score && <Badge variant="outline">
                    Score: {testResults.analytics.top_score.toFixed(3)}
                  </Badge>}
              </div>

              {testResults.results && testResults.results.length > 0 ? <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                  <p className="text-sm text-primary-foreground">RAG retornaria contexto para esta query</p>
                </div> : <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                  <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                  <p className="text-sm">Nenhum contexto encontrado - chat responderia sem RAG</p>
                </div>}

              {testResults.results?.slice(0, 2).map((result: any, idx: number) => <div key={idx} className="p-3 border rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Chunk {idx + 1}</span>
                    <Badge variant="outline" className="text-xs">
                      {result.similarity?.toFixed(3)}
                    </Badge>
                  </div>
                  <p className="text-sm line-clamp-2">{result.content}</p>
                </div>)}
            </div>}
        </CardContent>
      </Card>

      {/* Biblioteca de Pronúncias */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Biblioteca de Pronúncias
          </CardTitle>
          <CardDescription>
            Configure pronúncias fonéticas para TTS de cada chat
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Study Pronunciation Section */}
          <Collapsible open={phoneticStudyOpen} onOpenChange={setPhoneticStudyOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Study ({Object.keys(studyConfig?.phonetic_map || {}).length} termos)
                </span>
                <span>{phoneticStudyOpen ? "▼" : "▶"}</span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-3">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowJsonDialog("study")}
                  className="flex-1"
                >
                  <Code className="h-4 w-4 mr-2" />
                  Expandir JSON
                </Button>
                <Button
                  size="sm"
                  onClick={() => setAddingTermFor("study")}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Termo
                </Button>
              </div>

              {studyConfig?.phonetic_map && Object.keys(studyConfig.phonetic_map).length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="text-left p-2 font-medium">Termo</th>
                          <th className="text-left p-2 font-medium">Pronúncia</th>
                          <th className="w-36 p-1">
                            <div className="relative">
                              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                              <Input
                                placeholder="Buscar..."
                                value={studySearchTerm}
                                onChange={(e) => setStudySearchTerm(e.target.value)}
                                className="h-7 pl-7 text-xs"
                              />
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(studyConfig.phonetic_map)
                          .filter(([term, pronunciation]) => {
                            if (!studySearchTerm.trim()) return true;
                            const search = studySearchTerm.toLowerCase();
                            return term.toLowerCase().includes(search) || 
                                   (pronunciation as string).toLowerCase().includes(search);
                          })
                          .map(([term, pronunciation]) => (
                          <tr key={term} className="border-t">
                            <td className="p-2 font-mono text-xs">{term}</td>
                            <td className="p-2">{pronunciation}</td>
                            <td className="p-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const updated = { ...studyConfig.phonetic_map };
                                  delete updated[term];
                                  updateConfig("study", { phonetic_map: updated });
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum termo configurado
                </p>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Health Pronunciation Section */}
          <Collapsible open={phoneticHealthOpen} onOpenChange={setPhoneticHealthOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Health ({Object.keys(healthConfig?.phonetic_map || {}).length} termos)
                </span>
                <span>{phoneticHealthOpen ? "▼" : "▶"}</span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-3">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowJsonDialog("health")}
                  className="flex-1"
                >
                  <Code className="h-4 w-4 mr-2" />
                  Expandir JSON
                </Button>
                <Button
                  size="sm"
                  onClick={() => setAddingTermFor("health")}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Termo
                </Button>
              </div>

              {healthConfig?.phonetic_map && Object.keys(healthConfig.phonetic_map).length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="text-left p-2 font-medium">Termo</th>
                          <th className="text-left p-2 font-medium">Pronúncia</th>
                          <th className="w-36 p-1">
                            <div className="relative">
                              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                              <Input
                                placeholder="Buscar..."
                                value={healthSearchTerm}
                                onChange={(e) => setHealthSearchTerm(e.target.value)}
                                className="h-7 pl-7 text-xs"
                              />
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(healthConfig.phonetic_map)
                          .filter(([term, pronunciation]) => {
                            if (!healthSearchTerm.trim()) return true;
                            const search = healthSearchTerm.toLowerCase();
                            return term.toLowerCase().includes(search) || 
                                   (pronunciation as string).toLowerCase().includes(search);
                          })
                          .map(([term, pronunciation]) => (
                          <tr key={term} className="border-t">
                            <td className="p-2 font-mono text-xs">{term}</td>
                            <td className="p-2">{pronunciation}</td>
                            <td className="p-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const updated = { ...healthConfig.phonetic_map };
                                  delete updated[term];
                                  updateConfig("health", { phonetic_map: updated });
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum termo configurado
                </p>
              )}
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* JSON Dialog */}
      <Dialog open={showJsonDialog !== null} onOpenChange={() => setShowJsonDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              JSON - {showJsonDialog === "study" ? "Study" : "Health"}
            </DialogTitle>
            <DialogDescription>
              Visualização em formato JSON do mapa fonético
            </DialogDescription>
          </DialogHeader>
          <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
            {JSON.stringify(
              showJsonDialog === "study" ? studyConfig?.phonetic_map : healthConfig?.phonetic_map,
              null,
              2
            )}
          </pre>
        </DialogContent>
      </Dialog>

      {/* Add Term Dialog */}
      <Dialog open={addingTermFor !== null} onOpenChange={() => setAddingTermFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Novo Termo</DialogTitle>
            <DialogDescription>
              {addingTermFor === "study" ? "Study" : "Health"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Termo</Label>
              <Input
                placeholder="Ex: LLM"
                value={newTerm}
                onChange={(e) => setNewTerm(e.target.value)}
              />
            </div>
            <div>
              <Label>Pronúncia Fonética</Label>
              <Input
                placeholder="Ex: éle-éle-ême"
                value={newPronunciation}
                onChange={(e) => setNewPronunciation(e.target.value)}
              />
            </div>
            <Button
              onClick={() => {
                if (!newTerm.trim() || !newPronunciation.trim()) {
                  toast({
                    title: "Campos obrigatórios",
                    description: "Preencha termo e pronúncia",
                    variant: "destructive",
                  });
                  return;
                }
                const config = addingTermFor === "study" ? studyConfig : healthConfig;
                if (config) {
                  const updated = { ...config.phonetic_map, [newTerm]: newPronunciation };
                  updateConfig(addingTermFor!, { phonetic_map: updated });
                  setNewTerm("");
                  setNewPronunciation("");
                  setAddingTermFor(null);
                }
              }}
              className="w-full"
            >
              Adicionar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Separator />

      {/* Chat Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderChatCard(studyConfig, "Chat de Estudo", <FileText className="h-5 w-5" />)}
        {renderChatCard(healthConfig, "Chat de Saúde", <MessageSquare className="h-5 w-5" />)}
      </div>
    </div>;
}