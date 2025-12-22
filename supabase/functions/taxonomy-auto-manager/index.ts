import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  action: 'health' | 'gaps' | 'suggestions' | 'keywords' | 'analyze' | 'approve' | 'reject' | 'batch_approve' | 'batch_reject';
  suggestionId?: string;
  suggestionIds?: string[];
  notes?: string;
  modifyCode?: string;
  modifyName?: string;
  minOccurrences?: number;
  limit?: number;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, suggestionId, suggestionIds, notes, modifyCode, modifyName, minOccurrences, limit } = await req.json() as RequestBody;
    
    console.log(`[taxonomy-auto-manager] Action: ${action}`);

    switch (action) {
      // ===============================================
      // HEALTH - Estatísticas de saúde do sistema
      // ===============================================
      case 'health': {
        const { data, error } = await supabase.rpc('get_taxonomy_health_stats');
        
        if (error) {
          console.error('[taxonomy-auto-manager] Error getting health stats:', error);
          throw error;
        }

        return new Response(JSON.stringify({
          success: true,
          data,
          executionTime: Date.now() - startTime
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ===============================================
      // GAPS - Detectar problemas na taxonomia
      // ===============================================
      case 'gaps': {
        const { data, error } = await supabase.rpc('detect_taxonomy_gaps');
        
        if (error) {
          console.error('[taxonomy-auto-manager] Error detecting gaps:', error);
          throw error;
        }

        return new Response(JSON.stringify({
          success: true,
          gaps: data || [],
          count: data?.length || 0,
          executionTime: Date.now() - startTime
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ===============================================
      // KEYWORDS - Extrair keywords frequentes
      // ===============================================
      case 'keywords': {
        const { data, error } = await supabase.rpc('extract_frequent_keywords', {
          p_min_occurrences: minOccurrences || 3,
          p_limit: limit || 50
        });
        
        if (error) {
          console.error('[taxonomy-auto-manager] Error extracting keywords:', error);
          throw error;
        }

        // Filtrar apenas keywords sem taxonomia existente
        const unmappedKeywords = (data || []).filter((k: any) => !k.existing_taxonomy_code);

        return new Response(JSON.stringify({
          success: true,
          keywords: unmappedKeywords,
          totalFound: data?.length || 0,
          unmappedCount: unmappedKeywords.length,
          executionTime: Date.now() - startTime
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ===============================================
      // SUGGESTIONS - Listar sugestões pendentes
      // ===============================================
      case 'suggestions': {
        const { data, error } = await supabase
          .from('taxonomy_suggestions')
          .select('*')
          .order('confidence', { ascending: false })
          .order('occurrence_count', { ascending: false });
        
        if (error) {
          console.error('[taxonomy-auto-manager] Error fetching suggestions:', error);
          throw error;
        }

        const pending = data?.filter(s => s.status === 'pending') || [];
        const approved = data?.filter(s => s.status === 'approved') || [];
        const rejected = data?.filter(s => s.status === 'rejected') || [];

        return new Response(JSON.stringify({
          success: true,
          suggestions: {
            pending,
            approved,
            rejected,
            all: data
          },
          counts: {
            pending: pending.length,
            approved: approved.length,
            rejected: rejected.length,
            total: data?.length || 0
          },
          executionTime: Date.now() - startTime
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ===============================================
      // ANALYZE - Analisar documentos e criar sugestões
      // ===============================================
      case 'analyze': {
        console.log('[taxonomy-auto-manager] Starting document analysis...');
        
        // 1. Chamar analyze-taxonomy-gap
        const { data: gapData, error: gapError } = await supabase.functions.invoke('analyze-taxonomy-gap', {
          body: {}
        });

        if (gapError) {
          console.error('[taxonomy-auto-manager] Error calling analyze-taxonomy-gap:', gapError);
          throw gapError;
        }

        const analysisResult = gapData;
        console.log('[taxonomy-auto-manager] Gap analysis result:', JSON.stringify(analysisResult).substring(0, 500));

        // 2. Processar suggestedNewTaxonomies e criar sugestões
        const suggestedTaxonomies = analysisResult?.suggestedNewTaxonomies || [];
        const createdSuggestions: string[] = [];

        for (const suggestion of suggestedTaxonomies) {
          try {
            // Verificar se já existe taxonomia com esse código
            const { data: existingTax } = await supabase
              .from('global_taxonomy')
              .select('id')
              .ilike('code', suggestion.suggestedCode || '')
              .limit(1);

            if (existingTax && existingTax.length > 0) {
              console.log(`[taxonomy-auto-manager] Taxonomy already exists: ${suggestion.suggestedCode}`);
              continue;
            }

            // Criar sugestão via função SQL
            const { data: suggestionId, error: createError } = await supabase.rpc('create_taxonomy_suggestion', {
              p_code: suggestion.suggestedCode || `auto.${suggestion.tags?.[0]?.toLowerCase().replace(/\s+/g, '_') || 'unknown'}`,
              p_name: suggestion.suggestedName || suggestion.tags?.[0] || 'Unknown',
              p_description: `Sugestão automática baseada em ${suggestion.documentCount} documento(s)`,
              p_parent_id: null,
              p_keywords: suggestion.tags || [],
              p_source: 'ai_analysis',
              p_related_docs: suggestion.documentIds || [],
              p_confidence: Math.min(0.9, 0.5 + (suggestion.documentCount || 0) * 0.05),
              p_sample_contexts: []
            });

            if (createError) {
              console.error('[taxonomy-auto-manager] Error creating suggestion:', createError);
            } else if (suggestionId) {
              createdSuggestions.push(suggestionId);
            }
          } catch (err) {
            console.error('[taxonomy-auto-manager] Error processing suggestion:', err);
          }
        }

        // 3. Processar unmapped tags como sugestões
        const unmappedTags = analysisResult?.unmappedTags || [];
        for (const tag of unmappedTags.slice(0, 20)) { // Limitar a 20
          if (tag.count >= 3) {
            try {
              const { data: suggestionId, error: createError } = await supabase.rpc('create_taxonomy_suggestion', {
                p_code: `auto.${tag.tag.toLowerCase().replace(/\s+/g, '_')}`,
                p_name: tag.tag,
                p_description: `Criado a partir de tag não mapeada (${tag.count} ocorrências)`,
                p_parent_id: null,
                p_keywords: [tag.tag],
                p_source: 'keyword_frequency',
                p_related_docs: [],
                p_confidence: Math.min(0.8, 0.3 + tag.count * 0.05),
                p_sample_contexts: []
              });

              if (!createError && suggestionId) {
                createdSuggestions.push(suggestionId);
              }
            } catch (err) {
              console.error('[taxonomy-auto-manager] Error creating tag suggestion:', err);
            }
          }
        }

        return new Response(JSON.stringify({
          success: true,
          analysis: {
            suggestedTaxonomies: suggestedTaxonomies.length,
            unmappedTags: unmappedTags.length,
            createdSuggestions: createdSuggestions.length
          },
          createdSuggestionIds: createdSuggestions,
          executionTime: Date.now() - startTime
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ===============================================
      // APPROVE - Aprovar sugestão
      // ===============================================
      case 'approve': {
        if (!suggestionId) {
          throw new Error('suggestionId é obrigatório');
        }

        const { data: taxonomyId, error } = await supabase.rpc('approve_taxonomy_suggestion', {
          p_suggestion_id: suggestionId,
          p_reviewer_id: 'admin',
          p_notes: notes || null,
          p_modify_code: modifyCode || null,
          p_modify_name: modifyName || null
        });

        if (error) {
          console.error('[taxonomy-auto-manager] Error approving suggestion:', error);
          throw error;
        }

        return new Response(JSON.stringify({
          success: true,
          createdTaxonomyId: taxonomyId,
          message: 'Sugestão aprovada e taxonomia criada com sucesso',
          executionTime: Date.now() - startTime
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ===============================================
      // REJECT - Rejeitar sugestão
      // ===============================================
      case 'reject': {
        if (!suggestionId) {
          throw new Error('suggestionId é obrigatório');
        }

        const { data: success, error } = await supabase.rpc('reject_taxonomy_suggestion', {
          p_suggestion_id: suggestionId,
          p_reviewer_id: 'admin',
          p_notes: notes || null
        });

        if (error) {
          console.error('[taxonomy-auto-manager] Error rejecting suggestion:', error);
          throw error;
        }

        return new Response(JSON.stringify({
          success: true,
          rejected: success,
          message: 'Sugestão rejeitada',
          executionTime: Date.now() - startTime
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ===============================================
      // BATCH APPROVE - Aprovar múltiplas sugestões
      // ===============================================
      case 'batch_approve': {
        if (!suggestionIds || suggestionIds.length === 0) {
          throw new Error('suggestionIds é obrigatório');
        }

        const results: { id: string; success: boolean; taxonomyId?: string; error?: string }[] = [];

        for (const id of suggestionIds) {
          try {
            const { data: taxonomyId, error } = await supabase.rpc('approve_taxonomy_suggestion', {
              p_suggestion_id: id,
              p_reviewer_id: 'admin',
              p_notes: notes || 'Aprovado em lote'
            });

            if (error) {
              results.push({ id, success: false, error: error.message });
            } else {
              results.push({ id, success: true, taxonomyId });
            }
          } catch (err: any) {
            results.push({ id, success: false, error: err.message });
          }
        }

        return new Response(JSON.stringify({
          success: true,
          results,
          approved: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          executionTime: Date.now() - startTime
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ===============================================
      // BATCH REJECT - Rejeitar múltiplas sugestões
      // ===============================================
      case 'batch_reject': {
        if (!suggestionIds || suggestionIds.length === 0) {
          throw new Error('suggestionIds é obrigatório');
        }

        const results: { id: string; success: boolean; error?: string }[] = [];

        for (const id of suggestionIds) {
          try {
            const { data: success, error } = await supabase.rpc('reject_taxonomy_suggestion', {
              p_suggestion_id: id,
              p_reviewer_id: 'admin',
              p_notes: notes || 'Rejeitado em lote'
            });

            if (error) {
              results.push({ id, success: false, error: error.message });
            } else {
              results.push({ id, success: true });
            }
          } catch (err: any) {
            results.push({ id, success: false, error: err.message });
          }
        }

        return new Response(JSON.stringify({
          success: true,
          results,
          rejected: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          executionTime: Date.now() - startTime
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        return new Response(JSON.stringify({
          success: false,
          error: `Action desconhecida: ${action}`,
          availableActions: ['health', 'gaps', 'suggestions', 'keywords', 'analyze', 'approve', 'reject', 'batch_approve', 'batch_reject']
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

  } catch (error: any) {
    console.error('[taxonomy-auto-manager] Error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Erro interno',
      executionTime: Date.now() - startTime
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
