import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Bot, Settings, Save, RefreshCw, Volume2, Upload, BarChart3,
  Brush, Calculator, MessageSquare, Edit,
  CheckCircle2, XCircle, Loader2, ShieldCheck, ShieldOff, Target
} from "lucide-react";

import type { Database } from "@/integrations/supabase/types";

type ChatAgent = Database["public"]["Tables"]["chat_agents"]["Row"];

// Interface para dados do formulário com campos de escopo
interface AgentFormData extends Partial<ChatAgent> {
  allowedScope?: string;
  forbiddenScope?: string;
}

// Helper para extrair escopo do metadata
const extractScopeFromMetadata = (metadata: unknown): { allowedScope: string; forbiddenScope: string } => {
  if (metadata && typeof metadata === 'object') {
    const meta = metadata as Record<string, unknown>;
    return {
      allowedScope: (meta.allowedScope as string) || '',
      forbiddenScope: (meta.forbiddenScope as string) || ''
    };
  }
  return { allowedScope: '', forbiddenScope: '' };
};

const AgentManagementTab: React.FC = () => {
  const [agents, setAgents] = useState<ChatAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAgent, setEditingAgent] = useState<ChatAgent | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<AgentFormData>({});
  const [saving, setSaving] = useState(false);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("chat_agents")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error("Error fetching agents:", error);
      toast.error("Erro ao carregar agentes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleEdit = (agent: ChatAgent) => {
    setEditingAgent(agent);
    const { allowedScope, forbiddenScope } = extractScopeFromMetadata(agent.metadata);
    setFormData({
      ...agent,
      allowedScope,
      forbiddenScope
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingAgent) return;
    setSaving(true);

    try {
      // Mesclar dados de escopo no metadata existente
      const existingMetadata = (formData.metadata && typeof formData.metadata === 'object')
        ? formData.metadata as Record<string, unknown>
        : {};

      const updatedMetadata = {
        ...existingMetadata,
        allowedScope: formData.allowedScope || '',
        forbiddenScope: formData.forbiddenScope || ''
      };

      const { error } = await supabase
        .from("chat_agents")
        .update({
          name: formData.name,
          description: formData.description,
          is_active: formData.is_active,
          system_prompt: formData.system_prompt,
          temperature: formData.temperature,
          max_tokens: formData.max_tokens,
          model: formData.model,
          metadata: updatedMetadata,
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
          {agents.map(agent => (
            <Card key={agent.id} className="bg-slate-900/50 border-cyan-500/30">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-cyan-500/20 flex items-center justify-center">
                      <Bot className="h-6 w-6 text-cyan-400" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-cyan-400">{agent.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">id: {agent.id.slice(0, 8)}...</p>
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
                    {agent.model || 'default'}
                  </Badge>
                  {(() => {
                    const { allowedScope, forbiddenScope } = extractScopeFromMetadata(agent.metadata);
                    const hasScope = allowedScope || forbiddenScope;
                    return hasScope ? (
                      <Badge variant="outline" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                        <Target className="h-3 w-3 mr-1" />
                        Escopo
                      </Badge>
                    ) : null;
                  })()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-slate-900 border-cyan-500/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-cyan-400">
              <Settings className="h-5 w-5" />
              Editar Agente: {editingAgent?.name}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="geral" className="mt-4">
            <TabsList className="grid grid-cols-3 bg-slate-800">
              <TabsTrigger value="geral" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
                Geral
              </TabsTrigger>
              <TabsTrigger value="modelo" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
                Modelo
              </TabsTrigger>
              <TabsTrigger value="escopo" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
                <Target className="h-4 w-4 mr-1" />
                Escopo
              </TabsTrigger>
            </TabsList>

            {/* Tab Geral */}
            <TabsContent value="geral" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-cyan-400">Nome</Label>
                <input
                  type="text"
                  value={formData.name || ""}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-cyan-500/30 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  style={{ pointerEvents: 'auto', userSelect: 'text' }}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-cyan-400">Descrição</Label>
                <textarea
                  value={formData.description || ""}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="flex w-full rounded-md border border-cyan-500/30 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  style={{ pointerEvents: 'auto', userSelect: 'text' }}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-cyan-400">System Prompt</Label>
                <textarea
                  value={formData.system_prompt || ""}
                  onChange={e => setFormData(prev => ({ ...prev, system_prompt: e.target.value }))}
                  rows={6}
                  className="flex w-full rounded-md border border-cyan-500/30 bg-slate-800 px-3 py-2 text-xs text-white font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  style={{ pointerEvents: 'auto', userSelect: 'text' }}
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

            {/* Tab Modelo */}
            <TabsContent value="modelo" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-cyan-400">Modelo</Label>
                <input
                  type="text"
                  value={formData.model || ""}
                  onChange={e => setFormData(prev => ({ ...prev, model: e.target.value }))}
                  placeholder="Nome do modelo de IA"
                  className="flex h-10 w-full rounded-md border border-cyan-500/30 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  style={{ pointerEvents: 'auto', userSelect: 'text' }}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-cyan-400">
                  Temperatura: {(formData.temperature || 0.7).toFixed(2)}
                </Label>
                <Slider
                  value={[formData.temperature || 0.7]}
                  onValueChange={([value]) => setFormData(prev => ({ ...prev, temperature: value }))}
                  min={0}
                  max={2}
                  step={0.1}
                  className="accent-cyan-500"
                />
                <p className="text-xs text-muted-foreground">
                  Menor valor = mais determinístico, maior valor = mais criativo
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-cyan-400">Max Tokens</Label>
                <input
                  type="number"
                  value={formData.max_tokens || 4096}
                  onChange={e => setFormData(prev => ({ ...prev, max_tokens: parseInt(e.target.value) || 4096 }))}
                  min={100}
                  max={128000}
                  className="flex h-10 w-full rounded-md border border-cyan-500/30 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  style={{ pointerEvents: 'auto', userSelect: 'text' }}
                />
                <p className="text-xs text-muted-foreground">
                  Limite máximo de tokens na resposta
                </p>
              </div>
            </TabsContent>

            {/* Tab Escopo */}
            <TabsContent value="escopo" className="space-y-4 mt-4">
              {/* Escopo Aprovado */}
              <div className="space-y-2">
                <Label className="text-emerald-400 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Escopo Aprovado
                </Label>
                <textarea
                  value={formData.allowedScope || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData(prev => ({ ...prev, allowedScope: val }));
                  }}
                  rows={6}
                  placeholder="Defina os tópicos e comportamentos que este agente PODE abordar."
                  className="flex w-full rounded-md border border-cyan-500/30 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 resize-y"
                  style={{ pointerEvents: 'auto', userSelect: 'text', WebkitUserSelect: 'text' }}
                />
                <p className="text-xs text-muted-foreground">
                  Especifique claramente o que o agente está autorizado a fazer e discutir.
                </p>
              </div>

              {/* Escopo Proibído */}
              <div className="space-y-2">
                <Label className="text-red-400 flex items-center gap-2">
                  <ShieldOff className="h-4 w-4" />
                  Escopo Proibído
                </Label>
                <textarea
                  value={formData.forbiddenScope || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData(prev => ({ ...prev, forbiddenScope: val }));
                  }}
                  rows={6}
                  placeholder="Defina os tópicos e comportamentos que este agente NÃO PODE abordar."
                  className="flex w-full rounded-md border border-cyan-500/30 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 resize-y"
                  style={{ pointerEvents: 'auto', userSelect: 'text', WebkitUserSelect: 'text' }}
                />
                <p className="text-xs text-muted-foreground">
                  Especifique claramente o que o agente está proibido de fazer e discutir.
                </p>
              </div>

              {/* Info Card */}
              <div className="p-4 bg-slate-800 rounded-lg border border-cyan-500/20">
                <h4 className="text-sm font-medium text-cyan-400 flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4" />
                  Como funciona o Escopo
                </h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• O <span className="text-emerald-400">Escopo Aprovado</span> define o que o agente pode fazer</li>
                  <li>• O <span className="text-red-400">Escopo Proibído</span> define limites e restrições</li>
                  <li>• Estas configurações são injetadas no system prompt do agente</li>
                  <li>• Use linguagem clara e específica para melhores resultados</li>
                </ul>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)}
              className="border-cyan-500/30"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={saving}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgentManagementTab;
