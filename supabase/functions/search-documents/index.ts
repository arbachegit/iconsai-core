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
    const { query, targetChat, matchThreshold = 0.7, matchCount = 5 } = await req.json();
    
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
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        results: results || [],
        count: results?.length || 0
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