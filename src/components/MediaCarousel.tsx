import { Music } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePodcastContents } from "@/hooks/usePodcastContents";
import { Skeleton } from "@/components/ui/skeleton";

export const MediaCarousel = () => {
  const { podcasts, isLoading } = usePodcastContents();

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#1DB954]/10 rounded-lg">
              <Music className="w-6 h-6 text-[#1DB954]" />
            </div>
            <h3 className="text-2xl font-bold">Podcasts em Destaque</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-card/50 border-primary/10">
                <CardContent className="p-4">
                  <Skeleton className="w-full h-[152px] rounded-lg" />
                  <Skeleton className="h-6 w-3/4 mx-auto mt-4" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#1DB954]/10 rounded-lg">
            <Music className="w-6 h-6 text-[#1DB954]" />
          </div>
          <h3 className="text-2xl font-bold">Podcasts em Destaque</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {podcasts?.map((podcast) => (
            <Card key={podcast.id} className="bg-card/50 border-primary/10">
              <CardContent className="p-4">
                <iframe
                  src={`https://open.spotify.com/embed/episode/${podcast.spotify_episode_id}?utm_source=generator&theme=0`}
                  width="100%"
                  height="152"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  className="rounded-lg"
                />
                <div className="mt-4 text-center space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <h4 className="font-bold text-lg text-foreground">
                      {podcast.title}
                    </h4>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="relative inline-flex items-center justify-center w-6 h-6 min-w-6 min-h-6 aspect-square flex-shrink-0 rounded-full bg-[#1DB954]/20 border border-[#1DB954]/40 hover:bg-[#1DB954]/30 transition-colors cursor-pointer">
                          <Music className="w-3 h-3 text-[#1DB954]" />
                          <span className="absolute inset-0 rounded-full bg-[#1DB954]/40 animate-ping" />
                          <span className="absolute inset-0 rounded-full bg-[#1DB954]/20 animate-pulse" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-sm">
                        <p className="text-sm whitespace-pre-line">{podcast.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
