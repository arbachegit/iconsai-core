import { useEffect, useState } from "react";
import { Music, Youtube, ExternalLink, Filter } from "lucide-react";
import { useYouTubeCache } from "@/hooks/useYouTubeCache";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

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

const categories = [
  { id: 'all', label: 'Todos', query: '' },
  { id: 'ai', label: 'Inteligência Artificial', query: 'AI' },
  { id: 'healthcare', label: 'Saúde', query: 'Healthcare' },
  { id: 'knowyou', label: 'KnowYOU', query: 'KnowYOU' },
  { id: 'innovation', label: 'Inovação', query: 'Innovation' },
];

export const MediaCarousel = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  
  const category = categories.find(c => c.id === selectedCategory);
  const { videos, loading } = useYouTubeCache(category?.query || '');

  useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

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
      <div className="space-y-6">
        <div className="flex items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#FF0000]/10 rounded-lg animate-fade-in">
              <Youtube className="w-6 h-6 text-[#FF0000]" />
            </div>
            <h3 className="text-2xl font-bold">Vídeos no YouTube</h3>
          </div>
          <a
            href="https://www.youtube.com/@KnowRISKio"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            Ver Canal
            <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 flex-wrap animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground mr-2">Filtrar por:</span>
          {categories.map((category) => (
            <Badge
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              className="cursor-pointer transition-all hover:scale-105 hover:shadow-lg"
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.label}
            </Badge>
          ))}
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
        ) : videos.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-4">
              <div className="flex gap-2">
                {Array.from({ length: count }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => api?.scrollTo(index)}
                    className={`h-2 rounded-full transition-all ${
                      index === current
                        ? "w-8 bg-primary"
                        : "w-2 bg-primary/30 hover:bg-primary/50"
                    }`}
                    aria-label={`Ir para vídeo ${index + 1}`}
                  />
                ))}
              </div>
            </div>
            <Carousel
              setApi={setApi}
              opts={{
                align: "start",
                loop: true,
              }}
              className="w-full"
            >
              <CarouselContent>
              {videos.map((video, index) => (
                <CarouselItem 
                  key={video.id.videoId} 
                  className="md:basis-1/2 lg:basis-1/3 animate-fade-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <Card className="bg-card/50 border-primary/10 hover:border-primary/30 transition-all duration-300 group hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1">
                    <CardContent className="p-4">
                      <a
                        href={`https://www.youtube.com/watch?v=${video.id.videoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <div className="relative overflow-hidden rounded-lg mb-3 shadow-lg">
                          <img
                            src={video.snippet.thumbnails.medium.url}
                            alt={video.snippet.title}
                            className="w-full aspect-video object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                            <div className="transform scale-0 group-hover:scale-100 transition-transform duration-300">
                              <Youtube className="w-16 h-16 text-white drop-shadow-lg" />
                            </div>
                          </div>
                          <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-xs text-white font-medium">Assistir</span>
                          </div>
                        </div>
                        <h4 className="font-semibold text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors duration-300">
                          {video.snippet.title}
                        </h4>
                        <p className="text-xs text-muted-foreground line-clamp-2 group-hover:text-foreground/70 transition-colors">
                          {video.snippet.description}
                        </p>
                      </a>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
              <CarouselPrevious className="hidden md:flex h-12 w-12" />
              <CarouselNext className="hidden md:flex h-12 w-12" />
            </Carousel>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhum vídeo disponível no momento.</p>
          </div>
        )}
      </div>
    </div>
  );
};
