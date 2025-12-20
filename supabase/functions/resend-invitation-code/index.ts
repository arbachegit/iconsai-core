import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResendCodeRequest {
  token: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { token }: ResendCodeRequest = await req.json();

    // Fetch invitation
    const { data: invitation, error: fetchError } = await supabase
      .from("user_invitations")
      .select("*")
      .eq("token", token)
      .single();

    if (fetchError || !invitation) {
      return new Response(
        JSON.stringify({ error: "Convite não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already completed
    if (invitation.status === "completed") {
      return new Response(
        JSON.stringify({ error: "Este convite já foi utilizado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check rate limit (max 5 resends per hour)
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    if (invitation.last_resend_at && new Date(invitation.last_resend_at) > oneHourAgo) {
      if (invitation.resend_count >= 5) {
        return new Response(
          JSON.stringify({ error: "Limite de reenvios atingido. Tente novamente em 1 hora." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // Reset counter if more than 1 hour has passed
      invitation.resend_count = 0;
    }

    // Generate new 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set code expiration to 2 minutes
    const codeExpiresAt = new Date();
    codeExpiresAt.setMinutes(codeExpiresAt.getMinutes() + 2);

    // Update invitation with new code
    const { error: updateError } = await supabase
      .from("user_invitations")
      .update({
        verification_code: verificationCode,
        verification_code_expires_at: codeExpiresAt.toISOString(),
        verification_attempts: 0,
        resend_count: invitation.resend_count + 1,
        last_resend_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("token", token);

    if (updateError) {
      console.error("Error updating invitation:", updateError);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar novo código" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send code via previously chosen method
    const verificationMethod = invitation.verification_method;

    if (verificationMethod === "email") {
      try {
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; text-align: center; }
              .code { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #6366f1; background: #fff; padding: 20px 30px; border-radius: 8px; margin: 20px 0; display: inline-block; }
              .warning { color: #dc2626; font-size: 14px; margin-top: 20px; }
              .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin:0;">🔐 Novo Código de Verificação</h1>
              </div>
              <div class="content">
                <p>Olá <strong>${invitation.name}</strong>,</p>
                <p>Aqui está seu novo código de verificação:</p>
                
                <div class="code">${verificationCode}</div>
                
                <p class="warning">⏰ Este código expira em <strong>2 minutos</strong>.</p>
              </div>
              <div class="footer">
                <p>Plataforma KnowYOU Health &copy; ${new Date().getFullYear()}</p>
              </div>
            </div>
          </body>
          </html>
        `;

        await supabase.functions.invoke("send-email", {
          body: {
            to: invitation.email,
            subject: "🔐 Novo Código de Verificação - KnowYOU Health",
            body: emailHtml
          }
        });

        console.log("Resent verification code via email to:", invitation.email);
      } catch (emailError) {
        console.error("Error resending verification email:", emailError);
        return new Response(
          JSON.stringify({ error: "Erro ao reenviar código por email" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (verificationMethod === "whatsapp" && invitation.phone) {
      try {
        const whatsappMessage = `🔐 *Novo Código de Verificação*\n\nSeu código para completar o cadastro:\n\n*${verificationCode}*\n\n⏰ Este código expira em 2 minutos.`;

        await supabase.functions.invoke("send-whatsapp", {
          body: {
            phoneNumber: invitation.phone,
            message: whatsappMessage
          }
        });

        console.log("Resent verification code via WhatsApp to:", invitation.phone);
      } catch (whatsappError) {
        console.error("Error resending verification WhatsApp:", whatsappError);
        return new Response(
          JSON.stringify({ error: "Erro ao reenviar código por WhatsApp" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Notify Super Admin
    try {
      const { data: settings } = await supabase
        .from("admin_settings")
        .select("whatsapp_target_phone, whatsapp_global_enabled")
        .single();

      if (settings?.whatsapp_global_enabled && settings?.whatsapp_target_phone) {
        const methodLabel = verificationMethod === 'email' ? 'Email' : 'WhatsApp';
        const adminMessage = `🔄 *Reenvio de Código*\n\n👤 ${invitation.name}\n📧 ${invitation.email}\n\n📤 Reenviado via: ${methodLabel}`;

        await supabase.functions.invoke("send-whatsapp", {
          body: {
            phoneNumber: settings.whatsapp_target_phone,
            message: adminMessage
          }
        });
      }
    } catch (notifyError) {
      console.error("Error notifying admin:", notifyError);
    }

    // Log the event
    await supabase.from("notification_logs").insert({
      event_type: "user_invitation_resend",
      channel: verificationMethod || "system",
      recipient: verificationMethod === "email" ? invitation.email : invitation.phone || invitation.email,
      subject: "Código reenviado",
      message_body: `Código reenviado para ${invitation.name} via ${verificationMethod}`,
      status: "success",
      metadata: { token, verificationMethod, resendCount: invitation.resend_count + 1 }
    });

    // Mask the destination for privacy
    const maskedDestination = verificationMethod === "email"
      ? `***@${invitation.email.split("@")[1]}`
      : `****${(invitation.phone || "").slice(-4)}`;

    return new Response(
      JSON.stringify({
        success: true,
        maskedDestination,
        expiresAt: codeExpiresAt.toISOString(),
        remainingResends: 5 - (invitation.resend_count + 1)
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in resend-invitation-code:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
