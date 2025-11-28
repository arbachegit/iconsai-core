import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Youtube, Trash2, RefreshCw, Clock, Database } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

const QUOTA_EXCEEDED_KEY = 'youtube_quota_exceeded';
const VIDEOS_CACHE_KEY = 'youtube_videos_cache';
const VIDEOS_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

const categories = [
  { id: 'all', label: 'Todos', query: '' },
  { id: 'ai', label: 'Inteligência Artificial', query: 'AI' },
  { id: 'healthcare', label: 'Saúde', query: 'Healthcare' },
  { id: 'knowyou', label: 'KnowYOU', query: 'KnowYOU' },
  { id: 'innovation', label: 'Inovação', query: 'Innovation' },
];

export const YouTubeCacheTab = () => {
  const { toast } = useToast();
  const [isPreloading, setIsPreloading] = useState(false);
  const [cacheStats, setCacheStats] = useState<any>(null);

  const getCacheStatistics = () => {
    const stats: any = {
      quotaExceeded: false,
      quotaExceededUntil: null,
      cachedCategories: [],
    };

    // Check quota status
    try {
      const quotaCache = localStorage.getItem(QUOTA_EXCEEDED_KEY);
      if (quotaCache) {
        const { exceeded, timestamp } = JSON.parse(quotaCache);
        stats.quotaExceeded = exceeded;
        const expiresAt = timestamp + (24 * 60 * 60 * 1000);
        stats.quotaExceededUntil = new Date(expiresAt);
      }
    } catch (error) {
      console.error('Error reading quota cache:', error);
    }

    // Check videos cache for each category
    categories.forEach(category => {
      try {
        const cached = localStorage.getItem(`${VIDEOS_CACHE_KEY}_${category.query}`);
        if (cached) {
          const { videos, timestamp } = JSON.parse(cached);
          const expiresAt = timestamp + VIDEOS_CACHE_TTL;
          const isExpired = Date.now() > expiresAt;
          
          stats.cachedCategories.push({
            category: category.label,
            query: category.query,
            videoCount: videos?.length || 0,
            cachedAt: new Date(timestamp),
            expiresAt: new Date(expiresAt),
            isExpired
          });
        }
      } catch (error) {
        console.error(`Error reading cache for ${category.label}:`, error);
      }
    });

    setCacheStats(stats);
    return stats;
  };

  const clearAllCache = () => {
    try {
      // Clear quota exceeded status
      localStorage.removeItem(QUOTA_EXCEEDED_KEY);
      
      // Clear all video caches
      categories.forEach(category => {
        localStorage.removeItem(`${VIDEOS_CACHE_KEY}_${category.query}`);
      });

      toast({
        title: "Cache limpo com sucesso",
        description: "Todo o cache do YouTube foi removido. Os vídeos serão recarregados na próxima visita.",
      });

      getCacheStatistics();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao limpar o cache",
        variant: "destructive",
      });
    }
  };

  const clearQuotaStatus = () => {
    try {
      localStorage.removeItem(QUOTA_EXCEEDED_KEY);
      toast({
        title: "Status de quota limpo",
        description: "O bloqueio de quota foi removido. Novas requisições à API do YouTube serão permitidas.",
      });
      getCacheStatistics();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao limpar status de quota",
        variant: "destructive",
      });
    }
  };

  const preloadAllCategories = async () => {
    setIsPreloading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const category of categories) {
      try {
        console.log(`Pré-carregando vídeos: ${category.label}`);
        
        const { data, error } = await supabase.functions.invoke('youtube-videos', {
          body: { category: category.query }
        });

        if (error) throw error;

        if (data?.videos) {
          // Cache the videos
          localStorage.setItem(`${VIDEOS_CACHE_KEY}_${category.query}`, JSON.stringify({
            videos: data.videos,
            timestamp: Date.now()
          }));
          successCount++;
          console.log(`✓ ${category.label}: ${data.videos.length} vídeos`);
        }

        // Small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error: any) {
        console.error(`Erro ao pré-carregar ${category.label}:`, error);
        errorCount++;
      }
    }

    setIsPreloading(false);
    getCacheStatistics();

    toast({
      title: "Pré-carregamento concluído",
      description: `${successCount} categorias carregadas com sucesso${errorCount > 0 ? `, ${errorCount} com erro` : ''}.`,
      variant: errorCount > 0 ? "destructive" : "default",
    });
  };

  // Load stats on mount
  useState(() => {
    getCacheStatistics();
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Youtube className="h-5 w-5 text-[#FF0000]" />
            Gerenciamento de Cache do YouTube
          </CardTitle>
          <CardDescription>
            Gerencie o cache local de vídeos e controle de quota da API do YouTube
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={getCacheStatistics}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar Estatísticas
            </Button>
            
            <Button
              variant="outline"
              onClick={clearQuotaStatus}
              disabled={!cacheStats?.quotaExceeded}
              className="flex items-center gap-2"
            >
              <Clock className="h-4 w-4" />
              Liberar Quota
            </Button>

            <Button
              onClick={preloadAllCategories}
              disabled={isPreloading || cacheStats?.quotaExceeded}
              className="flex items-center gap-2"
            >
              {isPreloading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Pré-carregando...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4" />
                  Pré-carregar Vídeos
                </>
              )}
            </Button>

            <Button
              variant="destructive"
              onClick={clearAllCache}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Limpar Todo Cache
            </Button>
          </div>

          {/* Quota Status */}
          {cacheStats?.quotaExceeded && (
            <Card className="border-destructive bg-destructive/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-destructive/10 rounded-lg">
                    <Clock className="h-5 w-5 text-destructive" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-destructive mb-1">
                      Quota da API Excedida
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Bloqueio ativo até: {cacheStats.quotaExceededUntil?.toLocaleString('pt-BR')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Novas requisições à API estão bloqueadas por 24 horas desde a última tentativa.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cache Statistics */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Database className="h-4 w-4" />
              Vídeos em Cache
            </h3>
            
            {!cacheStats || cacheStats.cachedCategories.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="pt-6 text-center text-muted-foreground">
                  Nenhum cache de vídeos encontrado
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {cacheStats.cachedCategories.map((cache: any) => (
                  <Card key={cache.query} className={cache.isExpired ? "border-yellow-500/50" : ""}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{cache.category}</h4>
                            <Badge variant={cache.isExpired ? "destructive" : "secondary"}>
                              {cache.isExpired ? "Expirado" : "Válido"}
                            </Badge>
                            <Badge variant="outline">
                              {cache.videoCount} vídeos
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p>Armazenado: {cache.cachedAt.toLocaleString('pt-BR')}</p>
                            <p>Expira: {cache.expiresAt.toLocaleString('pt-BR')}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            localStorage.removeItem(`${VIDEOS_CACHE_KEY}_${cache.query}`);
                            getCacheStatistics();
                            toast({
                              title: "Cache removido",
                              description: `Cache de "${cache.category}" foi limpo.`,
                            });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Info Card */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><strong>Cache de Vídeos:</strong> Expira após 6 horas</p>
                <p><strong>Bloqueio de Quota:</strong> Dura 24 horas após exceder limite</p>
                <p><strong>Pré-carregamento:</strong> Busca vídeos de todas as categorias e armazena localmente</p>
                <p><strong>Consumo de Quota:</strong> 1 unidade por requisição (usando playlistItems API)</p>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};
