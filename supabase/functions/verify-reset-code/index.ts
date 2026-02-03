// ============================================
// VERSAO: 1.0.0 | DEPLOY: 2026-02-02
// Verificar código e aplicar nova senha
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

  console.log("=== VERIFY-RESET-CODE START ===");

  try {
    const { token, code } = await req.json();

    if (!token || !code) {
      return new Response(
        JSON.stringify({ success: false, error: "Token e código são obrigatórios" }),
        { status: 400, headers: { ...dynamicCorsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate code format
    if (!/^\d{6}$/.test(code)) {
      return new Response(
        JSON.stringify({ success: false, error: "Código deve ter 6 dígitos" }),
        { status: 400, headers: { ...dynamicCorsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify token and code
    const { data: tokenData, error: tokenError } = await supabase
      .from("password_reset_tokens")
      .select("*")
      .eq("token", token)
      .eq("used", false)
      .eq("step", "awaiting_code")
      .single();

    if (tokenError || !tokenData) {
      console.error("Token not found or invalid step:", tokenError);
      return new Response(
        JSON.stringify({ success: false, error: "Token inválido ou sessão expirada" }),
        { status: 400, headers: { ...dynamicCorsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check code expiration
    if (new Date(tokenData.code_expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ success: false, error: "Código expirado. Solicite um novo código." }),
        { status: 400, headers: { ...dynamicCorsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify code
    if (tokenData.verification_code !== code) {
      // Increment attempts
      const attempts = (tokenData.code_attempts || 0) + 1;

      await supabase
        .from("password_reset_tokens")
        .update({ code_attempts: attempts })
        .eq("id", tokenData.id);

      if (attempts >= 5) {
        // Mark token as used (block further attempts)
        await supabase
          .from("password_reset_tokens")
          .update({ used: true })
          .eq("id", tokenData.id);

        return new Response(
          JSON.stringify({ success: false, error: "Muitas tentativas. Solicite um novo link." }),
          { status: 400, headers: { ...dynamicCorsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: `Código incorreto. ${5 - attempts} tentativas restantes.` }),
        { status: 400, headers: { ...dynamicCorsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Code is correct - apply password change
    const newPassword = tokenData.pending_password;

    if (!newPassword) {
      return new Response(
        JSON.stringify({ success: false, error: "Senha pendente não encontrada. Tente novamente." }),
        { status: 400, headers: { ...dynamicCorsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update user password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      tokenData.user_id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      throw new Error("Erro ao atualizar senha");
    }

    // Mark token as used
    await supabase
      .from("password_reset_tokens")
      .update({
        used: true,
        used_at: new Date().toISOString(),
        step: "completed",
      })
      .eq("id", tokenData.id);

    // Send confirmation email
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY) {
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Senha Alterada - IconsAI</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0, 212, 255, 0.1);">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; border-bottom: 1px solid rgba(16, 185, 129, 0.3);">
              <div style="width: 60px; height: 60px; margin: 0 auto 20px; background: linear-gradient(135deg, #10B981, #059669); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 24px;">✅</span>
              </div>
              <h1 style="color: #ffffff; font-size: 24px; margin: 0; font-weight: 600;">Senha Alterada com Sucesso!</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #e0e0e0; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Olá,
              </p>
              <p style="color: #e0e0e0; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Sua senha foi alterada com sucesso. Você já pode fazer login com sua nova senha.
              </p>

              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="https://core.iconsai.ai/admin/login" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #10B981, #059669); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);">
                      Fazer Login
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #888888; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; text-align: center;">
                Se você não realizou esta alteração, entre em contato com o suporte imediatamente.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: rgba(0, 0, 0, 0.3); border-top: 1px solid rgba(16, 185, 129, 0.2);">
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

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "IconsAI <noreply@iconsai.ai>",
          to: [tokenData.email],
          subject: "Senha alterada com sucesso - IconsAI",
          html: emailHtml,
        }),
      });
    }

    console.log("Password reset completed for user:", tokenData.user_id);
    console.log("=== VERIFY-RESET-CODE END ===");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Senha alterada com sucesso! Você já pode fazer login."
      }),
      { status: 200, headers: { ...dynamicCorsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("=== VERIFY-RESET-CODE ERROR ===", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Erro interno" }),
      { status: 500, headers: { ...dynamicCorsHeaders, "Content-Type": "application/json" } }
    );
  }
});
