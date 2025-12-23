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

    // Build invitation URL based on access type
    const siteUrl = Deno.env.get("PUBLIC_SITE_URL") || "https://hmv.knowyou.app";
    
    // Determine the appropriate URL based on access type
    let inviteUrl: string;
    if (hasAppAccess && !hasPlatformAccess) {
      // APP only - redirect to PWA register
      inviteUrl = `${siteUrl}/pwa-register?token=${token}`;
    } else {
      // Platform access (with or without APP) - redirect to invite page
      inviteUrl = `${siteUrl}/invite/${token}`;
    }

    // Build access type description for email/whatsapp
    const accessDescriptions: string[] = [];
    if (hasPlatformAccess) {
      accessDescriptions.push("🖥️ Plataforma (Computador/Tablet)");
    }
    if (hasAppAccess) {
      accessDescriptions.push("📱 APP (Celular via WhatsApp)");
    }
    const accessDisplay = accessDescriptions.join("\n");

    // Send email if enabled
    if (sendViaEmail) {
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
              .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; }
              .button { display: inline-block; background: #6366f1; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
              .info { background: #fff; padding: 15px; border-radius: 8px; margin: 15px 0; }
              .access-badge { display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 6px; margin: 4px; font-size: 14px; }
              .platform-badge { background: #6366f1; color: white; }
              .app-badge { background: #10b981; color: white; }
              .warning { background: #fef3c7; border: 1px solid #fcd34d; padding: 12px; border-radius: 8px; margin-top: 15px; font-size: 14px; color: #92400e; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin:0;">🎉 Você foi convidado!</h1>
              </div>
              <div class="content">
                <p>Olá <strong>${name}</strong>,</p>
                <p>Você recebeu um convite para fazer parte da <strong>Plataforma KnowYOU</strong>.</p>
                
                <div class="info">
                  <p><strong>📧 Email:</strong> ${email}</p>
                  ${hasPlatformAccess ? `<p><strong>👤 Tipo de acesso:</strong> ${role === 'superadmin' ? 'Super Admin' : role === 'admin' ? 'Administrador' : 'Usuário'}</p>` : ''}
                  <p style="margin-top: 12px;"><strong>🔓 Seus acessos:</strong></p>
                  <div style="margin-top: 8px;">
                    ${hasPlatformAccess ? '<span class="access-badge platform-badge">🖥️ Plataforma</span>' : ''}
                    ${hasAppAccess ? '<span class="access-badge app-badge">📱 APP</span>' : ''}
                  </div>
                </div>

                ${hasPlatformAccess && !hasAppAccess ? `
                <div class="warning">
                  <strong>⚠️ Atenção:</strong> Seu acesso é exclusivo à <strong>Plataforma</strong>. 
                  Acesse pelo computador ou tablet para se cadastrar.
                </div>
                ` : ''}

                ${!hasPlatformAccess && hasAppAccess ? `
                <div class="warning">
                  <strong>📱 Atenção:</strong> Seu acesso é exclusivo ao <strong>APP</strong>. 
                  Use o celular para se cadastrar. O APP funciona apenas pelo WhatsApp.
                </div>
                ` : ''}

                ${hasPlatformAccess && hasAppAccess ? `
                <div class="warning" style="background: #dbeafe; border-color: #60a5fa; color: #1e40af;">
                  <strong>✨ Acesso Completo:</strong> Você pode acessar tanto a <strong>Plataforma</strong> (computador/tablet) 
                  quanto o <strong>APP</strong> (celular via WhatsApp).
                </div>
                ` : ''}
                
                <p style="text-align: center;">
                  <a href="${inviteUrl}" class="button">Completar Cadastro</a>
                </p>
                
                <p style="font-size: 14px; color: #64748b;">
                  Este convite expira em <strong>7 dias</strong>. Se você não solicitou este convite, ignore este email.
                </p>
              </div>
              <div class="footer">
                <p>Plataforma KnowYOU &copy; ${new Date().getFullYear()}</p>
                <p>Este é um email automático, não responda.</p>
              </div>
            </div>
          </body>
          </html>
        `;

        await supabase.functions.invoke("send-email", {
          body: {
            to: email,
            subject: "🎉 Você foi convidado para a Plataforma KnowYOU",
            body: emailHtml
          }
        });

        console.log("Invitation email sent to:", email);
      } catch (emailError) {
        console.error("Error sending invitation email:", emailError);
      }
    }

    // Send WhatsApp if enabled
    if (sendViaWhatsapp && phone) {
      try {
        let accessInfo = "";
        if (hasPlatformAccess && hasAppAccess) {
          accessInfo = "✅ Plataforma (computador/tablet)\n✅ APP (celular via WhatsApp)";
        } else if (hasPlatformAccess) {
          accessInfo = "✅ Plataforma (computador/tablet)\n⚠️ Acesse pelo computador ou tablet";
        } else if (hasAppAccess) {
          accessInfo = "✅ APP (celular via WhatsApp)\n📱 O APP funciona apenas pelo celular";
        }

        const whatsappMessage = `🎉 *Convite KnowYOU*

Olá ${name}!

Você foi convidado para a Plataforma KnowYOU.

*📱 Seu Acesso:*
${accessInfo}

🔗 Complete seu cadastro:
${inviteUrl}

⏰ Este convite expira em 7 dias.`;

        await supabase.functions.invoke("send-whatsapp", {
          body: {
            phoneNumber: phone,
            message: whatsappMessage
          }
        });

        console.log("Invitation WhatsApp sent to:", phone);
      } catch (whatsappError) {
        console.error("Error sending invitation WhatsApp:", whatsappError);
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
