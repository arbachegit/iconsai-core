// usePWAConversations Hook - v1.0.0
// 
// ===== TABELAS DO BANCO DE DADOS =====
// - pwa_conversation_sessions   : Sessões de conversa
// - pwa_conversation_messages   : Mensagens das conversas
// - pwa_conv_summaries          : Resumos das conversas (NÃO usar "pwa_conversation_summaries")
// =====================================
//
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { 
  PWAUser, 
  PWAConversationSession, 
  PWAUsersFilters, 
  PWAUsersSortConfig, 
  AutocompleteItem, 
  PWAModuleType 
} from '@/types/pwa-conversations';
import { toast } from 'sonner';

export function usePWAConversations() {
  const [users, setUsers] = useState<PWAUser[]>([]);
  const [sessions, setSessions] = useState<PWAConversationSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalUsers, setTotalUsers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<PWAUsersFilters>({});
  const [sortConfig, setSortConfig] = useState<PWAUsersSortConfig>({ 
    column: 'last_activity', 
    direction: 'desc' 
  });
  const [taxonomySuggestions, setTaxonomySuggestions] = useState<AutocompleteItem[]>([]);
  const [keyTopicsSuggestions, setKeyTopicsSuggestions] = useState<AutocompleteItem[]>([]);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // TODO: Implementar busca real quando tabelas existirem
      console.log('[usePWAConversations] Buscando usuários com filtros:', filters);
      console.log('[usePWAConversations] Ordenação:', sortConfig);
      console.log('[usePWAConversations] Página:', currentPage, 'Tamanho:', pageSize);
      
      // Placeholder - será substituído por query real
      setUsers([]);
      setTotalUsers(0);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
      toast.error('Erro ao carregar conversas');
    } finally {
      setIsLoading(false);
    }
  }, [filters, sortConfig, currentPage, pageSize]);

  const fetchSessionsForUser = useCallback(async (deviceId: string, moduleType?: PWAModuleType) => {
    setIsLoadingSessions(true);
    try {
      console.log('[usePWAConversations] Buscando sessões para:', deviceId, 'módulo:', moduleType);
      
      // TODO: Implementar busca real quando tabelas existirem
      setSessions([]);
    } catch (err: unknown) {
      toast.error('Erro ao carregar sessões');
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  const fetchTaxonomySuggestions = useCallback(async (query: string) => {
    if (query.length < 1) {
      setTaxonomySuggestions([]);
      return;
    }
    
    try {
      // TODO: Buscar do banco - global_taxonomy
      console.log('[usePWAConversations] Buscando taxonomias:', query);
      setTaxonomySuggestions([]);
    } catch (err) {
      console.error('Erro ao buscar taxonomias:', err);
    }
  }, []);

  const fetchKeyTopicsSuggestions = useCallback(async (query: string) => {
    if (query.length < 1) {
      setKeyTopicsSuggestions([]);
      return;
    }
    
    try {
      // TODO: Buscar do banco - key_topics das mensagens
      console.log('[usePWAConversations] Buscando temas-chave:', query);
      setKeyTopicsSuggestions([]);
    } catch (err) {
      console.error('Erro ao buscar temas-chave:', err);
    }
  }, []);

  const refreshData = useCallback(async () => {
    await fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    // Estado
    users,
    sessions,
    taxonomySuggestions,
    keyTopicsSuggestions,
    isLoading,
    isLoadingSessions,
    error,
    totalUsers,
    currentPage,
    pageSize,
    filters,
    sortConfig,
    
    // Setters
    setFilters,
    setSortConfig,
    setCurrentPage,
    setPageSize,
    
    // Actions
    fetchUsers,
    fetchSessionsForUser,
    fetchTaxonomySuggestions,
    fetchKeyTopicsSuggestions,
    refreshData,
  };
}

export default usePWAConversations;
