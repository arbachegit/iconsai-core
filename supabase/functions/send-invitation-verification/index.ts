import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendVerificationRequest {
  token: string;
  phone: string;
  addressCep: string;
  addressStreet: string;
  addressNumber: string;
  addressComplement?: string;
  addressNeighborhood: string;
  addressCity: string;
  addressState: string;
  password: string;
  verificationMethod: "email" | "whatsapp";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      token,
      phone,
      addressCep,
      addressStreet,
      addressNumber,
      addressComplement,
      addressNeighborhood,
      addressCity,
      addressState,
      password,
      verificationMethod
    }: SendVerificationRequest = await req.json();

    // Debug log at start
    console.log("[Verification] Starting verification process:", {
      token: token ? token.substring(0, 8) + "..." : "N/A",
      verificationMethod,
      phone: phone ? phone.substring(0, 6) + "****" : "N/A"
    });

    // Validate token
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

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Este convite expirou" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already completed
    if (invitation.status === "completed") {
      return new Response(
        JSON.stringify({ error: "Este convite já foi utilizado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      return new Response(
        JSON.stringify({ error: "A senha deve ter pelo menos 8 caracteres, uma letra maiúscula, uma minúscula e um número" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate phone for WhatsApp verification
    if (verificationMethod === "whatsapp" && !phone) {
      return new Response(
        JSON.stringify({ error: "Telefone é obrigatório para verificação via WhatsApp" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set code expiration to 2 minutes
    const codeExpiresAt = new Date();
    codeExpiresAt.setMinutes(codeExpiresAt.getMinutes() + 2);

    // Update invitation with form data and verification code
    const { error: updateError } = await supabase
      .from("user_invitations")
      .update({
        phone,
        address_cep: addressCep,
        address_street: addressStreet,
        address_number: addressNumber,
        address_complement: addressComplement || null,
        address_neighborhood: addressNeighborhood,
        address_city: addressCity,
        address_state: addressState,
        verification_code: verificationCode,
        verification_method: verificationMethod,
        verification_code_expires_at: codeExpiresAt.toISOString(),
        verification_attempts: 0,
        status: "form_submitted",
        updated_at: new Date().toISOString()
      })
      .eq("token", token);

    if (updateError) {
      console.error("Error updating invitation:", updateError);
      return new Response(
        JSON.stringify({ error: "Erro ao atualizar dados" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store password temporarily (will be used when creating auth user)
    // We store it hashed in a separate secure way - in this case we'll pass it in verify step
    // For now, we'll store it encrypted or use session

    // Send verification code via chosen method
    console.log("[Verification] Sending code via:", verificationMethod, "to:", 
      verificationMethod === "email" ? invitation.email : phone?.substring(0, 6) + "****"
    );

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
                <h1 style="margin:0;">🔐 Código de Verificação</h1>
              </div>
              <div class="content">
                <p>Olá <strong>${invitation.name}</strong>,</p>
                <p>Use o código abaixo para completar seu cadastro:</p>
                
                <div class="code">${verificationCode}</div>
                
                <p class="warning">⏰ Este código expira em <strong>2 minutos</strong>.</p>
              </div>
              <div class="footer">
                <p>Plataforma KnowYOU &copy; ${new Date().getFullYear()}</p>
                <p>Se você não solicitou este código, ignore este email.</p>
              </div>
            </div>
          </body>
          </html>
        `;

        await supabase.functions.invoke("send-email", {
          body: {
            to: invitation.email,
            subject: "🔐 Código de Verificação - KnowYOU",
            body: emailHtml
          }
        });

        console.log("Verification code sent via email to:", invitation.email);
      } catch (emailError: any) {
        console.error("[Verification] Error sending email:", {
          error: emailError.message,
          stack: emailError.stack,
          email: invitation.email,
          method: "email"
        });
        return new Response(
          JSON.stringify({ 
            error: `Erro ao enviar código por email: ${emailError.message}`,
            details: "Verifique se RESEND_API_KEY está configurado e o domínio verificado"
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (verificationMethod === "whatsapp") {
      try {
        const whatsappMessage = `🔐 *Código de Verificação*\n\nSeu código para completar o cadastro na Plataforma KnowYOU:\n\n*${verificationCode}*\n\n⏰ Este código expira em 2 minutos.`;

        console.log(`[Verification] Sending WhatsApp to: ${phone.slice(0, 6)}***`);
        
        const { data: whatsappResult, error: whatsappError } = await supabase.functions.invoke("send-whatsapp", {
          body: {
            phoneNumber: phone,
            message: whatsappMessage,
            eventType: "verification_code"
          }
        });

        if (whatsappError) {
          console.error("[Verification] WhatsApp function error:", whatsappError);
          throw whatsappError;
        }

        if (whatsappResult?.error) {
          console.error("[Verification] WhatsApp API error:", whatsappResult.error);
          return new Response(
            JSON.stringify({ error: whatsappResult.error }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log("[Verification] WhatsApp sent successfully:", whatsappResult?.sid);
      } catch (whatsappError: any) {
        console.error("[Verification] Error sending WhatsApp:", whatsappError);
        return new Response(
          JSON.stringify({ 
            error: whatsappError?.message || "Erro ao enviar código por WhatsApp. Tente por email." 
          }),
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
        const address = `${addressStreet}, ${addressNumber}${addressComplement ? ` - ${addressComplement}` : ''}, ${addressNeighborhood}, ${addressCity}/${addressState}`;
        const adminMessage = `📝 *Formulário Preenchido*\n\n👤 ${invitation.name}\n📧 ${invitation.email}\n📱 ${phone}\n📍 ${address}\n\n🔐 Verificação via: ${verificationMethod === 'email' ? 'Email' : 'WhatsApp'}`;

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
      event_type: "user_invitation_form_submitted",
      channel: verificationMethod,
      recipient: verificationMethod === "email" ? invitation.email : phone,
      subject: "Código de verificação enviado",
      message_body: `Código enviado para ${invitation.name} via ${verificationMethod}`,
      status: "success",
      metadata: { token, verificationMethod }
    });

    // Mask the destination for privacy
    const maskedDestination = verificationMethod === "email"
      ? `***@${invitation.email.split("@")[1]}`
      : `****${phone.slice(-4)}`;

    return new Response(
      JSON.stringify({
        success: true,
        maskedDestination,
        expiresAt: codeExpiresAt.toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-invitation-verification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
