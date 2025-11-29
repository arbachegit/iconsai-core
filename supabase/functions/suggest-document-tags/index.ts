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
    const { documentId, text } = await req.json();
    
    console.log(`Generating tags for document ${documentId}`);
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }
    
    // Use Lovable AI to generate hierarchical tags
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
            content: `Você é um especialista em categorização de documentos. Analise o texto e gere tags hierárquicas.

IMPORTANTE: Retorne APENAS um JSON válido, sem markdown, sem explicações.

Formato esperado:
{
  "parentTags": [
    {"name": "Categoria Ampla 1", "confidence": 0.95},
    {"name": "Categoria Ampla 2", "confidence": 0.85}
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
- Confidence entre 0.0 e 1.0 (NUNCA use percentagens)`
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
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Save parent tags
    const parentTagIds: { [key: string]: string } = {};
    
    for (const parentTag of tags.parentTags) {
      const { data: savedTag } = await supabase
        .from("document_tags")
        .insert({
          document_id: documentId,
          tag_name: parentTag.name,
          tag_type: "parent",
          confidence: parentTag.confidence,
          source: "ai"
        })
        .select()
        .single();
      
      if (savedTag) {
        parentTagIds[parentTag.name] = savedTag.id;
      }
    }
    
    // Save child tags
    for (const [parentName, childTags] of Object.entries(tags.childTags)) {
      const parentId = parentTagIds[parentName];
      if (!parentId) continue;
      
      for (const childTag of childTags as any[]) {
        await supabase
          .from("document_tags")
          .insert({
            document_id: documentId,
            tag_name: childTag.name,
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