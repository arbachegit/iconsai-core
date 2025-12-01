import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Image as ImageIcon, ChevronUp, ChevronDown } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminTitleWithInfo } from "./AdminTitleWithInfo";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";

const SECTIONS = [
  { id: 'software', name: 'Software - A Primeira Revolução' },
  { id: 'internet', name: 'Internet - A Era da Conectividade' },
  { id: 'tech-sem-proposito', name: 'Tech Sem Propósito - O Hype' },
  { id: 'kubrick', name: 'Kubrick - A Profecia de 1968' },
  { id: 'watson', name: 'Watson - A Era da Cognição' },
  { id: 'ia-nova-era', name: 'Nova Era da IA' },
  { id: 'bom-prompt', name: 'Bom Prompt - A Arte da Comunicação' },
];

const TIMELINE_EVENTS = [
  { id: 'talos', name: 'Talos - Gigante de Bronze' },
  { id: 'telegraphy-cards', name: 'Telegrafia e Cartões Perfurados' },
  { id: 'turing-machine', name: 'Máquina de Turing' },
  { id: 'enigma', name: 'Quebra do Código Enigma' },
  { id: 'turing-test', name: 'Teste de Turing' },
  { id: 'arpanet', name: 'ARPANET - Primeira Conexão' },
  { id: 'tcpip', name: 'Conceito de TCP/IP' },
  { id: 'www', name: 'World Wide Web' },
  { id: 'social', name: 'Facebook e Orkut - Web 2.0' },
  { id: 'watson', name: 'IBM Watson vence Jeopardy!' },
  { id: 'openai', name: 'Fundação da OpenAI' },
  { id: 'gpt3', name: 'Lançamento do GPT-3' },
  { id: 'chatgpt', name: 'Lançamento do ChatGPT' },
  { id: 'current', name: 'Web 3.0, Veo e LLMs' },
];

