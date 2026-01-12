/**
 * ============================================================
 * create-invitation/index.ts - Criar Convite v3.6.0
 * ============================================================
 * Data: 2026-01-11
 * CORRECAO: URL shortener integrado para SMS caber em 160 chars
 * ============================================================
 * CHANGELOG v3.6.0:
 * - Adicionada função shortenUrl() usando TinyURL API
 * - URL do APP é encurtada antes de enviar
 * - Mensagem SMS reduzida para ~85 caracteres
 * ============================================================
 * ROTA: supabase/functions/create-invitation/index.ts
 * ============================================================
 */

// ============================================
// VERSAO: 3.6.0 | DEPLOY: 2026-01-11
// FIX: URL shortener para SMS caber em 160 chars
// ============================================

const FUNCTION_VERSION = "3.6.0";
const SITE_URL = "https://fia.iconsai.ai";

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

interface CreateInvitationRequest {
  name: string;
  email: string;
  phone?: string;
  role: "user" | "admin" | "superadmin";
  sendViaEmail: boolean;
  sendViaWhatsapp: boolean;
  hasPlatformAccess: boolean;
  hasAppAccess: boolean;
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

  console.log(`=== CREATE-INVITATION v${FUNCTION_VERSION} START ===`);
  const results: SendResult[] = [];

