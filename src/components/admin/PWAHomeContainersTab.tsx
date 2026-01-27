/**
 * PWAHomeContainersTab - Manage PWA Home Containers
 * @version 1.0.0
 * @date 2026-01-27
 *
 * Admin component for managing:
 * - Which agents appear in HOME screen
 * - Display order of agents
 * - Welcome messages per agent
 * - Container visibility and custom styling
 */

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Home, Settings, ChevronUp, ChevronDown, Loader2,
  Save, GripVertical, Eye, EyeOff, MessageSquare, Palette
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Agent {
  id: string;
  name: string;
  slug: string;
  display_name: string;
  icon: string;
  color: string;
  is_active: boolean;
  welcome_message: string | null;
  welcome_message_returning: string | null;
  is_home_container: boolean;
}

interface HomeAgentConfig {
  id: string;
  agent_id: string;
  display_order: number;
  is_visible: boolean;
  custom_icon: string | null;
  custom_color: string | null;
  custom_label: string | null;
  agent?: Agent;
}

export default function PWAHomeContainersTab() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [homeConfigs, setHomeConfigs] = useState<HomeAgentConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Form state for editing
  const [editForm, setEditForm] = useState({
    welcome_message: "",
    welcome_message_returning: "",
    is_home_container: false,
  });

  // Fetch agents and home configs
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch all active agents
      const { data: agentsData, error: agentsError } = await supabase
        .from("iconsai_agents")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (agentsError) throw agentsError;
      setAgents(agentsData || []);

      // Fetch home agent configurations
      const { data: configsData, error: configsError } = await supabase
        .from("pwa_home_agents")
        .select("*")
        .order("display_order", { ascending: true });

      if (configsError) {
        // Table might not exist yet, that's ok
        console.log("[PWAHomeContainersTab] pwa_home_agents not found, will use defaults");
        setHomeConfigs([]);
      } else {
        setHomeConfigs(configsData || []);
      }
    } catch (err) {
      console.error("[PWAHomeContainersTab] Error:", err);
      toast.error("Erro ao carregar agentes");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get config for an agent (or default values)
  const getAgentConfig = (agentId: string): HomeAgentConfig | null => {
    return homeConfigs.find(c => c.agent_id === agentId) || null;
  };

  // Toggle visibility of an agent in HOME
  const toggleAgentVisibility = async (agent: Agent) => {
    setIsSaving(true);
    try {
      const existingConfig = getAgentConfig(agent.id);

      if (existingConfig) {
        // Update existing config
        const { error } = await supabase
          .from("pwa_home_agents")
          .update({ is_visible: !existingConfig.is_visible })
          .eq("id", existingConfig.id);

        if (error) throw error;
      } else {
        // Create new config
        const { error } = await supabase
          .from("pwa_home_agents")
          .insert({
            agent_id: agent.id,
            display_order: homeConfigs.length + 1,
            is_visible: true,
          });

        if (error) throw error;
      }

      await fetchData();
      toast.success(`${agent.display_name} ${existingConfig?.is_visible ? "ocultado" : "visível"} no HOME`);
    } catch (err) {
      console.error("[PWAHomeContainersTab] Toggle visibility error:", err);
      toast.error("Erro ao atualizar visibilidade");
    } finally {
      setIsSaving(false);
    }
  };

  // Move agent up in order
  const moveAgentUp = async (agent: Agent) => {
    const config = getAgentConfig(agent.id);
    if (!config || config.display_order <= 1) return;

    setIsSaving(true);
    try {
      // Find the agent above
      const aboveConfig = homeConfigs.find(c => c.display_order === config.display_order - 1);
      if (!aboveConfig) return;

      // Swap orders
      const { error: err1 } = await supabase
        .from("pwa_home_agents")
        .update({ display_order: config.display_order })
        .eq("id", aboveConfig.id);

      const { error: err2 } = await supabase
        .from("pwa_home_agents")
        .update({ display_order: config.display_order - 1 })
        .eq("id", config.id);

      if (err1 || err2) throw err1 || err2;

      await fetchData();
    } catch (err) {
      console.error("[PWAHomeContainersTab] Move error:", err);
      toast.error("Erro ao reordenar");
    } finally {
      setIsSaving(false);
    }
  };

  // Move agent down in order
  const moveAgentDown = async (agent: Agent) => {
    const config = getAgentConfig(agent.id);
    if (!config) return;

    const maxOrder = Math.max(...homeConfigs.map(c => c.display_order));
    if (config.display_order >= maxOrder) return;

    setIsSaving(true);
    try {
      // Find the agent below
      const belowConfig = homeConfigs.find(c => c.display_order === config.display_order + 1);
      if (!belowConfig) return;

      // Swap orders
      const { error: err1 } = await supabase
        .from("pwa_home_agents")
        .update({ display_order: config.display_order })
        .eq("id", belowConfig.id);

      const { error: err2 } = await supabase
        .from("pwa_home_agents")
        .update({ display_order: config.display_order + 1 })
        .eq("id", config.id);

      if (err1 || err2) throw err1 || err2;

      await fetchData();
    } catch (err) {
      console.error("[PWAHomeContainersTab] Move error:", err);
      toast.error("Erro ao reordenar");
    } finally {
      setIsSaving(false);
    }
  };

  // Open edit dialog
  const openEditDialog = (agent: Agent) => {
    setEditingAgent(agent);
    setEditForm({
      welcome_message: agent.welcome_message || "",
      welcome_message_returning: agent.welcome_message_returning || "",
      is_home_container: agent.is_home_container || false,
    });
    setEditDialogOpen(true);
  };

  // Save agent settings
  const saveAgentSettings = async () => {
    if (!editingAgent) return;

    setIsSaving(true);
    try {
      // If setting as home container, unset others first
      if (editForm.is_home_container) {
        await supabase
          .from("iconsai_agents")
          .update({ is_home_container: false })
          .eq("is_home_container", true);
      }

      // Update agent
      const { error } = await supabase
        .from("iconsai_agents")
        .update({
          welcome_message: editForm.welcome_message || null,
          welcome_message_returning: editForm.welcome_message_returning || null,
          is_home_container: editForm.is_home_container,
        })
        .eq("id", editingAgent.id);

      if (error) throw error;

      await fetchData();
      setEditDialogOpen(false);
      toast.success(`${editingAgent.display_name} atualizado`);
    } catch (err) {
      console.error("[PWAHomeContainersTab] Save error:", err);
      toast.error("Erro ao salvar");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Get visible agents sorted by display_order
  const visibleAgents = agents
    .filter(a => {
      const config = getAgentConfig(a.id);
      return config?.is_visible;
    })
    .sort((a, b) => {
      const configA = getAgentConfig(a.id);
      const configB = getAgentConfig(b.id);
      return (configA?.display_order || 0) - (configB?.display_order || 0);
    });

  const hiddenAgents = agents.filter(a => {
    const config = getAgentConfig(a.id);
    return !config?.is_visible;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" />
            <CardTitle>Containers do HOME</CardTitle>
          </div>
          <CardDescription>
            Configure quais módulos aparecem na tela HOME do PWA e suas mensagens de boas-vindas.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Visible Agents Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Módulos Visíveis ({visibleAgents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {visibleAgents.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              Nenhum módulo visível. Adicione módulos abaixo.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Ordem</TableHead>
                  <TableHead>Módulo</TableHead>
                  <TableHead>Welcome</TableHead>
                  <TableHead className="w-24">Principal</TableHead>
                  <TableHead className="w-32">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleAgents.map((agent, index) => {
                  const config = getAgentConfig(agent.id);
                  return (
                    <TableRow key={agent.id}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <span>{config?.display_order || index + 1}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: agent.color }}
                          />
                          <span className="font-medium">{agent.display_name}</span>
                          <Badge variant="outline" className="text-xs">
                            {agent.slug}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {agent.welcome_message ? (
                          <span className="text-sm text-muted-foreground truncate max-w-[200px] inline-block">
                            {agent.welcome_message.slice(0, 50)}...
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            Não configurado
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {agent.is_home_container && (
                          <Badge className="bg-primary text-primary-foreground">
                            <Home className="h-3 w-3 mr-1" />
                            HOME
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => moveAgentUp(agent)}
                            disabled={isSaving || index === 0}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => moveAgentDown(agent)}
                            disabled={isSaving || index === visibleAgents.length - 1}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEditDialog(agent)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => toggleAgentVisibility(agent)}
                            disabled={isSaving}
                          >
                            <EyeOff className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Hidden Agents */}
      {hiddenAgents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <EyeOff className="h-4 w-4" />
              Módulos Disponíveis ({hiddenAgents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {hiddenAgents.map(agent => (
                <div
                  key={agent.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: agent.color }}
                    />
                    <span className="text-sm">{agent.display_name}</span>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => toggleAgentVisibility(agent)}
                    disabled={isSaving}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurar {editingAgent?.display_name}
            </DialogTitle>
            <DialogDescription>
              Configure as mensagens de boas-vindas e preferências do módulo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Welcome Message */}
            <div className="space-y-2">
              <Label htmlFor="welcome_message" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Mensagem de Boas-vindas
              </Label>
              <Textarea
                id="welcome_message"
                placeholder="Olá! Sou o assistente..."
                value={editForm.welcome_message}
                onChange={(e) => setEditForm(prev => ({ ...prev, welcome_message: e.target.value }))}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Mensagem reproduzida por TTS quando o usuário abre o módulo pela primeira vez.
              </p>
            </div>

            {/* Returning User Message */}
            <div className="space-y-2">
              <Label htmlFor="welcome_returning" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Mensagem para Usuário que Retorna
              </Label>
              <Textarea
                id="welcome_returning"
                placeholder="Que bom ver você de novo..."
                value={editForm.welcome_message_returning}
                onChange={(e) => setEditForm(prev => ({ ...prev, welcome_message_returning: e.target.value }))}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Mensagem para usuários que já usaram este módulo antes.
              </p>
            </div>

            <Separator />

            {/* Is Home Container */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_home" className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Container Principal (HOME)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Define este módulo como a tela principal do PWA.
                </p>
              </div>
              <Switch
                id="is_home"
                checked={editForm.is_home_container}
                onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, is_home_container: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveAgentSettings} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
