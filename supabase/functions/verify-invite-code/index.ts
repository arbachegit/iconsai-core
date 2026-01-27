// ============================================
// VERSAO: 1.0.0 | DEPLOY: 2026-01-28
// Verifica código de convite IconsAI
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getSupabaseAdmin } from "../_shared/supabase.ts";

const FUNCTION_VERSION = "1.0.0";

// Templates Twilio IconsAI
const TWILIO_TEMPLATES = {
  otp: "HXf8fbdb191884bbe43a27a96e899d044a",
  resend: "HXbd7861cc0d6036df9c25b334385f407b",
};

interface VerifyCodeRequest {
  inviteId: string;
  code: string;
  channel?: "email" | "whatsapp" | "sms";
}

interface SendCodeRequest {
  inviteId: string;
  channel?: "whatsapp" | "sms" | "email";
}

// Normaliza telefone para E.164
function sanitizePhoneNumber(phone: string): string {
  let numbers = phone.replace(/\D/g, "");
  if (numbers.length === 11 || numbers.length === 10) {
    numbers = "55" + numbers;
  }
  return "+" + numbers;
}

// Envia código via WhatsApp
async function sendWhatsAppCode(phone: string, code: string, firstName: string): Promise<{ success: boolean; error?: string }> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromNumber = Deno.env.get("TWILIO_FROM_NUMBER");

  if (!accountSid || !authToken || !fromNumber) {
    return { success: false, error: "Twilio credentials not configured" };
  }

  const phoneNumber = sanitizePhoneNumber(phone);
  const twilioApiUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const formData = new URLSearchParams();
  formData.append("From", `whatsapp:${fromNumber}`);
  formData.append("To", `whatsapp:${phoneNumber}`);
  formData.append("ContentSid", TWILIO_TEMPLATES.otp);
  formData.append("ContentVariables", JSON.stringify({
    "1": firstName,
    "2": code,
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

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Envia código via SMS
async function sendSMSCode(phone: string, code: string): Promise<{ success: boolean; error?: string }> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromNumber = Deno.env.get("TWILIO_SMS_NUMBER") || Deno.env.get("TWILIO_FROM_NUMBER");

  if (!accountSid || !authToken || !fromNumber) {
    return { success: false, error: "Twilio SMS credentials not configured" };
  }

  const phoneNumber = sanitizePhoneNumber(phone);
  const twilioApiUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const message = `Seu codigo IconsAI: ${code}. Valido por 10 minutos.`;

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

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Envia código via Email
async function sendEmailCode(email: string, code: string, firstName: string): Promise<{ success: boolean; error?: string }> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

  if (!RESEND_API_KEY) {
    return { success: false, error: "RESEND_API_KEY não configurada" };
  }

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0A0E1A; color: #FFFFFF; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .logo { text-align: center; margin-bottom: 30px; }
    .logo-text { font-size: 28px; font-weight: bold; color: #00D4FF; }
    .card { background: #1A1F2E; border-radius: 16px; padding: 30px; margin-bottom: 20px; text-align: center; }
    h1 { color: #00D4FF; font-size: 24px; margin: 0 0 20px 0; }
    p { color: #E0E0E0; line-height: 1.6; margin: 0 0 15px 0; }
    .code { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #00D4FF; background: #0A0E1A; padding: 20px 30px; border-radius: 8px; margin: 20px 0; display: inline-block; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <div class="logo-text">IconsAI</div>
    </div>
    <div class="card">
      <h1>Seu código de verificação</h1>
      <p>Olá <strong>${firstName}</strong>,</p>
      <p>Use o código abaixo para verificar sua conta:</p>
      <div class="code">${code}</div>
      <p style="font-size: 14px; color: #888;">Este código expira em 10 minutos.</p>
    </div>
    <div class="footer">
      <p>Se você não solicitou este código, ignore este email.</p>
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
        to: [email],
        subject: `${code} é seu código IconsAI`,
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  console.log(`\n=== VERIFY-INVITE-CODE v${FUNCTION_VERSION} START ===`);
  console.log(`[TIMESTAMP] ${new Date().toISOString()}`);

  const respond = (status: number, payload: Record<string, unknown>) => {
    const body = { ...payload, version: FUNCTION_VERSION };
    console.log(`[RESPONSE] ${JSON.stringify(body)}`);
    console.log(`=== VERIFY-INVITE-CODE v${FUNCTION_VERSION} END ===\n`);
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  };

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "verify";

    const supabase = getSupabaseAdmin();

    // ============================================
    // ACTION: send-code - Envia código de verificação
    // ============================================
    if (action === "send-code") {
      const body: SendCodeRequest = await req.json();

      if (!body.inviteId) {
        return respond(400, { success: false, error: "inviteId é obrigatório" });
      }

      console.log(`📧 [SEND-CODE] Invite: ${body.inviteId}`);
      console.log(`📱 [CHANNEL] ${body.channel || "whatsapp (default)"}`);

      // Buscar convite
      const { data: invite, error: inviteError } = await supabase
        .from("user_invites")
        .select("*")
        .eq("id", body.inviteId)
        .single();

      if (inviteError || !invite) {
        return respond(404, { success: false, error: "Convite não encontrado" });
      }

      // Verificar status
      if (invite.status === "completed") {
        return respond(400, { success: false, error: "Convite já foi utilizado" });
      }

      if (invite.status === "cancelled") {
        return respond(400, { success: false, error: "Convite foi cancelado" });
      }

      if (new Date(invite.expires_at) < new Date()) {
        return respond(400, { success: false, error: "Convite expirado" });
      }

      // Gerar código
      const { data: code, error: codeError } = await supabase.rpc("set_invite_verification_code", {
        p_invite_id: body.inviteId,
        p_expiry_minutes: 10,
      });

      if (codeError) {
        console.error("❌ [DB] Error generating code:", codeError);
        return respond(500, { success: false, error: "Erro ao gerar código" });
      }

      console.log(`🔑 [CODE] Generated: ${code}`);

      // Enviar pelo canal preferido
      const channel = body.channel || "whatsapp";
      let sendResult: { success: boolean; error?: string };

      if (channel === "whatsapp") {
        sendResult = await sendWhatsAppCode(invite.phone, code, invite.first_name);

        // Fallback para SMS se WhatsApp falhar
        if (!sendResult.success) {
          console.log(`⚠️ [WHATSAPP] Falhou, tentando SMS...`);
          sendResult = await sendSMSCode(invite.phone, code);
          if (sendResult.success) {
            return respond(200, {
              success: true,
              channel: "sms",
              message: "Código enviado por SMS (WhatsApp indisponível)",
            });
          }
        }
      } else if (channel === "sms") {
        sendResult = await sendSMSCode(invite.phone, code);
      } else {
        sendResult = await sendEmailCode(invite.email, code, invite.first_name);
      }

      if (!sendResult.success) {
        return respond(500, {
          success: false,
          error: `Falha ao enviar código: ${sendResult.error}`,
        });
      }

      return respond(200, {
        success: true,
        channel,
        message: `Código enviado por ${channel}`,
      });
    }

    // ============================================
    // ACTION: verify - Verifica código
    // ============================================
    const body: VerifyCodeRequest = await req.json();

    if (!body.inviteId || !body.code) {
      return respond(400, { success: false, error: "inviteId e code são obrigatórios" });
    }

    console.log(`🔐 [VERIFY] Invite: ${body.inviteId}`);
    console.log(`🔑 [CODE] ${body.code}`);

    // Validar código usando função do banco
    const { data: result, error: verifyError } = await supabase.rpc("validate_invite_code", {
      p_invite_id: body.inviteId,
      p_code: body.code,
      p_verified_via: body.channel || "whatsapp",
    });

    if (verifyError) {
      console.error("❌ [DB] Error validating code:", verifyError);
      return respond(500, { success: false, error: "Erro ao validar código" });
    }

    console.log(`📋 [RESULT]`, result);

    if (!result.valid) {
      const errorMessages: Record<string, string> = {
        "invite_not_found": "Convite não encontrado",
        "invite_completed": "Convite já foi utilizado",
        "invite_expired": "Convite expirado",
        "invite_cancelled": "Convite foi cancelado",
        "no_code": "Nenhum código foi gerado. Solicite um novo código.",
        "code_expired": "Código expirado. Solicite um novo código.",
        "max_attempts": "Número máximo de tentativas atingido. Solicite um novo código.",
        "invalid_code": "Código inválido",
      };

      return respond(400, {
        success: false,
        error: errorMessages[result.error] || result.error,
        attemptsRemaining: result.attempts_remaining,
      });
    }

    // Buscar dados do convite para retornar
    const { data: invite } = await supabase
      .from("user_invites")
      .select("*, institutions(name, slug)")
      .eq("id", body.inviteId)
      .single();

    return respond(200, {
      success: true,
      verified: true,
      verifiedVia: result.verified_via,
      invite: {
        id: invite.id,
        email: invite.email,
        phone: invite.phone,
        firstName: invite.first_name,
        lastName: invite.last_name,
        role: invite.role,
        institutionId: invite.institution_id,
        institutionName: invite.institutions?.name,
        departmentId: invite.department_id,
      },
    });

  } catch (error) {
    console.error("❌ [FATAL]", error);
    return respond(500, {
      success: false,
      error: error instanceof Error ? error.message : "Erro interno",
    });
  }
});
