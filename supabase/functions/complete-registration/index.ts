// ============================================
// VERSAO: 1.1.0 | DEPLOY: 2026-01-28
// Completa cadastro de usuário IconsAI
// Cria auth.user e platform_users
// FIX: Removed magic link from response (security)
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
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
  welcome: "HX819a1dc0474b22c90c1d0283776627fe",
};

interface CompleteRegistrationRequest {
  inviteId: string;
  password: string;
  confirmPassword?: string;
}

// Normaliza telefone para E.164
function sanitizePhoneNumber(phone: string): string {
  let numbers = phone.replace(/\D/g, "");
  if (numbers.length === 11 || numbers.length === 10) {
    numbers = "55" + numbers;
  }
  return "+" + numbers;
}

// Valida força da senha
function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: "Senha deve ter pelo menos 8 caracteres" };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "Senha deve conter pelo menos uma letra maiúscula" };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: "Senha deve conter pelo menos uma letra minúscula" };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "Senha deve conter pelo menos um número" };
  }
  return { valid: true };
}

// Envia boas-vindas via WhatsApp
async function sendWelcomeWhatsApp(phone: string, firstName: string): Promise<void> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromNumber = Deno.env.get("TWILIO_FROM_NUMBER");

  if (!accountSid || !authToken || !fromNumber) {
    console.log("⚠️ [WELCOME] Twilio not configured, skipping WhatsApp");
    return;
  }

  const phoneNumber = sanitizePhoneNumber(phone);
  const twilioApiUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const formData = new URLSearchParams();
  formData.append("From", `whatsapp:${fromNumber}`);
  formData.append("To", `whatsapp:${phoneNumber}`);
  formData.append("ContentSid", TWILIO_TEMPLATES.welcome);
  formData.append("ContentVariables", JSON.stringify({
    "1": firstName,
  }));

  try {
    await fetch(twilioApiUrl, {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${accountSid}:${authToken}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });
    console.log("✅ [WELCOME] WhatsApp enviado");
  } catch (error) {
    console.error("⚠️ [WELCOME] WhatsApp falhou:", error);
  }
}

