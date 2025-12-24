import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResendWelcomeRequest {
  registrationId: string;
  channel?: 'email' | 'whatsapp' | 'both';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header to verify admin
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify admin user
    const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !adminUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", adminUser.id)
      .in("role", ["admin", "superadmin"])
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { registrationId, channel = 'email' }: ResendWelcomeRequest = await req.json();

    if (!registrationId) {
      return new Response(
        JSON.stringify({ error: "Registration ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get registration
    const { data: registration, error: regError } = await supabase
      .from("user_registrations")
      .select("*")
      .eq("id", registrationId)
      .single();

    if (regError || !registration) {
      console.error("[resend-welcome-email] Registration fetch error:", regError);
      return new Response(
        JSON.stringify({ error: "Registration not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is approved
    if (registration.status !== "approved") {
      return new Response(
        JSON.stringify({ error: "Only approved users can receive welcome emails" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is banned
    if (registration.is_banned) {
      return new Response(
        JSON.stringify({ error: "Cannot resend email to banned users" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[resend-welcome-email] Resending to:", registration.email, "via channel:", channel);

    const userName = `${registration.first_name} ${registration.last_name}`;
    const channelsToSend: string[] = [];
    const results: { email?: boolean; whatsapp?: boolean } = {};

    // Determine which channels to send
    if (channel === 'email' || channel === 'both') {
      channelsToSend.push('email');
    }
    if ((channel === 'whatsapp' || channel === 'both') && registration.phone) {
      channelsToSend.push('whatsapp');
    }

    // Generate new password recovery link
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: registration.email,
    });

    if (linkError) {
      console.error("[resend-welcome-email] Recovery link generation error:", linkError);
      return new Response(
        JSON.stringify({ error: "Failed to generate recovery link. User may not exist in auth system." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const recoveryLink = linkData?.properties?.action_link || `${supabaseUrl.replace('.supabase.co', '')}/admin/reset-password`;
    console.log("[resend-welcome-email] Recovery link generated");

    // Send via Email
    if (channelsToSend.includes('email')) {
      // Get template
      const { data: template } = await supabase
        .from("notification_templates")
        .select("email_subject, email_body")
        .eq("event_type", "user_registration_approved")
        .single();

      let emailSent = false;

      if (!template) {
        // Use default template if none exists
        const defaultHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
              .button { display: inline-block; background: #6366f1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin:0;">🎉 Bem-vindo à Plataforma!</h1>
              </div>
              <div class="content">
                <p>Olá <strong>${userName}</strong>,</p>
                <p>Seu cadastro foi aprovado! Para acessar a plataforma, clique no botão abaixo para definir sua senha:</p>
                <p style="text-align: center;">
                  <a href="${recoveryLink}" class="button" style="color: white;">Definir Minha Senha</a>
                </p>
                <p style="font-size: 12px; color: #666;">Este link é válido por 24 horas.</p>
              </div>
              <div class="footer">
                <p>Plataforma KnowYOU &copy; ${new Date().getFullYear()}</p>
              </div>
            </div>
          </body>
          </html>
        `;

        try {
          await supabase.functions.invoke("send-email", {
            body: {
              to: registration.email,
              subject: "🎉 Bem-vindo à Plataforma KnowYOU!",
              body: defaultHtml,
            },
          });
          console.log("[resend-welcome-email] Default welcome email sent to:", registration.email);
          emailSent = true;
        } catch (emailError) {
          console.error("[resend-welcome-email] Email send error:", emailError);
        }
      } else {
        // Use custom template
        let emailBody = template.email_body || "";
        let emailSubject = template.email_subject || "Bem-vindo à Plataforma KnowYOU!";
        
        const variables: Record<string, string> = {
          user_name: userName,
          user_email: registration.email,
          recovery_link: recoveryLink,
          timestamp: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
          platform_name: "Plataforma KnowYOU",
        };

        for (const [key, value] of Object.entries(variables)) {
          emailBody = emailBody.replace(new RegExp(`\\{${key}\\}`, "g"), value);
          emailSubject = emailSubject.replace(new RegExp(`\\{${key}\\}`, "g"), value);
        }

        try {
          await supabase.functions.invoke("send-email", {
            body: {
              to: registration.email,
              subject: emailSubject,
              body: emailBody,
            },
          });
          console.log("[resend-welcome-email] Welcome email sent to:", registration.email);
          emailSent = true;
        } catch (emailError) {
          console.error("[resend-welcome-email] Email send error:", emailError);
        }
      }

      results.email = emailSent;

      // Log email notification
      if (emailSent) {
        await supabase.from("notification_logs").insert({
          event_type: "user_registration_resend_welcome",
          channel: "email",
          recipient: registration.email,
          subject: "Reenvio de email de boas-vindas",
          message_body: `Email de boas-vindas reenviado para ${userName} com novo link de recuperação.`,
          status: "success",
          metadata: { registration_id: registrationId, triggered_by: adminUser.email },
        });
      }
    }

    // Send via WhatsApp
    if (channelsToSend.includes('whatsapp') && registration.phone) {
      try {
        // Get WhatsApp template
        const { data: whatsappTemplate } = await supabase
          .from("notification_templates")
          .select("whatsapp_message")
          .eq("event_type", "user_registration_approved")
          .single();

        let whatsappMessage = whatsappTemplate?.whatsapp_message || 
          `🎉 Olá ${userName}!\n\nSeu cadastro na Plataforma KnowYOU foi aprovado!\n\nClique no link abaixo para definir sua senha e começar a usar:\n${recoveryLink}\n\n⏰ Este link é válido por 24 horas.`;

        // Replace variables
        const variables: Record<string, string> = {
          user_name: userName,
          user_email: registration.email,
          recovery_link: recoveryLink,
          timestamp: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
          platform_name: "Plataforma KnowYOU",
        };

        for (const [key, value] of Object.entries(variables)) {
          whatsappMessage = whatsappMessage.replace(new RegExp(`\\{${key}\\}`, "g"), value);
        }

        await supabase.functions.invoke("send-whatsapp", {
          body: {
            phoneNumber: registration.phone,
            message: whatsappMessage,
          },
        });

        console.log("[resend-welcome-email] WhatsApp message sent to:", registration.phone);
        results.whatsapp = true;

        // Log WhatsApp notification
        await supabase.from("notification_logs").insert({
          event_type: "user_registration_resend_welcome",
          channel: "whatsapp",
          recipient: registration.phone,
          subject: "Reenvio de boas-vindas via WhatsApp",
          message_body: whatsappMessage,
          status: "success",
          metadata: { registration_id: registrationId, triggered_by: adminUser.email },
        });
      } catch (whatsappError) {
        console.error("[resend-welcome-email] WhatsApp send error:", whatsappError);
        results.whatsapp = false;
      }
    }

    // Log the action
    await supabase.from("user_activity_logs").insert({
      user_email: adminUser.email,
      user_id: adminUser.id,
      action_category: "USER_REGISTRATION_RESEND_WELCOME",
      action: `Reenviou boas-vindas para ${userName} (${registration.email}) via ${channel}`,
      details: {
        registration_id: registrationId,
        user_email: registration.email,
        user_name: userName,
        channel,
        results,
      },
    });

    // Determine success message
    const successChannels: string[] = [];
    if (results.email) successChannels.push('email');
    if (results.whatsapp) successChannels.push('WhatsApp');

    if (successChannels.length === 0) {
      return new Response(
        JSON.stringify({ error: "Failed to send message via any channel" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Welcome message resent successfully via ${successChannels.join(' and ')}`,
        email: registration.email,
        phone: registration.phone,
        channels: successChannels,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[resend-welcome-email] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
