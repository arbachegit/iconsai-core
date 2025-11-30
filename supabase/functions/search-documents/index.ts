import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const startTime = Date.now();
    const { query, targetChat, matchThreshold = 0.7, matchCount = 5, sessionId } = await req.json();
    
    console.log(`Searching documents for query: "${query}" (target: ${targetChat})`);
    
    // Generate embedding for the query
    const openAIKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAIKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }
    
    const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAIKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: query,
      }),
    });
    
    if (!embeddingResponse.ok) {
      throw new Error("Failed to generate query embedding");
    }
    
    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Search for similar chunks
    const { data: results, error } = await supabase.rpc("search_documents", {
      query_embedding: queryEmbedding,
      target_chat_filter: targetChat,
      match_threshold: matchThreshold,
      match_count: matchCount
    });
    
    if (error) {
      console.error("Search error:", error);
      throw error;
    }
    
    console.log(`Found ${results?.length || 0} matching chunks`);
    
    // Calcular latência e top score
    const latencyMs = Date.now() - startTime;
    const topScore = results && results.length > 0 ? results[0].similarity : null;
    
    // Logar analytics de forma assíncrona (não bloqueia resposta)
    supabase.from("rag_analytics").insert({
      query: query,
      target_chat: targetChat || null,
      latency_ms: latencyMs,
      success_status: !error && (results?.length > 0),
      results_count: results?.length || 0,
      top_similarity_score: topScore,
      match_threshold: matchThreshold,
      session_id: sessionId || null,
      metadata: {
        match_count_requested: matchCount
      }
    }).then(
      () => console.log("Analytics logged"),
      (err: Error) => console.error("Analytics logging failed:", err)
    );
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        results: results || [],
        count: results?.length || 0,
        analytics: {
          latency_ms: latencyMs,
          top_score: topScore
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Error searching documents:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});