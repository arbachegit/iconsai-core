import { useEffect, useState } from "react";
import { Music, Youtube, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface YouTubeVideo {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      medium: {
        url: string;
      };
    };
  };
}

export const MediaCarousel = () => {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchYouTubeVideos();
  }, []);

  const fetchYouTubeVideos = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('youtube-videos');
      
      if (error) throw error;
      
      if (data?.videos) {
        setVideos(data.videos);
      }
    } catch (error) {
      console.error('Error fetching YouTube videos:', error);
      toast({
        title: "Erro ao carregar vídeos",
        description: "Não foi possível carregar os vídeos do YouTube.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
        <Card className="bg-card/50 border-primary/10">
          <CardContent className="p-6">
            <iframe
              src="https://open.spotify.com/embed/show/7jlF9GoUTnUngBVi5Xrw0r?utm_source=generator&theme=0"
              width="100%"
              height="352"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="rounded-lg"
            />
          </CardContent>
        </Card>
      </div>

      {/* YouTube Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#FF0000]/10 rounded-lg">
              <Youtube className="w-6 h-6 text-[#FF0000]" />
            </div>
            <h3 className="text-2xl font-bold">Vídeos no YouTube</h3>
          </div>
          <a
            href="https://www.youtube.com/@KnowRISKio"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Ver Canal
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-card/50 border-primary/10">
                <CardContent className="p-4">
                  <Skeleton className="w-full aspect-video rounded-lg mb-3" />
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent>
              {videos.map((video) => (
                <CarouselItem key={video.id.videoId} className="md:basis-1/2 lg:basis-1/3">
                  <Card className="bg-card/50 border-primary/10 hover:border-primary/30 transition-all group">
                    <CardContent className="p-4">
                      <a
                        href={`https://www.youtube.com/watch?v=${video.id.videoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <div className="relative overflow-hidden rounded-lg mb-3">
                          <img
                            src={video.snippet.thumbnails.medium.url}
                            alt={video.snippet.title}
                            className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Youtube className="w-12 h-12 text-white" />
                          </div>
                        </div>
                        <h4 className="font-semibold text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                          {video.snippet.title}
                        </h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {video.snippet.description}
                        </p>
                      </a>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex" />
            <CarouselNext className="hidden md:flex" />
          </Carousel>
        )}
      </div>
    </div>
  );
};
