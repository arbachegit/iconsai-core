/**
 * AssistantsTab - Gerenciamento de Assistentes de IA
 * Permite criar e gerenciar assistentes personalizados
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bot, Plus, Pencil, Trash2, Loader2, Power, PowerOff } from "lucide-react";

interface Assistant {
  id: string;
  name: string;
  description: string | null;
  system_prompt: string | null;
  model: string;
  voice_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const AVAILABLE_MODELS = [
  { id: "gpt-4o", label: "GPT-4o (Recomendado)" },
  { id: "gpt-4o-mini", label: "GPT-4o Mini (Mais rápido)" },
  { id: "gpt-4-turbo", label: "GPT-4 Turbo" },
];

const AVAILABLE_VOICES = [
  { id: "EXAVITQu4vr4xnSDxMaL", label: "Sarah (Feminino)" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", label: "Liam (Masculino)" },
  { id: "XB0fDUnXU5powFXDhCwa", label: "Charlotte (Feminino)" },
  { id: "bIHbv24MWmeRgasZH58o", label: "Will (Masculino)" },
  { id: "cgSgspJ2msm6clMCkdW9", label: "Jessica (Feminino)" },
  { id: "iP95p4xoKVk53GoZ742B", label: "Chris (Masculino)" },
];

export default function AssistantsTab() {
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingAssistant, setEditingAssistant] = useState<Assistant | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    system_prompt: "",
    model: "gpt-4o",
    voice_id: "EXAVITQu4vr4xnSDxMaL",
  });

  // Load assistants
  const loadAssistants = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("assistants")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAssistants(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar assistentes:", error);
      toast.error("Erro ao carregar assistentes");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAssistants();
  }, []);

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      system_prompt: "",
      model: "gpt-4o",
      voice_id: "EXAVITQu4vr4xnSDxMaL",
    });
    setEditingAssistant(null);
  };

  // Open dialog for editing
  const handleEdit = (assistant: Assistant) => {
    setEditingAssistant(assistant);
    setFormData({
      name: assistant.name,
      description: assistant.description || "",
      system_prompt: assistant.system_prompt || "",
      model: assistant.model,
      voice_id: assistant.voice_id || "EXAVITQu4vr4xnSDxMaL",
    });
    setIsDialogOpen(true);
  };

  // Submit form
  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingAssistant) {
        // Update
        const { error } = await supabase
          .from("assistants")
          .update({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            system_prompt: formData.system_prompt.trim() || null,
            model: formData.model,
            voice_id: formData.voice_id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingAssistant.id);

        if (error) throw error;
        toast.success("Assistente atualizado com sucesso");
      } else {
        // Create
        const { error } = await supabase.from("assistants").insert({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          system_prompt: formData.system_prompt.trim() || null,
          model: formData.model,
          voice_id: formData.voice_id,
          is_active: true,
        });

        if (error) throw error;
        toast.success("Assistente criado com sucesso");
      }

      setIsDialogOpen(false);
      resetForm();
      loadAssistants();
    } catch (error: any) {
      console.error("Erro ao salvar assistente:", error);
      toast.error(error.message || "Erro ao salvar assistente");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle active status
  const handleToggleActive = async (assistant: Assistant) => {
    try {
      const { error } = await supabase
        .from("assistants")
        .update({ is_active: !assistant.is_active })
        .eq("id", assistant.id);

      if (error) throw error;
      toast.success(assistant.is_active ? "Assistente desativado" : "Assistente ativado");
      loadAssistants();
    } catch (error: any) {
      toast.error("Erro ao alterar status");
    }
  };

  // Delete assistant
  const handleDelete = async (assistant: Assistant) => {
    if (!confirm(`Deseja realmente excluir o assistente "${assistant.name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("assistants")
        .delete()
        .eq("id", assistant.id);

      if (error) throw error;
      toast.success("Assistente excluído com sucesso");
      loadAssistants();
    } catch (error: any) {
      toast.error("Erro ao excluir assistente");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Assistentes</h2>
          <p className="text-muted-foreground">
            Crie e gerencie assistentes de IA personalizados
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo Assistente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAssistant ? "Editar Assistente" : "Novo Assistente"}
              </DialogTitle>
              <DialogDescription>
                Configure as propriedades do assistente de IA
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Assistente de Vendas"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descricao</Label>
                <Input
                  id="description"
                  placeholder="Breve descricao do assistente"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="system_prompt">Prompt do Sistema</Label>
                <Textarea
                  id="system_prompt"
                  placeholder="Instrucoes para o assistente..."
                  rows={6}
                  value={formData.system_prompt}
                  onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Define como o assistente deve se comportar e responder
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Modelo de IA</Label>
                  <Select
                    value={formData.model}
                    onValueChange={(value) => setFormData({ ...formData, model: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_MODELS.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Voz</Label>
                  <Select
                    value={formData.voice_id}
                    onValueChange={(value) => setFormData({ ...formData, voice_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_VOICES.map((voice) => (
                        <SelectItem key={voice.id} value={voice.id}>
                          {voice.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingAssistant ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Lista de Assistentes
          </CardTitle>
          <CardDescription>
            {assistants.length} assistente(s) cadastrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : assistants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum assistente cadastrado</p>
              <p className="text-sm">Clique em "Novo Assistente" para criar</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assistants.map((assistant) => (
                  <TableRow key={assistant.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{assistant.name}</p>
                        {assistant.description && (
                          <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {assistant.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{assistant.model}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={assistant.is_active ? "default" : "secondary"}>
                        {assistant.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(assistant.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleActive(assistant)}
                          title={assistant.is_active ? "Desativar" : "Ativar"}
                        >
                          {assistant.is_active ? (
                            <PowerOff className="w-4 h-4 text-orange-500" />
                          ) : (
                            <Power className="w-4 h-4 text-green-500" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(assistant)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(assistant)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
