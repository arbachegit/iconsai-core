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
  CheckCircle2, XCircle, Loader2, Plus, Trash2
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

// Localizações disponíveis para atribuição de agentes
const AVAILABLE_LOCATIONS = [
  { value: "", label: "Não utilizado", icon: "⚠️" },
  { value: "/index (Seção KnowYOU)", label: "/index (Seção KnowYOU)", icon: "📚" },
  { value: "/index (Float Button)", label: "/index (Float Button)", icon: "🏢" },
  { value: "/app", label: "/app", icon: "📊" },
  { value: "/dashboard", label: "/dashboard", icon: "📈" },
  { value: "/dashboard (Float Button)", label: "/dashboard (Float Button)", icon: "💬" },
];

const AgentManagementTab: React.FC = () => {
  const [agents, setAgents] = useState<ChatAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAgent, setEditingAgent] = useState<ChatAgent | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<ChatAgent>>({});
  const [regionalRules, setRegionalRules] = useState<RegionalRule[]>([]);
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState({ allowed: "", forbidden: "" });
  const [pronunciationInput, setPronunciationInput] = useState({ term: "", pronunciation: "" });

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
      forbidden_tags: agent.forbidden_tags || [],
      pronunciation_rules: (agent as any).pronunciation_rules || {}
    });
    setTagInput({ allowed: "", forbidden: "" });
    setPronunciationInput({ term: "", pronunciation: "" });
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
          location: (formData as any).location || null,
          pronunciation_rules: (formData as any).pronunciation_rules || {},
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

  const handleAddPronunciation = () => {
    const { term, pronunciation } = pronunciationInput;
    if (!term.trim() || !pronunciation.trim()) return;
    
    const currentRules = ((formData as any).pronunciation_rules || {}) as Record<string, string>;
    setFormData(prev => ({
      ...prev,
      pronunciation_rules: { ...currentRules, [term.trim()]: pronunciation.trim() }
    }));
    setPronunciationInput({ term: "", pronunciation: "" });
  };

  const handleRemovePronunciation = (term: string) => {
    const currentRules = ((formData as any).pronunciation_rules || {}) as Record<string, string>;
    const { [term]: _, ...rest } = currentRules;
    setFormData(prev => ({
      ...prev,
      pronunciation_rules: rest
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
          className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-400"
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
                    
                    {/* Badge de Localização - dinâmico do banco de dados */}
                    {(agent as any).location ? (
                      <Badge variant="outline" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                        <Globe className="h-3 w-3 mr-1" />
                        {(agent as any).location}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-500/20 text-amber-300 border-amber-500/30">
                        <Globe className="h-3 w-3 mr-1" />
                        ⚠️ Não utilizado
                      </Badge>
                    )}
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

              {/* Localização do Agente */}
              <div className="space-y-2 p-3 bg-slate-800 rounded-lg">
                <Label className="text-cyan-400 flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Localização
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Define onde este agente será utilizado na aplicação (cada local aceita apenas um agente)
                </p>
                <Select
                  value={(formData as any).location || ""}
                  onValueChange={value => setFormData(prev => ({ ...prev, location: value || null }))}
                >
                  <SelectTrigger className="bg-slate-900 border-cyan-500/30">
                    <SelectValue placeholder="Selecione a localização" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_LOCATIONS.map(loc => {
                      const isUsedByOther = agents.some(a => 
                        (a as any).location === loc.value && a.id !== editingAgent?.id
                      );
                      return (
                        <SelectItem 
                          key={loc.value || "none"} 
                          value={loc.value || "none"}
                          disabled={loc.value !== "" && isUsedByOther}
                        >
                          <span className="flex items-center gap-2">
                            {loc.icon} {loc.label}
                            {loc.value !== "" && isUsedByOther && (
                              <span className="text-xs text-muted-foreground ml-2">(em uso)</span>
                            )}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
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

              <Separator className="bg-cyan-500/20" />

              {/* Biblioteca de Pronúncias */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-5 w-5 text-cyan-400" />
                  <Label className="text-cyan-400">Biblioteca de Pronúncias (TTS)</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Configure como o TTS deve pronunciar termos específicos deste agente
                </p>
                
                {/* Lista de regras existentes */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {Object.entries(((formData as any).pronunciation_rules || {}) as Record<string, string>).map(([term, pronunciation]) => (
                    <div key={term} className="flex items-center gap-2 p-2 bg-slate-800 rounded">
                      <code className="text-sm text-cyan-300 font-mono">{term}</code>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-sm flex-1">{pronunciation}</span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleRemovePronunciation(term)}
                        className="h-6 w-6 p-0 hover:bg-red-500/20"
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                  ))}
                  {Object.keys((formData as any).pronunciation_rules || {}).length === 0 && (
                    <p className="text-xs text-muted-foreground italic">Nenhuma pronúncia customizada</p>
                  )}
                </div>
                
                {/* Adicionar nova regra */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Termo (ex: IPCA)"
                    value={pronunciationInput.term}
                    onChange={(e) => setPronunciationInput(prev => ({ ...prev, term: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddPronunciation())}
                    className="flex-1 bg-slate-800 border-cyan-500/30 focus:border-cyan-500"
                  />
                  <Input
                    placeholder="Pronúncia (ex: í-pê-cê-á)"
                    value={pronunciationInput.pronunciation}
                    onChange={(e) => setPronunciationInput(prev => ({ ...prev, pronunciation: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddPronunciation())}
                    className="flex-1 bg-slate-800 border-cyan-500/30 focus:border-cyan-500"
                  />
                  <Button 
                    variant="outline" 
                    onClick={handleAddPronunciation}
                    className="border-cyan-500/30 text-cyan-400"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  Dica: Use hífens para separar sílabas (ex: "í-pê-cê-á") ou escreva por extenso
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
