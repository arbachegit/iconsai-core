// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-28
// Salva mensagens de conversa do PWA
// Tabelas: pwa_sessions, pwa_conversations
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { getSupabaseAdmin } from "../_shared/supabase.ts";

interface SaveMessageRequest {
  deviceId: string;
  moduleSlug: string;
  sessionId?: string;
  role: string;
  content: string;
  transcription?: string;
  audioUrl?: string;
  audioDuration?: number;
  metadata?: Record<string, unknown>;
}

const VALID_ROLES = ["user", "assistant"];

serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Validate POST method
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Método não permitido" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body: SaveMessageRequest = await req.json();

    // Validate required fields
    if (!body.deviceId || !body.moduleSlug || !body.role || !body.content) {
      console.error("[pwa-save-message] Campos faltando:", {
        deviceId: !!body.deviceId,
        moduleSlug: !!body.moduleSlug,
        role: !!body.role,
        content: !!body.content
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: "Campos obrigatórios: deviceId, moduleSlug, role, content"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate role
    if (!VALID_ROLES.includes(body.role)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `role deve ser: ${VALID_ROLES.join(", ")}`
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = getSupabaseAdmin();
    let sessionId = body.sessionId;

    // Get or create session
    if (sessionId) {
      const { data: existingSession, error: sessionError } = await supabase
        .from("pwa_sessions")
        .select("id")
        .eq("id", sessionId)
        .single();

      if (sessionError || !existingSession) {
        console.log("[pwa-save-message] Sessão não encontrada, criando nova:", sessionId);
        sessionId = undefined;
      }
    }

    if (!sessionId) {
      const { data: newSession, error: createError } = await supabase
        .from("pwa_sessions")
        .insert({
          device_id: body.deviceId,
          module_slug: body.moduleSlug,
          metadata: body.metadata || {},
        })
        .select("id")
        .single();

      if (createError || !newSession) {
        console.error("[pwa-save-message] Erro ao criar sessão:", createError);
        throw new Error("Falha ao criar sessão de conversa");
      }

      sessionId = newSession.id;
      console.log("[pwa-save-message] Nova sessão criada:", sessionId);
    }

    // Save conversation message
    const { data: conversation, error: convError } = await supabase
      .from("pwa_conversations")
      .insert({
        session_id: sessionId,
        device_id: body.deviceId,
        module_slug: body.moduleSlug,
        role: body.role,
        content: body.content,
        transcription: body.transcription || null,
        audio_url: body.audioUrl || null,
        audio_duration_seconds: body.audioDuration || null,
        metadata: body.metadata || {},
      })
      .select("id, created_at")
      .single();

    if (convError || !conversation) {
      console.error("[pwa-save-message] Erro ao salvar conversa:", convError);
      throw new Error("Falha ao salvar mensagem");
    }

    // Update session activity
    await supabase
      .from("pwa_sessions")
      .update({
        last_activity_at: new Date().toISOString(),
        total_messages: supabase.rpc('increment_counter', { row_id: sessionId, column_name: 'total_messages' })
      })
      .eq("id", sessionId);

    console.log(`[pwa-save-message] ✓ Conversa ${conversation.id} salva na sessão ${sessionId}`);

    return new Response(
      JSON.stringify({
        success: true,
        messageId: conversation.id,
        sessionId: sessionId,
        createdAt: conversation.created_at,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[pwa-save-message] Erro:", error.message || error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Erro interno do servidor"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
