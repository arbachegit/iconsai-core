import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatConfigUpdate {
  chatType: "study" | "health";
  matchThreshold?: number;
  matchCount?: number;
  scopeTopics?: string[];
  rejectionMessage?: string;
  systemPromptBase?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { chatType, ...updates } = await req.json() as ChatConfigUpdate;

    if (!chatType) {
      return new Response(
        JSON.stringify({ error: "chatType is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Updating chat config for ${chatType}:`, updates);

    // Get current config
    const { data: currentConfig, error: fetchError } = await supabase
      .from("chat_config")
      .select("*")
      .eq("chat_type", chatType)
      .single();

    if (fetchError) {
      console.error("Error fetching current config:", fetchError);
      throw fetchError;
    }

    // Update config
    const { error: updateError } = await supabase
      .from("chat_config")
      .update({
        ...(updates.matchThreshold !== undefined && { match_threshold: updates.matchThreshold }),
        ...(updates.matchCount !== undefined && { match_count: updates.matchCount }),
        ...(updates.scopeTopics !== undefined && { scope_topics: updates.scopeTopics }),
        ...(updates.rejectionMessage !== undefined && { rejection_message: updates.rejectionMessage }),
        ...(updates.systemPromptBase !== undefined && { system_prompt_base: updates.systemPromptBase }),
        updated_at: new Date().toISOString(),
      })
      .eq("chat_type", chatType);

    if (updateError) {
      console.error("Error updating config:", updateError);
      throw updateError;
    }

    // Recalculate health issues
    const issues: any[] = [];

    // Check threshold
    const threshold = updates.matchThreshold ?? currentConfig.match_threshold;
    if (threshold > 0.3) {
      issues.push({
        type: "warning",
        message: `Threshold muito alto (${threshold}) pode causar rejeições falsas`,
      });
    }

    // Check match count
    const matchCount = updates.matchCount ?? currentConfig.match_count;
    if (matchCount < 3) {
      issues.push({
        type: "warning",
        message: `Match count baixo (${matchCount}) pode perder contexto`,
      });
    }

    // Check documents
    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select("id, is_readable")
      .eq("target_chat", chatType)
      .eq("status", "completed");

    if (docsError) {
      console.error("Error fetching documents:", docsError);
    } else {
      const totalDocs = documents?.length || 0;
      const unreadableDocs = documents?.filter((d) => !d.is_readable).length || 0;

      if (totalDocs === 0) {
        issues.push({
          type: "error",
          message: "Nenhum documento disponível para este chat",
        });
      } else if (totalDocs < 3) {
        issues.push({
          type: "warning",
          message: `Apenas ${totalDocs} documento(s) disponível(is)`,
        });
      }

      if (unreadableDocs > 0) {
        issues.push({
          type: "warning",
          message: `${unreadableDocs} documento(s) ilegível(is)`,
        });
      }
    }

    // Update health status
    const status = issues.some((i) => i.type === "error")
      ? "error"
      : issues.some((i) => i.type === "warning")
      ? "warning"
      : "ok";

    await supabase
      .from("chat_config")
      .update({ health_status: status, health_issues: issues })
      .eq("chat_type", chatType);

    console.log(`Chat config updated successfully for ${chatType}`);

    return new Response(
      JSON.stringify({
        success: true,
        chatType,
        healthStatus: status,
        issues,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in update-chat-config:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
