import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, RefreshCw, Sparkles, Database, Clock, Volume2, Eye, Download, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const SECTIONS = [
  { id: "software", name: "Software (1950)" },
  { id: "internet", name: "Internet (1990)" },
  { id: "tech-sem-proposito", name: "Tech Sem Propósito" },
  { id: "kubrick", name: "Kubrick (1969)" },
  { id: "watson", name: "Watson (2004)" },
  { id: "ia-nova-era", name: "Nova Era IA" },
  { id: "knowyou", name: "KnowYOU" },
  { id: "bom-prompt", name: "Bom Prompt" },
];

interface CachedImage {
  id: string;
  section_id: string;
  prompt_key: string;
  image_url: string;
  created_at: string;
}

export const ImageCacheTab = () => {
  const [isClearing, setIsClearing] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);
  const [cacheStats, setCacheStats] = useState<{ total: number; bySection: Record<string, number> } | null>(null);
  const [audioCacheStats, setAudioCacheStats] = useState<{ section: string; title: string; type: 'section' | 'tooltip' }[]>([]);
  const [cachedImages, setCachedImages] = useState<CachedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<CachedImage | null>(null);
  const [viewMode, setViewMode] = useState<'stats' | 'gallery'>('stats');

  const loadCacheStats = async () => {
    try {
      const { data, error } = await supabase
        .from('generated_images')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCachedImages(data || []);

      const stats = {
        total: data?.length || 0,
        bySection: {} as Record<string, number>
      };

      data?.forEach((img) => {
        const section = img.section_id.replace('tooltip-', '');
        stats.bySection[section] = (stats.bySection[section] || 0) + 1;
      });

      setCacheStats(stats);
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    }
  };

  const deleteImage = async (imageId: string) => {
    try {
      const { error } = await supabase
        .from('generated_images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;

      toast.success("Imagem removida do cache!");
      await loadCacheStats();
    } catch (error) {
      console.error("Erro ao deletar imagem:", error);
      toast.error("Erro ao remover imagem");
    }
  };

  const downloadImage = async (imageUrl: string, fileName: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Download iniciado!");
    } catch (error) {
      console.error("Erro ao baixar imagem:", error);
      toast.error("Erro ao baixar imagem");
    }
  };

  const loadAudioCacheStats = async () => {
    try {
      // Load section audio
      const { data: sectionAudio, error: sectionError } = await supabase
        .from('section_audio')
        .select('section_id');

      if (sectionError) throw sectionError;

      // Load tooltip audio
      const { data: tooltipAudio, error: tooltipError } = await supabase
        .from('tooltip_contents')
        .select('section_id, title')
        .not('audio_url', 'is', null);

      if (tooltipError) throw tooltipError;

      const stats = [
        ...(sectionAudio || []).map(item => ({
          section: item.section_id,
          title: `Seção: ${item.section_id}`,
          type: 'section' as const,
        })),
        ...(tooltipAudio || []).map(item => ({
          section: item.section_id,
          title: `Tooltip: ${item.title}`,
          type: 'tooltip' as const,
        })),
      ];

      setAudioCacheStats(stats);
    } catch (error) {
      console.error("Erro ao carregar estatísticas de áudio:", error);
    }
  };

  useEffect(() => {
    loadCacheStats();
    loadAudioCacheStats();
  }, []);

  const clearCreditsFlag = () => {
    localStorage.removeItem("lovable_credits_exhausted");
    toast.success("Flag de créditos esgotados removida! Novas tentativas de geração serão feitas.");
  };

  const clearAllCache = async () => {
    setIsClearing(true);
    try {
      // Limpar banco de dados
      const { error: deleteError } = await supabase
        .from('generated_images')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (deleteError) throw deleteError;

      // Limpar flag de créditos
      clearCreditsFlag();

      toast.success("Cache de imagens limpo com sucesso!");
      await loadCacheStats();
    } catch (error) {
      console.error("Erro ao limpar cache:", error);
      toast.error("Erro ao limpar cache de imagens");
    } finally {
      setIsClearing(false);
    }
  };

  const clearSectionCache = async (sectionId: string) => {
    try {
      const { error } = await supabase
        .from('generated_images')
        .delete()
        .or(`section_id.eq.${sectionId},section_id.eq.tooltip-${sectionId}`);

      if (error) throw error;

      toast.success(`Cache da seção ${sectionId} limpo!`);
      await loadCacheStats();
    } catch (error) {
      console.error("Erro ao limpar cache da seção:", error);
      toast.error("Erro ao limpar cache da seção");
    }
  };

  const clearSectionAudio = async (sectionId: string) => {
    try {
      const { error } = await supabase
        .from('section_audio')
        .delete()
        .eq('section_id', sectionId);

      if (error) throw error;

      toast.success(`Áudio da seção ${sectionId} limpo!`);
      await loadAudioCacheStats();
    } catch (error) {
      console.error("Erro ao limpar áudio da seção:", error);
      toast.error("Erro ao limpar áudio da seção");
    }
  };

  const clearTooltipAudio = async (sectionId: string) => {
    try {
      const { error } = await supabase
        .from('tooltip_contents')
        .update({ audio_url: null })
        .eq('section_id', sectionId);

      if (error) throw error;

      toast.success(`Áudio do tooltip limpo!`);
      await loadAudioCacheStats();
    } catch (error) {
      console.error("Erro ao limpar áudio do tooltip:", error);
      toast.error("Erro ao limpar áudio do tooltip");
    }
  };

  const preloadCriticalImages = async () => {
    setIsPreloading(true);
    
    try {
      toast.info("Verificando créditos e iniciando pré-carregamento...");

      // Limpar flag de créditos para permitir novas tentativas
      clearCreditsFlag();

      // Chamar edge function para verificar e preload
      const { data, error } = await supabase.functions.invoke('check-credits-preload');

      if (error) throw error;

      toast.success(data?.message || "Pré-carregamento iniciado!");
      
    } catch (error) {
      console.error("Erro no pré-carregamento:", error);
      toast.error("Erro ao pré-carregar imagens");
    } finally {
      setIsPreloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Gerenciamento de Cache</h2>
          <p className="text-muted-foreground">
            Gerencie o cache de imagens geradas e otimize o uso de créditos
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'stats' ? 'default' : 'outline'}
            onClick={() => setViewMode('stats')}
            size="sm"
          >
            <Database className="mr-2 h-4 w-4" />
            Estatísticas
          </Button>
          <Button
            variant={viewMode === 'gallery' ? 'default' : 'outline'}
            onClick={() => setViewMode('gallery')}
            size="sm"
          >
            <ImageIcon className="mr-2 h-4 w-4" />
            Galeria ({cachedImages.length})
          </Button>
        </div>
      </div>

      {viewMode === 'gallery' ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Galeria de Imagens em Cache
            </CardTitle>
            <CardDescription>
              Visualize e gerencie todas as imagens geradas ({cachedImages.length} total)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              {cachedImages.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Nenhuma imagem em cache</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {cachedImages.map((image) => (
                    <div key={image.id} className="group relative border rounded-lg overflow-hidden bg-muted/20 hover:shadow-lg transition-all">
                      <div className="aspect-square relative">
                        <img
                          src={image.image_url}
                          alt={`${image.section_id} - ${image.prompt_key}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setSelectedImage(image)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => downloadImage(image.image_url, `${image.section_id}-${image.prompt_key}.png`)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Deletar imagem?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação removerá a imagem do cache. Ela precisará ser gerada novamente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteImage(image.id)}>
                                  Deletar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      <div className="p-2 space-y-1">
                        <Badge variant="secondary" className="text-xs">
                          {image.section_id}
                        </Badge>
                        <p className="text-xs text-muted-foreground truncate">
                          {image.prompt_key}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(image.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Créditos Esgotados
            </CardTitle>
            <CardDescription>
              Remove a flag de créditos esgotados para permitir novas tentativas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={clearCreditsFlag}
              variant="outline"
              className="w-full"
            >
              Limpar Flag de Créditos
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Pré-carregar Imagens
            </CardTitle>
            <CardDescription>
              Carrega imagens das seções mais importantes primeiro
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={preloadCriticalImages}
              disabled={isPreloading}
              className="w-full"
            >
              {isPreloading ? "Iniciando..." : "Pré-carregar Críticas"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Auto-Preload
            </CardTitle>
            <CardDescription>
              Sistema verifica automaticamente a cada 15 minutos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              O sistema está configurado para verificar créditos e pré-carregar imagens automaticamente.
              Veja detalhes na aba <strong>Créditos</strong>.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Estatísticas do Cache
          </CardTitle>
          <CardDescription>
            Visualize quantas imagens estão em cache por seção
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={loadCacheStats}
            variant="outline"
            size="sm"
          >
            Atualizar Estatísticas
          </Button>

          {cacheStats && (
            <div className="space-y-2">
              <div className="text-sm font-medium">
                Total de imagens em cache: {cacheStats.total}
              </div>
              <div className="grid gap-2">
                {SECTIONS.map((section) => {
                  const count = cacheStats.bySection[section.id] || 0;
                  const tooltipCount = cacheStats.bySection[`tooltip-${section.id}`] || 0;
                  const total = count + tooltipCount;
                  
                  return (
                    <div key={section.id} className="flex items-center justify-between p-2 rounded-lg border">
                      <div>
                        <span className="font-medium">{section.name}</span>
                        <span className="text-muted-foreground text-sm ml-2">
                          ({count} seção + {tooltipCount} tooltip)
                        </span>
                      </div>
                      <Button
                        onClick={() => clearSectionCache(section.id)}
                        variant="ghost"
                        size="sm"
                        disabled={total === 0}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Cache de Áudio
          </CardTitle>
          <CardDescription>
            Gerencie o cache de áudio das seções e tooltips
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {audioCacheStats.length} áudios em cache
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={loadAudioCacheStats}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
          </div>

          {audioCacheStats.length > 0 && (
            <div className="space-y-2">
              {audioCacheStats.map((stat, index) => (
                <div
                  key={`${stat.section}-${stat.title}-${index}`}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium text-sm">{stat.title}</p>
                    <p className="text-xs text-muted-foreground">{stat.section}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (stat.type === 'section') {
                        clearSectionAudio(stat.section);
                      } else {
                        clearTooltipAudio(stat.section);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Limpar Todo o Cache
          </CardTitle>
          <CardDescription>
            Remove todas as imagens em cache. Use com cuidado!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive"
                disabled={isClearing}
                className="w-full"
              >
                {isClearing ? "Limpando..." : "Limpar Todo o Cache"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação irá remover TODAS as imagens em cache do banco de dados.
                  Novas imagens precisarão ser geradas (consumindo créditos) quando os usuários
                  visitarem as páginas.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={clearAllCache}>
                  Sim, limpar tudo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
        </>
      )}

      {/* Dialog de visualização de imagem */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Pré-visualização da Imagem</DialogTitle>
            <DialogDescription>
              {selectedImage && (
                <div className="space-y-2 mt-2">
                  <div className="flex gap-2">
                    <Badge>{selectedImage.section_id}</Badge>
                    <Badge variant="outline">{selectedImage.prompt_key}</Badge>
                  </div>
                  <p className="text-sm">
                    Criado em: {new Date(selectedImage.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedImage && (
            <div className="space-y-4">
              <div className="relative rounded-lg overflow-hidden bg-muted/20">
                <img
                  src={selectedImage.image_url}
                  alt={`${selectedImage.section_id} - ${selectedImage.prompt_key}`}
                  className="w-full h-auto"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => downloadImage(selectedImage.image_url, `${selectedImage.section_id}-${selectedImage.prompt_key}.png`)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Baixar
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Deletar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Deletar imagem?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação removerá a imagem do cache. Ela precisará ser gerada novamente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => {
                        deleteImage(selectedImage.id);
                        setSelectedImage(null);
                      }}>
                        Deletar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};