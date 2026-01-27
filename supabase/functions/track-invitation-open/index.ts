// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSupabaseAdmin } from "../_shared/supabase.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

interface TrackRequest {
  token: string;
  source: "platform" | "app";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { token, source }: TrackRequest = await req.json();

    console.log("Track invitation open:", { token: token?.substring(0, 8) + "...", source });

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Token é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!source || !["platform", "app"].includes(source)) {
      return new Response(
        JSON.stringify({ error: "Source deve ser 'platform' ou 'app'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch invitation
    const { data: invitation, error: fetchError } = await supabase
      .from("user_invites")
      .select("*")
      .eq("token", token)
      .single();

    if (fetchError || !invitation) {
      console.error("Invitation not found:", fetchError);
      return new Response(
        JSON.stringify({ error: "Convite não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date().toISOString();
    const updateData: Record<string, unknown> = {
      updated_at: now,
    };

    // Track specific modality fields
    let isFirstOpenForSource = false;

    if (source === "platform") {
      isFirstOpenForSource = !invitation.platform_first_opened_at;
      updateData.platform_last_opened_at = now;
      updateData.platform_open_count = (invitation.platform_open_count || 0) + 1;
      
      if (isFirstOpenForSource) {
        updateData.platform_first_opened_at = now;
      }
    } else if (source === "app") {
      isFirstOpenForSource = !invitation.app_first_opened_at;
      updateData.app_last_opened_at = now;
      updateData.app_open_count = (invitation.app_open_count || 0) + 1;
      
      if (isFirstOpenForSource) {
        updateData.app_first_opened_at = now;
      }
    }

    // Also update legacy fields for backwards compatibility
    if (!invitation.first_opened_at) {
      updateData.first_opened_at = now;
    }
    updateData.last_opened_at = now;
    updateData.open_count = (invitation.open_count || 0) + 1;

    await supabase
      .from("user_invites")
      .update(updateData)
      .eq("token", token);

    console.log(`Invitation tracked: source=${source}, first_open_for_source=${isFirstOpenForSource}, total_open_count=${updateData.open_count}`);

    // Log first open (admin_settings and notification_logs tables removed in v3.0)
    if (isFirstOpenForSource) {
      const sourceLabel = source === "app" ? "📱 APP" : "🖥️ Plataforma";
      console.log(`[LOG] First open: ${invitation.email} - ${sourceLabel}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        first_open: isFirstOpenForSource,
        source 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in track-invitation-open:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
