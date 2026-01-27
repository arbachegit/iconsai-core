// usePWAConversations Hook - v2.0.0
//
// ===== TABELAS DO BANCO DE DADOS =====
// - pwa_sessions       : Sessões de conversa
// - pwa_conversations  : Mensagens das conversas
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
  PWAModuleType,
  CompanySource,
  KeyTopics
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
      console.log('[usePWAConversations] Buscando usuários com filtros:', filters);

      // Query direta na tabela pwa_sessions agrupando por device_id
      const { data, error: queryError } = await supabase
        .from('pwa_sessions')
        .select('device_id, module_slug, started_at, metadata')
        .order('started_at', { ascending: false })
        .limit(500);

      if (queryError) throw queryError;

      // Agrupar por device_id
      const userMap = new Map<string, PWAUser>();
      (data || []).forEach((session) => {
        const existing = userMap.get(session.device_id);
        if (!existing) {
          userMap.set(session.device_id, {
            device_id: session.device_id,
            user_name: (session.metadata as Record<string, unknown>)?.user_name as string || null,
            user_email: null,
            company: null,
            company_source: 'undefined',
            last_activity: session.started_at,
            total_sessions: 1,
            modules_used: [session.module_slug as PWAModuleType],
          });
        } else {
          existing.total_sessions++;
          if (!existing.modules_used.includes(session.module_slug as PWAModuleType)) {
            existing.modules_used.push(session.module_slug as PWAModuleType);
          }
        }
      });

      const mappedUsers = Array.from(userMap.values());
      setUsers(mappedUsers);
      setTotalUsers(mappedUsers.length);

      console.log('[usePWAConversations] Usuários carregados:', mappedUsers.length);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('[usePWAConversations] Erro ao buscar usuários:', err);
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

      // 1. Buscar sessões
      let sessionsQuery = supabase
        .from('pwa_sessions')
        .select('*')
        .eq('device_id', deviceId)
        .order('started_at', { ascending: false });

      if (moduleType) {
        sessionsQuery = sessionsQuery.eq('module_slug', moduleType);
      }

      const { data: sessionsData, error: sessionsError } = await sessionsQuery;
      if (sessionsError) throw sessionsError;

      // 2. Para cada sessão, buscar conversas
      const sessionsWithDetails: PWAConversationSession[] = await Promise.all(
        (sessionsData || []).map(async (session) => {
          // Buscar conversas (mensagens)
          const { data: conversationsData } = await supabase
            .from('pwa_conversations')
            .select('*')
            .eq('session_id', session.id)
            .order('created_at', { ascending: true });

          // Mapear mensagens
          const mappedMessages = (conversationsData || []).map((conv) => ({
            id: conv.id,
            session_id: conv.session_id,
            role: conv.role as 'user' | 'assistant',
            content: conv.content,
            audio_url: conv.audio_url,
            audio_duration: conv.audio_duration_seconds,
            transcription: conv.transcription,
            timestamp: conv.created_at,
            taxonomy_tags: conv.taxonomy_tags || [],
            key_topics: conv.key_topics as unknown as KeyTopics,
            created_at: conv.created_at,
          }));

          return {
            id: session.id,
            device_id: session.device_id,
            user_name: (session.metadata as Record<string, unknown>)?.user_name as string || null,
            user_email: null,
            company: null,
            company_source: 'undefined' as CompanySource,
            module_type: session.module_slug as PWAModuleType,
            started_at: session.started_at,
            ended_at: session.ended_at,
            city: null,
            country: null,
            latitude: null,
            longitude: null,
            created_at: session.created_at,
            messages: mappedMessages,
            summary: session.summary ? {
              id: session.id,
              session_id: session.id,
              summary: session.summary,
              key_topics: { keywords: session.summary_keywords || [] } as unknown as KeyTopics,
              created_at: session.created_at,
            } : undefined,
          } as PWAConversationSession;
        })
      );

      setSessions(sessionsWithDetails);
      console.log('[usePWAConversations] Sessões carregadas:', sessionsWithDetails.length);
    } catch (err: unknown) {
      console.error('[usePWAConversations] Erro ao buscar sessões:', err);
      toast.error('Erro ao carregar sessões');
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  // Taxonomias desabilitadas - tabela removida
  const fetchTaxonomySuggestions = useCallback(async (_query: string) => {
    setTaxonomySuggestions([]);
  }, []);

  // Buscar temas-chave das conversas
  const fetchKeyTopicsSuggestions = useCallback(async (query: string) => {
    try {
      console.log('[usePWAConversations] Buscando temas-chave:', query || '(todos)');

      const { data, error } = await supabase
        .from('pwa_conversations')
        .select('key_topics')
        .not('key_topics', 'is', null)
        .limit(100);

      if (error) throw error;

      const topicsSet = new Map<string, AutocompleteItem>();
      const lowerQuery = query.toLowerCase();

      (data || []).forEach((row) => {
        const kt = row.key_topics as unknown as KeyTopics | null;
        if (!kt) return;

        kt.people?.forEach((p) => {
          if ((lowerQuery === '' || p.toLowerCase().includes(lowerQuery)) && !topicsSet.has(p)) {
            topicsSet.set(p, { value: p, label: p, category: 'person' });
          }
        });

        kt.countries?.forEach((c) => {
          if ((lowerQuery === '' || c.toLowerCase().includes(lowerQuery)) && !topicsSet.has(c)) {
            topicsSet.set(c, { value: c, label: c, category: 'country' });
          }
        });

        kt.organizations?.forEach((o) => {
          if ((lowerQuery === '' || o.toLowerCase().includes(lowerQuery)) && !topicsSet.has(o)) {
            topicsSet.set(o, { value: o, label: o, category: 'organization' });
          }
        });
      });

      const suggestions = Array.from(topicsSet.values()).slice(0, 20);
      setKeyTopicsSuggestions(suggestions);
    } catch (err) {
      console.error('[usePWAConversations] Erro ao buscar temas-chave:', err);
      setKeyTopicsSuggestions([]);
    }
  }, []);

  const refreshData = useCallback(async () => {
    await fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
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
    setFilters,
    setSortConfig,
    setCurrentPage,
    setPageSize,
    fetchUsers,
    fetchSessionsForUser,
    fetchTaxonomySuggestions,
    fetchKeyTopicsSuggestions,
    refreshData,
  };
}

export default usePWAConversations;
