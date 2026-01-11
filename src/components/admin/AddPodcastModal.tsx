import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Music, Link, Search } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SpotifyMetadata {
  title: string;
  description: string;
}

interface AddPodcastModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPodcastCreated: (id: string) => void;
}

export const AddPodcastModal = ({ open, onOpenChange, onPodcastCreated }: AddPodcastModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [spotifyLink, setSpotifyLink] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [metadata, setMetadata] = useState<SpotifyMetadata | null>(null);

  const extractSpotifyId = (link: string): string | null => {
    // Handle direct ID
    if (/^[a-zA-Z0-9]{22}$/.test(link.trim())) {
      return link.trim();
    }
    // Extract from URL: https://open.spotify.com/episode/2lORJJJIGECuG57sxtbmTx
    const match = link.match(/episode\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  };

  const fetchSpotifyMetadata = async (episodeId: string): Promise<SpotifyMetadata | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-spotify-metadata', {
        body: { episodeId },
      });

      if (error) {
        console.error("Error fetching Spotify metadata:", error);
        return null;
      }

      if (data?.error) {
        console.error("Spotify API error:", data.error);
        return null;
      }

      return {
        title: data.title || "Podcast",
        description: data.description || "Episódio do Spotify",
      };
    } catch (error) {
      console.error("Error fetching Spotify metadata:", error);
      return null;
    }
  };

  const handleFetchMetadata = async () => {
    const episodeId = extractSpotifyId(spotifyLink);
    if (!episodeId) {
      toast({
        title: "Link inválido",
        description: "Cole um link válido do Spotify ou o ID do episódio.",
        variant: "destructive",
      });
      return;
    }

    setIsFetching(true);
    const result = await fetchSpotifyMetadata(episodeId);
    setIsFetching(false);

    if (result) {
      setMetadata(result);
      toast({
        title: "Metadados obtidos",
        description: `Título: ${result.title}`,
      });
    } else {
      toast({
        title: "Não foi possível obter metadados",
        description: "O podcast será criado com título padrão.",
        variant: "destructive",
      });
    }
  };

  const createMutation = useMutation({
    mutationFn: async (episodeId: string) => {
      // Get current max display_order
      const { data: existing } = await supabase
        .from("podcast_contents")
        .select("display_order")
        .order("display_order", { ascending: false })
        .limit(1);
      
      const nextOrder = (existing?.[0]?.display_order ?? -1) + 1;

      const { data, error } = await supabase
        .from("podcast_contents")
        .insert({
          title: metadata?.title || "Novo Podcast",
          spotify_episode_id: episodeId,
          description: metadata?.description || "Descrição do podcast",
          display_order: nextOrder,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["podcasts-admin"] });
      queryClient.invalidateQueries({ queryKey: ["podcasts"] });
      toast({
        title: "Podcast adicionado",
        description: metadata?.title ? `"${metadata.title}" criado com sucesso.` : "Preencha os dados do podcast.",
      });
      setSpotifyLink("");
      setMetadata(null);
      onOpenChange(false);
      onPodcastCreated(data.id);
    },
    onError: () => {
      toast({
        title: "Erro ao adicionar",
        description: "Não foi possível adicionar o podcast.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    const episodeId = extractSpotifyId(spotifyLink);
    if (!episodeId) {
      toast({
        title: "Link inválido",
        description: "Cole um link válido do Spotify ou o ID do episódio.",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(episodeId);
  };

  // Auto-fetch metadata when link changes
  const handleLinkChange = async (value: string) => {
    setSpotifyLink(value);
    setMetadata(null);
    
    const episodeId = extractSpotifyId(value);
    if (episodeId) {
      setIsFetching(true);
      const result = await fetchSpotifyMetadata(episodeId);
      setIsFetching(false);
      if (result) {
        setMetadata(result);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5 text-[#1DB954]" />
            Adicionar Podcast Spotify
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Link ou ID do Episódio</Label>
            <div className="relative">
              <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={spotifyLink}
                onChange={(e) => handleLinkChange(e.target.value)}
                placeholder="https://open.spotify.com/episode/..."
                className="pl-10 border-blue-400/60 focus:border-blue-500"
              />
              {isFetching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Cole o link completo do episódio ou apenas o ID (ex: 2lORJJJIGECuG57sxtbmTx)
            </p>
          </div>

          {/* Preview dos metadados */}
          {metadata && (
            <div className="p-3 bg-[#1DB954]/10 border border-[#1DB954]/30 rounded-lg space-y-1">
              <p className="text-sm font-medium text-[#1DB954]">✓ Metadados obtidos:</p>
              <p className="text-sm"><strong>Título:</strong> {metadata.title}</p>
              <p className="text-xs text-muted-foreground">{metadata.description}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!spotifyLink.trim() || createMutation.isPending}
            className="bg-[#1DB954] hover:bg-[#1ed760] text-black"
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Music className="h-4 w-4 mr-1" />
            )}
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
