/**
 * ============================================================
 * resend-invitation-code/index.ts - Reenvio de Convite v3.5.0
 * ============================================================
 * Data: 2026-01-11
 * CORRECAO: URL shortener integrado para SMS caber em 160 chars
 * ============================================================
 * CHANGELOG v3.5.0:
 * - Adicionada função shortenUrl() usando TinyURL API
 * - URL do APP é encurtada antes de enviar
 * - Mensagem SMS reduzida para ~85 caracteres
 * ============================================================
 * ROTA: supabase/functions/resend-invitation-code/index.ts
 * ============================================================
 */

// ============================================
// VERSAO: 3.5.0 | DEPLOY: 2026-01-11
// FIX: URL shortener para SMS caber em 160 chars
// ============================================

const FUNCTION_VERSION = "3.5.0";
const SITE_URL = "https://fia.iconsai.ai";

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

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

// ===========================================
// URL SHORTENER - TinyURL API (gratuita)
// ===========================================
async function shortenUrl(longUrl: string): Promise<string> {
  try {
    console.log(`[URL-SHORTENER] Encurtando: ${longUrl.slice(0, 50)}...`);

    const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`, {
      method: "GET",
    });

    if (response.ok) {
      const shortUrl = await response.text();
      console.log(`[URL-SHORTENER] Resultado: ${shortUrl}`);
      return shortUrl.trim();
    }

    console.warn(`[URL-SHORTENER] HTTP ${response.status}, usando URL original`);
  } catch (e) {
    console.warn(`[URL-SHORTENER] Erro: ${e}, usando URL original`);
  }

  return longUrl;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log(`=== [RESEND-INVITATION-CODE v${FUNCTION_VERSION}] START ===`);
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
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Check if already completed
    if (invitation.status === "completed") {
      return new Response(
        JSON.stringify({ success: false, error_code: "INVITE_USED", error: "Este convite já foi utilizado" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Check rate limit
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    if (invitation.last_resend_at && new Date(invitation.last_resend_at) > oneHourAgo) {
      if ((invitation.resend_count || 0) >= 10) {
        return new Response(
          JSON.stringify({
            success: false,
            error_code: "RATE_LIMIT",
            error: "Limite de reenvios atingido. Tente novamente em 1 hora.",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const platformUrl = `${SITE_URL}/invite/${token}`;
    const appUrlLong = `${SITE_URL}/pwa-register/${token}`;

    // ENCURTAR URL DO APP PARA SMS
    const appUrl = await shortenUrl(appUrlLong);
    console.log(`📲 URL encurtada: ${appUrl}`);

    const { name, email, phone, has_platform_access, has_app_access } = invitation;

    console.log("📋 Access check:", { has_platform_access, has_app_access, hasPhone: !!phone, product });

    // Determine what to send
    const shouldSendPlatform = (product === "platform" || product === "both") && has_platform_access;
    const shouldSendApp = (product === "app" || product === "both") && has_app_access;

    const hasResendKey = !!Deno.env.get("RESEND_API_KEY");
    console.log("🔑 Credentials:", { hasResendKey });

    // =====================================================
    // PLATAFORMA: Email + SMS informativo
    // =====================================================
    if (shouldSendPlatform) {
      console.log("🖥️ Processing PLATFORM resend...");

      if (!hasResendKey) {
        console.warn("⚠️ RESEND_API_KEY not configured");
        results.push({
          channel: "email",
          product: "platform",
          success: false,
          error: "RESEND_API_KEY não configurada",
        });
      } else {
        try {
          const platformEmailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; }
                .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
                .button { display: inline-block; background: #6366f1; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin:0;">🖥️ Lembrete: KnowYOU Plataforma</h1>
                </div>
                <div class="content">
                  <p>Olá <strong>${name}</strong>,</p>
                  <p>Você ainda não completou seu cadastro na <strong>KnowYOU Plataforma</strong>.</p>
                  <p style="text-align: center;">
                    <a href="${platformUrl}" class="button">Completar Cadastro</a>
                  </p>
                  <p style="font-size: 14px; color: #64748b; text-align: center;">
                    ⏰ Expira em: <strong>${new Date(invitation.expires_at).toLocaleDateString("pt-BR")}</strong>
                  </p>
                </div>
                <div class="footer">
                  <p>KnowYOU Plataforma © ${new Date().getFullYear()}</p>
                </div>
              </div>
            </body>
            </html>
          `;

          const { data: emailData, error: emailError } = await supabase.functions.invoke("send-email", {
            body: { to: email, subject: "🖥️ Lembrete: Complete seu cadastro", body: platformEmailHtml },
          });

          if (emailError || emailData?.error) {
            console.error("❌ Platform email error:", emailError || emailData?.error);
            results.push({
              channel: "email",
              product: "platform",
              success: false,
              error: emailError?.message || emailData?.error,
            });
          } else {
            console.log("✅ Platform email sent");
            results.push({ channel: "email", product: "platform", success: true });
          }

          await supabase.from("notification_logs").insert({
            event_type: "invitation_resend",
            channel: "email",
            recipient: email,
            subject: "Reenvio Plataforma",
            status: emailError || emailData?.error ? "failed" : "success",
            error_message: emailError?.message || emailData?.error || null,
            metadata: { token, product: "platform", action: "resend", rule_version: `v${FUNCTION_VERSION}` },
          });
        } catch (emailCatch: any) {
          console.error("❌ Platform email exception:", emailCatch);
          results.push({ channel: "email", product: "platform", success: false, error: emailCatch.message });
        }
      }

      // SMS informativo para Plataforma (só se NÃO tem APP)
      if (phone && !has_app_access) {
        console.log(`📱 [v${FUNCTION_VERSION}] Sending platform info via SMS...`);
        try {
          const smsMsg = `KnowYOU: Reenviamos email com convite. Acesse pelo computador.`;

          const { data: smsData, error: smsError } = await supabase.functions.invoke("send-sms", {
            body: { phoneNumber: phone, message: smsMsg },
          });

          if (smsError || smsData?.error) {
            console.error("❌ Platform info SMS error:", smsError || smsData?.error);
            results.push({
              channel: "sms",
              product: "platform_info",
              success: false,
              error: smsError?.message || smsData?.error,
            });
          } else {
            console.log("✅ Platform info SMS sent");
            results.push({ channel: "sms", product: "platform_info", success: true });
          }
        } catch (smsCatch: any) {
          console.error("❌ Platform info SMS exception:", smsCatch);
          results.push({ channel: "sms", product: "platform_info", success: false, error: smsCatch.message });
        }
      }
    }

    // =====================================================
    // APP (PWA): SMS com URL encurtada
    // =====================================================
    if (shouldSendApp) {
      console.log(`📱 [v${FUNCTION_VERSION}] Processing APP resend...`);

      if (!phone) {
        console.error("❌ APP requires phone but none provided");
        results.push({ channel: "sms", product: "app", success: false, error: "Telefone obrigatório para APP" });
      } else {
        try {
          console.log(`📲 Enviando URL encurtada: ${appUrl}`);

          const { data: notifData, error: notifError } = await supabase.functions.invoke("send-pwa-notification", {
            body: {
              to: phone,
              template: "invitation",
              variables: {
                "1": name || "Usuário",
                "2": "Equipe KnowYOU",
                "3": appUrl, // URL JÁ ENCURTADA
              },
              channel: "sms",
            },
          });

          console.log("📨 send-pwa-notification response:", JSON.stringify(notifData));

          if (notifError || !notifData?.success) {
            console.error("❌ APP notification error:", notifError || notifData?.error);
            results.push({
              channel: notifData?.channel || "sms",
              product: "app",
              success: false,
              error: notifError?.message || notifData?.error,
            });
          } else {
            console.log("✅ APP notification sent via", notifData?.channel);
            results.push({ channel: notifData?.channel || "sms", product: "app", success: true });
          }

          await supabase.from("notification_logs").insert({
            event_type: "invitation_resend",
            channel: notifData?.channel || "sms",
            recipient: phone,
            subject: "Reenvio APP",
            status: notifError || !notifData?.success ? "failed" : "success",
            error_message: notifError?.message || notifData?.error || null,
            metadata: {
              token,
              product: "app",
              action: "resend",
              rule_version: `v${FUNCTION_VERSION}`,
              shortUrl: appUrl,
            },
          });
        } catch (notifCatch: any) {
          console.error("❌ APP notification exception:", notifCatch);
          results.push({ channel: "sms", product: "app", success: false, error: notifCatch.message });
        }
      }
    }

    // Update resend tracking
    await supabase
      .from("user_invitations")
      .update({
        resend_count: (invitation.resend_count || 0) + 1,
        last_resend_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("token", token);

    // Summary
    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    console.log(`📊 Results: ${successCount} success, ${failCount} failed`);
    console.log(`=== [RESEND-INVITATION-CODE v${FUNCTION_VERSION}] END ===`);

    await supabase.from("notification_logs").insert({
      event_type: "invitation_resend_summary",
      channel: "system",
      recipient: email,
      subject: `Reenvio: ${product}`,
      message_body: results.map((r) => `${r.success ? "✅" : "❌"} ${r.channel}/${r.product}`).join(", "),
      status: successCount > 0 ? "success" : "failed",
      metadata: {
        token,
        product,
        results,
        successCount,
        failCount,
        rule_version: `v${FUNCTION_VERSION}`,
        shortUrl: appUrl,
      },
    });

    return new Response(
      JSON.stringify({
        success: successCount > 0,
        results: results.map((r) => `${r.success ? "✅" : "❌"} ${r.channel}/${r.product}: ${r.error || "OK"}`),
        remainingResends: 10 - ((invitation.resend_count || 0) + 1),
        details: results,
        version: FUNCTION_VERSION,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("❌ Error in resend-invitation-code:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
