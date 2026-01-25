// Hook stub - tabela chat_analytics foi removida
// Mantido para compatibilidade com useChat

interface CreateSessionParams {
  session_id: string;
  user_name: string | null;
}

interface UpdateSessionParams {
  session_id: string;
  updates: {
    message_count?: number;
    audio_plays?: number;
  };
}

export function useChatAnalytics() {
  return {
    createSession: async (_params: CreateSessionParams) => {
      // No-op - tabela removida
      return { data: null, error: null };
    },
    updateSession: async (_params: UpdateSessionParams) => {
      // No-op - tabela removida
      return { data: null, error: null };
    },
  };
}
