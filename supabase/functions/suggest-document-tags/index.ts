import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentId, text, chatType } = await req.json();
    
    console.log(`Generating tags for document ${documentId} (chat: ${chatType || 'unknown'})`);
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Fetch existing parent tags to avoid duplicates
    const { data: existingTags } = await supabase
      .from("document_tags")
      .select("id, tag_name, tag_type")
      .is("parent_tag_id", null)
      .order("tag_name");
    
    const existingTagNames = existingTags?.map(t => t.tag_name) || [];
    console.log(`Found ${existingTagNames.length} existing parent tags`);
    
    // Fetch machine learning merge rules to prevent duplicate creation
    const { data: mergeRules } = await supabase
      .from("tag_merge_rules")
      .select("source_tag, canonical_tag")
      .eq("chat_type", chatType || "health");
    
    const mergeRulesMap = new Map<string, string>();
    mergeRules?.forEach(rule => {
      mergeRulesMap.set(rule.source_tag.toLowerCase(), rule.canonical_tag);
    });
    console.log(`Loaded ${mergeRulesMap.size} machine learning merge rules`);
    
    // Build merge rules instruction for AI
    const mergeRulesInstruction = mergeRules && mergeRules.length > 0 
      ? `\n\n🔴 REGRAS DE APRENDIZADO (NÃO VIOLAR):
As seguintes variações foram corrigidas pelo admin e NÃO devem ser usadas:
${mergeRules.map(r => `- "${r.source_tag}" → USE "${r.canonical_tag}"`).join('\n')}

NUNCA gere as tags do lado esquerdo. SEMPRE use as tags do lado direito.`
      : '';
    
    // Use Lovable AI to generate hierarchical tags with context of existing tags
    const systemPrompt = `Você é um especialista em categorização de documentos. Analise o texto e gere tags hierárquicas.

TAGS EXISTENTES NO SISTEMA:
${existingTagNames.length > 0 ? existingTagNames.map(name => `- "${name}"`).join('\n') : '(Nenhuma tag existente)'}
${mergeRulesInstruction}

REGRAS DE PADRONIZAÇÃO:
1. SE uma tag existente é semanticamente equivalente à que você criaria, USE A EXISTENTE (retorne "existingName" com o nome exato)
2. SE a tag não existe mas é similar (ex: "IA" vs "Inteligência Artificial"), sugira a versão mais completa e padronizada
3. NUNCA crie duplicatas como "Machine Learning" e "Aprendizado de Máquina" - escolha UMA versão padronizada
4. Para tags filhas, certifique-se de que o nome seja específico e não genérico
5. Priorize REUTILIZAR tags existentes quando o documento se enquadrar nelas
6. SE existe uma REGRA DE APRENDIZADO para uma tag, USE OBRIGATORIAMENTE a versão canônica

IMPORTANTE: Retorne APENAS um JSON válido, sem markdown, sem explicações.

Formato esperado:
{
  "parentTags": [
    {"name": "Categoria Ampla 1", "confidence": 0.95, "existingName": "nome-exato-se-existir-ou-null"},
    {"name": "Categoria Ampla 2", "confidence": 0.85, "existingName": null}
  ],
  "childTags": {
    "Categoria Ampla 1": [
      {"name": "Tópico Específico A", "confidence": 0.90},
      {"name": "Tópico Específico B", "confidence": 0.80}
    ],
    "Categoria Ampla 2": [
      {"name": "Tópico Específico C", "confidence": 0.85}
    ]
  }
}

Regras:
- 3-5 tags pai (categorias amplas)
- 5-10 tags filhas no total, distribuídas entre os pais
- Confidence entre 0.0 e 1.0 (NUNCA use percentagens)
- Use "existingName" quando a tag já existe no sistema para evitar duplicatas`;
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: `Analise este documento e gere tags hierárquicas:\n\n${text.substring(0, 3000)}`
          }
        ],
        temperature: 0.3,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`AI gateway error: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse JSON response
    let tags;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      tags = JSON.parse(cleanContent);
    } catch (e) {
      console.error("Failed to parse tags JSON:", content);
      throw new Error("Failed to parse AI response");
    }
    
    // Create index of existing tags for fast lookup
    const existingTagIndex = new Map(
      existingTags?.map(t => [t.tag_name.toLowerCase(), t.id]) || []
    );
    
    // Helper function to apply merge rules
    const applyMergeRules = (tagName: string): string => {
      const canonical = mergeRulesMap.get(tagName.toLowerCase());
      if (canonical) {
        console.log(`ML Rule applied: "${tagName}" → "${canonical}"`);
        return canonical;
      }
      return tagName;
    };
    
    // Save parent tags (reuse existing or create new)
    const parentTagIds: { [key: string]: string } = {};
    
    for (const parentTag of tags.parentTags) {
      // Apply merge rules first
      let tagNameToUse = parentTag.existingName || parentTag.name;
      tagNameToUse = applyMergeRules(tagNameToUse);
      
      const existingId = existingTagIndex.get(tagNameToUse.toLowerCase());
      
      if (existingId) {
        // Reuse existing tag
        parentTagIds[parentTag.name] = existingId;
        console.log(`Reusing existing parent tag: ${tagNameToUse}`);
      } else {
        // Create new tag
        const { data: savedTag } = await supabase
          .from("document_tags")
          .insert({
            document_id: documentId,
            tag_name: tagNameToUse,
            tag_type: "parent",
            confidence: parentTag.confidence,
            source: "ai"
          })
          .select()
          .single();
        
        if (savedTag) {
          parentTagIds[parentTag.name] = savedTag.id;
          console.log(`Created new parent tag: ${tagNameToUse}`);
        }
      }
    }
    
    // Save child tags
    for (const [parentName, childTags] of Object.entries(tags.childTags)) {
      const parentId = parentTagIds[parentName];
      if (!parentId) continue;
      
      for (const childTag of childTags as any[]) {
        // Apply merge rules to child tags too
        const childTagName = applyMergeRules(childTag.name);
        
        await supabase
          .from("document_tags")
          .insert({
            document_id: documentId,
            tag_name: childTagName,
            tag_type: "child",
            parent_tag_id: parentId,
            confidence: childTag.confidence,
            source: "ai"
          });
      }
    }
    
    console.log(`Tags generated for document ${documentId}`);
    
    return new Response(
      JSON.stringify({ success: true, tags }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Error generating tags:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});