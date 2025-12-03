import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface NewDocumentBadgeData {
  themes: string[];
  documentIds: string[];
}

interface SuggestionRanking {
  text: string;
  clickCount: number;
}

interface Subtopic {
  name: string;
  confidence: number;
}

interface UseDocumentSuggestionsReturn {
  newDocumentBadge: NewDocumentBadgeData | null;
  currentTheme: string;
  complementarySuggestions: string[];
  topSuggestions: SuggestionRanking[];
  recordSuggestionClick: (text: string, documentId?: string) => void;
  getSubtopicsForTheme: (theme: string) => Promise<Subtopic[]>;
  expandedTheme: string | null;
  setExpandedTheme: (theme: string | null) => void;
  subtopicsCache: Record<string, Subtopic[]>;
}

export function useDocumentSuggestions(chatType: 'health' | 'study'): UseDocumentSuggestionsReturn {
  const [currentThemeIndex, setCurrentThemeIndex] = useState(0);
  const [expandedTheme, setExpandedTheme] = useState<string | null>(null);
  const [subtopicsCache, setSubtopicsCache] = useState<Record<string, Subtopic[]>>({});

  // Buscar documentos recentes (últimos 3 dias) - aumentar limite para 15
  const { data: recentDocs } = useQuery({
    queryKey: ['recent-documents', chatType],
    queryFn: async () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      
      const { data, error } = await supabase
        .from('documents')
        .select(`
          id,
          filename,
          created_at,
          document_tags (tag_name, confidence, tag_type)
        `)
        .eq('target_chat', chatType)
        .eq('status', 'completed')
        .gte('created_at', threeDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(15);
      
      if (error) {
        console.error('Error fetching recent documents:', error);
        return [];
      }
      return data || [];
    },
    staleTime: 60000,
  });

  // Buscar ranking de sugestões mais clicadas - aumentar para 20
  const { data: clickRanking } = useQuery({
    queryKey: ['suggestion-ranking', chatType],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('suggestion_clicks')
        .select('suggestion_text')
        .eq('chat_type', chatType)
        .gte('clicked_at', thirtyDaysAgo.toISOString());

      if (error) {
        console.error('Error fetching click ranking:', error);
        return [];
      }

      // Contar cliques por sugestão
      const counts: Record<string, number> = {};
      (data || []).forEach(item => {
        counts[item.suggestion_text] = (counts[item.suggestion_text] || 0) + 1;
      });

      // Ordenar por contagem
      return Object.entries(counts)
        .map(([text, clickCount]) => ({ text, clickCount }))
        .sort((a, b) => b.clickCount - a.clickCount)
        .slice(0, 20);
    },
    staleTime: 60000,
  });

  // Extrair temas das tags com confidence > 0.70 - aumentar limite para 15
  const newDocumentData = useMemo((): NewDocumentBadgeData | null => {
    if (!recentDocs?.length) return null;
    
    const themes: string[] = [];
    const documentIds: string[] = [];
    
    recentDocs.forEach(doc => {
      if (doc.document_tags && Array.isArray(doc.document_tags)) {
        documentIds.push(doc.id);
        doc.document_tags.forEach((tag: any) => {
          if (tag.confidence > 0.70 && tag.tag_type === 'parent' && !themes.includes(tag.tag_name)) {
            themes.push(tag.tag_name);
          }
        });
      }
    });

    if (themes.length === 0) return null;
    
    return { themes: themes.slice(0, 15), documentIds };
  }, [recentDocs]);

  // PROTEÇÃO ABSOLUTA: Alternância automática de temas a cada 5 segundos
  // Intervalo pausado quando textarea está focado (detecção via :focus)
  useEffect(() => {
    if (!newDocumentData?.themes.length || newDocumentData.themes.length <= 1) return;

    const interval = setInterval(() => {
      // NOVA VERIFICAÇÃO: Detectar se algum textarea está focado no chat
      const chatContainer = document.querySelector('.chat-container');
      const focusedElement = chatContainer?.querySelector('textarea:focus');
      if (focusedElement) return; // Não atualizar durante digitação
      
      setCurrentThemeIndex(prev => 
        (prev + 1) % newDocumentData.themes.length
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [newDocumentData?.themes.length]);

  // Tema atual para exibição
  const currentTheme = useMemo(() => {
    if (!newDocumentData?.themes.length) return '';
    return newDocumentData.themes[currentThemeIndex] || newDocumentData.themes[0];
  }, [newDocumentData, currentThemeIndex]);

  // Sugestões complementares (documentos mais antigos, >3 dias) - aumentar limite para 20
  const { data: olderDocs } = useQuery({
    queryKey: ['older-documents', chatType],
    queryFn: async () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      
      const { data, error } = await supabase
        .from('documents')
        .select(`
          id,
          document_tags (tag_name, confidence, tag_type)
        `)
        .eq('target_chat', chatType)
        .eq('status', 'completed')
        .lt('created_at', threeDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) {
        console.error('Error fetching older documents:', error);
        return [];
      }
      return data || [];
    },
    staleTime: 60000,
  });

  const complementarySuggestions = useMemo(() => {
    if (!olderDocs?.length) return [];
    
    const suggestions: string[] = [];
    olderDocs.forEach(doc => {
      if (doc.document_tags && Array.isArray(doc.document_tags)) {
        doc.document_tags.forEach((tag: any) => {
          if (tag.confidence > 0.70 && tag.tag_type === 'parent' && !suggestions.includes(tag.tag_name)) {
            suggestions.push(tag.tag_name);
          }
        });
      }
    });
    
    // Filtrar temas que já estão no badge NOVO
    const newThemes = newDocumentData?.themes || [];
    return suggestions
      .filter(s => !newThemes.includes(s))
      .slice(0, 15);
  }, [olderDocs, newDocumentData?.themes]);

  // Buscar subtópicos para um tema (tags filhas)
  const getSubtopicsForTheme = useCallback(async (theme: string): Promise<Subtopic[]> => {
    // Check cache first
    if (subtopicsCache[theme]) {
      return subtopicsCache[theme];
    }

    try {
      // Buscar tag parent pelo nome
      const { data: parentTag, error: parentError } = await supabase
        .from('document_tags')
        .select('id')
        .eq('tag_name', theme)
        .eq('tag_type', 'parent')
        .limit(1)
        .single();

      if (parentError || !parentTag) {
        return [];
      }

      // Buscar tags filhas
      const { data: childTags, error: childError } = await supabase
        .from('document_tags')
        .select('tag_name, confidence')
        .eq('parent_tag_id', parentTag.id)
        .eq('tag_type', 'child')
        .order('confidence', { ascending: false })
        .limit(10);

      if (childError) {
        console.error('Error fetching subtopics:', childError);
        return [];
      }

      const subtopics = (childTags || []).map(tag => ({
        name: tag.tag_name,
        confidence: tag.confidence || 0
      }));

      // Cache the result
      setSubtopicsCache(prev => ({ ...prev, [theme]: subtopics }));
      
      return subtopics;
    } catch (error) {
      console.error('Error getting subtopics:', error);
      return [];
    }
  }, [subtopicsCache]);

  // Registrar clique em sugestão
  const recordSuggestionClick = useCallback(async (text: string, documentId?: string) => {
    try {
      await supabase
        .from('suggestion_clicks')
        .insert({
          suggestion_text: text,
          chat_type: chatType,
          document_id: documentId || null,
        });
    } catch (error) {
      console.error('Error recording suggestion click:', error);
    }
  }, [chatType]);

  return {
    newDocumentBadge: newDocumentData,
    currentTheme,
    complementarySuggestions,
    topSuggestions: clickRanking || [],
    recordSuggestionClick,
    getSubtopicsForTheme,
    expandedTheme,
    setExpandedTheme,
    subtopicsCache,
  };
}
