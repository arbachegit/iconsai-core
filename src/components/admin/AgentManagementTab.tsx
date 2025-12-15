import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  Bot, Settings, Save, RefreshCw, Volume2, Upload, BarChart3, 
  Brush, Calculator, Globe, MessageSquare, Tag, X, Edit, 
  CheckCircle2, XCircle, Loader2
} from "lucide-react";

import type { Database } from "@/integrations/supabase/types";

type ChatAgent = Database["public"]["Tables"]["chat_agents"]["Row"];

interface RegionalRule {
  id: string;
  region_code: string;
  region_name: string;
  is_active: boolean;
}

const defaultCapabilities = {
  voice: false,
  file_upload: false,
  charts: false,
  drawing: false,
  math: false
};

const AgentManagementTab: React.FC = () => {
  const [agents, setAgents] = useState<ChatAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAgent, setEditingAgent] = useState<ChatAgent | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<ChatAgent>>({});
  const [regionalRules, setRegionalRules] = useState<RegionalRule[]>([]);
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState({ allowed: "", forbidden: "" });

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("chat_agents")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error("Error fetching agents:", error);
      toast.error("Erro ao carregar agentes");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRegionalRules = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("regional_tone_rules")
        .select("id, region_code, region_name, is_active")
        .eq("is_active", true)
        .order("region_name");

      if (error) throw error;
      setRegionalRules(data || []);
    } catch (error) {
      console.error("Error fetching regional rules:", error);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
    fetchRegionalRules();
  }, [fetchAgents, fetchRegionalRules]);

  const handleEdit = (agent: ChatAgent) => {
    setEditingAgent(agent);
    setFormData({
      ...agent,
      capabilities: agent.capabilities || defaultCapabilities,
      allowed_tags: agent.allowed_tags || [],
      forbidden_tags: agent.forbidden_tags || []
    });
    setTagInput({ allowed: "", forbidden: "" });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingAgent) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("chat_agents")
        .update({
          name: formData.name,
          slug: formData.slug,
          description: formData.description,
          avatar_url: formData.avatar_url,
          greeting_message: formData.greeting_message,
          is_active: formData.is_active,
          rag_collection: formData.rag_collection,
          match_threshold: formData.match_threshold,
          match_count: formData.match_count,
          allowed_tags: formData.allowed_tags,
          forbidden_tags: formData.forbidden_tags,
          system_prompt: formData.system_prompt,
          rejection_message: formData.rejection_message,
          capabilities: formData.capabilities,
          regional_tone: formData.regional_tone,
          pronunciation_set: formData.pronunciation_set,
          maieutic_level: formData.maieutic_level,
          updated_at: new Date().toISOString()
        })
        .eq("id", editingAgent.id);

      if (error) throw error;

      toast.success("Agente atualizado com sucesso");
      setIsDialogOpen(false);
      fetchAgents();
    } catch (error) {
      console.error("Error saving agent:", error);
      toast.error("Erro ao salvar agente");
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = (field: "allowed_tags" | "forbidden_tags") => {
    const inputKey = field === "allowed_tags" ? "allowed" : "forbidden";
    const tag = tagInput[inputKey].trim();
    if (!tag) return;

    const currentTags = (formData[field] as string[]) || [];
    if (!currentTags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        [field]: [...currentTags, tag]
      }));
    }
    setTagInput(prev => ({ ...prev, [inputKey]: "" }));
  };

  const handleRemoveTag = (field: "allowed_tags" | "forbidden_tags", tag: string) => {
    const currentTags = (formData[field] as string[]) || [];
    setFormData(prev => ({
      ...prev,
      [field]: currentTags.filter(t => t !== tag)
    }));
  };

  const toggleCapability = (key: string) => {
    const caps = (formData.capabilities || defaultCapabilities) as Record<string, boolean>;
    setFormData(prev => ({
      ...prev,
      capabilities: { ...caps, [key]: !caps[key] }
    }));
  };

  const getCapabilityIcon = (key: string) => {
    switch (key) {
      case "voice": return Volume2;
      case "file_upload": return Upload;
      case "charts": return BarChart3;
      case "drawing": return Brush;
      case "math": return Calculator;
      default: return Settings;
    }
  };

  const getCapabilityLabel = (key: string) => {
    switch (key) {
      case "voice": return "Voz";
      case "file_upload": return "Upload";
      case "charts": return "Gráficos";
      case "drawing": return "Desenho";
      case "math": return "Matemática";
      default: return key;
    }
  };

  const capabilities = (formData.capabilities || defaultCapabilities) as Record<string, boolean>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bot className="h-6 w-6 text-cyan-400" />
          <h2 className="text-xl font-bold text-cyan-400">Gerenciamento de Agentes</h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchAgents}
          disabled={loading}
          className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Agent Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {agents.map(agent => {
            const agentCaps = (agent.capabilities || {}) as Record<string, boolean>;
            const activeCapabilities = Object.entries(agentCaps).filter(([, v]) => v);

            return (
              <Card key={agent.id} className="bg-slate-900/50 border-cyan-500/30">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {agent.avatar_url ? (
                        <img 
                          src={agent.avatar_url} 
                          alt={agent.name} 
                          className="h-12 w-12 rounded-full object-cover border-2 border-cyan-500/30"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-cyan-500/20 flex items-center justify-center">
                          <Bot className="h-6 w-6 text-cyan-400" />
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-lg text-cyan-400">{agent.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">slug: {agent.slug}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(agent)}
                      className="text-cyan-400 hover:bg-cyan-500/10"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {agent.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{agent.description}</p>
                  )}
                  
                  <div className="flex flex-wrap gap-2">
                    <Badge 
                      variant="outline" 
                      className={agent.is_active 
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" 
                        : "bg-red-500/20 text-red-300 border-red-500/30"
                      }
                    >
                      {agent.is_active ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                      {agent.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                    <Badge variant="outline" className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                      <MessageSquare className="h-3 w-3 mr-1" />
                      {agent.rag_collection}
                    </Badge>
                  </div>

                  {activeCapabilities.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {activeCapabilities.map(([key]) => {
                        const Icon = getCapabilityIcon(key);
                        return (
                          <Badge 
                            key={key} 
                            variant="secondary" 
                            className="bg-slate-800 text-slate-300 text-xs"
                          >
                            <Icon className="h-3 w-3 mr-1" />
                            {getCapabilityLabel(key)}
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-slate-900 border-cyan-500/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-cyan-400">
              <Settings className="h-5 w-5" />
              Editar Agente: {editingAgent?.name}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="geral" className="mt-4">
            <TabsList className="grid grid-cols-5 bg-slate-800">
              <TabsTrigger value="geral" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
                Geral
              </TabsTrigger>
              <TabsTrigger value="rag" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
                RAG
              </TabsTrigger>
              <TabsTrigger value="delimitacoes" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
                Delimitações
              </TabsTrigger>
              <TabsTrigger value="capacidades" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
                Capacidades
              </TabsTrigger>
              <TabsTrigger value="comunicacao" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
                Comunicação
              </TabsTrigger>
            </TabsList>

            {/* Tab Geral */}
            <TabsContent value="geral" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-cyan-400">Nome</Label>
                  <Input
                    value={formData.name || ""}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-slate-800 border-cyan-500/30 focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-cyan-400">Slug</Label>
                  <Input
                    value={formData.slug || ""}
                    onChange={e => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    className="bg-slate-800 border-cyan-500/30 focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-cyan-400">Descrição</Label>
                <Textarea
                  value={formData.description || ""}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="bg-slate-800 border-cyan-500/30 focus:border-cyan-500"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-cyan-400">URL do Avatar</Label>
                <Input
                  value={formData.avatar_url || ""}
                  onChange={e => setFormData(prev => ({ ...prev, avatar_url: e.target.value }))}
                  placeholder="https://..."
                  className="bg-slate-800 border-cyan-500/30 focus:border-cyan-500"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-cyan-400">Mensagem de Saudação</Label>
                <Textarea
                  value={formData.greeting_message || ""}
                  onChange={e => setFormData(prev => ({ ...prev, greeting_message: e.target.value }))}
                  rows={3}
                  className="bg-slate-800 border-cyan-500/30 focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                <div>
                  <Label className="text-cyan-400">Agente Ativo</Label>
                  <p className="text-xs text-muted-foreground">Desativar remove o agente da interface</p>
                </div>
                <Switch
                  checked={formData.is_active ?? true}
                  onCheckedChange={checked => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
              </div>
            </TabsContent>

            {/* Tab RAG */}
            <TabsContent value="rag" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-cyan-400">Coleção RAG</Label>
                <Select
                  value={formData.rag_collection || ""}
                  onValueChange={value => setFormData(prev => ({ ...prev, rag_collection: value }))}
                >
                  <SelectTrigger className="bg-slate-800 border-cyan-500/30">
                    <SelectValue placeholder="Selecione a coleção" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-cyan-500/30">
                    <SelectItem value="study">Study (Estudo)</SelectItem>
                    <SelectItem value="health">Health (Saúde)</SelectItem>
                    <SelectItem value="both">Both (Ambos)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-cyan-400">
                  Match Threshold: {(formData.match_threshold || 0.15).toFixed(2)}
                </Label>
                <Slider
                  value={[formData.match_threshold || 0.15]}
                  onValueChange={([value]) => setFormData(prev => ({ ...prev, match_threshold: value }))}
                  min={0.05}
                  max={0.50}
                  step={0.01}
                  className="accent-cyan-500"
                />
                <p className="text-xs text-muted-foreground">
                  Menor valor = mais resultados, maior valor = mais precisão
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-cyan-400">Match Count</Label>
                <Input
                  type="number"
                  value={formData.match_count || 5}
                  onChange={e => setFormData(prev => ({ ...prev, match_count: parseInt(e.target.value) || 5 }))}
                  min={1}
                  max={20}
                  className="bg-slate-800 border-cyan-500/30 focus:border-cyan-500"
                />
                <p className="text-xs text-muted-foreground">
                  Número de chunks retornados pela busca RAG
                </p>
              </div>
            </TabsContent>

            {/* Tab Delimitações */}
            <TabsContent value="delimitacoes" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-cyan-400 flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tags Permitidas
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput.allowed}
                    onChange={e => setTagInput(prev => ({ ...prev, allowed: e.target.value }))}
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleAddTag("allowed_tags"))}
                    placeholder="Adicionar tag..."
                    className="bg-slate-800 border-cyan-500/30 focus:border-cyan-500"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleAddTag("allowed_tags")}
                    className="border-cyan-500/30 text-cyan-400"
                  >
                    Adicionar
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {(formData.allowed_tags || []).map(tag => (
                    <Badge key={tag} className="bg-emerald-500/20 text-emerald-300">
                      {tag}
                      <button onClick={() => handleRemoveTag("allowed_tags", tag)} className="ml-1">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator className="bg-cyan-500/20" />

              <div className="space-y-2">
                <Label className="text-cyan-400 flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tags Proibidas
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput.forbidden}
                    onChange={e => setTagInput(prev => ({ ...prev, forbidden: e.target.value }))}
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleAddTag("forbidden_tags"))}
                    placeholder="Adicionar tag..."
                    className="bg-slate-800 border-cyan-500/30 focus:border-cyan-500"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleAddTag("forbidden_tags")}
                    className="border-cyan-500/30 text-cyan-400"
                  >
                    Adicionar
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {(formData.forbidden_tags || []).map(tag => (
                    <Badge key={tag} className="bg-red-500/20 text-red-300">
                      {tag}
                      <button onClick={() => handleRemoveTag("forbidden_tags", tag)} className="ml-1">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator className="bg-cyan-500/20" />

              <div className="space-y-2">
                <Label className="text-cyan-400">System Prompt</Label>
                <Textarea
                  value={formData.system_prompt || ""}
                  onChange={e => setFormData(prev => ({ ...prev, system_prompt: e.target.value }))}
                  rows={6}
                  className="bg-slate-800 border-cyan-500/30 focus:border-cyan-500 font-mono text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-cyan-400">Mensagem de Rejeição</Label>
                <Textarea
                  value={formData.rejection_message || ""}
                  onChange={e => setFormData(prev => ({ ...prev, rejection_message: e.target.value }))}
                  rows={3}
                  className="bg-slate-800 border-cyan-500/30 focus:border-cyan-500"
                />
              </div>
            </TabsContent>

            {/* Tab Capacidades */}
            <TabsContent value="capacidades" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 gap-3">
                {Object.keys(defaultCapabilities).map(key => {
                  const Icon = getCapabilityIcon(key);
                  const isEnabled = (capabilities as Record<string, boolean>)[key] ?? false;

                  return (
                    <div 
                      key={key}
                      className="flex items-center justify-between p-4 bg-slate-800 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isEnabled ? "bg-cyan-500/20" : "bg-slate-700"}`}>
                          <Icon className={`h-5 w-5 ${isEnabled ? "text-cyan-400" : "text-slate-400"}`} />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{getCapabilityLabel(key)}</p>
                          <p className="text-xs text-muted-foreground">
                            {key === "voice" && "Permite respostas em áudio via TTS"}
                            {key === "file_upload" && "Permite upload de documentos"}
                            {key === "charts" && "Permite geração de gráficos"}
                            {key === "drawing" && "Permite geração de imagens"}
                            {key === "math" && "Permite cálculos matemáticos"}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={() => toggleCapability(key)}
                      />
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* Tab Comunicação */}
            <TabsContent value="comunicacao" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-cyan-400 flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Tom Regional
                </Label>
                <Select
                  value={formData.regional_tone || "none"}
                  onValueChange={value => setFormData(prev => ({ 
                    ...prev, 
                    regional_tone: value === "none" ? null : value 
                  }))}
                >
                  <SelectTrigger className="bg-slate-800 border-cyan-500/30">
                    <SelectValue placeholder="Selecione o tom regional" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-cyan-500/30">
                    <SelectItem value="none">Nenhum (neutro)</SelectItem>
                    {regionalRules.map(rule => (
                      <SelectItem key={rule.id} value={rule.region_code}>
                        {rule.region_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-cyan-400">Conjunto de Pronúncia</Label>
                <Select
                  value={formData.pronunciation_set || "general"}
                  onValueChange={value => setFormData(prev => ({ ...prev, pronunciation_set: value }))}
                >
                  <SelectTrigger className="bg-slate-800 border-cyan-500/30">
                    <SelectValue placeholder="Selecione o conjunto" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-cyan-500/30">
                    <SelectItem value="general">Geral</SelectItem>
                    <SelectItem value="study">Estudo</SelectItem>
                    <SelectItem value="health">Saúde</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-cyan-400">Nível Maiêutico</Label>
                <Select
                  value={formData.maieutic_level || "media"}
                  onValueChange={value => setFormData(prev => ({ ...prev, maieutic_level: value }))}
                >
                  <SelectTrigger className="bg-slate-800 border-cyan-500/30">
                    <SelectValue placeholder="Selecione o nível" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-cyan-500/30">
                    <SelectItem value="alta">Alta (mais questionador)</SelectItem>
                    <SelectItem value="media">Média (equilibrado)</SelectItem>
                    <SelectItem value="baixa">Baixa (mais direto)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Controla o quanto o agente faz perguntas de acompanhamento
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="border-slate-600"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgentManagementTab;
