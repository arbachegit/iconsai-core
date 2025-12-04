import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AdminTitleWithInfo } from "./AdminTitleWithInfo";
import { Music, Save, X, Edit2, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Podcast {
  id: string;
  title: string;
  spotify_episode_id: string;
  description: string;
  display_order: number | null;
  is_active: boolean | null;
}

export const PodcastManagementTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", spotify_episode_id: "", description: "" });

  const { data: podcasts, isLoading } = useQuery({
    queryKey: ["podcasts-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("podcast_contents")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return data as Podcast[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { id: string; title: string; spotify_episode_id: string; description: string }) => {
      const { error } = await supabase
        .from("podcast_contents")
        .update({
          title: data.title,
          spotify_episode_id: data.spotify_episode_id,
          description: data.description,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["podcasts-admin"] });
      queryClient.invalidateQueries({ queryKey: ["podcasts"] });
      toast({
        title: "Salvo com sucesso",
        description: "Podcast atualizado.",
      });
      setEditingId(null);
    },
    onError: () => {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível atualizar o podcast.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (podcast: Podcast) => {
    setEditingId(podcast.id);
    setEditForm({
      title: podcast.title,
      spotify_episode_id: podcast.spotify_episode_id,
      description: podcast.description,
    });
  };

  const handleSave = () => {
    if (!editingId) return;
    saveMutation.mutate({
      id: editingId,
      title: editForm.title,
      spotify_episode_id: editForm.spotify_episode_id,
      description: editForm.description,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({ title: "", spotify_episode_id: "", description: "" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminTitleWithInfo
        title="Gerenciamento de Podcasts"
        level="h2"
        tooltipText="Gerencie os 3 podcasts exibidos no app"
        infoContent={
          <p>Gerencie os 3 podcasts exibidos no app. Cada podcast tem título, link do Spotify e descrição que aparece em um modal ao clicar no ícone de lâmpada.</p>
        }
      />

      <div className="grid gap-4">
        {podcasts?.map((podcast, index) => (
          <Card key={podcast.id} className="border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#1DB954]/10 rounded-lg">
                    <Music className="w-5 h-5 text-[#1DB954]" />
                  </div>
                  <CardTitle className="text-base">
                    Podcast {index + 1}
                  </CardTitle>
                </div>
                {editingId !== podcast.id && (
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(podcast)}>
                    <Edit2 className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {editingId === podcast.id ? (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Título</Label>
                    <Input
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="border-blue-400/60 focus:border-blue-500"
                      placeholder="Título do podcast"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">ID do Episódio Spotify</Label>
                    <Input
                      value={editForm.spotify_episode_id}
                      onChange={(e) => setEditForm({ ...editForm, spotify_episode_id: e.target.value })}
                      className="border-blue-400/60 focus:border-blue-500"
                      placeholder="Ex: 2lORJJJIGECuG57sxtbmTx"
                    />
                    <p className="text-xs text-muted-foreground">
                      O ID do episódio encontra-se na URL do Spotify após "episode/"
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Descrição</Label>
                    <Textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="border-blue-400/60 focus:border-blue-500 min-h-[120px]"
                      placeholder="Descrição do episódio"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleSave} disabled={saveMutation.isPending} size="sm">
                      {saveMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-1" />
                      )}
                      Salvar
                    </Button>
                    <Button variant="outline" onClick={handleCancel} size="sm">
                      <X className="h-4 w-4 mr-1" />
                      Cancelar
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Título</Label>
                    <p className="text-sm font-medium">{podcast.title}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">ID do Episódio</Label>
                    <p className="text-sm font-mono text-muted-foreground">{podcast.spotify_episode_id}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Descrição</Label>
                    <p className="text-sm text-muted-foreground line-clamp-3">{podcast.description}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