// Envia email de boas-vindas
async function sendWelcomeEmail(email: string, firstName: string): Promise<void> {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

  if (!RESEND_API_KEY) {
    console.log("⚠️ [WELCOME] Resend not configured, skipping email");
    return;
  }

  const baseUrl = Deno.env.get("APP_BASE_URL") || "https://app.iconsai.com.br";

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
    .card { background: #1A1F2E; border-radius: 16px; padding: 30px; margin-bottom: 20px; }
    h1 { color: #00D4FF; font-size: 24px; margin: 0 0 20px 0; }
    p { color: #E0E0E0; line-height: 1.6; margin: 0 0 15px 0; }
    .button { display: inline-block; background: linear-gradient(135deg, #00D4FF 0%, #00A3CC 100%); color: #0A0E1A !important; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
    ul { color: #E0E0E0; line-height: 1.8; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <div class="logo-text">IconsAI</div>
    </div>
    <div class="card">
      <h1>Bem-vindo(a) ao IconsAI!</h1>
      <p>Olá <strong>${sanitizeHtml(firstName)}</strong>,</p>
      <p>Sua conta foi criada com sucesso! Agora você tem acesso a todos os recursos da plataforma IconsAI.</p>
      <p>Com o IconsAI você pode:</p>
      <ul>
        <li>Conversar com assistentes de IA especializados</li>
        <li>Obter informações sobre sua cidade e região</li>
        <li>Acompanhar dados de saúde e bem-estar</li>
        <li>Explorar ideias e soluções criativas</li>
      </ul>
      <p style="text-align: center;">
        <a href="${baseUrl}/login" class="button">Acessar Plataforma</a>
      </p>
    </div>
    <div class="footer">
      <p>&copy; 2026 IconsAI. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>
`;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "IconsAI <noreply@iconsai.com.br>",
        to: [email],
        subject: "Bem-vindo ao IconsAI!",
        html: htmlBody,
      }),
    });
    console.log("✅ [WELCOME] Email enviado");
  } catch (error) {
    console.error("⚠️ [WELCOME] Email falhou:", error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  console.log(`\n=== COMPLETE-REGISTRATION v${FUNCTION_VERSION} START ===`);
  console.log(`[TIMESTAMP] ${new Date().toISOString()}`);

  const respond = (status: number, payload: Record<string, unknown>) => {
    const body = { ...payload, version: FUNCTION_VERSION };
    console.log(`[RESPONSE] ${JSON.stringify(body)}`);
    console.log(`=== COMPLETE-REGISTRATION v${FUNCTION_VERSION} END ===\n`);
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  };

  try {
    const body: CompleteRegistrationRequest = await req.json();

    // Validação
    if (!body.inviteId || !body.password) {
      return respond(400, {
        success: false,
        error: "inviteId e password são obrigatórios",
      });
    }

    // Validar senha
    const passwordValidation = validatePassword(body.password);
    if (!passwordValidation.valid) {
      return respond(400, {
        success: false,
        error: passwordValidation.error,
      });
    }

    // Confirmar senha se fornecida
    if (body.confirmPassword && body.password !== body.confirmPassword) {
      return respond(400, {
        success: false,
        error: "As senhas não conferem",
      });
    }

    console.log(`📋 [INVITE] ${body.inviteId}`);

    const supabase = getSupabaseAdmin();

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

    if (invite.status !== "verified") {
      return respond(400, { success: false, error: "Convite não foi verificado. Complete a verificação primeiro." });
    }

    if (new Date(invite.expires_at) < new Date()) {
      return respond(400, { success: false, error: "Convite expirado" });
    }

    console.log(`📧 [EMAIL] ${invite.email}`);
    console.log(`👤 [NAME] ${invite.first_name} ${invite.last_name || ""}`);
    console.log(`👑 [ROLE] ${invite.role}`);

    // Verificar se já existe usuário com este email
    const { data: existingUser } = await supabase
      .from("platform_users")
      .select("id")
      .eq("email", invite.email)
      .single();

    if (existingUser) {
      return respond(400, { success: false, error: "Já existe um usuário com este email" });
    }

    // Criar auth.user
    console.log("🔐 [AUTH] Criando usuário...");
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: invite.email,
      password: body.password,
      email_confirm: true, // Já confirmado via código
      user_metadata: {
        first_name: invite.first_name,
        last_name: invite.last_name,
        phone: invite.phone,
      },
      app_metadata: {
        role: invite.role,
        institution_id: invite.institution_id,
      },
    });

    if (authError) {
      console.error("❌ [AUTH] Error creating user:", authError);
      return respond(500, {
        success: false,
        error: `Erro ao criar usuário: ${authError.message}`,
      });
    }

    console.log(`✅ [AUTH] User created: ${authUser.user.id}`);

    // Criar platform_user
    console.log("👤 [PLATFORM] Criando perfil...");
    const { data: platformUser, error: platformError } = await supabase
      .from("platform_users")
      .insert({
        auth_user_id: authUser.user.id,
        first_name: invite.first_name,
        last_name: invite.last_name,
        email: invite.email,
        phone: invite.phone,
        institution_id: invite.institution_id,
        department_id: invite.department_id,
        role: invite.role,
        status: "active",
        email_verified: true,
        email_verified_at: invite.verified_at,
        phone_verified: true,
        phone_verified_at: invite.verified_at,
        password_set: true,
        password_set_at: new Date().toISOString(),
        activated_at: new Date().toISOString(),
        invited_by: invite.created_by,
      })
      .select()
      .single();

    if (platformError) {
      console.error("❌ [PLATFORM] Error creating profile:", platformError);

      // Tentar deletar auth.user para não deixar órfão
      await supabase.auth.admin.deleteUser(authUser.user.id);

      return respond(500, {
        success: false,
        error: `Erro ao criar perfil: ${platformError.message}`,
      });
    }

    console.log(`✅ [PLATFORM] Profile created: ${platformUser.id}`);

    // Marcar convite como completo
    await supabase.rpc("complete_invite", {
      p_invite_id: body.inviteId,
      p_platform_user_id: platformUser.id,
    });
    console.log(`✅ [INVITE] Marked as completed`);

    // Enviar boas-vindas em background
    Promise.all([
      sendWelcomeWhatsApp(invite.phone, invite.first_name),
      sendWelcomeEmail(invite.email, invite.first_name),
    ]).catch(console.error);

    // Gerar sessão para login automático
    console.log("🔑 [SESSION] Gerando token...");
    const { data: session, error: sessionError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: invite.email,
    });

    if (sessionError) {
      console.warn("⚠️ [SESSION] Could not generate magic link:", sessionError);
    }

    // Determinar URL de redirecionamento baseado no role
    const baseUrl = Deno.env.get("APP_BASE_URL") || "https://app.iconsai.com.br";
    let redirectUrl = `${baseUrl}/pwa`;
    if (invite.role === "admin" || invite.role === "superadmin") {
      redirectUrl = `${baseUrl}/admin`;
    }

    return respond(200, {
      success: true,
      message: "Cadastro concluído com sucesso!",
      user: {
        id: platformUser.id,
        authId: authUser.user.id,
        email: platformUser.email,
        firstName: platformUser.first_name,
        lastName: platformUser.last_name,
        role: platformUser.role,
        institutionId: platformUser.institution_id,
      },
      redirectUrl,
      // NOTE: loginLink removed for security - magic link should not be exposed in HTTP response
      // Users should login via the standard login page at redirectUrl
    });

  } catch (error) {
    console.error("❌ [FATAL]", error);
    return respond(500, {
      success: false,
      error: error instanceof Error ? error.message : "Erro interno",
    });
  }
});
