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
    
    console.log(`Generating summary for document ${documentId}`);
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }
    
    // Use Lovable AI to generate summary and assess readability
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
            content: `Você é um especialista em análise de documentos. Analise o texto e retorne um JSON com:
1. Um resumo de 150-300 palavras
2. Uma avaliação de legibilidade (0.0 a 1.0)
3. Se o texto é coerente e utilizável (true/false)

IMPORTANTE: Retorne APENAS um JSON válido, sem markdown, sem explicações.

Formato esperado:
{
  "summary": "Resumo do documento...",
  "readabilityScore": 0.85,
  "isReadable": true
}`
          },
          {
            role: "user",
            content: `Analise este documento:\n\n${text.substring(0, 5000)}`
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
    let analysis;
    try {
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      analysis = JSON.parse(cleanContent);
    } catch (e) {
      console.error("Failed to parse analysis JSON:", content);
      throw new Error("Failed to parse AI response");
    }
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Update document with summary and readability
    await supabase
      .from("documents")
      .update({
        ai_summary: analysis.summary,
        readability_score: analysis.readabilityScore,
        is_readable: analysis.isReadable
      })
      .eq("id", documentId);
    
    console.log(`Summary generated for document ${documentId}`);
    
    return new Response(
      JSON.stringify({ success: true, analysis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Error generating summary:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});