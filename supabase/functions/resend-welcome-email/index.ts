import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResendWelcomeRequest {
  registrationId: string;
  channel?: "email" | "whatsapp" | "both";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar autorização
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      data: { user: adminUser },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !adminUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verificar role admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", adminUser.id)
      .in("role", ["admin", "superadmin"])
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extrair parâmetros - CRÍTICO: channel com default 'both'
    const { registrationId, channel = "both" }: ResendWelcomeRequest = await req.json();

    console.log("[resend-welcome-email] Request received:", { registrationId, channel });

    if (!registrationId) {
      return new Response(JSON.stringify({ error: "Registration ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar registro
    const { data: registration, error: regError } = await supabase
      .from("user_registrations")
      .select("*")
      .eq("id", registrationId)
      .single();

    if (regError || !registration) {
      console.error("[resend-welcome-email] Registration fetch error:", regError);
      return new Response(JSON.stringify({ error: "Registration not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validações
    if (registration.status !== "approved") {
      return new Response(JSON.stringify({ error: "Only approved users can receive welcome emails" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (registration.is_banned) {
      return new Response(JSON.stringify({ error: "Cannot resend email to banned users" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // =====================================================
    // CONFIGURAÇÃO DE CANAIS - RESPEITA ESCOLHA DO ADMIN
    // =====================================================
    const shouldSendEmail = channel === "email" || channel === "both";
    const shouldSendWhatsApp = channel === "whatsapp" || channel === "both";

    console.log("[resend-welcome-email] Channel config:", {
      channel,
      shouldSendEmail,
      shouldSendWhatsApp,
      hasPlatformAccess: registration.has_platform_access,
      hasAppAccess: registration.has_app_access,
      hasPhone: !!registration.phone,
    });

    const userName = `${registration.first_name} ${registration.last_name}`;
    const results: { email?: boolean; whatsapp?: boolean } = {};
    const siteUrl = "https://fia.iconsai.ai";
    const appUrl = `${siteUrl}/pwa-register`;

    // =====================================================
    // 1. EMAIL - Só se shouldSendEmail = true
    // =====================================================
    if (shouldSendEmail && registration.has_platform_access) {
      console.log("[resend-welcome-email] Sending EMAIL...");

      // Gerar link de recuperação
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: "recovery",
        email: registration.email,
      });

      if (linkError) {
        console.error("[resend-welcome-email] Recovery link error:", linkError);
        // Não falha completamente, apenas não envia email
        results.email = false;
      } else {
        const recoveryLink = linkData?.properties?.action_link || `${siteUrl}/admin/reset-password`;

        // Buscar template ou usar padrão
        const { data: template } = await supabase
          .from("notification_templates")
          .select("email_subject, email_body")
          .eq("event_type", "user_registration_approved")
          .single();

        const emailHtml = template?.email_body
          ? replaceVariables(template.email_body, {
              user_name: userName,
              recovery_link: recoveryLink,
              user_email: registration.email,
            })
          : getDefaultEmailHtml(userName, recoveryLink);

        const emailSubject = template?.email_subject
          ? replaceVariables(template.email_subject, { user_name: userName })
          : "🖥️ Bem-vindo à Plataforma KnowYOU!";

        try {
          await supabase.functions.invoke("send-email", {
            body: { to: registration.email, subject: emailSubject, body: emailHtml },
          });
          console.log("[resend-welcome-email] Email SENT to:", registration.email);
          results.email = true;

          // Log
          await logNotification(supabase, {
            event_type: "user_registration_resend_welcome",
            channel: "email",
            recipient: registration.email,
            subject: "Reenvio de boas-vindas (Email)",
            message_body: `Email enviado para ${userName}`,
            status: "success",
            metadata: { registration_id: registrationId, triggered_by: adminUser.email },
          });
        } catch (e) {
          console.error("[resend-welcome-email] Email error:", e);
          results.email = false;
        }
      }
    } else if (shouldSendEmail) {
      console.log("[resend-welcome-email] Email requested but user has no platform access");
    }

    // =====================================================
    // 2. WHATSAPP - Só se shouldSendWhatsApp = true
    // =====================================================
    if (shouldSendWhatsApp && registration.phone) {
      console.log("[resend-welcome-email] Sending WHATSAPP...");

      let whatsappMessage = "";
      let whatsappSubject = "";

      // Escolher mensagem baseado no tipo de acesso
      if (registration.has_app_access) {
        whatsappMessage = `*KnowYOU APP*

Olá ${userName}, seu cadastro foi aprovado!

Acesse pelo celular para ter seu assistente sempre com você.

Link: ${appUrl}

_Lembre-se: o APP funciona apenas no celular_`;
        whatsappSubject = "WhatsApp APP com link";
      } else if (registration.has_platform_access) {
        whatsappMessage = `*KnowYOU*

Olá ${userName},

Reenviamos um email com as instruções para acessar a Plataforma KnowYOU.

Acesse pelo computador ou tablet para definir sua senha.

_Verifique também sua pasta de spam_`;
        whatsappSubject = "WhatsApp informativo (Plataforma)";
      }

      if (whatsappMessage) {
        try {
          await supabase.functions.invoke("send-whatsapp", {
            body: { phoneNumber: registration.phone, message: whatsappMessage },
          });
          console.log("[resend-welcome-email] WhatsApp SENT to:", registration.phone);
          results.whatsapp = true;

          // Log
          await logNotification(supabase, {
            event_type: "user_registration_resend_welcome",
            channel: "whatsapp",
            recipient: registration.phone,
            subject: whatsappSubject,
            message_body: whatsappMessage,
            status: "success",
            metadata: { registration_id: registrationId, triggered_by: adminUser.email },
          });
        } catch (e) {
          console.error("[resend-welcome-email] WhatsApp error:", e);
          results.whatsapp = false;
        }
      }
    } else if (shouldSendWhatsApp) {
      console.log("[resend-welcome-email] WhatsApp requested but user has no phone");
    }

    // Log de atividade
    await supabase.from("user_activity_logs").insert({
      user_email: adminUser.email,
      user_id: adminUser.id,
      action_category: "USER_REGISTRATION_RESEND_WELCOME",
      action: `Reenviou boas-vindas para ${userName} (${registration.email})`,
      details: { registration_id: registrationId, channel, results },
    });

    // Resposta
    const successChannels: string[] = [];
    if (results.email) successChannels.push("email");
    if (results.whatsapp) successChannels.push("WhatsApp");

    if (successChannels.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Nenhuma mensagem foi enviada",
          channel_requested: channel,
          details: results,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Mensagem enviada via ${successChannels.join(" e ")}`,
        channel_requested: channel,
        channels: successChannels,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("[resend-welcome-email] Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

function replaceVariables(text: string, vars: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }
  return result;
}

async function logNotification(supabase: any, data: any): Promise<void> {
  try {
    await supabase.from("notification_logs").insert(data);
  } catch (e) {
    console.error("[resend-welcome-email] Log error:", e);
  }
}

function getDefaultEmailHtml(userName: string, recoveryLink: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
    .button { display: inline-block; background: #6366f1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
    .info { background: #fff; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #6366f1; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin:0;">🖥️ Bem-vindo à Plataforma!</h1>
    </div>
    <div class="content">
      <p>Olá <strong>${userName}</strong>,</p>
      <p>Seu cadastro foi aprovado! Para acessar a plataforma, clique no botão abaixo para definir sua senha:</p>
      <div class="info">
        <p style="margin:0;">💻 Acesse pelo <strong>computador ou tablet</strong> para aproveitar todos os recursos.</p>
      </div>
      <p style="text-align: center;">
        <a href="${recoveryLink}" class="button" style="color: white;">Definir Minha Senha</a>
      </p>
      <p style="font-size: 12px; color: #666;">Este link é válido por 24 horas.</p>
    </div>
    <div class="footer">
      <p>Plataforma KnowYOU &copy; ${new Date().getFullYear()}</p>
    </div>
  </div>
</body>
</html>`;
}
