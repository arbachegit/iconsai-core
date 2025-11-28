import { useEffect, useState } from "react";
import { Music, Youtube, ExternalLink, Filter } from "lucide-react";
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

// Cache keys and TTLs
const QUOTA_EXCEEDED_KEY = 'youtube_quota_exceeded';
const VIDEOS_CACHE_KEY = 'youtube_videos_cache';
const QUOTA_EXCEEDED_TTL = 24 * 60 * 60 * 1000; // 24 hours
const VIDEOS_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

// Helper to get cached videos
const getCachedVideos = (category: string): YouTubeVideo[] | null => {
  try {
    const cached = localStorage.getItem(`${VIDEOS_CACHE_KEY}_${category}`);
    if (cached) {
      const { videos, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < VIDEOS_CACHE_TTL) {
        console.log(`Using cached videos for category: ${category}`);
        return videos;
      }
      localStorage.removeItem(`${VIDEOS_CACHE_KEY}_${category}`);
    }
  } catch (error) {
    console.error('Error reading video cache:', error);
  }
  return null;
};

// Helper to cache videos
const cacheVideos = (category: string, videos: YouTubeVideo[]) => {
  try {
    localStorage.setItem(`${VIDEOS_CACHE_KEY}_${category}`, JSON.stringify({
      videos,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error('Error caching videos:', error);
  }
};

// Helper to check quota exceeded status
const getQuotaExceededStatus = (): boolean => {
  try {
    const cached = localStorage.getItem(QUOTA_EXCEEDED_KEY);
    if (cached) {
      const { exceeded, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < QUOTA_EXCEEDED_TTL) {
        console.log('Quota exceeded status from cache: blocked for 24h');
        return exceeded;
      }
      localStorage.removeItem(QUOTA_EXCEEDED_KEY);
    }
  } catch (error) {
    console.error('Error reading quota status:', error);
  }
  return false;
};

// Helper to set quota exceeded
const setQuotaExceededStatus = (exceeded: boolean) => {
  try {
    localStorage.setItem(QUOTA_EXCEEDED_KEY, JSON.stringify({
      exceeded,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error('Error setting quota status:', error);
  }
};

export const MediaCarousel = () => {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [quotaExceeded, setQuotaExceeded] = useState(() => getQuotaExceededStatus());
  const { toast } = useToast();

  useEffect(() => {
    if (!quotaExceeded) {
      fetchYouTubeVideos();
    }
  }, [selectedCategory, quotaExceeded]);

  const fetchYouTubeVideos = async () => {
    // Check cache first
    const category = categories.find(c => c.id === selectedCategory);
    const categoryQuery = category?.query || '';
    
    const cachedVideos = getCachedVideos(categoryQuery);
    if (cachedVideos) {
      setVideos(cachedVideos);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      console.log(`Fetching fresh videos for category: ${categoryQuery}`);
      const { data, error } = await supabase.functions.invoke('youtube-videos', {
        body: { category: categoryQuery }
      });
      
      if (error) {
        throw error;
      }
      
      if (data?.error) {
        const message: string = data.error as string;
        if (message.toLowerCase().includes('quota') || message.toLowerCase().includes('quotaexceeded')) {
          setQuotaExceeded(true);
          setQuotaExceededStatus(true);
          toast({
            title: "Limite da API do YouTube atingido",
            description: "O YouTube temporariamente bloqueou novas requisições. Cache será usado por 24 horas.",
            variant: "destructive",
          });
          setVideos([]);
          return;
        }
      }
      
      if (data?.videos) {
        setVideos(data.videos);
        cacheVideos(categoryQuery, data.videos);
        console.log(`Cached ${data.videos.length} videos for category: ${categoryQuery}`);
      }
    } catch (error: any) {
      console.error('Error fetching YouTube videos:', error);
      const message = typeof error?.message === 'string' ? error.message : '';
      if (message.toLowerCase().includes('quota') || message.toLowerCase().includes('quotaexceeded')) {
        setQuotaExceeded(true);
        setQuotaExceededStatus(true);
        toast({
          title: "Limite da API do YouTube atingido",
          description: "O YouTube temporariamente bloqueou novas requisições. Cache será usado por 24 horas.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao carregar vídeos",
          description: "Não foi possível carregar os vídeos do YouTube.",
          variant: "destructive",
        });
      }
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
        ) : quotaExceeded ? (
          <Card className="bg-card/50 border-primary/10">
            <CardContent className="p-6 space-y-3">
              <p className="text-sm text-muted-foreground">
                No momento atingimos o limite de uso da API do YouTube. Você ainda pode acessar
                todos os conteúdos diretamente no nosso canal.
              </p>
              <a
                href="https://www.youtube.com/@KnowRISKio"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
              >
                Ir para o canal no YouTube
                <ExternalLink className="w-4 h-4" />
              </a>
            </CardContent>
          </Card>
        ) : videos.length === 0 ? (
          <Card className="bg-card/50 border-primary/10">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">
                Nenhum vídeo encontrado para este filtro no momento.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Carousel
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
            <CarouselPrevious className="hidden md:flex" />
            <CarouselNext className="hidden md:flex" />
          </Carousel>
        )}
      </div>
    </div>
  );
};
