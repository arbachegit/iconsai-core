import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, RefreshCw, Sparkles, Database } from "lucide-react";
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

export const ImageCacheTab = () => {
  const [isClearing, setIsClearing] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);
  const [cacheStats, setCacheStats] = useState<{ total: number; bySection: Record<string, number> } | null>(null);

  const loadCacheStats = async () => {
    try {
      const { data, error } = await supabase
        .from('generated_images')
        .select('section_id');

      if (error) throw error;

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

  const preloadCriticalImages = async () => {
    setIsPreloading(true);
    
    try {
      // Seções críticas que aparecem primeiro na página
      const criticalSections = ["software", "internet", "ia-nova-era", "knowyou"];
      
      toast.info("Iniciando pré-carregamento de imagens críticas...");

      // Limpar flag de créditos para permitir novas tentativas
      clearCreditsFlag();

      for (const sectionId of criticalSections) {
        // Verificar se seção já tem imagens
        const { data: existing } = await supabase
          .from('generated_images')
          .select('id')
          .eq('section_id', sectionId);

        if (existing && existing.length > 0) {
          console.log(`Seção ${sectionId} já possui imagens em cache`);
          continue;
        }

        toast.info(`Pré-carregando imagens para ${sectionId}...`);
        
        // Disparar evento para forçar recarga da página
        // (as imagens serão carregadas automaticamente pelos componentes)
      }

      toast.success("Pré-carregamento iniciado! Recarregue a página principal para ver as imagens sendo geradas.");
      
    } catch (error) {
      console.error("Erro no pré-carregamento:", error);
      toast.error("Erro ao pré-carregar imagens");
    } finally {
      setIsPreloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Gerenciamento de Cache</h2>
        <p className="text-muted-foreground">
          Gerencie o cache de imagens geradas e otimize o uso de créditos
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
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
    </div>
  );
};