// ============================================
// VERSAO: 1.1.0 | DEPLOY: 2026-01-28
// Sistema de convites para usuários IconsAI
// Envia Email + WhatsApp (SMS como fallback)
// FIX: HTML sanitization for XSS prevention
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, corsHeaders } from "../_shared/cors.ts";
import { getSupabaseAdmin } from "../_shared/supabase.ts";

const FUNCTION_VERSION = "1.1.0";

/**
 * Sanitize string for safe HTML insertion
 * Prevents XSS attacks by escaping HTML special characters
 */
function sanitizeHtml(str: string): string {
  const htmlEscapes: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
    "/": "&#x2F;",
    "`": "&#x60;",
    "=": "&#x3D;",
  };
  return str.replace(/[&<>"'`=/]/g, (char) => htmlEscapes[char] || char);
}

// Templates Twilio IconsAI
const TWILIO_TEMPLATES = {
  invitation: "HX12e18ddf6df67d64100eed31a5fc0318",
  otp: "HXf8fbdb191884bbe43a27a96e899d044a",
  welcome: "HX819a1dc0474b22c90c1d0283776627fe",
  resend: "HXbd7861cc0d6036df9c25b334385f407b",
};

interface SendInviteRequest {
  email: string;
  phone: string;
  firstName: string;
  lastName?: string;
  institutionId?: string;
  departmentId?: string;
  role?: "user" | "admin";
  invitedBy?: string;
}

// Normaliza telefone para E.164
function sanitizePhoneNumber(phone: string): string {
  let numbers = phone.replace(/\D/g, "");
  if (numbers.length === 11 || numbers.length === 10) {
    numbers = "55" + numbers;
  }
  return "+" + numbers;
}

// Envia email via Resend
async function sendEmail(params: {
  to: string;
  firstName: string;
  inviteLink: string;
  institutionName?: string;
}): Promise<{ success: boolean; error?: string }> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

  if (!RESEND_API_KEY) {
    return { success: false, error: "RESEND_API_KEY não configurada" };
  }

  // Sanitize user input to prevent XSS
  const safeFirstName = sanitizeHtml(params.firstName);
  const safeInstitutionName = params.institutionName ? sanitizeHtml(params.institutionName) : null;

  const institutionText = safeInstitutionName
    ? `para fazer parte da equipe <strong>${safeInstitutionName}</strong> na`
    : "para usar a";

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0A0E1A; color: #FFFFFF; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .logo { text-align: center; margin-bottom: 30px; }
    .logo img { height: 50px; }
    .logo-text { font-size: 28px; font-weight: bold; color: #00D4FF; }
    .card { background: #1A1F2E; border-radius: 16px; padding: 30px; margin-bottom: 20px; }
    h1 { color: #00D4FF; font-size: 24px; margin: 0 0 20px 0; }
    p { color: #E0E0E0; line-height: 1.6; margin: 0 0 15px 0; }
    .button { display: inline-block; background: linear-gradient(135deg, #00D4FF 0%, #00A3CC 100%); color: #0A0E1A !important; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
    .button:hover { background: linear-gradient(135deg, #00E5FF 0%, #00B8DB 100%); }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
    .footer a { color: #00D4FF; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <div class="logo-text">IconsAI</div>
    </div>
    <div class="card">
      <h1>Bem-vindo(a) ao IconsAI!</h1>
      <p>Olá <strong>${safeFirstName}</strong>,</p>
      <p>Você foi convidado(a) ${institutionText} plataforma IconsAI.</p>
      <p>Clique no botão abaixo para criar sua conta e começar a usar:</p>
      <p style="text-align: center;">
        <a href="${params.inviteLink}" class="button">Aceitar Convite</a>
      </p>
      <p style="font-size: 14px; color: #888;">Este convite expira em 7 dias.</p>
    </div>
    <div class="footer">
      <p>Se você não solicitou este convite, ignore este email.</p>
      <p>&copy; 2026 IconsAI. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>
`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "IconsAI <noreply@iconsai.com.br>",
        to: [params.to],
        subject: "Você foi convidado para o IconsAI",
        html: htmlBody,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.message || `Resend error: ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Envia WhatsApp via Twilio com template
async function sendWhatsApp(params: {
  phone: string;
  firstName: string;
  inviteLink: string;
}): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromNumber = Deno.env.get("TWILIO_FROM_NUMBER");

  if (!accountSid || !authToken || !fromNumber) {
    return { success: false, error: "Twilio credentials not configured" };
  }

  const phoneNumber = sanitizePhoneNumber(params.phone);
  const twilioApiUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const formData = new URLSearchParams();
  formData.append("From", `whatsapp:${fromNumber}`);
  formData.append("To", `whatsapp:${phoneNumber}`);
  formData.append("ContentSid", TWILIO_TEMPLATES.invitation);
  formData.append("ContentVariables", JSON.stringify({
    "1": params.firstName,
    "2": params.inviteLink,
  }));

  try {
    const response = await fetch(twilioApiUrl, {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.message || `Twilio error: ${response.status}` };
    }

    return { success: true, messageSid: data.sid };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Envia SMS via Twilio (fallback)
async function sendSMS(params: {
  phone: string;
  firstName: string;
  inviteLink: string;
}): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromNumber = Deno.env.get("TWILIO_SMS_NUMBER") || Deno.env.get("TWILIO_FROM_NUMBER");

  if (!accountSid || !authToken || !fromNumber) {
    return { success: false, error: "Twilio SMS credentials not configured" };
  }

  const phoneNumber = sanitizePhoneNumber(params.phone);
  const twilioApiUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  // SMS pode usar texto livre (não precisa de template)
  const message = `Ola ${params.firstName}! Voce foi convidado para o IconsAI. Acesse: ${params.inviteLink}`;

  const formData = new URLSearchParams();
  formData.append("From", fromNumber);
  formData.append("To", phoneNumber);
  formData.append("Body", message);

  try {
    const response = await fetch(twilioApiUrl, {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.message || `Twilio SMS error: ${response.status}` };
    }

    return { success: true, messageSid: data.sid };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  console.log(`\n=== SEND-INVITE v${FUNCTION_VERSION} START ===`);
  console.log(`[TIMESTAMP] ${new Date().toISOString()}`);

  const respond = (status: number, payload: Record<string, unknown>) => {
    const body = { ...payload, version: FUNCTION_VERSION };
    console.log(`[RESPONSE] ${JSON.stringify(body)}`);
    console.log(`=== SEND-INVITE v${FUNCTION_VERSION} END ===\n`);
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  };

  try {
    const body: SendInviteRequest = await req.json();

    // Validação
    if (!body.email || !body.phone || !body.firstName) {
      return respond(400, {
        success: false,
        error: "email, phone e firstName são obrigatórios",
      });
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return respond(400, {
        success: false,
        error: "Formato de email inválido",
      });
    }

    console.log(`📧 [EMAIL] ${body.email}`);
    console.log(`📱 [PHONE] ${body.phone}`);
    console.log(`👤 [NAME] ${body.firstName} ${body.lastName || ""}`);
    console.log(`🏢 [INSTITUTION] ${body.institutionId || "N/A"}`);
    console.log(`👑 [ROLE] ${body.role || "user"}`);

    const supabase = getSupabaseAdmin();

    // Buscar nome da instituição se fornecido
    let institutionName: string | undefined;
    if (body.institutionId) {
      const { data: institution } = await supabase
        .from("institutions")
        .select("name")
        .eq("id", body.institutionId)
        .single();
      institutionName = institution?.name;
    }

    // Criar convite usando a função do banco
    const { data: invite, error: inviteError } = await supabase.rpc("create_user_invite", {
      p_email: body.email.toLowerCase().trim(),
      p_phone: body.phone,
      p_first_name: body.firstName.trim(),
      p_last_name: body.lastName?.trim() || null,
      p_institution_id: body.institutionId || null,
      p_department_id: body.departmentId || null,
      p_role: body.role || "user",
      p_created_by: body.invitedBy || null,
    });

    if (inviteError) {
      console.error("❌ [DB] Error creating invite:", inviteError);
      return respond(400, {
        success: false,
        error: inviteError.message,
      });
    }

    console.log(`✅ [DB] Invite created: ${invite.id}`);
    console.log(`🔑 [TOKEN] ${invite.token.slice(0, 8)}...`);

    // Gerar link de convite
    const baseUrl = Deno.env.get("APP_BASE_URL") || "https://app.iconsai.com.br";
    const inviteLink = `${baseUrl}/invite/${invite.token}`;
    console.log(`🔗 [LINK] ${inviteLink}`);

    // Resultados dos envios
    const results = {
      email: { sent: false, error: null as string | null },
      whatsapp: { sent: false, messageSid: null as string | null, error: null as string | null },
      sms: { sent: false, messageSid: null as string | null, error: null as string | null },
    };

    // 1. Enviar Email
    console.log("\n📧 [EMAIL] Enviando...");
    const emailResult = await sendEmail({
      to: body.email,
      firstName: body.firstName,
      inviteLink,
      institutionName,
    });
    results.email.sent = emailResult.success;
    results.email.error = emailResult.error || null;

    // Registrar no banco
    await supabase.rpc("mark_invite_sent", {
      p_invite_id: invite.id,
      p_channel: "email",
      p_success: emailResult.success,
      p_error: emailResult.error,
    });
    console.log(emailResult.success ? "✅ [EMAIL] Enviado" : `❌ [EMAIL] Falhou: ${emailResult.error}`);

    // 2. Enviar WhatsApp
    console.log("\n📱 [WHATSAPP] Enviando...");
    const whatsappResult = await sendWhatsApp({
      phone: body.phone,
      firstName: body.firstName,
      inviteLink,
    });
    results.whatsapp.sent = whatsappResult.success;
    results.whatsapp.messageSid = whatsappResult.messageSid || null;
    results.whatsapp.error = whatsappResult.error || null;

    // Registrar no banco
    await supabase.rpc("mark_invite_sent", {
      p_invite_id: invite.id,
      p_channel: "whatsapp",
      p_success: whatsappResult.success,
      p_message_sid: whatsappResult.messageSid,
      p_error: whatsappResult.error,
    });
    console.log(whatsappResult.success
      ? `✅ [WHATSAPP] Enviado: ${whatsappResult.messageSid}`
      : `❌ [WHATSAPP] Falhou: ${whatsappResult.error}`
    );

    // 3. SMS como fallback se WhatsApp falhar
    if (!whatsappResult.success) {
      console.log("\n📲 [SMS] Fallback - Enviando...");
      const smsResult = await sendSMS({
        phone: body.phone,
        firstName: body.firstName,
        inviteLink,
      });
      results.sms.sent = smsResult.success;
      results.sms.messageSid = smsResult.messageSid || null;
      results.sms.error = smsResult.error || null;

      // Registrar no banco
      await supabase.rpc("mark_invite_sent", {
        p_invite_id: invite.id,
        p_channel: "sms",
        p_success: smsResult.success,
        p_message_sid: smsResult.messageSid,
        p_error: smsResult.error,
      });
      console.log(smsResult.success
        ? `✅ [SMS] Enviado: ${smsResult.messageSid}`
        : `❌ [SMS] Falhou: ${smsResult.error}`
      );
    }

    // Verificar se pelo menos um canal teve sucesso
    const anySuccess = results.email.sent || results.whatsapp.sent || results.sms.sent;

    return respond(anySuccess ? 200 : 500, {
      success: anySuccess,
      inviteId: invite.id,
      token: invite.token,
      inviteLink,
      channels: results,
      message: anySuccess
        ? "Convite enviado com sucesso"
        : "Falha ao enviar convite por todos os canais",
    });

  } catch (error) {
    console.error("❌ [FATAL]", error);
    return respond(500, {
      success: false,
      error: error instanceof Error ? error.message : "Erro interno",
    });
  }
});
