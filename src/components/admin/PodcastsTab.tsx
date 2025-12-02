import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useSystemIncrement } from "@/hooks/useSystemIncrement";
import { AdminTitleWithInfo } from "./AdminTitleWithInfo";
import { 
  Music, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  GripVertical,
  ExternalLink
} from "lucide-react";

interface Podcast {
  id: string;
  title: string;
  description: string;
  spotify_episode_id: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export const PodcastsTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { logIncrement } = useSystemIncrement();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Podcast>>({});
  const [newPodcast, setNewPodcast] = useState({
    spotify_episode_id: "",
    title: "",
    description: ""
  });
  const [showAddForm, setShowAddForm] = useState(false);

  const { data: podcasts, isLoading } = useQuery({
    queryKey: ["admin-podcasts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("podcast_contents")
        .select("*")
        .order("display_order", { ascending: true });
      
      if (error) throw error;
      return data as Podcast[];
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (podcast: Partial<Podcast> & { id: string }) => {
      const { error } = await supabase
        .from("podcast_contents")
        .update({
          title: podcast.title,
          description: podcast.description,
          is_active: podcast.is_active,
          display_order: podcast.display_order,
          updated_at: new Date().toISOString()
        })
        .eq("id", podcast.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-podcasts"] });
      queryClient.invalidateQueries({ queryKey: ["podcast-contents"] });
      setEditingId(null);
      toast({ title: "Podcast atualizado com sucesso" });
      logIncrement({
        operationType: "UPDATE",
        operationSource: "podcasts_management",
        tablesAffected: ["podcast_contents"],
        summary: "Podcast atualizado via painel admin"
      });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar podcast", variant: "destructive" });
    }
  });

  const createMutation = useMutation({
    mutationFn: async (podcast: typeof newPodcast) => {
      const maxOrder = podcasts?.length ? Math.max(...podcasts.map(p => p.display_order)) : 0;
      const { error } = await supabase
        .from("podcast_contents")
        .insert({
          spotify_episode_id: podcast.spotify_episode_id,
          title: podcast.title,
          description: podcast.description,
          display_order: maxOrder + 1,
          is_active: true
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-podcasts"] });
      queryClient.invalidateQueries({ queryKey: ["podcast-contents"] });
      setNewPodcast({ spotify_episode_id: "", title: "", description: "" });
      setShowAddForm(false);
      toast({ title: "Podcast adicionado com sucesso" });
      logIncrement({
        operationType: "INSERT",
        operationSource: "podcasts_management",
        tablesAffected: ["podcast_contents"],
        summary: "Novo podcast adicionado via painel admin"
      });
    },
    onError: () => {
      toast({ title: "Erro ao adicionar podcast", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("podcast_contents")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-podcasts"] });
      queryClient.invalidateQueries({ queryKey: ["podcast-contents"] });
      toast({ title: "Podcast removido com sucesso" });
      logIncrement({
        operationType: "DELETE",
        operationSource: "podcasts_management",
        tablesAffected: ["podcast_contents"],
        summary: "Podcast removido via painel admin"
      });
    },
    onError: () => {
      toast({ title: "Erro ao remover podcast", variant: "destructive" });
    }
  });

  const handleEdit = (podcast: Podcast) => {
    setEditingId(podcast.id);
    setEditForm(podcast);
  };

  const handleSave = () => {
    if (editForm.id) {
      updateMutation.mutate(editForm as Partial<Podcast> & { id: string });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleCreate = () => {
    if (!newPodcast.spotify_episode_id || !newPodcast.title) {
      toast({ title: "Preencha o ID do Spotify e o título", variant: "destructive" });
      return;
    }
    createMutation.mutate(newPodcast);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja remover este podcast?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggleActive = (podcast: Podcast) => {
    updateMutation.mutate({ ...podcast, is_active: !podcast.is_active });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminTitleWithInfo
        icon={Music}
        title="Gerenciamento de Podcasts"
        level="h1"
        tooltipText="Gerencie os podcasts exibidos no carrossel da landing page."
        infoContent={
          <p>
            Edite títulos, descrições e ordem de exibição dos podcasts. 
            Ative ou desative episódios conforme necessário.
          </p>
        }
      />

      {/* Add New Podcast */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Adicionar Novo Podcast
            </CardTitle>
            <Button
              variant={showAddForm ? "outline" : "default"}
              size="sm"
              onClick={() => setShowAddForm(!showAddForm)}
            >
              {showAddForm ? "Cancelar" : "Novo Podcast"}
            </Button>
          </div>
        </CardHeader>
        {showAddForm && (
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">ID DO EPISÓDIO SPOTIFY *</Label>
              <Input
                placeholder="Ex: 3UBnRJy..."
                value={newPodcast.spotify_episode_id}
                onChange={(e) => setNewPodcast(prev => ({ ...prev, spotify_episode_id: e.target.value }))}
                className="border-blue-400/60 focus:border-blue-500"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Encontre em: Spotify → Episódio → (...) → Compartilhar → Copiar link do episódio
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">TÍTULO *</Label>
              <Input
                placeholder="Ex: 🚀 T1E1 | O Custo do Silêncio..."
                value={newPodcast.title}
                onChange={(e) => setNewPodcast(prev => ({ ...prev, title: e.target.value }))}
                className="border-blue-400/60 focus:border-blue-500"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">DESCRIÇÃO</Label>
              <Textarea
                placeholder="Descrição completa do episódio..."
                value={newPodcast.description}
                onChange={(e) => setNewPodcast(prev => ({ ...prev, description: e.target.value }))}
                className="border-blue-400/60 focus:border-blue-500 min-h-[120px]"
              />
            </div>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              <Plus className="w-4 h-4 mr-2" />
              {createMutation.isPending ? "Adicionando..." : "Adicionar Podcast"}
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Podcast List */}
      <div className="space-y-4">
        {podcasts?.map((podcast, index) => (
          <Card key={podcast.id} className={`border-primary/20 ${!podcast.is_active ? "opacity-60" : ""}`}>
            <CardContent className="p-4">
              {editingId === podcast.id ? (
                /* Edit Mode */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      #{index + 1} - Editando
                    </span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={handleCancel}>
                        <X className="w-4 h-4 mr-1" /> Cancelar
                      </Button>
                      <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
                        <Save className="w-4 h-4 mr-1" /> Salvar
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-xs text-muted-foreground">TÍTULO</Label>
                    <Input
                      value={editForm.title || ""}
                      onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                      className="border-blue-400/60 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs text-muted-foreground">DESCRIÇÃO</Label>
                    <Textarea
                      value={editForm.description || ""}
                      onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                      className="border-blue-400/60 focus:border-blue-500 min-h-[150px]"
                    />
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div>
                      <Label className="text-xs text-muted-foreground">ORDEM</Label>
                      <Input
                        type="number"
                        value={editForm.display_order || 0}
                        onChange={(e) => setEditForm(prev => ({ ...prev, display_order: parseInt(e.target.value) }))}
                        className="w-20 border-blue-400/60 focus:border-blue-500"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">ATIVO</Label>
                      <Switch
                        checked={editForm.is_active}
                        onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, is_active: checked }))}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                      <div>
                        <h3 className="font-medium">#{index + 1} {podcast.title}</h3>
                        <p className="text-xs text-muted-foreground whitespace-pre-line line-clamp-2 mt-1">
                          {podcast.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={podcast.is_active}
                        onCheckedChange={() => handleToggleActive(podcast)}
                      />
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(podcast)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(podcast.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Spotify Player Preview */}
                  <div className="rounded-lg overflow-hidden">
                    <iframe
                      src={`https://open.spotify.com/embed/episode/${podcast.spotify_episode_id}?utm_source=generator&theme=0`}
                      width="100%"
                      height="152"
                      frameBorder="0"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                      className="rounded-lg"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <span className={podcast.is_active ? "text-green-500" : "text-red-500"}>
                        {podcast.is_active ? "🟢 Ativo" : "🔴 Inativo"}
                      </span>
                      <span>Ordem: {podcast.display_order}</span>
                    </div>
                    <a
                      href={`https://open.spotify.com/episode/${podcast.spotify_episode_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Abrir no Spotify
                    </a>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {podcasts?.length === 0 && (
          <Card className="border-dashed border-primary/20">
            <CardContent className="p-8 text-center">
              <Music className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum podcast cadastrado</p>
              <Button className="mt-4" onClick={() => setShowAddForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Primeiro Podcast
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
