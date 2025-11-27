import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Image as ImageIcon } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const SECTIONS = [
  { id: 'software', name: 'Software - A Primeira Revolução' },
  { id: 'internet', name: 'Internet - A Era da Conectividade' },
  { id: 'tech-sem-proposito', name: 'Tech Sem Propósito - O Hype' },
  { id: 'kubrick', name: 'Kubrick - A Profecia de 1968' },
  { id: 'watson', name: 'Watson - A Era da Cognição' },
  { id: 'ia-nova-era', name: 'Nova Era da IA' },
  { id: 'bom-prompt', name: 'Bom Prompt - A Arte da Comunicação' },
];

export const ImageCacheTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [generatingSection, setGeneratingSection] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de Imagens das Seções</CardTitle>
          <CardDescription>
            Gere e gerencie as imagens contextuais para cada seção do landing page
          </CardDescription>
        </CardHeader>
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
      </Card>
    </div>
  );
};
