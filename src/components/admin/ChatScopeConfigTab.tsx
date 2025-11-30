import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, AlertTriangle, CheckCircle2, XCircle, Settings, FileText, Search } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";

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
  created_at: string;
  updated_at: string;
}

export function ChatScopeConfigTab() {
  const { toast } = useToast();
  const [studyConfig, setStudyConfig] = useState<ChatConfig | null>(null);
  const [healthConfig, setHealthConfig] = useState<ChatConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingChat, setEditingChat] = useState<"study" | "health" | null>(null);
  const [testQuery, setTestQuery] = useState("");
  const [testResults, setTestResults] = useState<any>(null);
  const [testingChat, setTestingChat] = useState<"study" | "health">("study");

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from("chat_config")
        .select("*")
        .order("chat_type");

      if (error) throw error;

      const study = data.find((c) => c.chat_type === "study") as ChatConfig | undefined;
      const health = data.find((c) => c.chat_type === "health") as ChatConfig | undefined;

      setStudyConfig(study || null);
      setHealthConfig(health || null);

      // Calculate health issues
      if (study) calculateHealthIssues(study);
      if (health) calculateHealthIssues(health);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar configurações",
        description: error.message,
        variant: "destructive",
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
        message: `Threshold muito alto (${config.match_threshold}) pode causar rejeições falsas`,
      });
    }

    // Check match count
    if (config.match_count < 3) {
      issues.push({
        type: "warning",
        message: `Match count baixo (${config.match_count}) pode perder contexto`,
      });
    }

    // Check documents
    if (config.total_documents === 0) {
      issues.push({
        type: "error",
        message: "Nenhum documento disponível para este chat",
      });
    } else if (config.total_documents < 3) {
      issues.push({
        type: "warning",
        message: `Apenas ${config.total_documents} documento(s) disponível(is)`,
      });
    }

    // Check unreadable documents
    const { data: unreadableDocs } = await supabase
      .from("documents")
      .select("id")
      .eq("target_chat", config.chat_type)
      .eq("is_readable", false);

    if (unreadableDocs && unreadableDocs.length > 0) {
      issues.push({
        type: "warning",
        message: `${unreadableDocs.length} documento(s) ilegível(is)`,
      });
    }

    // Update health status
    const status = issues.some((i) => i.type === "error")
      ? "error"
      : issues.some((i) => i.type === "warning")
      ? "warning"
      : "ok";

    await supabase
      .from("chat_config")
      .update({ health_status: status, health_issues: issues })
      .eq("id", config.id);

    // Update local state
    if (config.chat_type === "study") {
      setStudyConfig({ ...config, health_status: status, health_issues: issues });
    } else {
      setHealthConfig({ ...config, health_status: status, health_issues: issues });
    }
  };

  const updateConfig = async (chatType: "study" | "health", updates: Partial<ChatConfig>) => {
    try {
      const { error } = await supabase
        .from("chat_config")
        .update(updates)
        .eq("chat_type", chatType);

      if (error) throw error;

      toast({
        title: "Configuração atualizada",
        description: `Chat de ${chatType === "study" ? "Estudo" : "Saúde"} atualizado com sucesso`,
      });

      fetchConfigs();
      setEditingChat(null);
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar configuração",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const testRAGSearch = async () => {
    if (!testQuery.trim()) return;

    try {
      const { data, error } = await supabase.functions.invoke("search-documents", {
        body: {
          query: testQuery,
          targetChat: testingChat,
          matchThreshold: testingChat === "study" ? studyConfig?.match_threshold : healthConfig?.match_threshold,
          matchCount: testingChat === "study" ? studyConfig?.match_count : healthConfig?.match_count,
        },
      });

      if (error) throw error;

      setTestResults(data);

      toast({
        title: "Teste concluído",
        description: `${data.results?.length || 0} chunks encontrados`,
      });
    } catch (error: any) {
      toast({
        title: "Erro no teste",
        description: error.message,
        variant: "destructive",
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

    return (
      <Card className="flex-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {icon}
              <CardTitle>{title}</CardTitle>
              {getStatusIcon(config.health_status)}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingChat(isEditing ? null : config.chat_type)}
            >
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
          {config.health_issues && config.health_issues.length > 0 && (
            <div className="space-y-2">
              {config.health_issues.map((issue: any, idx: number) => (
                <div
                  key={idx}
                  className={`flex items-start gap-2 p-2 rounded-lg ${
                    issue.type === "error"
                      ? "bg-red-50 dark:bg-red-950"
                      : "bg-yellow-50 dark:bg-yellow-950"
                  }`}
                >
                  {issue.type === "error" ? (
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                  )}
                  <p className="text-sm text-black dark:text-white">{issue.message}</p>
                </div>
              ))}
            </div>
          )}

          {/* RAG Configuration */}
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Match Threshold</Label>
              {isEditing ? (
                <div className="flex items-center gap-4 mt-2">
                  <Slider
                    value={[config.match_threshold]}
                    onValueChange={(v) => {
                      const updated = config.chat_type === "study" ? studyConfig : healthConfig;
                      if (updated) {
                        const setter = config.chat_type === "study" ? setStudyConfig : setHealthConfig;
                        setter({ ...updated, match_threshold: v[0] });
                      }
                    }}
                    min={0.05}
                    max={0.5}
                    step={0.05}
                    className="flex-1"
                  />
                  <span className="text-sm font-mono">{config.match_threshold.toFixed(2)}</span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">{config.match_threshold}</p>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium">Match Count</Label>
              {isEditing ? (
                <Input
                  type="number"
                  value={config.match_count}
                  onChange={(e) => {
                    const updated = config.chat_type === "study" ? studyConfig : healthConfig;
                    if (updated) {
                      const setter = config.chat_type === "study" ? setStudyConfig : setHealthConfig;
                      setter({ ...updated, match_count: parseInt(e.target.value) || 3 });
                    }
                  }}
                  min={3}
                  max={10}
                  className="mt-1"
                />
              ) : (
                <p className="text-sm text-muted-foreground mt-1">{config.match_count}</p>
              )}
            </div>
          </div>

          {/* Scope Topics */}
          <div>
            <Label className="text-sm font-medium">Escopo Permitido (Auto-Gerado)</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {config.scope_topics.map((topic, idx) => (
                <Badge key={idx} variant="secondary">
                  {topic}
                </Badge>
              ))}
            </div>
          </div>

          {/* Tags Extraídas dos Documentos */}
          {config.document_tags_data && config.document_tags_data.length > 0 && (
            <Card className="border-2 border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  🏷️ Tags Extraídas dos Documentos
                  <Badge variant="outline" className="ml-auto">
                    {config.total_documents} documentos
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Parent Tags */}
                {(() => {
                  const parentTags = config.document_tags_data.filter(t => t.tag_type === "parent");
                  const highConfParents = parentTags.filter(t => t.avg_confidence >= 0.7);
                  const lowConfParents = parentTags.filter(t => t.avg_confidence < 0.7);
                  
                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold">📁 Tags Parent ({parentTags.length})</Label>
                        {lowConfParents.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            ⚠️ {lowConfParents.length} com baixa confiança
                          </Badge>
                        )}
                      </div>
                      
                      {highConfParents.length > 0 && (
                        <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                          <p className="text-xs text-muted-foreground mb-2">
                            ✅ Incluídas no escopo (confidence ≥ 70%):
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {highConfParents.map((tag, idx) => (
                              <Badge 
                                key={idx} 
                                variant="default"
                                className="text-xs"
                              >
                                {tag.tag_name} {(tag.avg_confidence * 100).toFixed(0)}%
                                {tag.count > 1 && (
                                  <span className="ml-1 opacity-70">×{tag.count}</span>
                                )}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {lowConfParents.length > 0 && (
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
                          <p className="text-xs text-muted-foreground mb-2">
                            ⚠️ Não incluídas (confidence {'<'} 70%):
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {lowConfParents.map((tag, idx) => (
                              <Badge 
                                key={idx} 
                                variant="outline"
                                className="text-xs opacity-60"
                              >
                                {tag.tag_name} {(tag.avg_confidence * 100).toFixed(0)}%
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <Separator />

                {/* Child Tags */}
                {(() => {
                  const childTags = config.document_tags_data.filter(t => t.tag_type === "child");
                  
                  if (childTags.length === 0) return null;
                  
                  return (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">📄 Tags Child ({childTags.length})</Label>
                      <div className="p-3 bg-muted/50 rounded-lg max-h-32 overflow-y-auto">
                        <div className="flex flex-wrap gap-1.5">
                          {childTags.slice(0, 20).map((tag, idx) => (
                            <Badge 
                              key={idx} 
                              variant="secondary"
                              className="text-xs"
                            >
                              {tag.tag_name}
                            </Badge>
                          ))}
                          {childTags.length > 20 && (
                            <Badge variant="outline" className="text-xs">
                              +{childTags.length - 20} mais...
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Statistics */}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                  <span>
                    🔄 Última atualização: {new Date(config.updated_at).toLocaleString('pt-BR')}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      toast({
                        title: "Atualizando tags...",
                        description: "Recalculando escopo com base nos documentos",
                      });
                      updateConfig(config.chat_type, config);
                    }}
                    className="h-7 text-xs"
                  >
                    ↻ Forçar Atualização
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rejection Message */}
          {isEditing ? (
            <div>
              <Label className="text-sm font-medium">Mensagem de Rejeição</Label>
              <Textarea
                value={config.rejection_message}
                onChange={(e) => {
                  const updated = config.chat_type === "study" ? studyConfig : healthConfig;
                  if (updated) {
                    const setter = config.chat_type === "study" ? setStudyConfig : setHealthConfig;
                    setter({ ...updated, rejection_message: e.target.value });
                  }
                }}
                className="mt-1"
                rows={3}
              />
            </div>
          ) : null}

          {isEditing && (
            <Button onClick={() => updateConfig(config.chat_type, config)} className="w-full">
              Salvar Alterações
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Carregando configurações...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Configurações de Chat & Delimitações</h2>
        <p className="text-muted-foreground mt-1">
          Gerencie as delimitações e configurações RAG de cada assistente
        </p>
      </div>

      {/* Chat Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderChatCard(studyConfig, "Chat de Estudo", <FileText className="h-5 w-5" />)}
        {renderChatCard(healthConfig, "Chat de Saúde", <MessageSquare className="h-5 w-5" />)}
      </div>

      <Separator />

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
            <Input
              placeholder="Digite uma query para testar..."
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && testRAGSearch()}
              className="flex-1"
            />
            <select
              value={testingChat}
              onChange={(e) => setTestingChat(e.target.value as "study" | "health")}
              className="border rounded-md px-3 py-2 text-black dark:text-white"
            >
              <option value="study">Study</option>
              <option value="health">Health</option>
            </select>
            <Button onClick={testRAGSearch}>
              <Search className="h-4 w-4 mr-2" />
              Testar
            </Button>
          </div>

          {testResults && (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">
                  {testResults.results?.length || 0} chunks encontrados
                </span>
                {testResults.analytics?.top_score && (
                  <Badge variant="outline">
                    Score: {testResults.analytics.top_score.toFixed(3)}
                  </Badge>
                )}
              </div>

              {testResults.results && testResults.results.length > 0 ? (
                <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                  <p className="text-sm">RAG retornaria contexto para esta query</p>
                </div>
              ) : (
                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                  <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                  <p className="text-sm">Nenhum contexto encontrado - chat responderia sem RAG</p>
                </div>
              )}

              {testResults.results?.slice(0, 2).map((result: any, idx: number) => (
                <div key={idx} className="p-3 border rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Chunk {idx + 1}</span>
                    <Badge variant="outline" className="text-xs">
                      {result.similarity?.toFixed(3)}
                    </Badge>
                  </div>
                  <p className="text-sm line-clamp-2">{result.content}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