  try {
    // 1. CONFIGURAÇÃO INICIAL
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("❌ Missing Supabase credentials");
      return new Response(JSON.stringify({ error: "Configuração do servidor incompleta" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2. PARSE E VALIDAÇÃO DO REQUEST
    let body: CreateInvitationRequest;
    try {
      body = await req.json();
      console.log(
        "📥 Request:",
        JSON.stringify({
          name: body.name,
          email: body.email,
          phone: body.phone ? "***" + body.phone.slice(-4) : null,
          role: body.role,
          sendViaEmail: body.sendViaEmail,
          sendViaWhatsapp: body.sendViaWhatsapp,
          hasPlatformAccess: body.hasPlatformAccess,
          hasAppAccess: body.hasAppAccess,
        }),
      );
    } catch (parseError) {
      console.error("❌ Invalid request body:", parseError);
      return new Response(
        JSON.stringify({ success: false, error_code: "VALIDATION_ERROR", error: "Corpo da requisição inválido" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { name, email, phone, role, sendViaEmail, sendViaWhatsapp, hasPlatformAccess, hasAppAccess } = body;

    // Validações básicas
    if (!name || !email) {
      return new Response(
        JSON.stringify({ success: false, error_code: "VALIDATION_ERROR", error: "Nome e email são obrigatórios" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!hasPlatformAccess && !hasAppAccess) {
      return new Response(
        JSON.stringify({
          success: false,
          error_code: "VALIDATION_ERROR",
          error: "Selecione pelo menos um tipo de acesso",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (sendViaWhatsapp && !phone) {
      return new Response(
        JSON.stringify({
          success: false,
          error_code: "PHONE_REQUIRED",
          error: "Telefone é obrigatório para envio via WhatsApp",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // REGRA CRÍTICA: PWA-only = WhatsApp obrigatório, Email proibido
    let finalSendViaEmail = sendViaEmail;
    let finalSendViaWhatsapp = sendViaWhatsapp;

    if (hasAppAccess && !hasPlatformAccess) {
      if (!phone) {
        return new Response(
          JSON.stringify({
            success: false,
            error_code: "PHONE_REQUIRED_FOR_PWA",
            error: "Telefone é obrigatório para convites de APP.",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      finalSendViaWhatsapp = true;
      finalSendViaEmail = false;
      console.log("📱 PWA-only: Forçando WhatsApp/SMS, desabilitando Email");
    }

    // 3. VERIFICAR SE JÁ EXISTE
    console.log("🔍 Checking existing invitations...");
    const { data: existingInvite } = await supabase
      .from("user_invitations")
      .select("id, status")
      .eq("email", email.toLowerCase())
      .in("status", ["pending", "form_submitted"])
      .maybeSingle();

    if (existingInvite) {
      return new Response(
        JSON.stringify({
          success: false,
          error_code: "DUPLICATE_INVITE",
          error: "Já existe um convite pendente para este email",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: existingReg } = await supabase
      .from("user_registrations")
      .select("id, status, platform_registered_at, pwa_registered_at")
      .eq("email", email.toLowerCase())
      .eq("status", "approved")
      .maybeSingle();

    if (existingReg) {
      const needsPlatformRegistration = !!hasPlatformAccess && !existingReg.platform_registered_at;
      const needsAppRegistration = !!hasAppAccess && !existingReg.pwa_registered_at;

      if (!needsPlatformRegistration && !needsAppRegistration) {
        return new Response(
          JSON.stringify({
            success: false,
            error_code: "ALREADY_REGISTERED",
            error: "Este email já está cadastrado no sistema",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // 4. GERAR TOKEN E CRIAR CONVITE
    console.log("🔐 Generating token...");
    const tokenArray = new Uint8Array(32);
    crypto.getRandomValues(tokenArray);
    const token = Array.from(tokenArray)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    console.log("💾 Inserting invitation...");
    const { data: invitation, error: insertError } = await supabase
      .from("user_invitations")
      .insert({
        token,
        name,
        email: email.toLowerCase(),
        phone: phone || null,
        role,
        send_via_email: finalSendViaEmail,
        send_via_whatsapp: finalSendViaWhatsapp,
        expires_at: expiresAt.toISOString(),
        status: "pending",
        has_platform_access: hasPlatformAccess,
        has_app_access: hasAppAccess,
        pwa_access: hasAppAccess ? ["economia", "health", "ideias"] : [],
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Erro ao criar convite: " + insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("✅ Invitation created:", invitation.id);

    // 5. CONSTRUIR URLs
    const platformUrl = `${SITE_URL}/invite/${token}`;
    const appUrlLong = `${SITE_URL}/pwa-register/${token}`;

    // ENCURTAR URL DO APP PARA SMS
    const appUrl = await shortenUrl(appUrlLong);
    console.log(`📲 URL encurtada: ${appUrl}`);

    const inviteUrl = hasAppAccess && !hasPlatformAccess ? appUrlLong : platformUrl;

    // 6. VERIFICAR SECRETS
    const hasResendKey = !!Deno.env.get("RESEND_API_KEY");
    console.log("🔑 Secrets check:", { hasResendKey });

    // 7. EMAIL PARA PLATAFORMA
    if (hasPlatformAccess && finalSendViaEmail) {
      if (!hasResendKey) {
        console.warn("⚠️ RESEND_API_KEY not configured");
        results.push({
          channel: "email",
          product: "platform",
          success: false,
          error: "RESEND_API_KEY não configurada",
        });
      } else {
        console.log("📧 Sending platform email...");
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
                  <h1 style="margin:0;">🖥️ Convite KnowYOU Plataforma</h1>
                </div>
                <div class="content">
                  <p>Olá <strong>${name}</strong>,</p>
                  <p>Você foi convidado para a <strong>KnowYOU Plataforma</strong>!</p>
                  <p style="text-align: center;">
                    <a href="${platformUrl}" class="button">Acessar Plataforma</a>
                  </p>
                  <p style="font-size: 14px; color: #64748b; text-align: center;">
                    ⏰ Este convite expira em <strong>7 dias</strong>.
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
            body: {
              to: email,
              subject: "🖥️ Convite KnowYOU Plataforma",
              body: platformEmailHtml,
            },
          });

          const emailSuccess = !emailError && !emailData?.error;
          if (!emailSuccess) {
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
            event_type: "invitation_send",
            channel: "email",
            recipient: email,
            subject: "Convite Plataforma",
            status: emailSuccess ? "success" : "failed",
            error_message: emailError?.message || emailData?.error || null,
            metadata: { token, product: "platform", action: "create", rule_version: `v${FUNCTION_VERSION}` },
          });
        } catch (emailCatch: any) {
          console.error("❌ Platform email exception:", emailCatch);
          results.push({ channel: "email", product: "platform", success: false, error: emailCatch.message });
        }
      }
    }

    // 8. APP (PWA): SMS com URL encurtada
    if (hasAppAccess) {
      if (!phone) {
        results.push({ channel: "sms", product: "app", success: false, error: "Telefone obrigatório para APP" });
      } else {
        console.log(`💬 [v${FUNCTION_VERSION}] Sending app invitation via SMS...`);
        try {
          console.log(`📲 Enviando URL encurtada: ${appUrl}`);

          const { data: notifResult, error: notifError } = await supabase.functions.invoke("send-pwa-notification", {
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

          console.log("📨 send-pwa-notification response:", JSON.stringify(notifResult));

          const appNotifSuccess = !notifError && notifResult?.success;
          if (!appNotifSuccess) {
            console.error("❌ App notification error:", notifError || notifResult?.error);
            results.push({
              channel: notifResult?.channel || "sms",
              product: "app",
              success: false,
              error: notifError?.message || notifResult?.error,
            });
          } else {
            console.log("✅ App notification sent via", notifResult?.channel);
            results.push({ channel: notifResult?.channel || "sms", product: "app", success: true });
          }

          await supabase.from("notification_logs").insert({
            event_type: "invitation_send",
            channel: notifResult?.channel || "sms",
            recipient: phone,
            subject: "Convite APP",
            status: appNotifSuccess ? "success" : "failed",
            error_message: notifError?.message || notifResult?.error || null,
            metadata: {
              token,
              product: "app",
              action: "create",
              rule_version: `v${FUNCTION_VERSION}`,
              shortUrl: appUrl,
            },
          });
        } catch (notifCatch: any) {
          console.error("❌ App notification exception:", notifCatch);
          results.push({ channel: "sms", product: "app", success: false, error: notifCatch.message });
        }
      }
    }

    // 9. SMS INFORMATIVO para Plataforma (só se NÃO tem APP)
    if (hasPlatformAccess && !hasAppAccess && phone) {
      console.log(`📱 [v${FUNCTION_VERSION}] Sending platform info via SMS...`);
      try {
        const smsMsg = `KnowYOU: Enviamos email com convite. Acesse pelo computador.`;

        const { data: smsResult, error: smsError } = await supabase.functions.invoke("send-sms", {
          body: { phoneNumber: phone, message: smsMsg },
        });

        const platformSmsSuccess = !smsError && !smsResult?.error;
        if (!platformSmsSuccess) {
          console.error("❌ Platform info SMS error:", smsError || smsResult?.error);
          results.push({
            channel: "sms",
            product: "platform_info",
            success: false,
            error: smsError?.message || smsResult?.error,
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

    // 10. NOTIFICAR ADMIN
    try {
      const { data: settings } = await supabase
        .from("admin_settings")
        .select("whatsapp_target_phone, whatsapp_global_enabled")
        .single();

      if (settings?.whatsapp_global_enabled && settings?.whatsapp_target_phone) {
        const successCount = results.filter((r) => r.success).length;
        const failCount = results.filter((r) => !r.success).length;

        const adminSms = `KnowYOU: Convite ${name}. ${successCount}OK/${failCount}FAIL`;

        await supabase.functions.invoke("send-sms", {
          body: { phoneNumber: settings.whatsapp_target_phone, message: adminSms },
        });
        console.log("✅ Admin notified via SMS");
      }
    } catch (notifyError) {
      console.warn("⚠️ Admin notification failed:", notifyError);
    }

    // 11. REGISTRAR LOG FINAL
    const successCount = results.filter((r) => r.success).length;
    const totalCount = results.length;
    let status = "created_only";
    if (totalCount > 0) {
      status = successCount === totalCount ? "success" : successCount > 0 ? "partial_success" : "send_failed";
    }

    await supabase.from("notification_logs").insert({
      event_type: "user_invitation_created",
      channel: "system",
      recipient: email,
      subject: "Convite criado",
      message_body: JSON.stringify({ results, inviteUrl }),
      status,
      metadata: { token, role, hasPlatformAccess, hasAppAccess, results, shortUrl: appUrl },
    });

    console.log(`=== CREATE-INVITATION v${FUNCTION_VERSION} END ===`);
    console.log("Results:", JSON.stringify(results));

    const warnings = results.filter((r) => !r.success).map((r) => `${r.channel}/${r.product}: ${r.error}`);

    return new Response(
      JSON.stringify({
        success: true,
        inviteUrl,
        invitation: {
          id: invitation.id,
          token,
          expiresAt: expiresAt.toISOString(),
        },
        sendResults: results,
        warnings,
        version: FUNCTION_VERSION,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("=== CREATE-INVITATION FATAL ERROR ===", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
