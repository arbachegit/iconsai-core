import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateInvitationRequest {
  name: string;
  email: string;
  phone?: string;
  role: "user" | "admin" | "superadmin";
  sendViaEmail: boolean;
  sendViaWhatsapp: boolean;
  hasPlatformAccess: boolean;
  hasAppAccess: boolean;
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
      name, 
      email, 
      phone, 
      role, 
      sendViaEmail, 
      sendViaWhatsapp, 
      hasPlatformAccess, 
      hasAppAccess 
    }: CreateInvitationRequest = await req.json();

    console.log("Creating invitation:", { name, email, hasPlatformAccess, hasAppAccess });

    // Validate required fields
    if (!name || !email) {
      return new Response(
        JSON.stringify({ error: "Nome e email são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate at least one access type
    if (!hasPlatformAccess && !hasAppAccess) {
      return new Response(
        JSON.stringify({ error: "Selecione pelo menos um tipo de acesso" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If sending via WhatsApp, phone is required
    if (sendViaWhatsapp && !phone) {
      return new Response(
        JSON.stringify({ error: "Telefone é obrigatório para envio via WhatsApp" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if email already exists in invitations or registrations
    const { data: existingInvite } = await supabase
      .from("user_invitations")
      .select("id, status")
      .eq("email", email.toLowerCase())
      .in("status", ["pending", "form_submitted"])
      .single();

    if (existingInvite) {
      return new Response(
        JSON.stringify({ error: "Já existe um convite pendente para este email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check in user_registrations
    const { data: existingReg } = await supabase
      .from("user_registrations")
      .select("id, status")
      .eq("email", email.toLowerCase())
      .eq("status", "approved")
      .single();

    if (existingReg) {
      return new Response(
        JSON.stringify({ error: "Este email já está cadastrado no sistema" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate unique token (64 hex characters)
    const tokenArray = new Uint8Array(32);
    crypto.getRandomValues(tokenArray);
    const token = Array.from(tokenArray).map(b => b.toString(16).padStart(2, "0")).join("");

    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Insert invitation
    const { data: invitation, error: insertError } = await supabase
      .from("user_invitations")
      .insert({
        token,
        name,
        email: email.toLowerCase(),
        phone: phone || null,
        role,
        send_via_email: sendViaEmail,
        send_via_whatsapp: sendViaWhatsapp,
        expires_at: expiresAt.toISOString(),
        status: "pending",
        has_platform_access: hasPlatformAccess,
        has_app_access: hasAppAccess,
        pwa_access: hasAppAccess ? ["economia", "health", "ideias"] : [] // Legacy support
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting invitation:", insertError);
      return new Response(
        JSON.stringify({ error: "Erro ao criar convite" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build invitation URLs
    const siteUrl = Deno.env.get("PUBLIC_SITE_URL") || "https://hmv.knowyou.app";
    const platformUrl = `${siteUrl}/invite/${token}`;
    const appUrl = `${siteUrl}/pwa-register?token=${token}`;

    // Send emails based on access type - SEPARATE emails for each product
    if (sendViaEmail) {
      // Email para PLATAFORMA
      if (hasPlatformAccess) {
        try {
          const platformEmailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; }
                .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
                .badge { display: inline-block; background: #6366f1; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 15px; }
                .button { display: inline-block; background: #6366f1; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
                .info { background: #fff; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #6366f1; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin:0;">🖥️ Convite KnowYOU Plataforma</h1>
                </div>
                <div class="content">
                  <span class="badge">🖥️ PLATAFORMA</span>
                  <p>Olá <strong>${name}</strong>,</p>
                  <p>Você foi convidado para a <strong>KnowYOU Plataforma</strong>!</p>
                  
                  <div class="info">
                    <p style="margin:0;">💻 Acesse pelo <strong>computador ou tablet</strong> para aproveitar todos os recursos.</p>
                  </div>
                  
                  <p style="text-align: center;">
                    <a href="${platformUrl}" class="button">Acessar Plataforma</a>
                  </p>
                  
                  <p style="font-size: 14px; color: #64748b; text-align: center;">
                    ⏰ Este convite expira em <strong>7 dias</strong>.
                  </p>
                </div>
                <div class="footer">
                  <p>KnowYOU Plataforma &copy; ${new Date().getFullYear()}</p>
                </div>
              </div>
            </body>
            </html>
          `;

          await supabase.functions.invoke("send-email", {
            body: {
              to: email,
              subject: "🖥️ Convite KnowYOU Plataforma",
              body: platformEmailHtml
            }
          });
          console.log("Platform invitation email sent to:", email);
        } catch (emailError) {
          console.error("Error sending platform email:", emailError);
        }
      }

      // Email para APP
      if (hasAppAccess) {
        try {
          const appEmailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; }
                .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
                .badge { display: inline-block; background: #10b981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 15px; }
                .button { display: inline-block; background: #10b981; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
                .info { background: #fff; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #10b981; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin:0;">📱 Convite KnowYOU APP</h1>
                </div>
                <div class="content">
                  <span class="badge">📱 APP</span>
                  <p>Olá <strong>${name}</strong>,</p>
                  <p>Você foi convidado para o <strong>KnowYOU APP</strong>!</p>
                  
                  <div class="info">
                    <p style="margin:0;">📲 Acesse pelo <strong>celular via WhatsApp</strong> para ter o assistente sempre com você.</p>
                  </div>
                  
                  <p style="text-align: center;">
                    <a href="${appUrl}" class="button">Cadastrar no APP</a>
                  </p>
                  
                  <p style="font-size: 14px; color: #64748b; text-align: center;">
                    ⏰ Este convite expira em <strong>7 dias</strong>.
                  </p>
                </div>
                <div class="footer">
                  <p>KnowYOU APP &copy; ${new Date().getFullYear()}</p>
                </div>
              </div>
            </body>
            </html>
          `;

          await supabase.functions.invoke("send-email", {
            body: {
              to: email,
              subject: "📱 Convite KnowYOU APP",
              body: appEmailHtml
            }
          });
          console.log("APP invitation email sent to:", email);
        } catch (emailError) {
          console.error("Error sending APP email:", emailError);
        }
      }
    }

    // Send WhatsApp based on access type - SEPARATE messages for each product
    if (sendViaWhatsapp && phone) {
      // WhatsApp para PLATAFORMA
      if (hasPlatformAccess) {
        try {
          const platformWhatsappMessage = `🖥️ *Convite KnowYOU Plataforma*

Olá ${name}!

Você foi convidado para a *KnowYOU Plataforma*.

💻 Acesse pelo computador ou tablet.

🔗 Link: ${platformUrl}

⏰ Expira em 7 dias.`;

          await supabase.functions.invoke("send-whatsapp", {
            body: {
              phoneNumber: phone,
              message: platformWhatsappMessage
            }
          });
          console.log("Platform WhatsApp sent to:", phone);
        } catch (whatsappError) {
          console.error("Error sending platform WhatsApp:", whatsappError);
        }
      }

      // WhatsApp para APP
      if (hasAppAccess) {
        try {
          const appWhatsappMessage = `📱 *Convite KnowYOU APP*

Olá ${name}!

Você foi convidado para o *KnowYOU APP*.

📲 Acesse pelo celular para ter o assistente sempre com você.

🔗 Link: ${appUrl}

⏰ Expira em 7 dias.`;

          await supabase.functions.invoke("send-whatsapp", {
            body: {
              phoneNumber: phone,
              message: appWhatsappMessage
            }
          });
          console.log("APP WhatsApp sent to:", phone);
        } catch (whatsappError) {
          console.error("Error sending APP WhatsApp:", whatsappError);
        }
      }
    }

    // Notify Super Admin
    try {
      const { data: settings } = await supabase
        .from("admin_settings")
        .select("whatsapp_target_phone, whatsapp_global_enabled")
        .single();

      if (settings?.whatsapp_global_enabled && settings?.whatsapp_target_phone) {
        const roleLabel = role === 'superadmin' ? 'Super Admin' : role === 'admin' ? 'Admin' : 'Usuário';
        const accessLabels = [];
        if (hasPlatformAccess) accessLabels.push("🖥️ Plataforma");
        if (hasAppAccess) accessLabels.push("📱 APP");
        
        const adminMessage = `📧 *Convite Enviado*

👤 ${name}
📧 ${email}
🔑 Role: ${roleLabel}
🔓 Acesso: ${accessLabels.join(" + ")}

✅ Aguardando preenchimento do formulário.`;

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
      event_type: "user_invitation_sent",
      channel: "system",
      recipient: email,
      subject: "Convite enviado",
      message_body: `Convite criado para ${name} (${email}) - Plataforma: ${hasPlatformAccess}, APP: ${hasAppAccess}`,
      status: "success",
      metadata: { token, role, sendViaEmail, sendViaWhatsapp, hasPlatformAccess, hasAppAccess }
    });

    // Return the primary URL based on access type
    const inviteUrl = hasAppAccess && !hasPlatformAccess ? appUrl : platformUrl;

    return new Response(
      JSON.stringify({
        success: true,
        inviteUrl,
        invitation: {
          id: invitation.id,
          token,
          expiresAt: expiresAt.toISOString()
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in create-invitation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
