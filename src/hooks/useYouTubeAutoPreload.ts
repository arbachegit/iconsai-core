import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const VIDEOS_CACHE_KEY = 'youtube_videos_cache';
const VIDEOS_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours
const PRELOAD_CHECK_INTERVAL = 15 * 60 * 1000; // Check every 15 minutes
const QUOTA_EXCEEDED_KEY = 'youtube_quota_exceeded';

const categories = [
  { id: 'all', label: 'Todos', query: '' },
  { id: 'ai', label: 'Inteligência Artificial', query: 'AI' },
  { id: 'healthcare', label: 'Saúde', query: 'Healthcare' },
  { id: 'knowyou', label: 'KnowYOU', query: 'KnowYOU' },
  { id: 'innovation', label: 'Inovação', query: 'Innovation' },
];

const isQuotaExceeded = (): boolean => {
  try {
    const cached = localStorage.getItem(QUOTA_EXCEEDED_KEY);
    if (cached) {
      const { exceeded, timestamp } = JSON.parse(cached);
      const QUOTA_EXCEEDED_TTL = 24 * 60 * 60 * 1000;
      if (Date.now() - timestamp < QUOTA_EXCEEDED_TTL) {
        return exceeded;
      }
      localStorage.removeItem(QUOTA_EXCEEDED_KEY);
    }
  } catch (error) {
    console.error('Error checking quota status:', error);
  }
  return false;
};

const isCacheExpired = (categoryQuery: string): boolean => {
  try {
    const cached = localStorage.getItem(`${VIDEOS_CACHE_KEY}_${categoryQuery}`);
    if (!cached) return true;
    
    const { timestamp } = JSON.parse(cached);
    return Date.now() - timestamp > VIDEOS_CACHE_TTL;
  } catch (error) {
    console.error(`Error checking cache for ${categoryQuery}:`, error);
    return true;
  }
};

const preloadCategory = async (categoryQuery: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('youtube-videos', {
      body: { category: categoryQuery }
    });

    if (error) throw error;

    if (data?.videos) {
      localStorage.setItem(`${VIDEOS_CACHE_KEY}_${categoryQuery}`, JSON.stringify({
        videos: data.videos,
        timestamp: Date.now()
      }));
      return true;
    }
    
    return false;
  } catch (error: any) {
    console.error(`[Auto-preload] Erro ao carregar ${categoryQuery}:`, error);
    
    // Check if quota exceeded
    if (error?.message?.toLowerCase().includes('quota')) {
      localStorage.setItem(QUOTA_EXCEEDED_KEY, JSON.stringify({
        exceeded: true,
        timestamp: Date.now()
      }));
    }
    
    return false;
  }
};

/**
 * Hook para pré-carregar automaticamente vídeos do YouTube em background
 * quando o cache expira, sem bloquear a interface do usuário.
 * 
 * Verifica periodicamente (a cada 15 minutos) se algum cache expirou
 * e recarrega silenciosamente em background.
 */
export const useYouTubeAutoPreload = () => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const checkAndPreload = async () => {
      // Skip if quota exceeded
      if (isQuotaExceeded()) {
        return;
      }

      // Check each category
      for (const category of categories) {
        if (isCacheExpired(category.query)) {
          // Preload in background (don't await to avoid blocking)
          preloadCategory(category.query);
          
          // Small delay between categories to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    };

    // Initial check after 30 seconds (let the page load first)
    const initialTimeout = setTimeout(() => {
      checkAndPreload();
    }, 30000);

    // Set up periodic checks
    intervalRef.current = setInterval(() => {
      checkAndPreload();
    }, PRELOAD_CHECK_INTERVAL);

    // Cleanup
    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
};
