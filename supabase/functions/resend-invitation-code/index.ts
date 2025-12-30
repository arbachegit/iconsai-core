import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResendRequest {
  token: string;
  product?: "platform" | "app" | "both";
}

interface SendResult {
  channel: string;
  product: string;
  success: boolean;
  error?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("=== RESEND-INVITATION-CODE START ===");
  const results: SendResult[] = [];

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { token, product = "both" }: ResendRequest = await req.json();

    console.log("📥 Resend request:", { token: token?.slice(0, 8) + "...", product });

    // Fetch invitation
    const { data: invitation, error: fetchError } = await supabase
      .from("user_invitations")
      .select("*")
      .eq("token", token)
      .single();

    if (fetchError || !invitation) {
      console.error("❌ Invitation not found:", fetchError);
      return new Response(
        JSON.stringify({ success: false, error_code: "INVALID_TOKEN", error: "Convite não encontrado" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already completed
    if (invitation.status === "completed") {
      return new Response(
        JSON.stringify({ success: false, error_code: "INVITE_USED", error: "Este convite já foi utilizado" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check rate limit (max 10 resends per hour)
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    if (invitation.last_resend_at && new Date(invitation.last_resend_at) > oneHourAgo) {
      if ((invitation.resend_count || 0) >= 10) {
        return new Response(
          JSON.stringify({ success: false, error_code: "RATE_LIMIT", error: "Limite de reenvios atingido. Tente novamente em 1 hora." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const siteUrl = "https://fia.iconsai.ai";
    const platformUrl = `${siteUrl}/invite/${token}`;
    const appUrl = `${siteUrl}/pwa-register?token=${token}`;
    
    const { name, email, phone, has_platform_access, has_app_access, status } = invitation;
    
    // =====================================================
    // REGRA OBRIGATÓRIA DE CANAL:
    // - PLATAFORMA → EMAIL + WHATSAPP (se tiver phone)
    // - APP (PWA) → WHATSAPP ONLY (phone obrigatório)
    // - AMBOS → EMAIL + WHATSAPP (plataforma) + WHATSAPP (app)
    // =====================================================

    console.log("📋 Access check:", { has_platform_access, has_app_access, hasPhone: !!phone, product });

    // Determine what to send based on product selection and access
    const shouldSendPlatform = (product === "platform" || product === "both") && has_platform_access;
    const shouldSendApp = (product === "app" || product === "both") && has_app_access;

    // Check Twilio credentials
    const hasTwilioSid = !!Deno.env.get("TWILIO_ACCOUNT_SID");
    const hasTwilioToken = !!Deno.env.get("TWILIO_AUTH_TOKEN");
    const hasTwilioFrom = !!Deno.env.get("TWILIO_FROM_NUMBER");
    const hasTwilioCredentials = hasTwilioSid && hasTwilioToken && hasTwilioFrom;
    const hasResendKey = !!Deno.env.get("RESEND_API_KEY");

    console.log("🔑 Credentials:", { hasResendKey, hasTwilioCredentials });

    // =====================================================
    // PLATAFORMA: Email obrigatório + WhatsApp informativo
    // =====================================================
    if (shouldSendPlatform) {
      console.log("🖥️ Processing PLATFORM resend...");
      
      // EMAIL - Obrigatório para plataforma
      if (!hasResendKey) {
        console.warn("⚠️ RESEND_API_KEY not configured");
        results.push({ channel: "email", product: "platform", success: false, error: "RESEND_API_KEY não configurada" });
      } else {
        try {
          const platformEmailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; }
                .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
                .badge { display: inline-block; background: #f59e0b; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 15px; }
                .button { display: inline-block; background: #6366f1; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
                .info { background: #fff; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #6366f1; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin:0;">🖥️ Lembrete: KnowYOU Plataforma</h1>
                </div>
                <div class="content">
                  <span class="badge">🔄 LEMBRETE</span>
                  <p>Olá <strong>${name}</strong>,</p>
                  <p>Você ainda não completou seu cadastro na <strong>KnowYOU Plataforma</strong>.</p>
                  
                  <div class="info">
                    <p style="margin:0;">💻 Acesse pelo <strong>computador ou tablet</strong> para começar!</p>
                  </div>
                  
                  <p style="text-align: center;">
                    <a href="${platformUrl}" class="button">Completar Cadastro</a>
                  </p>
                  
                  <p style="font-size: 14px; color: #64748b; text-align: center;">
                    ⏰ Expira em: <strong>${new Date(invitation.expires_at).toLocaleDateString('pt-BR')}</strong>
                  </p>
                </div>
                <div class="footer">
                  <p>KnowYOU Plataforma &copy; ${new Date().getFullYear()}</p>
                </div>
              </div>
            </body>
            </html>
          `;

          const { data: emailData, error: emailError } = await supabase.functions.invoke("send-email", {
            body: { to: email, subject: "🖥️ Lembrete: Complete seu cadastro na KnowYOU Plataforma", body: platformEmailHtml }
          });

          if (emailError || emailData?.error) {
            console.error("❌ Platform email error:", emailError || emailData?.error);
            results.push({ channel: "email", product: "platform", success: false, error: emailError?.message || emailData?.error });
          } else {
            console.log("✅ Platform email sent");
            results.push({ channel: "email", product: "platform", success: true });
          }

          // Log email attempt
          await supabase.from("notification_logs").insert({
            event_type: "invitation_resend",
            channel: "email",
            recipient: email,
            subject: "Reenvio Plataforma",
            message_body: "Email de lembrete para plataforma",
            status: emailError || emailData?.error ? "failed" : "success",
            error_message: emailError?.message || emailData?.error || null,
            metadata: { token, product: "platform", action: "resend", rule_version: "mandatory_v1" }
          });
        } catch (emailCatch: any) {
          console.error("❌ Platform email exception:", emailCatch);
          results.push({ channel: "email", product: "platform", success: false, error: emailCatch.message });
        }
      }

      // WHATSAPP para Plataforma (se tiver phone e não tem APP - informativo)
      if (phone && hasTwilioCredentials && !has_app_access) {
        try {
          const msg = `*KnowYOU*

Olá ${name},

Reenviamos um email com seu convite para a Plataforma KnowYOU.

Acesse pelo computador ou tablet para completar seu cadastro.

_Verifique também sua pasta de spam_`;

          const { data: whatsappData, error: whatsappError } = await supabase.functions.invoke("send-whatsapp", {
            body: { phoneNumber: phone, message: msg }
          });

          if (whatsappError || whatsappData?.error) {
            console.error("❌ Platform info WhatsApp error:", whatsappError || whatsappData?.error);
            results.push({ channel: "whatsapp", product: "platform_info", success: false, error: whatsappError?.message || whatsappData?.error });
          } else {
            console.log("✅ Platform info WhatsApp sent");
            results.push({ channel: "whatsapp", product: "platform_info", success: true });
          }

          // Log WhatsApp attempt
          await supabase.from("notification_logs").insert({
            event_type: "invitation_resend",
            channel: "whatsapp",
            recipient: phone,
            subject: "Reenvio Plataforma Info",
            message_body: msg,
            status: whatsappError || whatsappData?.error ? "failed" : "success",
            error_message: whatsappError?.message || whatsappData?.error || null,
            metadata: { token, product: "platform_info", action: "resend", rule_version: "mandatory_v1" }
          });
        } catch (whatsappCatch: any) {
          console.error("❌ Platform info WhatsApp exception:", whatsappCatch);
          results.push({ channel: "whatsapp", product: "platform_info", success: false, error: whatsappCatch.message });
        }
      }
    }

    // =====================================================
    // APP (PWA): WHATSAPP OBRIGATÓRIO (com link)
    // =====================================================
    if (shouldSendApp) {
      console.log("📱 Processing APP resend...");
      
      if (!phone) {
        console.error("❌ APP requires phone but none provided");
        results.push({ channel: "whatsapp", product: "app", success: false, error: "Telefone obrigatório para APP" });
      } else if (!hasTwilioCredentials) {
        const missing = [];
        if (!hasTwilioSid) missing.push("TWILIO_ACCOUNT_SID");
        if (!hasTwilioToken) missing.push("TWILIO_AUTH_TOKEN");
        if (!hasTwilioFrom) missing.push("TWILIO_FROM_NUMBER");
        const errorMsg = `Credenciais Twilio incompletas: ${missing.join(", ")}`;
        console.error("❌ " + errorMsg);
        results.push({ channel: "whatsapp", product: "app", success: false, error: errorMsg });
      } else {
        try {
          const msg = `*KnowYOU APP*

Olá ${name}, você foi convidado!

Acesse pelo celular para ter seu assistente sempre com você.

Link: ${appUrl}

_Convite válido até ${new Date(invitation.expires_at).toLocaleDateString('pt-BR')}_`;

          const { data: whatsappData, error: whatsappError } = await supabase.functions.invoke("send-whatsapp", {
            body: { phoneNumber: phone, message: msg }
          });

          if (whatsappError || whatsappData?.error) {
            console.error("❌ APP WhatsApp error:", whatsappError || whatsappData?.error);
            results.push({ channel: "whatsapp", product: "app", success: false, error: whatsappError?.message || whatsappData?.error });
          } else {
            console.log("✅ APP WhatsApp sent");
            results.push({ channel: "whatsapp", product: "app", success: true });
          }

          // Log WhatsApp attempt
          await supabase.from("notification_logs").insert({
            event_type: "invitation_resend",
            channel: "whatsapp",
            recipient: phone,
            subject: "Reenvio APP",
            message_body: msg,
            status: whatsappError || whatsappData?.error ? "failed" : "success",
            error_message: whatsappError?.message || whatsappData?.error || null,
            metadata: { token, product: "app", action: "resend", rule_version: "mandatory_v1" }
          });
        } catch (whatsappCatch: any) {
          console.error("❌ APP WhatsApp exception:", whatsappCatch);
          results.push({ channel: "whatsapp", product: "app", success: false, error: whatsappCatch.message });
        }
      }
    }

    // Update resend tracking
    await supabase
      .from("user_invitations")
      .update({
        resend_count: (invitation.resend_count || 0) + 1,
        last_resend_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("token", token);

    // Summary log
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    console.log(`📊 Results: ${successCount} success, ${failCount} failed`);
    console.log("=== RESEND-INVITATION-CODE END ===");

    // Log summary
    await supabase.from("notification_logs").insert({
      event_type: "invitation_resend_summary",
      channel: "system",
      recipient: email,
      subject: `Reenvio: ${product}`,
      message_body: results.map(r => `${r.success ? '✅' : '❌'} ${r.channel}/${r.product}`).join(", "),
      status: successCount > 0 ? "success" : "failed",
      metadata: { token, product, status: invitation.status, results, successCount, failCount, rule_version: "mandatory_v1" }
    });

    return new Response(
      JSON.stringify({
        success: successCount > 0,
        results: results.map(r => `${r.success ? '✅' : '❌'} ${r.channel}/${r.product}: ${r.error || 'OK'}`),
        remainingResends: 10 - ((invitation.resend_count || 0) + 1),
        details: results
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ Error in resend-invitation-code:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
