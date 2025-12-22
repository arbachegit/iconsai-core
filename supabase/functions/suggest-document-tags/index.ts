import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TaxonomyNode {
  id: string;
  code: string;
  name: string;
  parent_id: string | null;
  level: number;
  description: string | null;
  keywords: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentId, text, chatType, saveSuggestions = true } = await req.json();
    
    console.log(`[suggest-document-tags] Document ${documentId}, chat: ${chatType || 'unknown'}, saveSuggestions: ${saveSuggestions}`);
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // 1. Fetch global taxonomy tree
    const { data: taxonomyNodes, error: taxonomyError } = await supabase
      .from("global_taxonomy")
      .select("id, code, name, parent_id, level, description, keywords")
      .eq("status", "approved")
      .order("level")
      .order("name");
    
    if (taxonomyError) {
      console.error("[suggest-document-tags] Error fetching taxonomy:", taxonomyError);
      throw new Error("Failed to fetch taxonomy");
    }
    
    console.log(`[suggest-document-tags] Loaded ${taxonomyNodes?.length || 0} taxonomy nodes`);
    
    // Build taxonomy tree representation for AI
    const buildTaxonomyTree = (nodes: TaxonomyNode[]): string => {
      const rootNodes = nodes.filter(n => !n.parent_id);
      const childMap = new Map<string, TaxonomyNode[]>();
      
      nodes.forEach(node => {
        if (node.parent_id) {
          const children = childMap.get(node.parent_id) || [];
          children.push(node);
          childMap.set(node.parent_id, children);
        }
      });
      
      const renderNode = (node: TaxonomyNode, indent: string = ""): string => {
        let result = `${indent}- ${node.code}: "${node.name}"`;
        if (node.keywords?.length > 0) {
          result += ` [keywords: ${node.keywords.join(', ')}]`;
        }
        result += "\n";
        
        const children = childMap.get(node.id) || [];
        children.forEach(child => {
          result += renderNode(child, indent + "  ");
        });
        
        return result;
      };
      
      return rootNodes.map(n => renderNode(n)).join("");
    };
    
    const taxonomyTree = buildTaxonomyTree(taxonomyNodes || []);
    
    // 2. Fetch existing ML feedback to learn from corrections
    const { data: feedbackData } = await supabase
      .from("ml_tag_feedback")
      .select("original_code, corrected_code, feedback_type")
      .order("created_at", { ascending: false })
      .limit(100);
    
    // Build correction rules from feedback
    const correctionRules = feedbackData
      ?.filter(f => f.feedback_type === 'corrected' && f.original_code && f.corrected_code)
      .map(f => `- "${f.original_code}" → "${f.corrected_code}"`)
      .join('\n') || '';
    
    const rejectedCodes = feedbackData
      ?.filter(f => f.feedback_type === 'rejected' && f.original_code)
      .map(f => f.original_code) || [];
    
    console.log(`[suggest-document-tags] Loaded ${feedbackData?.length || 0} feedback entries, ${rejectedCodes.length} rejected codes`);
    
    // 3. Build contextual guidance based on chatType
    let contextualGuidance = '';
    
    if (chatType === 'economia') {
      contextualGuidance = `
🎯 CONTEXTO: Documento de ECONOMIA/FINANÇAS.
PRIORIZE códigos em: economia.*, tecnologia.dados
EVITE códigos muito genéricos se existirem específicos.`;
    } else if (chatType === 'health') {
      contextualGuidance = `
🎯 CONTEXTO: Documento de SAÚDE.
PRIORIZE códigos em: saude.*, conhecimento.ciencias
EVITE códigos não relacionados a saúde.`;
    } else if (chatType === 'study') {
      contextualGuidance = `
🎯 CONTEXTO: Documento de ESTUDO/EDUCAÇÃO.
PRIORIZE códigos em: conhecimento.*, tecnologia.*, ideias.*
EVITE códigos muito específicos de outros domínios.`;
    }
    
    // 4. Build AI prompt
    const systemPrompt = `Você é um especialista em classificação de documentos usando uma taxonomia hierárquica pré-definida.

## TAXONOMIA DISPONÍVEL (USE APENAS ESTES CÓDIGOS):
${taxonomyTree}

${contextualGuidance}

## REGRAS DE APRENDIZADO (NÃO VIOLAR):
${correctionRules ? `Correções aprendidas (use sempre a versão corrigida):
${correctionRules}` : '(Nenhuma correção registrada)'}

${rejectedCodes.length > 0 ? `
Códigos rejeitados (NÃO USE):
${rejectedCodes.map(c => `- ${c}`).join('\n')}` : ''}

## INSTRUÇÕES:
1. Analise o texto do documento
2. Selecione 2-5 códigos de taxonomia que MELHOR representam o conteúdo
3. Use APENAS códigos que existem na taxonomia acima
4. Atribua confidence de 0.5 a 1.0 baseado na relevância
5. Priorize códigos mais específicos (níveis mais baixos) quando aplicável

## FORMATO DE RESPOSTA (APENAS JSON, SEM MARKDOWN):
{
  "suggestions": [
    {"code": "economia.indicadores", "confidence": 0.95},
    {"code": "tecnologia.dados", "confidence": 0.80}
  ],
  "reasoning": "Breve explicação da classificação"
}`;
    
    // 5. Call AI
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Classifique este documento:\n\n${text.substring(0, 4000)}` }
        ],
        temperature: 0.2,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`AI gateway error: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // 6. Parse response
    let result;
    try {
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      result = JSON.parse(cleanContent);
    } catch (e) {
      console.error("[suggest-document-tags] Failed to parse AI response:", content);
      throw new Error("Failed to parse AI response");
    }
    
    console.log(`[suggest-document-tags] AI suggested ${result.suggestions?.length || 0} taxonomy codes`);
    
    // 7. Validate and enrich suggestions with taxonomy data
    const validSuggestions: Array<{
      code: string;
      confidence: number;
      taxonomy_id: string;
      taxonomy_name: string;
    }> = [];
    
    const taxonomyMap = new Map(taxonomyNodes?.map(n => [n.code, n]) || []);
    
    for (const suggestion of result.suggestions || []) {
      const taxonomy = taxonomyMap.get(suggestion.code);
      if (taxonomy) {
        validSuggestions.push({
          code: suggestion.code,
          confidence: Math.min(1, Math.max(0.5, suggestion.confidence)),
          taxonomy_id: taxonomy.id,
          taxonomy_name: taxonomy.name,
        });
      } else {
        console.log(`[suggest-document-tags] Ignoring invalid code: ${suggestion.code}`);
      }
    }
    
    console.log(`[suggest-document-tags] ${validSuggestions.length} valid suggestions after validation`);
    
    // 8. Save to ml_tag_suggestions if requested
    if (saveSuggestions && validSuggestions.length > 0) {
      const suggestionsToInsert = validSuggestions.map(s => ({
        document_id: documentId,
        taxonomy_id: s.taxonomy_id,
        suggested_code: s.code,
        confidence: s.confidence,
        source: 'ai_suggestion',
        status: 'pending',
      }));
      
      const { error: insertError } = await supabase
        .from("ml_tag_suggestions")
        .insert(suggestionsToInsert);
      
      if (insertError) {
        console.error("[suggest-document-tags] Error saving suggestions:", insertError);
        // Don't throw - still return the suggestions
      } else {
        console.log(`[suggest-document-tags] Saved ${suggestionsToInsert.length} suggestions to ml_tag_suggestions`);
      }
    }
    
    // 9. Also create entity_tags directly for high-confidence suggestions (auto-approve)
    const highConfidenceSuggestions = validSuggestions.filter(s => s.confidence >= 0.9);
    
    if (highConfidenceSuggestions.length > 0) {
      const entityTagsToInsert = highConfidenceSuggestions.map(s => ({
        entity_id: documentId,
        entity_type: 'document',
        taxonomy_id: s.taxonomy_id,
        source: 'ai_auto',
        confidence: s.confidence,
        is_primary: false,
      }));
      
      const { error: entityError } = await supabase
        .from("entity_tags")
        .upsert(entityTagsToInsert, { 
          onConflict: 'entity_id,entity_type,taxonomy_id',
          ignoreDuplicates: true 
        });
      
      if (entityError) {
        console.log("[suggest-document-tags] Error auto-creating entity_tags:", entityError);
      } else {
        console.log(`[suggest-document-tags] Auto-created ${highConfidenceSuggestions.length} entity_tags (confidence >= 0.9)`);
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        suggestions: validSuggestions,
        reasoning: result.reasoning,
        autoApproved: highConfidenceSuggestions.length,
        pendingReview: validSuggestions.length - highConfidenceSuggestions.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("[suggest-document-tags] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
