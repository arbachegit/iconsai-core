import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminTitleWithInfo } from "./AdminTitleWithInfo";

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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [timelinePage, setTimelinePage] = useState(1);
  const [timelineItemsPerPage, setTimelineItemsPerPage] = useState(10);

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

  const getSectionImage = (sectionId: string) => {
    return existingImages?.find(img => img.section_id === sectionId);
  };

  const getTimelineImage = (eraId: string) => {
    return timelineImages?.find(img => img.section_id === `history-${eraId}`);
  };

  // Pagination
  const totalPages = Math.ceil(SECTIONS.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSections = SECTIONS.slice(startIndex, startIndex + itemsPerPage);

  const timelineTotalPages = Math.ceil(TIMELINE_EVENTS.length / timelineItemsPerPage);
  const timelineStartIndex = (timelinePage - 1) * timelineItemsPerPage;
  const paginatedTimelineEvents = TIMELINE_EVENTS.slice(timelineStartIndex, timelineStartIndex + timelineItemsPerPage);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
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
        </CardHeader>
        <CardContent className="space-y-4">
          {paginatedSections.map((section) => {
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

          {/* Pagination Controls */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Itens por página:</span>
              <Select value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {startIndex + 1}-{Math.min(startIndex + itemsPerPage, SECTIONS.length)} de {SECTIONS.length}
              </span>
              <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline History Images */}
      <Card>
        <CardHeader>
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
        </CardHeader>
        <CardContent className="space-y-4">
          {paginatedTimelineEvents.map((event) => {
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

          {/* Timeline Pagination Controls */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Itens por página:</span>
              <Select value={timelineItemsPerPage.toString()} onValueChange={(v) => { setTimelineItemsPerPage(Number(v)); setTimelinePage(1); }}>
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {timelineStartIndex + 1}-{Math.min(timelineStartIndex + timelineItemsPerPage, TIMELINE_EVENTS.length)} de {TIMELINE_EVENTS.length}
              </span>
              <Button variant="outline" size="sm" disabled={timelinePage === 1} onClick={() => setTimelinePage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={timelinePage === timelineTotalPages} onClick={() => setTimelinePage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
