/**
 * AssistantsTab - Gerenciamento de Agentes de IA
 * Agente principal "ICONSAI - SABE TUDO" + criação de novos agentes
 */

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Bot,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Power,
  PowerOff,
  Volume2,
  Play,
  Square,
  Link,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Settings,
  Save
} from "lucide-react";

const VOICE_API_URL = import.meta.env.VITE_VOICE_API_URL || "";
const APP_URL = import.meta.env.VITE_APP_URL || "https://pwa.iconsai.ai";

interface Assistant {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  system_prompt: string | null;
  model: string;
  voice_id: string | null;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// Vozes disponíveis no ElevenLabs
const ELEVENLABS_VOICES = [
  {
    id: "21m00Tcm4TlvDq8ikWAM",
    name: "Rachel",
    description: "Voz feminina clara e natural. Excelente para PT-BR.",
    gender: "Feminina",
    recommended: true
  },
  {
    id: "pNInz6obpgDQGcFmaJgB",
    name: "Adam",
    description: "Voz masculina profunda e confiante.",
    gender: "Masculina"
  },
  {
    id: "MF3mGyEYCl7XYWbV9V6O",
    name: "Elli",
    description: "Voz feminina jovem e amigável.",
    gender: "Feminina"
  },
  {
    id: "VR6AewLTigWG4xSOukaG",
    name: "Arnold",
    description: "Voz masculina forte e autoritária.",
    gender: "Masculina"
  },
  {
    id: "jsCqWAovK2LkecY7zXl4",
    name: "Callum",
    description: "Voz masculina suave e acolhedora.",
    gender: "Masculina"
  },
  {
    id: "ODq5zmih8GrVes37Dizd",
    name: "Patrick",
    description: "Voz masculina neutra e versátil.",
    gender: "Masculina"
  },
];

const AVAILABLE_MODELS = [
  { id: "gpt-4o", label: "GPT-4o (Recomendado)" },
  { id: "gpt-4o-mini", label: "GPT-4o Mini (Mais rápido)" },
  { id: "gpt-4-turbo", label: "GPT-4 Turbo" },
];

// Agente padrão
const DEFAULT_ASSISTANT = {
  name: "ICONSAI - SABE TUDO",
  slug: "sabe-tudo",
  description: "Assistente principal que responde sobre qualquer assunto",
  system_prompt: "Você é o ICONSAI, um assistente de voz inteligente desenvolvido pela Arbache AI. Você é especialista em responder perguntas sobre qualquer assunto de forma clara, objetiva e amigável. Sempre responda em português brasileiro.",
  model: "gpt-4o",
  voice_id: "21m00Tcm4TlvDq8ikWAM",
  is_default: true,
};

export default function AssistantsTab() {
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Form state para novo agente
  const [isCreating, setIsCreating] = useState(false);
  const [newAgent, setNewAgent] = useState({
    name: "",
    slug: "",
    description: "",
    system_prompt: "",
    model: "gpt-4o",
    voice_id: "21m00Tcm4TlvDq8ikWAM",
  });

  // Load assistants
  const loadAssistants = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("assistants")
        .select("*")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Se não existe o agente padrão, criar
      if (!data || data.length === 0 || !data.find(a => a.is_default)) {
        await createDefaultAssistant();
        return;
      }

      setAssistants(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar agentes:", error);
      toast.error("Erro ao carregar agentes");
    } finally {
      setIsLoading(false);
    }
  };

  // Criar agente padrão
  const createDefaultAssistant = async () => {
    try {
      const { error } = await supabase.from("assistants").insert({
        ...DEFAULT_ASSISTANT,
        is_active: true,
      });

      if (error && !error.message.includes("duplicate")) throw error;
      loadAssistants();
    } catch (error: any) {
      console.error("Erro ao criar agente padrão:", error);
    }
  };

  useEffect(() => {
    loadAssistants();
  }, []);

