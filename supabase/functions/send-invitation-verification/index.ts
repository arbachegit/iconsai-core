// ============================================
// VERSAO: 3.0.0 | DEPLOY: 2026-01-03
// MIGRACAO: Templates Twilio - Corrige erro 63016
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

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
  verificationMethod: "email" | "sms" | "whatsapp";
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("=== send-invitation-verification START ===");
  console.log("Timestamp:", new Date().toISOString());

  try {
    // Step 1: Validate environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("❌ Missing environment variables:", {
        hasUrl: !!supabaseUrl,
        hasServiceKey: !!supabaseServiceKey
      });
      return new Response(
        JSON.stringify({ error: "Configuração do servidor incompleta" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log("✅ Environment variables validated");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 2: Parse request body with dedicated error handling
    let body: SendVerificationRequest;
    try {
      const rawBody = await req.text();
      console.log("📦 Raw body received, length:", rawBody.length);
      
      body = JSON.parse(rawBody);
      console.log("✅ Request body parsed:", {
        token: body.token ? body.token.substring(0, 8) + "..." : "MISSING",
        verificationMethod: body.verificationMethod || "MISSING",
        phone: body.phone ? body.phone.substring(0, 6) + "****" : "MISSING",
        hasPassword: !!body.password,
        hasAddress: !!(body.addressCep && body.addressStreet)
      });
    } catch (parseError: any) {
      console.error("❌ Error parsing request body:", parseError.message);
      return new Response(
        JSON.stringify({ success: false, error_code: "VALIDATION_ERROR", error: "Corpo da requisição inválido", details: parseError.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
    } = body;

    // Step 3: Validate required fields - retornar HTTP 200 com success: false
    if (!token) {
      console.error("❌ Missing token");
      return new Response(
        JSON.stringify({ success: false, error_code: "VALIDATION_ERROR", error: "Token é obrigatório" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!verificationMethod || !["email", "sms", "whatsapp"].includes(verificationMethod)) {
      console.error("❌ Invalid verification method:", verificationMethod);
      return new Response(
        JSON.stringify({ success: false, error_code: "VALIDATION_ERROR", error: "Método de verificação inválido. Use: email, sms ou whatsapp" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 4: Fetch invitation
    console.log("🔍 Fetching invitation with token:", token.substring(0, 8) + "...");
    const { data: invitation, error: fetchError } = await supabase
      .from("user_invitations")
      .select("*")
      .eq("token", token)
      .single();

    if (fetchError) {
      console.error("❌ Error fetching invitation:", fetchError);
      return new Response(
        JSON.stringify({ success: false, error_code: "INTERNAL_ERROR", error: "Erro ao buscar convite: " + fetchError.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!invitation) {
      console.error("❌ Invitation not found for token");
      return new Response(
        JSON.stringify({ success: false, error_code: "INVALID_TOKEN", error: "Convite não encontrado" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Invitation found:", {
      id: invitation.id,
      name: invitation.name,
      email: invitation.email,
      status: invitation.status,
      expires_at: invitation.expires_at
    });

    // Step 5: Validate invitation state
    if (invitation.status === "completed") {
      console.error("❌ Invitation already completed");
      return new Response(
        JSON.stringify({ success: false, error_code: "INVITE_USED", error: "Este convite já foi utilizado" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (new Date(invitation.expires_at) < new Date()) {
      console.error("❌ Invitation expired:", invitation.expires_at);
      return new Response(
        JSON.stringify({ success: false, error_code: "INVITE_EXPIRED", error: "Este convite expirou" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 6: Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!password || !passwordRegex.test(password)) {
      console.error("❌ Invalid password format");
      return new Response(
        JSON.stringify({ success: false, error_code: "VALIDATION_ERROR", error: "A senha deve ter pelo menos 8 caracteres, uma letra maiúscula, uma minúscula e um número" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log("✅ Password validated");

    // Step 7: Validate phone for WhatsApp/SMS
    if ((verificationMethod === "whatsapp" || verificationMethod === "sms") && !phone) {
      console.error("❌ Phone required for", verificationMethod, "but not provided");
      return new Response(
        JSON.stringify({ success: false, error_code: "PHONE_REQUIRED", error: `Telefone é obrigatório para verificação via ${verificationMethod === 'whatsapp' ? 'WhatsApp' : 'SMS'}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 8: Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const codeExpiresAt = new Date();
    codeExpiresAt.setMinutes(codeExpiresAt.getMinutes() + 2);
    console.log("🔑 Generated verification code, expires at:", codeExpiresAt.toISOString());

    // Step 9: Update invitation with form data
    console.log("💾 Updating invitation with form data...");
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
      console.error("❌ Error updating invitation:", updateError);
      return new Response(
        JSON.stringify({ error: "Erro ao salvar dados: " + updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log("✅ Invitation updated successfully");

    // Step 10: Send verification code
    let sendResult: { success: boolean; error: string; method: string } = { success: false, error: "", method: verificationMethod };

    if (verificationMethod === "email") {
      console.log("📧 Sending verification code via EMAIL to:", invitation.email);
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

        const { data: emailData, error: emailError } = await supabase.functions.invoke("send-email", {
          body: {
            to: invitation.email,
            subject: "🔐 Código de Verificação - KnowYOU",
            body: emailHtml
          }
        });

        if (emailError) {
          console.error("❌ Email function returned error:", emailError);
          sendResult = { success: false, error: emailError.message || "Erro na função de email", method: "email" };
        } else if (emailData?.error) {
          console.error("❌ Email API returned error:", emailData.error);
          sendResult = { success: false, error: emailData.error, method: "email" };
        } else {
          console.log("✅ Email sent successfully");
          sendResult = { success: true, error: "", method: "email" };
        }
      } catch (emailCatch: any) {
        console.error("❌ Exception sending email:", emailCatch);
        sendResult = { success: false, error: emailCatch.message || "Exceção ao enviar email", method: "email" };
      }
    } else if (verificationMethod === "sms") {
      console.log("📱 Sending verification code via SMS to:", phone.substring(0, 6) + "****");
      try {
        const smsMessage = `KnowYOU - Código: ${verificationCode}. Expira em 2 min.`;

        const { data: smsData, error: smsError } = await supabase.functions.invoke("send-sms", {
          body: {
            phoneNumber: phone,
            message: smsMessage,
            eventType: "verification_code"
          }
        });

        if (smsError) {
          console.error("❌ SMS function returned error:", smsError);
          sendResult = { success: false, error: smsError.message || "Erro na função de SMS", method: "sms" };
        } else if (smsData?.error) {
          console.error("❌ SMS API returned error:", smsData.error);
          sendResult = { success: false, error: smsData.error, method: "sms" };
        } else {
          console.log("✅ SMS sent successfully, SID:", smsData?.sid);
          sendResult = { success: true, error: "", method: "sms" };
        }
      } catch (smsCatch: any) {
        console.error("❌ Exception sending SMS:", smsCatch);
        sendResult = { success: false, error: smsCatch.message || "Exceção ao enviar SMS", method: "sms" };
      }
    } else if (verificationMethod === "whatsapp") {
      console.log("💬 [v3.0] Sending verification code via send-pwa-notification with OTP template...");
      
      try {
        // Use send-pwa-notification with OTP template
        const { data: notifData, error: notifError } = await supabase.functions.invoke("send-pwa-notification", {
          body: {
            to: phone,
            template: "otp",
            variables: { "1": verificationCode },
            channel: "whatsapp"
          }
        });

        console.log("📨 send-pwa-notification response:", JSON.stringify(notifData));

        if (notifError) {
          console.log("⚠️ send-pwa-notification error:", notifError);
          sendResult = { success: false, error: notifError.message || "Erro na função de notificação", method: "whatsapp" };
        } else if (!notifData?.success) {
          console.log("⚠️ send-pwa-notification failed:", notifData?.error);
          sendResult = { success: false, error: notifData?.error || "Erro desconhecido", method: notifData?.channel || "whatsapp" };
        } else {
          console.log("✅ Notification sent successfully via", notifData?.channel);
          sendResult = { success: true, error: "", method: notifData?.channel || "whatsapp" };
        }
      } catch (notifCatch: any) {
        console.log("⚠️ Exception sending notification:", notifCatch.message);
        sendResult = { success: false, error: notifCatch.message || "Exceção ao enviar notificação", method: "whatsapp" };
      }

      // Fallback para SMS direto se send-pwa-notification falhou
      if (!sendResult.success) {
        console.log("🔄 Notification failed, trying direct SMS fallback...");
        try {
          const smsMessage = `KnowYOU - Código: ${verificationCode}. Expira em 2 min.`;

          const { data: smsData, error: smsError } = await supabase.functions.invoke("send-sms", {
            body: {
              phoneNumber: phone,
              message: smsMessage,
              eventType: "verification_code"
            }
          });

          if (smsError) {
            console.error("❌ SMS fallback function error:", smsError);
          } else if (smsData?.error) {
            console.error("❌ SMS fallback API error:", smsData.error);
          } else {
            console.log("✅ SMS fallback sent successfully, SID:", smsData?.sid);
            sendResult = { success: true, error: "", method: "sms_fallback" };
          }
        } catch (smsFallbackCatch: any) {
          console.error("❌ SMS fallback exception:", smsFallbackCatch.message);
        }
      }
    }

    // Step 11: Handle send failure
    if (!sendResult.success) {
      console.error("❌ Failed to send verification code:", sendResult);
      
      // Detectar tipo de erro do provedor
      const errorCode = sendResult.error?.toLowerCase().includes("window") || sendResult.error?.toLowerCase().includes("24")
        ? "WHATSAPP_WINDOW_EXPIRED"
        : sendResult.method === "whatsapp" ? "TWILIO_ERROR" : "EMAIL_FAILED";
      
      return new Response(
        JSON.stringify({
          success: false,
          error_code: errorCode,
          error: `Erro ao enviar código: ${sendResult.error}`,
          details: "O código foi gerado mas não foi possível enviar. Tente outro método de verificação."
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 12: Notify Super Admin (via SMS, not WhatsApp)
    try {
      const { data: settings } = await supabase
        .from("admin_settings")
        .select("whatsapp_target_phone, whatsapp_global_enabled")
        .single();

      if (settings?.whatsapp_global_enabled && settings?.whatsapp_target_phone) {
        // Use SMS for admin notification (freeform allowed)
        const adminSms = `KnowYOU: Formulário preenchido - ${invitation.name}. Verificação via ${sendResult.method}.`;

        await supabase.functions.invoke("send-sms", {
          body: {
            phoneNumber: settings.whatsapp_target_phone,
            message: adminSms
          }
        });
        console.log("✅ Admin notified via SMS");
      }
    } catch (notifyError) {
      console.log("⚠️ Error notifying admin (non-critical):", notifyError);
    }

    // Step 13: Log the event
    try {
      await supabase.from("notification_logs").insert({
        event_type: "user_invitation_form_submitted",
        channel: sendResult.method,
        recipient: verificationMethod === "email" ? invitation.email : phone,
        subject: "Código de verificação enviado",
        message_body: `Código enviado para ${invitation.name} via ${sendResult.method}`,
        status: "success",
        metadata: { token: token.substring(0, 8), verificationMethod, actualMethod: sendResult.method }
      });
      console.log("✅ Event logged to notification_logs");
    } catch (logError) {
      console.log("⚠️ Error logging event (non-critical):", logError);
    }

    // Step 14: Prepare response
    const maskedDestination = verificationMethod === "email"
      ? `***@${invitation.email.split("@")[1]}`
      : `****${phone.slice(-4)}`;

    console.log("=== send-invitation-verification SUCCESS ===");
    console.log("Response:", { maskedDestination, method: sendResult.method });

    return new Response(
      JSON.stringify({
        success: true,
        maskedDestination,
        expiresAt: codeExpiresAt.toISOString(),
        method: sendResult.method
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("=== send-invitation-verification FATAL ERROR ===");
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);
    
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
