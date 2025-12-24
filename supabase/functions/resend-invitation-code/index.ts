import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResendRequest {
  token: string;
  product?: "platform" | "app" | "both";  // Qual produto reenviar
  channel?: "email" | "whatsapp" | "both"; // Qual canal usar (ignorado - usamos regra por produto)
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { token, product = "both" }: ResendRequest = await req.json();

    console.log("Resend request:", { token, product });

    // Fetch invitation
    const { data: invitation, error: fetchError } = await supabase
      .from("user_invitations")
      .select("*")
      .eq("token", token)
      .single();

    if (fetchError || !invitation) {
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

    const siteUrl = Deno.env.get("PUBLIC_SITE_URL") || "https://hmv.knowyou.app";
    const platformUrl = `${siteUrl}/invite/${token}`;
    const appUrl = `${siteUrl}/pwa-register?token=${token}`;
    
    const { name, email, phone, has_platform_access, has_app_access, verification_method, status } = invitation;
    
    const results: string[] = [];

    // =====================================================
    // REGRA DE CANAL POR PRODUTO:
    // - PLATAFORMA → EMAIL (plataforma não abre no celular)
    // - APP → WHATSAPP (app é para mobile)
    // - Se só tem Plataforma + tem telefone → WhatsApp informativo
    // =====================================================

    // =====================================================
    // CASO 1: Convite em status "pending" (sem verification_method)
    // Reenvia o CONVITE original
    // =====================================================
    if (!verification_method || status === "pending") {
      console.log("Resending original invitation (status pending)");

      // PLATAFORMA - Sempre via EMAIL
      if ((product === "platform" || product === "both") && has_platform_access) {
        // Email Plataforma
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

          await supabase.functions.invoke("send-email", {
            body: { to: email, subject: "🖥️ Lembrete: Complete seu cadastro na KnowYOU Plataforma", body: platformEmailHtml }
          });
          results.push("✅ Email Plataforma enviado");
        } catch (e) {
          console.error("Error sending platform email:", e);
          results.push("❌ Erro ao enviar email Plataforma");
        }

        // WhatsApp INFORMATIVO para Plataforma (só se NÃO tem APP)
        // Apenas avisa que enviamos um email - NÃO envia link!
        if (phone && !has_app_access) {
          try {
            const msg = `*KnowYOU*

Olá ${name},

Reenviamos um email com seu convite para a Plataforma KnowYOU.

Acesse pelo computador ou tablet para completar seu cadastro.

_Verifique também sua pasta de spam_`;

            await supabase.functions.invoke("send-whatsapp", {
              body: { phoneNumber: phone, message: msg }
            });
            results.push("✅ WhatsApp informativo enviado");
          } catch (e) {
            console.error("Error sending platform info WhatsApp:", e);
            results.push("❌ Erro ao enviar WhatsApp informativo");
          }
        }
      }

      // APP - Sempre via WhatsApp (com link)
      if ((product === "app" || product === "both") && has_app_access && phone) {
        try {
          const msg = `*KnowYOU APP*

Olá ${name}, você foi convidado!

Acesse pelo celular para ter seu assistente sempre com você.

Link: ${appUrl}

_Convite válido até ${new Date(invitation.expires_at).toLocaleDateString('pt-BR')}_`;

          await supabase.functions.invoke("send-whatsapp", {
            body: { phoneNumber: phone, message: msg }
          });
          results.push("✅ WhatsApp APP enviado");
        } catch (e) {
          console.error("Error sending APP WhatsApp:", e);
          results.push("❌ Erro ao enviar WhatsApp APP");
        }
      }
    }
    // =====================================================
    // CASO 2: Convite em status "form_submitted" (tem verification_method)
    // Reenvia o CÓDIGO de verificação
    // =====================================================
    else if (status === "form_submitted" && verification_method) {
      console.log("Resending verification code (status form_submitted)");

      // Generate new 6-digit verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Set code expiration to 2 minutes
      const codeExpiresAt = new Date();
      codeExpiresAt.setMinutes(codeExpiresAt.getMinutes() + 2);

      // Update invitation with new code
      await supabase
        .from("user_invitations")
        .update({
          verification_code: verificationCode,
          verification_code_expires_at: codeExpiresAt.toISOString(),
          verification_attempts: 0,
          updated_at: new Date().toISOString()
        })
        .eq("token", token);

      // Enviar código pelo método original de verificação
      if (verification_method === "email") {
        try {
          const codeEmailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; }
                .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; text-align: center; }
                .code { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #6366f1; background: #fff; padding: 20px 30px; border-radius: 8px; margin: 20px 0; display: inline-block; border: 2px dashed #6366f1; }
                .warning { color: #dc2626; font-size: 14px; margin-top: 20px; }
                .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin:0;">🔐 Código de Verificação</h1>
                </div>
                <div class="content">
                  <p>Olá <strong>${name}</strong>,</p>
                  <p>Seu código de verificação:</p>
                  
                  <div class="code">${verificationCode}</div>
                  
                  <p class="warning">⏰ Este código expira em <strong>2 minutos</strong>.</p>
                </div>
                <div class="footer">
                  <p>KnowYOU &copy; ${new Date().getFullYear()}</p>
                </div>
              </div>
            </body>
            </html>
          `;

          await supabase.functions.invoke("send-email", {
            body: { to: email, subject: "🔐 Código de Verificação - KnowYOU", body: codeEmailHtml }
          });
          results.push("✅ Código enviado por Email");
        } catch (e) {
          console.error("Error sending code email:", e);
          results.push("❌ Erro ao enviar código por Email");
        }
      }

      if (verification_method === "whatsapp" && phone) {
        try {
          const msg = `*Código de Verificação*

Seu código: *${verificationCode}*

Este código expira em 2 minutos.

_Toque e segure o código para copiar_`;

          await supabase.functions.invoke("send-whatsapp", {
            body: { phoneNumber: phone, message: msg }
          });
          results.push("✅ Código enviado por WhatsApp");
        } catch (e) {
          console.error("Error sending code WhatsApp:", e);
          results.push("❌ Erro ao enviar código por WhatsApp");
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

    // Log the event
    await supabase.from("notification_logs").insert({
      event_type: "invitation_resend",
      channel: "system",
      recipient: email,
      subject: `Reenvio: ${product}`,
      message_body: results.join(", "),
      status: results.some(r => r.includes("✅")) ? "success" : "failed",
      metadata: { token, product, status: invitation.status, results }
    });

    return new Response(
      JSON.stringify({
        success: true,
        results,
        remainingResends: 10 - ((invitation.resend_count || 0) + 1)
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in resend-invitation-code:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
