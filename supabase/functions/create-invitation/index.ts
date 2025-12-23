import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("=== CREATE-INVITATION START ===");
  const results: SendResult[] = [];

  try {
    // 1. CONFIGURAÇÃO INICIAL
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("❌ Missing Supabase credentials");
      return new Response(
        JSON.stringify({ error: "Configuração do servidor incompleta" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2. PARSE E VALIDAÇÃO DO REQUEST
    let body: CreateInvitationRequest;
    try {
      body = await req.json();
      console.log("📥 Request:", JSON.stringify({
        name: body.name,
        email: body.email,
        phone: body.phone ? "***" + body.phone.slice(-4) : null,
        role: body.role,
        sendViaEmail: body.sendViaEmail,
        sendViaWhatsapp: body.sendViaWhatsapp,
        hasPlatformAccess: body.hasPlatformAccess,
        hasAppAccess: body.hasAppAccess
      }));
    } catch (parseError) {
      console.error("❌ Invalid request body:", parseError);
      return new Response(
        JSON.stringify({ error: "Corpo da requisição inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { name, email, phone, role, sendViaEmail, sendViaWhatsapp, hasPlatformAccess, hasAppAccess } = body;

    // Validações básicas
    if (!name || !email) {
      return new Response(
        JSON.stringify({ error: "Nome e email são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!hasPlatformAccess && !hasAppAccess) {
      return new Response(
        JSON.stringify({ error: "Selecione pelo menos um tipo de acesso" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (sendViaWhatsapp && !phone) {
      return new Response(
        JSON.stringify({ error: "Telefone é obrigatório para envio via WhatsApp" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
        JSON.stringify({ error: "Já existe um convite pendente para este email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: existingReg } = await supabase
      .from("user_registrations")
      .select("id, status")
      .eq("email", email.toLowerCase())
      .eq("status", "approved")
      .maybeSingle();

    if (existingReg) {
      return new Response(
        JSON.stringify({ error: "Este email já está cadastrado no sistema" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. GERAR TOKEN E CRIAR CONVITE
    console.log("🔐 Generating token...");
    const tokenArray = new Uint8Array(32);
    crypto.getRandomValues(tokenArray);
    const token = Array.from(tokenArray).map(b => b.toString(16).padStart(2, "0")).join("");

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
        send_via_email: sendViaEmail,
        send_via_whatsapp: sendViaWhatsapp,
        expires_at: expiresAt.toISOString(),
        status: "pending",
        has_platform_access: hasPlatformAccess,
        has_app_access: hasAppAccess,
        pwa_access: hasAppAccess ? ["economia", "health", "ideias"] : []
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Erro ao criar convite: " + insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Invitation created:", invitation.id);

    // 5. CONSTRUIR URLs
    const siteUrl = Deno.env.get("PUBLIC_SITE_URL") || "https://hmv.knowyou.app";
    const platformUrl = `${siteUrl}/invite/${token}`;
    const appUrl = `${siteUrl}/pwa-register?token=${token}`;
    
    // URL principal baseada no acesso
    const inviteUrl = hasAppAccess && !hasPlatformAccess ? appUrl : platformUrl;

    // 6. VERIFICAR SECRETS ANTES DE ENVIAR
    const hasResendKey = !!Deno.env.get("RESEND_API_KEY");
    const hasTwilioSid = !!Deno.env.get("TWILIO_ACCOUNT_SID");
    const hasTwilioToken = !!Deno.env.get("TWILIO_AUTH_TOKEN");
    const hasTwilioFrom = !!Deno.env.get("TWILIO_FROM_NUMBER");
    const hasTwilioCredentials = hasTwilioSid && hasTwilioToken && hasTwilioFrom;

    console.log("🔑 Secrets check:", { hasResendKey, hasTwilioSid, hasTwilioToken, hasTwilioFrom });

    // 7. ENVIAR EMAIL (não falha se der erro)
    if (sendViaEmail) {
      if (!hasResendKey) {
        console.warn("⚠️ RESEND_API_KEY not configured");
        if (hasPlatformAccess) {
          results.push({ channel: "email", product: "platform", success: false, error: "RESEND_API_KEY não configurada" });
        }
        if (hasAppAccess) {
          results.push({ channel: "email", product: "app", success: false, error: "RESEND_API_KEY não configurada" });
        }
      } else {
        // Email para PLATAFORMA
        if (hasPlatformAccess) {
          console.log("📧 Sending platform email...");
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
                  .badge { display: inline-block; background: #6366f1; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 15px; }
                  .button { display: inline-block; background: #6366f1; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
                  .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
                  .info { background: #fff; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #6366f1; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1 style="margin:0;">🖥️ Convite KnowYOU Plataforma</h1>
                  </div>
                  <div class="content">
                    <span class="badge">🖥️ PLATAFORMA</span>
                    <p>Olá <strong>${name}</strong>,</p>
                    <p>Você foi convidado para a <strong>KnowYOU Plataforma</strong>!</p>
                    
                    <div class="info">
                      <p style="margin:0;">💻 Acesse pelo <strong>computador ou tablet</strong> para aproveitar todos os recursos.</p>
                    </div>
                    
                    <p style="text-align: center;">
                      <a href="${platformUrl}" class="button">Acessar Plataforma</a>
                    </p>
                    
                    <p style="font-size: 14px; color: #64748b; text-align: center;">
                      ⏰ Este convite expira em <strong>7 dias</strong>.
                    </p>
                  </div>
                  <div class="footer">
                    <p>KnowYOU Plataforma &copy; ${new Date().getFullYear()}</p>
                  </div>
                </div>
              </body>
              </html>
            `;

            const { error: emailError } = await supabase.functions.invoke("send-email", {
              body: {
                to: email,
                subject: "🖥️ Convite KnowYOU Plataforma",
                body: platformEmailHtml
              }
            });

            if (emailError) {
              console.error("❌ Platform email error:", emailError);
              results.push({ channel: "email", product: "platform", success: false, error: emailError.message });
            } else {
              console.log("✅ Platform email sent");
              results.push({ channel: "email", product: "platform", success: true });
            }
          } catch (emailCatch: any) {
            console.error("❌ Platform email exception:", emailCatch);
            results.push({ channel: "email", product: "platform", success: false, error: emailCatch.message });
          }
        }

        // Email para APP
        if (hasAppAccess) {
          console.log("📧 Sending app email...");
          try {
            const appEmailHtml = `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <style>
                  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                  .container { max-width: 600px; margin: 0 auto; }
                  .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                  .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
                  .badge { display: inline-block; background: #10b981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 15px; }
                  .button { display: inline-block; background: #10b981; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
                  .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
                  .info { background: #fff; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #10b981; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1 style="margin:0;">📱 Convite KnowYOU APP</h1>
                  </div>
                  <div class="content">
                    <span class="badge">📱 APP</span>
                    <p>Olá <strong>${name}</strong>,</p>
                    <p>Você foi convidado para o <strong>KnowYOU APP</strong>!</p>
                    
                    <div class="info">
                      <p style="margin:0;">📲 Acesse pelo <strong>celular via WhatsApp</strong> para ter o assistente sempre com você.</p>
                    </div>
                    
                    <p style="text-align: center;">
                      <a href="${appUrl}" class="button">Cadastrar no APP</a>
                    </p>
                    
                    <p style="font-size: 14px; color: #64748b; text-align: center;">
                      ⏰ Este convite expira em <strong>7 dias</strong>.
                    </p>
                  </div>
                  <div class="footer">
                    <p>KnowYOU APP &copy; ${new Date().getFullYear()}</p>
                  </div>
                </div>
              </body>
              </html>
            `;

            const { error: emailError } = await supabase.functions.invoke("send-email", {
              body: {
                to: email,
                subject: "📱 Convite KnowYOU APP",
                body: appEmailHtml
              }
            });

            if (emailError) {
              console.error("❌ App email error:", emailError);
              results.push({ channel: "email", product: "app", success: false, error: emailError.message });
            } else {
              console.log("✅ App email sent");
              results.push({ channel: "email", product: "app", success: true });
            }
          } catch (emailCatch: any) {
            console.error("❌ App email exception:", emailCatch);
            results.push({ channel: "email", product: "app", success: false, error: emailCatch.message });
          }
        }
      }
    }

    // 8. ENVIAR WHATSAPP (não falha se der erro)
    if (sendViaWhatsapp && phone) {
      if (!hasTwilioCredentials) {
        const missing = [];
        if (!hasTwilioSid) missing.push("TWILIO_ACCOUNT_SID");
        if (!hasTwilioToken) missing.push("TWILIO_AUTH_TOKEN");
        if (!hasTwilioFrom) missing.push("TWILIO_FROM_NUMBER");
        const errorMsg = `Credenciais Twilio incompletas: ${missing.join(", ")}`;
        
        console.warn("⚠️ " + errorMsg);
        if (hasPlatformAccess) {
          results.push({ channel: "whatsapp", product: "platform", success: false, error: errorMsg });
        }
        if (hasAppAccess) {
          results.push({ channel: "whatsapp", product: "app", success: false, error: errorMsg });
        }
      } else {
        // WhatsApp para PLATAFORMA
        if (hasPlatformAccess) {
          console.log("💬 Sending platform WhatsApp...");
          try {
            const platformWhatsappMessage = `🖥️ *Convite KnowYOU Plataforma*

Olá ${name}!

Você foi convidado para a *KnowYOU Plataforma*.

💻 Acesse pelo computador ou tablet.

🔗 Link: ${platformUrl}

⏰ Expira em 7 dias.`;

            const { data: whatsappResult, error: whatsappError } = await supabase.functions.invoke("send-whatsapp", {
              body: {
                phoneNumber: phone,
                message: platformWhatsappMessage
              }
            });

            if (whatsappError) {
              console.error("❌ Platform WhatsApp error:", whatsappError);
              results.push({ channel: "whatsapp", product: "platform", success: false, error: whatsappError.message });
            } else if (whatsappResult?.error) {
              console.error("❌ Platform WhatsApp API error:", whatsappResult.error);
              results.push({ channel: "whatsapp", product: "platform", success: false, error: whatsappResult.error });
            } else {
              console.log("✅ Platform WhatsApp sent");
              results.push({ channel: "whatsapp", product: "platform", success: true });
            }
          } catch (whatsappCatch: any) {
            console.error("❌ Platform WhatsApp exception:", whatsappCatch);
            results.push({ channel: "whatsapp", product: "platform", success: false, error: whatsappCatch.message });
          }
        }

        // WhatsApp para APP
        if (hasAppAccess) {
          console.log("💬 Sending app WhatsApp...");
          try {
            const appWhatsappMessage = `📱 *Convite KnowYOU APP*

Olá ${name}!

Você foi convidado para o *KnowYOU APP*.

📲 Acesse pelo celular para ter o assistente sempre com você.

🔗 Link: ${appUrl}

⏰ Expira em 7 dias.`;

            const { data: whatsappResult, error: whatsappError } = await supabase.functions.invoke("send-whatsapp", {
              body: {
                phoneNumber: phone,
                message: appWhatsappMessage
              }
            });

            if (whatsappError) {
              console.error("❌ App WhatsApp error:", whatsappError);
              results.push({ channel: "whatsapp", product: "app", success: false, error: whatsappError.message });
            } else if (whatsappResult?.error) {
              console.error("❌ App WhatsApp API error:", whatsappResult.error);
              results.push({ channel: "whatsapp", product: "app", success: false, error: whatsappResult.error });
            } else {
              console.log("✅ App WhatsApp sent");
              results.push({ channel: "whatsapp", product: "app", success: true });
            }
          } catch (whatsappCatch: any) {
            console.error("❌ App WhatsApp exception:", whatsappCatch);
            results.push({ channel: "whatsapp", product: "app", success: false, error: whatsappCatch.message });
          }
        }
      }
    }

    // 9. NOTIFICAR ADMIN (silencioso)
    try {
      const { data: settings } = await supabase
        .from("admin_settings")
        .select("whatsapp_target_phone, whatsapp_global_enabled")
        .single();

      if (settings?.whatsapp_global_enabled && settings?.whatsapp_target_phone) {
        const roleLabel = role === 'superadmin' ? 'Super Admin' : role === 'admin' ? 'Admin' : 'Usuário';
        const accessLabels = [];
        if (hasPlatformAccess) accessLabels.push("🖥️ Plataforma");
        if (hasAppAccess) accessLabels.push("📱 APP");
        
        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;
        
        const adminMessage = `📧 *Convite Criado*

👤 ${name}
📧 ${email}
🔑 Role: ${roleLabel}
🔓 Acesso: ${accessLabels.join(" + ")}

📊 Status dos envios:
${results.map(r => `${r.success ? '✅' : '❌'} ${r.channel}/${r.product}: ${r.error || 'OK'}`).join('\n')}

📈 Total: ${successCount} sucesso, ${failCount} falha(s)`;

        await supabase.functions.invoke("send-whatsapp", {
          body: {
            phoneNumber: settings.whatsapp_target_phone,
            message: adminMessage
          }
        });
      }
    } catch (notifyError) {
      console.warn("⚠️ Admin notification failed:", notifyError);
    }

    // 10. REGISTRAR LOG
    const successCount = results.filter(r => r.success).length;
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
      metadata: { token, role, sendViaEmail, sendViaWhatsapp, hasPlatformAccess, hasAppAccess, results }
    });

    // 11. RETORNAR SUCESSO (sempre, independente dos envios)
    console.log("=== CREATE-INVITATION END ===");
    console.log("Results:", JSON.stringify(results));

    const warnings = results.filter(r => !r.success).map(r => `${r.channel}/${r.product}: ${r.error}`);

    return new Response(
      JSON.stringify({
        success: true,
        inviteUrl,
        invitation: {
          id: invitation.id,
          token,
          expiresAt: expiresAt.toISOString()
        },
        sendResults: results,
        warnings
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("=== CREATE-INVITATION FATAL ERROR ===", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
