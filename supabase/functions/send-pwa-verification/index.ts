import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendPWAVerificationRequest {
  token: string;
  phone?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("=== SEND-PWA-VERIFICATION START ===");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("❌ Missing Supabase credentials");
      return new Response(
        JSON.stringify({ success: false, error: "Configuração do servidor incompleta" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request
    let body: SendPWAVerificationRequest;
    try {
      body = await req.json();
      console.log("📥 Request:", { token: body.token?.substring(0, 8) + "...", phone: body.phone ? "***" + body.phone.slice(-4) : "not provided" });
    } catch (parseError) {
      console.error("❌ Invalid request body:", parseError);
      return new Response(
        JSON.stringify({ success: false, error: "Corpo da requisição inválido" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { token, phone: providedPhone } = body;

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: "Token é obrigatório" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Find invitation
    console.log("🔍 Looking for invitation...");
    const { data: invitation, error: fetchError } = await supabase
      .from("user_invitations")
      .select("*")
      .eq("token", token)
      .in("status", ["pending", "form_submitted", "verification_sent"])
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (fetchError) {
      console.error("❌ Error fetching invitation:", fetchError);
      return new Response(
        JSON.stringify({ success: false, error: "Erro ao buscar convite" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!invitation) {
      console.log("❌ Invitation not found or expired");
      return new Response(
        JSON.stringify({ success: false, error: "Convite não encontrado ou expirado" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Get phone number (from request or invitation)
    const phoneToUse = providedPhone || invitation.phone;
    
    if (!phoneToUse) {
      console.log("❌ No phone number available");
      return new Response(
        JSON.stringify({ success: false, error: "Telefone é obrigatório para verificação PWA" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Generate 6-digit code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    console.log("🔐 Generated verification code (expires in 10 min)");

    // 4. Save code to invitation
    const { error: updateError } = await supabase
      .from("user_invitations")
      .update({
        verification_code: verificationCode,
        verification_code_expires_at: expiresAt.toISOString(),
        verification_attempts: 0,
        status: "verification_sent",
        phone: phoneToUse, // Ensure phone is saved
      })
      .eq("id", invitation.id);

    if (updateError) {
      console.error("❌ Error saving verification code:", updateError);
      return new Response(
        JSON.stringify({ success: false, error: "Erro ao salvar código de verificação" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Send code via WhatsApp (with SMS fallback)
    const message = `*KnowYOU APP*

Olá ${invitation.name || ""}!

Seu código de verificação é:

*${verificationCode}*

⏰ Válido por 10 minutos.

_Não compartilhe este código._`;

    let sendSuccess = false;
    let sendChannel = "whatsapp";
    let sendError = null;

    // Try WhatsApp first
    console.log("💬 Attempting to send via WhatsApp...");
    try {
      const { data: whatsappResult, error: whatsappError } = await supabase.functions.invoke("send-whatsapp", {
        body: {
          phoneNumber: phoneToUse,
          message: message
        }
      });

      if (whatsappError) {
        console.warn("⚠️ WhatsApp failed:", whatsappError.message);
        sendError = whatsappError.message;
      } else if (whatsappResult?.error) {
        console.warn("⚠️ WhatsApp API error:", whatsappResult.error);
        sendError = whatsappResult.error;
      } else {
        console.log("✅ Code sent via WhatsApp");
        sendSuccess = true;
      }
    } catch (whatsappCatch: any) {
      console.warn("⚠️ WhatsApp exception:", whatsappCatch.message);
      sendError = whatsappCatch.message;
    }

    // Fallback to SMS if WhatsApp failed
    if (!sendSuccess) {
      console.log("📱 Falling back to SMS...");
      sendChannel = "sms";
      
      const smsMessage = `KnowYOU: Seu código de verificação é ${verificationCode}. Válido por 10 minutos.`;
      
      try {
        const { data: smsResult, error: smsError } = await supabase.functions.invoke("send-sms", {
          body: {
            phoneNumber: phoneToUse,
            message: smsMessage
          }
        });

        if (smsError) {
          console.error("❌ SMS failed:", smsError.message);
          sendError = smsError.message;
        } else if (smsResult?.error) {
          console.error("❌ SMS API error:", smsResult.error);
          sendError = smsResult.error;
        } else {
          console.log("✅ Code sent via SMS");
          sendSuccess = true;
        }
      } catch (smsCatch: any) {
        console.error("❌ SMS exception:", smsCatch.message);
        sendError = smsCatch.message;
      }
    }

    // 6. Log the attempt
    await supabase.from("notification_logs").insert({
      event_type: "pwa_verification_code",
      channel: sendChannel,
      recipient: phoneToUse,
      subject: "Código de verificação PWA",
      message_body: `Código enviado para registro PWA`,
      status: sendSuccess ? "success" : "failed",
      error_message: sendError,
      metadata: { 
        invitation_id: invitation.id, 
        name: invitation.name,
        expires_in_seconds: 600 
      }
    });

    if (!sendSuccess) {
      console.error("❌ Failed to send code via any channel");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Falha ao enviar código: ${sendError}. Verifique o número de telefone.` 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("=== SEND-PWA-VERIFICATION END ===");

    return new Response(
      JSON.stringify({ 
        success: true, 
        channel: sendChannel,
        expires_in: 600, // 10 minutes in seconds
        message: `Código enviado via ${sendChannel === "whatsapp" ? "WhatsApp" : "SMS"}` 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ Unhandled error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
