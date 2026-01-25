// Hook desabilitado - tabela tooltip_contents foi removida do banco
// Mantido para compatibilidade com componentes que ainda o importam

interface TooltipContent {
  id: string;
  section_id: string;
  title: string;
  content: string;
  audio_url: string | null;
  is_active: boolean;
}

export const useTooltipContent = (_sectionId: string) => {
  return {
    content: null as TooltipContent | null,
    isLoading: false,
    updateContent: async (_updates: Partial<TooltipContent>) => null,
  };
};
