// ============================================
// VERSAO: 1.0.0 | DEPLOY: 2026-02-02
// Definir nova senha e enviar código de verificação
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

  console.log("=== SET-NEW-PASSWORD START ===");

  try {
    const { token, newPassword, confirmPassword } = await req.json();

    // Validations
    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: "Token é obrigatório" }),
        { status: 400, headers: { ...dynamicCorsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!newPassword || !confirmPassword) {
      return new Response(
        JSON.stringify({ success: false, error: "Senha e confirmação são obrigatórias" }),
        { status: 400, headers: { ...dynamicCorsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (newPassword !== confirmPassword) {
      return new Response(
        JSON.stringify({ success: false, error: "As senhas não coincidem" }),
        { status: 400, headers: { ...dynamicCorsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Password strength validation
    if (newPassword.length < 8) {
      return new Response(
        JSON.stringify({ success: false, error: "A senha deve ter no mínimo 8 caracteres" }),
        { status: 400, headers: { ...dynamicCorsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);

    if (!hasUppercase || !hasLowercase || !hasNumber) {
      return new Response(
        JSON.stringify({ success: false, error: "A senha deve conter letras maiúsculas, minúsculas e números" }),
        { status: 400, headers: { ...dynamicCorsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify token
    const { data: tokenData, error: tokenError } = await supabase
      .from("password_reset_tokens")
      .select("*")
      .eq("token", token)
      .eq("used", false)
      .single();

    if (tokenError || !tokenData) {
      console.error("Token not found or already used:", tokenError);
      return new Response(
        JSON.stringify({ success: false, error: "Token inválido ou expirado" }),
        { status: 400, headers: { ...dynamicCorsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiration
    if (new Date(tokenData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ success: false, error: "Token expirado. Solicite um novo link." }),
        { status: 400, headers: { ...dynamicCorsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store the new password hash temporarily and the verification code
    const { error: updateError } = await supabase
      .from("password_reset_tokens")
      .update({
        verification_code: verificationCode,
        code_expires_at: codeExpiresAt.toISOString(),
        pending_password: newPassword, // Will be hashed when applied
        step: "awaiting_code",
      })
      .eq("id", tokenData.id);

    if (updateError) {
      console.error("Error updating token:", updateError);
      throw new Error("Erro ao processar solicitação");
    }

    // Send verification code via email
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY não configurada");
    }

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Código de Verificação - IconsAI</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0, 212, 255, 0.1);">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; border-bottom: 1px solid rgba(0, 212, 255, 0.2);">
              <div style="width: 60px; height: 60px; margin: 0 auto 20px; background: linear-gradient(135deg, #10B981, #059669); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 24px;">✉️</span>
              </div>
              <h1 style="color: #ffffff; font-size: 24px; margin: 0; font-weight: 600;">Código de Verificação</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #e0e0e0; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Olá,
              </p>
              <p style="color: #e0e0e0; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Seu código de verificação para redefinir a senha é:
              </p>

              <!-- Code Box -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <div style="display: inline-block; padding: 20px 40px; background: linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(0, 168, 204, 0.1)); border: 2px solid #00D4FF; border-radius: 12px;">
                      <span style="font-size: 36px; font-weight: bold; color: #00D4FF; letter-spacing: 8px; font-family: monospace;">
                        ${verificationCode}
                      </span>
                    </div>
                  </td>
                </tr>
              </table>

              <p style="color: #888888; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; text-align: center;">
                Este código expira em <strong style="color: #10B981;">10 minutos</strong>.
              </p>
              <p style="color: #888888; font-size: 14px; line-height: 1.6; margin: 15px 0 0 0; text-align: center;">
                Se você não solicitou esta alteração, por favor ignore este email e entre em contato com o suporte.
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
        to: [tokenData.email],
        subject: "Código de Verificação - IconsAI",
        html: emailHtml,
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend error:", emailData);
      throw new Error("Erro ao enviar código de verificação");
    }

    console.log("Verification code sent:", emailData.id);
    console.log("=== SET-NEW-PASSWORD END ===");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Código de verificação enviado para seu email!",
        email: tokenData.email.replace(/(.{2})(.*)(@.*)/, "$1***$3") // Mask email
      }),
      { status: 200, headers: { ...dynamicCorsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("=== SET-NEW-PASSWORD ERROR ===", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Erro interno" }),
      { status: 500, headers: { ...dynamicCorsHeaders, "Content-Type": "application/json" } }
    );
  }
});
