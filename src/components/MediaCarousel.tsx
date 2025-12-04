import { useState } from "react";
import { Music, Lightbulb, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Podcast {
  id: string;
  title: string;
  spotify_episode_id: string;
  description: string;
  display_order: number | null;
  is_active: boolean | null;
}

export const MediaCarousel = () => {
  const [selectedPodcast, setSelectedPodcast] = useState<Podcast | null>(null);

  const { data: podcasts } = useQuery({
    queryKey: ["podcasts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("podcast_contents")
        .select("*")
        .eq("is_active", true)
        .order("display_order")
        .limit(3);
      if (error) throw error;
      return data as Podcast[];
    },
  });

  return (
    <div className="space-y-8">
      {/* Spotify Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#1DB954]/10 rounded-lg">
            <Music className="w-6 h-6 text-[#1DB954]" />
          </div>
          <h3 className="text-2xl font-bold">Podcast no Spotify</h3>
        </div>
        
        {/* 3 Podcasts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {podcasts?.map((podcast) => (
            <Card key={podcast.id} className="bg-card/50 border-primary/10 relative">
              <CardContent className="p-4">
                {/* Tooltip Button */}
                <div className="absolute top-3 right-3 z-10">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPodcast(podcast)}
                    className="h-10 w-10 p-0 rounded-full bg-gradient-to-r from-primary/20 to-purple-500/20 border border-primary/30 hover:from-primary/30 hover:to-purple-500/30 transition-all"
                  >
                    <Lightbulb className="h-5 w-5 text-primary" />
                    {/* Green Pulsating Dot */}
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                  </Button>
                </div>
                
                {/* Spotify Embed */}
                <iframe
                  src={`https://open.spotify.com/embed/episode/${podcast.spotify_episode_id}?utm_source=generator&theme=0`}
                  width="100%"
                  height="232"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  className="rounded-lg"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Description Modal */}
      <Dialog open={!!selectedPodcast} onOpenChange={() => setSelectedPodcast(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Music className="h-5 w-5 text-[#1DB954]" />
              {selectedPodcast?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
              {selectedPodcast?.description}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
