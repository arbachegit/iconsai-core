// Hook stub - tabela de mapeamento de agentes foi removida
// Retorna null para todas as localizações

export function useAgentByLocation(_location: string) {
  return {
    agentSlug: null,
    isLoading: false,
    error: null,
  };
}
