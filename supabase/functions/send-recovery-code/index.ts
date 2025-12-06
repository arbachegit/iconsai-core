import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getEmailTemplate(code: string): string {
  const currentYear = new Date().getFullYear();
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 40px; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; padding: 32px;">
    <h2 style="color: #60a5fa; margin: 0 0 24px 0; font-size: 24px;">Health AI App</h2>
    <hr style="border: none; border-top: 1px solid #334155; margin: 0 0 24px 0;">
    
    <h3 style="color: #f8fafc; margin: 0 0 16px 0; font-size: 18px;">Recuperação de Senha</h3>
    <p style="color: #cbd5e1; margin: 0 0 24px 0; line-height: 1.6;">
      Você solicitou a recuperação de senha. Use o código abaixo para continuar:
    </p>
    
    <div style="background-color: #0f172a; padding: 24px; text-align: center; border-radius: 8px; margin: 0 0 24px 0; border: 1px solid #334155;">
      <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #60a5fa; font-family: monospace;">
        ${code}
      </span>
    </div>
    
    <p style="color: #94a3b8; font-size: 14px; margin: 0 0 8px 0;">
      ⏱️ Este código expira em <strong>15 minutos</strong>.
    </p>
    <p style="color: #94a3b8; font-size: 14px; margin: 0 0 24px 0;">
      Se você não solicitou esta recuperação, ignore este email.
    </p>
    
    <hr style="border: none; border-top: 1px solid #334155; margin: 0 0 16px 0;">
    <p style="color: #64748b; font-size: 12px; margin: 0; text-align: center;">
      © ${currentYear} Health AI App. Todos os direitos reservados.
    </p>
  </div>
</body>
</html>
  `.trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({ error: "Email é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user exists
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) {
      console.error("Error listing users:", userError);
      throw new Error("Erro ao verificar usuário");
    }

    const userExists = userData.users.some(u => u.email?.toLowerCase() === email.toLowerCase());
    if (!userExists) {
      console.log(`User not found for email: ${email}`);
      return new Response(
        JSON.stringify({ error: "email_not_found", message: "Email não registrado no sistema" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting: check for recent codes (max 3 per 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: recentCodes, error: recentError } = await supabase
      .from("password_recovery_codes")
      .select("id")
      .eq("email", email.toLowerCase())
      .gte("created_at", fifteenMinutesAgo);

    if (recentError) {
      console.error("Error checking recent codes:", recentError);
    }

    if (recentCodes && recentCodes.length >= 3) {
      return new Response(
        JSON.stringify({ error: "Muitas tentativas. Aguarde 15 minutos." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Invalidate previous unused codes
    const { error: invalidateError } = await supabase
      .from("password_recovery_codes")
      .update({ is_used: true })
      .eq("email", email.toLowerCase())
      .eq("is_used", false);

    if (invalidateError) {
      console.error("Error invalidating old codes:", invalidateError);
    }

    // Generate new code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Save code to database
    const { error: insertError } = await supabase
      .from("password_recovery_codes")
      .insert({
        email: email.toLowerCase(),
        code,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error("Error inserting code:", insertError);
      throw new Error("Erro ao gerar código");
    }

    // Send email via Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Health AI App <noreply@knowyou.app>",
        to: [email],
        subject: "Código de Recuperação de Senha - Health AI App",
        html: getEmailTemplate(code),
      }),
    });

    const emailResult = await emailResponse.json();
    console.log("Recovery code email sent:", emailResult);

    if (!emailResponse.ok) {
      console.error("Resend API error:", emailResult);
      throw new Error("Erro ao enviar email");
    }

    // Log activity
    await supabase.from("user_activity_logs").insert({
      user_email: email,
      action: "Solicitou código de recuperação de senha",
      action_category: "PASSWORD_RECOVERY",
      details: { code_sent: true },
    });

    return new Response(
      JSON.stringify({ success: true, message: "Código enviado para seu email" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-recovery-code:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