export const ImageCacheTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [generatingSection, setGeneratingSection] = useState<string | null>(null);
  const [generatingTimeline, setGeneratingTimeline] = useState<string | null>(null);
  const [generatingTooltip, setGeneratingTooltip] = useState<string | null>(null);
  const [isSectionsOpen, setIsSectionsOpen] = useState(true);
  const [isTimelineOpen, setIsTimelineOpen] = useState(true);
  const [isTooltipsOpen, setIsTooltipsOpen] = useState(true);

  const { data: existingImages } = useQuery({
    queryKey: ['section-images-admin'],
    queryFn: async () => {
      const { data } = await supabase
        .from('generated_images')
        .select('section_id, image_url, created_at')
        .in('section_id', SECTIONS.map(s => s.id))
        .order('created_at', { ascending: false });
      return data || [];
    }
  });

  const { data: timelineImages } = useQuery({
    queryKey: ['timeline-images-admin'],
    queryFn: async () => {
      const { data } = await supabase
        .from('generated_images')
        .select('section_id, image_url, created_at')
        .like('section_id', 'history-%')
        .order('created_at', { ascending: false });
      return data || [];
    }
  });

  const { data: tooltipImages } = useQuery({
    queryKey: ['tooltip-images-admin'],
    queryFn: async () => {
      const { data } = await supabase
        .from('generated_images')
        .select('section_id, image_url, created_at')
        .in('section_id', ['software-tooltip', 'internet-tooltip', 'tech-sem-proposito-tooltip', 'kubrick-tooltip', 'watson-tooltip', 'ia-nova-era-tooltip', 'bom-prompt-tooltip'])
        .order('created_at', { ascending: false });
      return data || [];
    }
  });

  const generateTimelineImageMutation = useMutation({
    mutationFn: async ({ eraId, forceRegenerate }: { eraId: string; forceRegenerate: boolean }) => {
      setGeneratingTimeline(eraId);
      
      const { data, error } = await supabase.functions.invoke('generate-history-image', {
        body: { eraId, forceRegenerate }
      });

      if (error) throw error;
      if (!data?.imageUrl) throw new Error('Nenhuma imagem retornada');

      return data.imageUrl;
    },
    onSuccess: (_, { eraId }) => {
      toast({
        title: "Imagem gerada com sucesso",
        description: `Imagem do evento ${eraId} foi gerada e salva.`,
      });
      queryClient.invalidateQueries({ queryKey: ['timeline-images-admin'] });
      setGeneratingTimeline(null);
    },
    onError: (error: any) => {
      let errorMessage = 'Erro ao gerar imagem';
      
      if (error.message?.includes('402')) {
        errorMessage = 'Créditos insuficientes. Adicione créditos ao workspace.';
      } else if (error.message?.includes('429')) {
        errorMessage = 'Limite de requisições excedido. Tente novamente em alguns minutos.';
      }

      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
      setGeneratingTimeline(null);
    }
  });

  const deleteTimelineImageMutation = useMutation({
    mutationFn: async (eraId: string) => {
      const { error } = await supabase
        .from('generated_images')
        .delete()
        .eq('section_id', `history-${eraId}`);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Cache limpo",
        description: "Imagem removida do cache.",
      });
      queryClient.invalidateQueries({ queryKey: ['timeline-images-admin'] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao limpar cache",
        variant: "destructive",
      });
    }
  });

  const generateImageMutation = useMutation({
    mutationFn: async (sectionId: string) => {
      setGeneratingSection(sectionId);
      
      const { data, error } = await supabase.functions.invoke('generate-section-image', {
        body: { section_id: sectionId }
      });

      if (error) throw error;
      if (!data?.imageUrl) throw new Error('Nenhuma imagem retornada');

      // Save to database
      const { error: dbError } = await supabase
        .from('generated_images')
        .insert({
          section_id: sectionId,
          image_url: data.imageUrl,
          prompt_key: sectionId
        });

      if (dbError) throw dbError;

      return data.imageUrl;
    },
    onSuccess: (_, sectionId) => {
      toast({
        title: "Imagem gerada com sucesso",
        description: `Imagem da seção ${sectionId} foi gerada e salva.`,
      });
      queryClient.invalidateQueries({ queryKey: ['section-images-admin'] });
      queryClient.invalidateQueries({ queryKey: ['section-image'] });
      setGeneratingSection(null);
    },
    onError: (error: any) => {
      let errorMessage = 'Erro ao gerar imagem';
      
      if (error.message?.includes('402')) {
        errorMessage = 'Créditos insuficientes. Adicione créditos ao workspace.';
      } else if (error.message?.includes('429')) {
        errorMessage = 'Limite de requisições excedido. Tente novamente em alguns minutos.';
      }

      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
      setGeneratingSection(null);
    }
  });

  const deleteImageMutation = useMutation({
    mutationFn: async (sectionId: string) => {
      const { error } = await supabase
        .from('generated_images')
        .delete()
        .eq('section_id', sectionId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Cache limpo",
        description: "Imagem removida do cache.",
      });
      queryClient.invalidateQueries({ queryKey: ['section-images-admin'] });
      queryClient.invalidateQueries({ queryKey: ['section-image'] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao limpar cache",
        variant: "destructive",
      });
    }
  });

  const [isMigrating, setIsMigrating] = useState(false);

  const migrateTimelineImagesMutation = useMutation({
    mutationFn: async () => {
      setIsMigrating(true);
      const { data, error } = await supabase.functions.invoke('migrate-timeline-images', {
        body: {}
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setIsMigrating(false);
      toast({
        title: "Migração concluída",
        description: `${data.migrated} imagens migradas para WebP no Storage. ${data.failed} falhas.`,
      });
      queryClient.invalidateQueries({ queryKey: ['timeline-images'] });
    },
    onError: (error: Error) => {
      setIsMigrating(false);
      toast({
        title: "Erro na migração",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const migrateAllImagesMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('migrate-all-images');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Migração de todas as imagens concluída",
        description: `${data.migrated} imagens migradas com sucesso. ${data.failed} falharam. ${data.skipped} já estavam migradas.`,
      });
      queryClient.invalidateQueries({ queryKey: ['generated-images'] });
      queryClient.invalidateQueries({ queryKey: ['section-images-admin'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro na migração",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const getSectionImage = (sectionId: string) => {
    return existingImages?.find(img => img.section_id === sectionId);
  };

  const getTimelineImage = (eraId: string) => {
    return timelineImages?.find(img => img.section_id === `history-${eraId}`);
  };

  const getTooltipImage = (sectionId: string) => {
    return tooltipImages?.find(img => img.section_id === `${sectionId}-tooltip`);
  };

  const generateTooltipImageMutation = useMutation({
    mutationFn: async (sectionId: string) => {
      setGeneratingTooltip(sectionId);
      
      const { data, error } = await supabase.functions.invoke('generate-section-image', {
        body: { section_id: `${sectionId}-tooltip` }
      });

      if (error) throw error;
      if (!data?.imageUrl) throw new Error('Nenhuma imagem retornada');

      const { error: dbError } = await supabase
        .from('generated_images')
        .insert({
          section_id: `${sectionId}-tooltip`,
          image_url: data.imageUrl,
          prompt_key: `${sectionId}-tooltip`
        });

      if (dbError) throw dbError;

      return data.imageUrl;
    },
    onSuccess: (_, sectionId) => {
      toast({
        title: "Imagem gerada com sucesso",
        description: `Imagem do tooltip ${sectionId} foi gerada e salva.`,
      });
      queryClient.invalidateQueries({ queryKey: ['tooltip-images-admin'] });
      setGeneratingTooltip(null);
    },
    onError: (error: any) => {
      let errorMessage = 'Erro ao gerar imagem';
      
      if (error.message?.includes('402')) {
        errorMessage = 'Créditos insuficientes. Adicione créditos ao workspace.';
      } else if (error.message?.includes('429')) {
        errorMessage = 'Limite de requisições excedido. Tente novamente em alguns minutos.';
      }

      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
      setGeneratingTooltip(null);
    }
  });

  const deleteTooltipImageMutation = useMutation({
    mutationFn: async (sectionId: string) => {
      const { error } = await supabase
        .from('generated_images')
        .delete()
        .eq('section_id', `${sectionId}-tooltip`);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Cache limpo",
        description: "Imagem removida do cache.",
      });
      queryClient.invalidateQueries({ queryKey: ['tooltip-images-admin'] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao limpar cache",
        variant: "destructive",
      });
    }
  });

  return (
    <div className="space-y-6">
      {/* Migration Alert - Timeline */}
      <Card className="border-blue-500/50 bg-blue-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-400">
            <ImageIcon className="h-5 w-5" />
            Otimização de Imagens da Timeline
          </CardTitle>
          <CardDescription>
            Migre as imagens Base64 (~43 MB) para WebP otimizado no Storage (~1-2 MB total)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => migrateTimelineImagesMutation.mutate()}
            disabled={isMigrating}
            variant="outline"
            className="w-full sm:w-auto"
          >
            {isMigrating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Migrando...
              </>
            ) : (
              'Executar Migração para WebP + Storage'
            )}
          </Button>
          <p className="mt-2 text-sm text-muted-foreground">
            Esta operação irá converter todas as 19 imagens da timeline para WebP e armazená-las no Supabase Storage.
          </p>
        </CardContent>
      </Card>

      {/* Migration Alert - All Images */}
      <Card className="border-purple-500/50 bg-purple-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-400">
            <ImageIcon className="h-5 w-5" />
            Otimização de Todas as Imagens
          </CardTitle>
          <CardDescription>
            Migre TODAS as imagens de seções e tooltips para WebP no Storage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-purple-500/5 rounded-lg border border-purple-500/20">
              <p className="text-sm font-semibold mb-2">Esta migração processa:</p>
              <ul className="text-sm space-y-1 ml-4">
                <li>• 8 imagens de seções do landing page</li>
                <li>• Todas as imagens de tooltips existentes</li>
                <li>• Ignora imagens da timeline (já migradas acima)</li>
                <li>• Economia total prevista: ~50 MB no banco</li>
              </ul>
            </div>
            
            <Button
              onClick={() => migrateAllImagesMutation.mutate()}
              disabled={migrateAllImagesMutation.isPending}
              variant="outline"
              className="w-full sm:w-auto"
            >
              {migrateAllImagesMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Migrando Todas...
                </>
              ) : (
                'Migrar Seções + Tooltips'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <AdminTitleWithInfo
                title="Gerenciamento de Imagens das Seções"
                level="h2"
                icon={ImageIcon}
                tooltipText="Gerencie imagens contextuais"
                infoContent={
                  <>
                    <p>Gere e gerencie imagens para cada seção do landing page.</p>
                    <p className="mt-2">Regenere imagens ou remova do cache quando necessário.</p>
                  </>
                }
              />
              <CardDescription className="mt-2">
                Gere e gerencie as imagens contextuais para cada seção do landing page
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSectionsOpen(!isSectionsOpen)}
              className="gap-2"
            >
              {isSectionsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {isSectionsOpen ? "Colapsar" : "Expandir"}
            </Button>
          </div>
        </CardHeader>
        <Collapsible open={isSectionsOpen}>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {SECTIONS.map((section) => {
            const existingImage = getSectionImage(section.id);
            const isGenerating = generatingSection === section.id;

            return (
              <Card key={section.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <ImageIcon className="h-4 w-4" />
                      <h3 className="font-semibold">{section.name}</h3>
                    </div>
                    {existingImage ? (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Imagem gerada em: {new Date(existingImage.created_at).toLocaleDateString('pt-BR')}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => generateImageMutation.mutate(section.id)}
                            disabled={isGenerating}
                          >
                            {isGenerating ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Gerando...
                              </>
                            ) : (
                              'Regerar'
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteImageMutation.mutate(section.id)}
                          >
                            Remover
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Nenhuma imagem gerada ainda
                        </p>
                        <Button
                          size="sm"
                          onClick={() => generateImageMutation.mutate(section.id)}
                          disabled={isGenerating}
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Gerando...
                            </>
                          ) : (
                            'Gerar Imagem'
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                  {existingImage && (
                    <div className="w-24 h-24 rounded-lg overflow-hidden border">
                      <img
                        src={existingImage.image_url}
                        alt={section.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Timeline History Images */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <AdminTitleWithInfo
                title="Imagens da Timeline Histórica"
                level="h2"
                icon={ImageIcon}
                tooltipText="Gerencie imagens da timeline de IA"
                infoContent={
                  <>
                    <p>Gere e gerencie imagens para eventos da timeline histórica da IA.</p>
                    <p className="mt-2">Forçar regeneração criará uma nova imagem mesmo se já existir no cache.</p>
                  </>
                }
              />
              <CardDescription className="mt-2">
                Gere e gerencie as imagens para cada evento da linha do tempo da história da IA
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsTimelineOpen(!isTimelineOpen)}
              className="gap-2"
            >
              {isTimelineOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {isTimelineOpen ? "Colapsar" : "Expandir"}
            </Button>
          </div>
        </CardHeader>
        <Collapsible open={isTimelineOpen}>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {TIMELINE_EVENTS.map((event) => {
            const existingImage = getTimelineImage(event.id);
            const isGenerating = generatingTimeline === event.id;

            return (
              <Card key={event.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <ImageIcon className="h-4 w-4" />
                      <h3 className="font-semibold">{event.name}</h3>
                    </div>
                    {existingImage ? (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Imagem gerada em: {new Date(existingImage.created_at).toLocaleDateString('pt-BR')}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => generateTimelineImageMutation.mutate({ eraId: event.id, forceRegenerate: true })}
                            disabled={isGenerating}
                          >
                            {isGenerating ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Gerando...
                              </>
                            ) : (
                              'Forçar Regeneração'
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteTimelineImageMutation.mutate(event.id)}
                          >
                            Remover
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Nenhuma imagem gerada ainda
                        </p>
                        <Button
                          size="sm"
                          onClick={() => generateTimelineImageMutation.mutate({ eraId: event.id, forceRegenerate: false })}
                          disabled={isGenerating}
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Gerando...
                            </>
                          ) : (
                            'Gerar Imagem'
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                  {existingImage && (
                    <div className="w-24 h-24 rounded-lg overflow-hidden border">
                      <img
                        src={existingImage.image_url}
                        alt={event.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Tooltip Images */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <AdminTitleWithInfo
                title="Gerenciamento de Imagens dos Tooltips"
                level="h2"
                icon={ImageIcon}
                tooltipText="Gerencie imagens dos tooltips"
                infoContent={
                  <>
                    <p>Gere e gerencie imagens para os tooltips de cada seção.</p>
                    <p className="mt-2">Regenere imagens ou remova do cache quando necessário.</p>
                  </>
                }
              />
              <CardDescription className="mt-2">
                Gere e gerencie as imagens contextuais para os tooltips das seções
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsTooltipsOpen(!isTooltipsOpen)}
              className="gap-2"
            >
              {isTooltipsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {isTooltipsOpen ? "Colapsar" : "Expandir"}
            </Button>
          </div>
        </CardHeader>
        <Collapsible open={isTooltipsOpen}>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {SECTIONS.map((section) => {
                const existingImage = getTooltipImage(section.id);
                const isGenerating = generatingTooltip === section.id;

                return (
                  <Card key={section.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <ImageIcon className="h-4 w-4" />
                          <h3 className="font-semibold">{section.name} - Tooltip</h3>
                        </div>
                        {existingImage ? (
                          <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                              Imagem gerada em: {new Date(existingImage.created_at).toLocaleDateString('pt-BR')}
                            </p>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => generateTooltipImageMutation.mutate(section.id)}
                                disabled={isGenerating}
                              >
                                {isGenerating ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Gerando...
                                  </>
                                ) : (
                                  'Regerar'
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteTooltipImageMutation.mutate(section.id)}
                              >
                                Remover
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">
                              Nenhuma imagem gerada ainda
                            </p>
                            <Button
                              size="sm"
                              onClick={() => generateTooltipImageMutation.mutate(section.id)}
                              disabled={isGenerating}
                            >
                              {isGenerating ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Gerando...
                                </>
                              ) : (
                                'Gerar Imagem'
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                      {existingImage && (
                        <div className="w-24 h-24 rounded-lg overflow-hidden border">
                          <img
                            src={existingImage.image_url}
                            alt={`${section.name} - Tooltip`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
};
