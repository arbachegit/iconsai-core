// ============================================
// VERSAO: 1.0.0 | DEPLOY: 2026-02-02
// Solicitar reset de senha - envia link por email
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const origin = req.headers.get("origin");
  const dynamicCorsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: dynamicCorsHeaders });
  }

  console.log("=== REQUEST-PASSWORD-RESET START ===");

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: "Email é obrigatório" }),
        { status: 400, headers: { ...dynamicCorsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ success: false, error: "Email inválido" }),
        { status: 400, headers: { ...dynamicCorsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if user exists
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    const user = userData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
      // Don't reveal if user exists or not for security
      console.log("User not found, but returning success for security");
      return new Response(
        JSON.stringify({ success: true, message: "Se o email existir, você receberá um link de recuperação." }),
        { status: 200, headers: { ...dynamicCorsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate secure token
    const token = crypto.randomUUID() + "-" + crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Store token in database
    const { error: insertError } = await supabase
      .from("password_reset_tokens")
      .insert({
        user_id: user.id,
        email: email.toLowerCase(),
        token: token,
        expires_at: expiresAt.toISOString(),
        used: false,
      });

    if (insertError) {
      console.error("Error storing token:", insertError);
      // If table doesn't exist, create it
      if (insertError.message.includes("does not exist")) {
        console.log("Table doesn't exist, will create via migration");
      }
      throw new Error("Erro ao processar solicitação");
    }

    // Send email via Resend
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY não configurada");
    }

    const resetLink = `https://core.iconsai.ai/reset-password?token=${token}`;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redefinir Senha - IconsAI</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0, 212, 255, 0.1);">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; border-bottom: 1px solid rgba(0, 212, 255, 0.2);">
              <div style="width: 60px; height: 60px; margin: 0 auto 20px; background: linear-gradient(135deg, #00D4FF, #00A8CC); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 24px;">🔐</span>
              </div>
              <h1 style="color: #ffffff; font-size: 24px; margin: 0; font-weight: 600;">Redefinir Senha</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #e0e0e0; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Olá,
              </p>
              <p style="color: #e0e0e0; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Recebemos uma solicitação para redefinir a senha da sua conta IconsAI. Clique no botão abaixo para criar uma nova senha:
              </p>

              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${resetLink}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #00D4FF, #00A8CC); color: #000000; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0, 212, 255, 0.4);">
                      Redefinir Minha Senha
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #888888; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                Este link expira em <strong style="color: #00D4FF;">30 minutos</strong>.
              </p>
              <p style="color: #888888; font-size: 14px; line-height: 1.6; margin: 10px 0 0 0;">
                Se você não solicitou esta redefinição, ignore este email. Sua senha permanecerá inalterada.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: rgba(0, 0, 0, 0.3); border-top: 1px solid rgba(0, 212, 255, 0.2);">
              <p style="color: #666666; font-size: 12px; line-height: 1.5; margin: 0; text-align: center;">
                Este email foi enviado automaticamente pelo sistema IconsAI.<br>
                Por favor, não responda a este email.
              </p>
              <p style="color: #444444; font-size: 11px; margin: 15px 0 0 0; text-align: center;">
                © 2026 IconsAI. Todos os direitos reservados.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "IconsAI <noreply@iconsai.ai>",
        to: [email],
        subject: "Redefinir sua senha - IconsAI",
        html: emailHtml,
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend error:", emailResponse.status, emailData);

      // Handle rate limit
      if (emailResponse.status === 429 || emailData?.message?.includes("rate limit")) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Muitas solicitações. Aguarde alguns minutos e tente novamente."
          }),
          { status: 429, headers: { ...dynamicCorsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Handle domain not verified
      if (emailData?.message?.includes("domain") || emailData?.message?.includes("not verified")) {
        console.error("Domain not verified for iconsai.ai");
        return new Response(
          JSON.stringify({
            success: false,
            error: "Erro de configuração de email. Contate o suporte."
          }),
          { status: 500, headers: { ...dynamicCorsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(emailData?.message || "Erro ao enviar email");
    }

    console.log("Password reset email sent:", emailData.id);
    console.log("=== REQUEST-PASSWORD-RESET END ===");

    return new Response(
      JSON.stringify({ success: true, message: "Email de recuperação enviado com sucesso!" }),
      { status: 200, headers: { ...dynamicCorsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("=== REQUEST-PASSWORD-RESET ERROR ===", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Erro interno" }),
      { status: 500, headers: { ...dynamicCorsHeaders, "Content-Type": "application/json" } }
    );
  }
});