  // Gerar slug a partir do nome
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  // Copiar link
  const handleCopyLink = async (assistant: Assistant) => {
    const link = `${APP_URL}/pwa?agent=${assistant.slug}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(assistant.id);
      toast.success("Link copiado!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Erro ao copiar link");
    }
  };

  // Testar voz
  const handleTestVoice = async (voiceId: string, assistantId: string) => {
    if (isPlaying === assistantId && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlaying(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setIsPlaying(assistantId);

    try {
      const testText = "Olá! Esta é uma demonstração da minha voz. Como posso ajudar você hoje?";

      const response = await fetch(`${VOICE_API_URL}/functions/v1/text-to-speech-karaoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: testText, voice: voiceId, chatType: "assistant" }),
      });

      if (!response.ok) throw new Error("Falha ao gerar áudio");

      const data = await response.json();
      if (!data.audioBase64) throw new Error("Áudio não recebido");

      const audio = new Audio(`data:audio/mpeg;base64,${data.audioBase64}`);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(null);
        audioRef.current = null;
      };

      audio.onerror = () => {
        toast.error("Erro ao reproduzir áudio");
        setIsPlaying(null);
        audioRef.current = null;
      };

      await audio.play();
    } catch (error) {
      console.error("Erro ao testar voz:", error);
      toast.error("Erro ao testar voz");
      setIsPlaying(null);
    }
  };

  // Salvar configuração do agente
  const handleSaveAssistant = async (assistant: Assistant, voiceId: string) => {
    setSavingId(assistant.id);
    try {
      const { error } = await supabase
        .from("assistants")
        .update({
          voice_id: voiceId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", assistant.id);

      if (error) throw error;
      toast.success("Configuração salva!");
      loadAssistants();
    } catch (error: any) {
      toast.error("Erro ao salvar");
    } finally {
      setSavingId(null);
    }
  };

  // Criar novo agente
  const handleCreateAgent = async () => {
    if (!newAgent.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    setIsCreating(true);
    try {
      const slug = newAgent.slug || generateSlug(newAgent.name);

      const { error } = await supabase.from("assistants").insert({
        name: newAgent.name.trim(),
        slug,
        description: newAgent.description.trim() || null,
        system_prompt: newAgent.system_prompt.trim() || null,
        model: newAgent.model,
        voice_id: newAgent.voice_id,
        is_active: true,
        is_default: false,
      });

      if (error) throw error;

      toast.success("Agente criado com sucesso!");
      setNewAgent({
        name: "",
        slug: "",
        description: "",
        system_prompt: "",
        model: "gpt-4o",
        voice_id: "21m00Tcm4TlvDq8ikWAM",
      });
      loadAssistants();
    } catch (error: any) {
      if (error.code === "23505") {
        toast.error("Já existe um agente com esse slug");
      } else {
        toast.error(error.message || "Erro ao criar agente");
      }
    } finally {
      setIsCreating(false);
    }
  };

  // Toggle ativo
  const handleToggleActive = async (assistant: Assistant) => {
    if (assistant.is_default) {
      toast.error("Não é possível desativar o agente padrão");
      return;
    }

    try {
      const { error } = await supabase
        .from("assistants")
        .update({ is_active: !assistant.is_active })
        .eq("id", assistant.id);

      if (error) throw error;
      toast.success(assistant.is_active ? "Agente desativado" : "Agente ativado");
      loadAssistants();
    } catch {
      toast.error("Erro ao alterar status");
    }
  };

  // Deletar agente
  const handleDelete = async (assistant: Assistant) => {
    if (assistant.is_default) {
      toast.error("Não é possível excluir o agente padrão");
      return;
    }

    if (!confirm(`Deseja realmente excluir o agente "${assistant.name}"?`)) return;

    try {
      const { error } = await supabase
        .from("assistants")
        .delete()
        .eq("id", assistant.id);

      if (error) throw error;
      toast.success("Agente excluído");
      loadAssistants();
    } catch {
      toast.error("Erro ao excluir agente");
    }
  };

  // Renderizar card do agente
  const renderAgentCard = (assistant: Assistant) => {
    const agentLink = `${APP_URL}/pwa?agent=${assistant.slug}`;
    const currentVoice = ELEVENLABS_VOICES.find(v => v.id === assistant.voice_id) || ELEVENLABS_VOICES[0];

    return (
      <Card key={assistant.id} className={assistant.is_default ? "border-primary/50 bg-primary/5" : ""}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${assistant.is_default ? "bg-primary/20" : "bg-muted"}`}>
                {assistant.is_default ? (
                  <Sparkles className="w-6 h-6 text-primary" />
                ) : (
                  <Bot className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  {assistant.name}
                  {assistant.is_default && (
                    <Badge className="bg-primary/20 text-primary text-xs">Principal</Badge>
                  )}
                </CardTitle>
                <CardDescription className="mt-1">
                  {assistant.description || "Sem descrição"}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant={assistant.is_active ? "default" : "secondary"}>
                {assistant.is_active ? "Ativo" : "Inativo"}
              </Badge>
              {!assistant.is_default && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggleActive(assistant)}
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
                    onClick={() => handleDelete(assistant)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Link de Acesso */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Link className="w-4 h-4" />
              Link de Acesso
            </Label>
            <div className="flex items-center gap-2">
              <Input
                value={agentLink}
                readOnly
                className="font-mono text-sm bg-muted"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleCopyLink(assistant)}
              >
                {copiedId === assistant.id ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => window.open(agentLink, "_blank")}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Configuração de Voz */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              Configuração de Voz
            </Label>

            <div className="grid gap-2">
              {ELEVENLABS_VOICES.map((voice) => (
                <div
                  key={voice.id}
                  className={`
                    flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer
                    ${assistant.voice_id === voice.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'}
                  `}
                  onClick={() => handleSaveAssistant(assistant, voice.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${assistant.voice_id === voice.id ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{voice.name}</span>
                        <Badge variant="outline" className="text-xs">{voice.gender}</Badge>
                        {voice.recommended && (
                          <Badge className="bg-green-500/10 text-green-500 text-xs">Recomendada</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{voice.description}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTestVoice(voice.id, `${assistant.id}-${voice.id}`);
                    }}
                    disabled={isPlaying !== null && isPlaying !== `${assistant.id}-${voice.id}`}
                  >
                    {isPlaying === `${assistant.id}-${voice.id}` ? (
                      <Square className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>

            {savingId === assistant.id && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const defaultAssistant = assistants.find(a => a.is_default);
  const otherAssistants = assistants.filter(a => !a.is_default);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Agentes de IA</h2>
        <p className="text-muted-foreground">
          Configure os agentes e suas vozes
        </p>
      </div>

      {/* Agente Principal */}
      {defaultAssistant && renderAgentCard(defaultAssistant)}

      {/* Outros Agentes */}
      {otherAssistants.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Outros Agentes</h3>
          {otherAssistants.map(renderAgentCard)}
        </div>
      )}

      {/* Criar Novo Agente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Criar Novo Agente
          </CardTitle>
          <CardDescription>
            Configure um novo agente de IA personalizado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new-name">Nome do Agente *</Label>
              <Input
                id="new-name"
                placeholder="Ex: Assistente de Vendas"
                value={newAgent.name}
                onChange={(e) => {
                  setNewAgent({
                    ...newAgent,
                    name: e.target.value,
                    slug: generateSlug(e.target.value),
                  });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-slug">Slug (URL)</Label>
              <Input
                id="new-slug"
                placeholder="assistente-vendas"
                value={newAgent.slug}
                onChange={(e) => setNewAgent({ ...newAgent, slug: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-description">Descrição</Label>
            <Input
              id="new-description"
              placeholder="Breve descrição do agente"
              value={newAgent.description}
              onChange={(e) => setNewAgent({ ...newAgent, description: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-prompt">Prompt do Sistema</Label>
            <Textarea
              id="new-prompt"
              placeholder="Instruções de comportamento para o agente..."
              rows={4}
              value={newAgent.system_prompt}
              onChange={(e) => setNewAgent({ ...newAgent, system_prompt: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Modelo de IA</Label>
              <Select
                value={newAgent.model}
                onValueChange={(value) => setNewAgent({ ...newAgent, model: value })}
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
                value={newAgent.voice_id}
                onValueChange={(value) => setNewAgent({ ...newAgent, voice_id: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ELEVENLABS_VOICES.map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      {voice.name} ({voice.gender})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleCreateAgent} disabled={isCreating}>
              {isCreating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Criar Agente
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
