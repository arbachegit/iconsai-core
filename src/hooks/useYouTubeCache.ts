import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

interface CacheData {
  videos: YouTubeVideo[];
  timestamp: number;
  category: string;
}

const CACHE_KEY = 'youtube_videos_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas em milissegundos

export const useYouTubeCache = (category: string) => {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchVideos();
  }, [category]);

  const getCacheKey = (cat: string) => `${CACHE_KEY}_${cat}`;

  const getFromCache = (cat: string): CacheData | null => {
    try {
      const cached = localStorage.getItem(getCacheKey(cat));
      if (!cached) return null;
      
      const data: CacheData = JSON.parse(cached);
      return data;
    } catch (error) {
      console.error('Error reading cache:', error);
      return null;
    }
  };

  const saveToCache = (cat: string, videosData: YouTubeVideo[]) => {
    try {
      const cacheData: CacheData = {
        videos: videosData,
        timestamp: Date.now(),
        category: cat,
      };
      localStorage.setItem(getCacheKey(cat), JSON.stringify(cacheData));
      console.log('✅ Cache atualizado para categoria:', cat);
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  };

  const isCacheValid = (cacheData: CacheData): boolean => {
    const now = Date.now();
    const age = now - cacheData.timestamp;
    return age < CACHE_DURATION;
  };

  const fetchVideos = async () => {
    setLoading(true);
    
    // 1. Tentar buscar do cache primeiro
    const cached = getFromCache(category);
    
    if (cached && isCacheValid(cached)) {
      console.log('📦 Usando vídeos do cache (válido)');
      setVideos(cached.videos);
      setLoading(false);
      return;
    }

    // 2. Cache expirado ou não existe - tentar buscar da API
    try {
      console.log('🔄 Buscando vídeos da API do YouTube...');
      const { data, error } = await supabase.functions.invoke('youtube-videos', {
        body: { category }
      });
      
      if (error) throw error;
      
      if (data?.videos && data.videos.length > 0) {
        console.log('✅ Vídeos carregados da API');
        setVideos(data.videos);
        saveToCache(category, data.videos);
      } else if (cached) {
        // Se a API retornou vazio mas temos cache, usar o cache
        console.log('📦 API retornou vazio, usando cache');
        setVideos(cached.videos);
      }
    } catch (error: any) {
      console.log('⚠️ Erro ao buscar vídeos da API (usando fallback):', error?.message || error);
      
      // 3. Se falhou, tentar usar cache mesmo que expirado
      if (cached && cached.videos.length > 0) {
        console.log('📦 Usando cache expirado como fallback');
        setVideos(cached.videos);
        
        // Mostrar toast informativo apenas se for erro de quota
        if (error?.message?.includes('quota') || error?.message?.includes('403')) {
          toast({
            title: "Usando vídeos em cache",
            description: "A quota da API do YouTube foi excedida. Exibindo vídeos salvos.",
            variant: "default",
          });
        }
      } else {
        // Sem cache disponível - não mostrar erro destrutivo, apenas log silencioso
        console.log('ℹ️ Nenhum cache disponível para fallback');
        setVideos([]); // Garantir que videos seja array vazio
      }
    } finally {
      setLoading(false);
    }
  };

  return { videos, loading, refreshVideos: fetchVideos };
};
