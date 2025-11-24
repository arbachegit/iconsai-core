import { useEffect, useState, useCallback } from "react";
import { Music, Youtube, ExternalLink, Filter, Play, Pause } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import Autoplay from "embla-carousel-autoplay";
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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isPlaying, setIsPlaying] = useState(true);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const autoplayPlugin = Autoplay({
    delay: 4000,
    stopOnInteraction: false,
    stopOnMouseEnter: true,
  });

  useEffect(() => {
    fetchYouTubeVideos();
  }, [selectedCategory]);

  useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
      setProgress(0);
    });

    // Progress bar animation
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 0;
        return prev + (100 / 40); // 4000ms / 100ms intervals
      });
    }, 100);

    return () => clearInterval(interval);
  }, [api]);

  const fetchYouTubeVideos = async () => {
    setLoading(true);
    try {
      const category = categories.find(c => c.id === selectedCategory);
      const { data, error } = await supabase.functions.invoke('youtube-videos', {
        body: { category: category?.query || '' }
      });
      
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

  const togglePlayPause = useCallback(() => {
    if (!autoplayPlugin) return;
    
    if (isPlaying) {
      autoplayPlugin.stop();
    } else {
      autoplayPlugin.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, autoplayPlugin]);

  const scrollToSlide = useCallback((index: number) => {
    api?.scrollTo(index);
  }, [api]);

  return (
    <div className="space-y-8">
      {/* Category Filters */}
      <div className="flex items-center gap-2 flex-wrap animate-fade-in justify-center">
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

      {/* Side-by-side Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Spotify Section - 2 columns on desktop */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#1DB954]/10 rounded-lg">
              <Music className="w-6 h-6 text-[#1DB954]" />
            </div>
            <h3 className="text-2xl font-bold">Podcast</h3>
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

        {/* YouTube Section - 3 columns on desktop */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center gap-3 justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#FF0000]/10 rounded-lg animate-fade-in">
                <Youtube className="w-6 h-6 text-[#FF0000]" />
              </div>
              <h3 className="text-2xl font-bold">Vídeos</h3>
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

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="bg-card/50 border-primary/10 overflow-hidden">
                  <CardContent className="p-4">
                    <div className="relative overflow-hidden rounded-lg mb-3">
                      <Skeleton className="w-full aspect-video animate-pulse" />
                      <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-foreground/5 to-transparent" />
                    </div>
                    <Skeleton className="h-4 w-3/4 mb-2 animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
                    <Skeleton className="h-3 w-full animate-pulse" style={{ animationDelay: `${i * 0.15}s` }} />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <Carousel
                opts={{
                  align: "start",
                  loop: true,
                }}
                plugins={[autoplayPlugin]}
                className="w-full"
                setApi={setApi}
                onMouseEnter={() => autoplayPlugin.stop()}
                onMouseLeave={() => isPlaying && autoplayPlugin.play()}
              >
                <CarouselContent>
                  {videos.map((video, index) => (
                    <CarouselItem 
                      key={video.id.videoId} 
                      className="md:basis-1/2 animate-fade-in"
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
                <CarouselPrevious className="hidden md:flex" />
                <CarouselNext className="hidden md:flex" />
              </Carousel>

              {/* Carousel Controls */}
              <div className="flex items-center justify-between gap-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                {/* Play/Pause Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={togglePlayPause}
                  className="gap-2"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-4 h-4" />
                      Pausar
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Reproduzir
                    </>
                  )}
                </Button>

                {/* Progress Bar */}
                <div className="flex-1 space-y-2">
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-100 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  
                  {/* Dot Indicators */}
                  <div className="flex items-center justify-center gap-1.5">
                    {Array.from({ length: count }).map((_, index) => (
                      <button
                        key={index}
                        className={cn(
                          "h-1.5 rounded-full transition-all duration-300",
                          current === index 
                            ? "bg-primary w-6" 
                            : "bg-muted-foreground/30 w-1.5 hover:bg-muted-foreground/50"
                        )}
                        onClick={() => scrollToSlide(index)}
                        aria-label={`Ir para slide ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Counter */}
                <div className="text-sm text-muted-foreground font-medium min-w-[3rem] text-right">
                  {current + 1} / {count}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
