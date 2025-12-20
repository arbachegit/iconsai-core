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
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { name, email, phone, role, sendViaEmail, sendViaWhatsapp }: CreateInvitationRequest = await req.json();

    // Validate required fields
    if (!name || !email) {
      return new Response(
        JSON.stringify({ error: "Nome e email são obrigatórios" }),
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
        status: "pending"
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

    // Build invitation URL
    const siteUrl = Deno.env.get("PUBLIC_SITE_URL") || "https://knowyou.app";
    const inviteUrl = `${siteUrl}/invite/${token}`;

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
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin:0;">🎉 Você foi convidado!</h1>
              </div>
              <div class="content">
                <p>Olá <strong>${name}</strong>,</p>
                <p>Você recebeu um convite para fazer parte da <strong>Plataforma KnowYOU Health</strong>.</p>
                
                <div class="info">
                  <p><strong>📧 Email:</strong> ${email}</p>
                  <p><strong>👤 Tipo de acesso:</strong> ${role === 'superadmin' ? 'Super Admin' : role === 'admin' ? 'Administrador' : 'Usuário'}</p>
                </div>
                
                <p style="text-align: center;">
                  <a href="${inviteUrl}" class="button">Completar Cadastro</a>
                </p>
                
                <p style="font-size: 14px; color: #64748b;">
                  Este convite expira em <strong>7 dias</strong>. Se você não solicitou este convite, ignore este email.
                </p>
              </div>
              <div class="footer">
                <p>Plataforma KnowYOU Health &copy; ${new Date().getFullYear()}</p>
                <p>Este é um email automático, não responda.</p>
              </div>
            </div>
          </body>
          </html>
        `;

        await supabase.functions.invoke("send-email", {
          body: {
            to: email,
            subject: "🎉 Você foi convidado para a Plataforma KnowYOU Health",
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
        const whatsappMessage = `🎉 *Convite KnowYOU Health*\n\nOlá ${name}!\n\nVocê foi convidado para a Plataforma KnowYOU Health.\n\n📱 Complete seu cadastro:\n${inviteUrl}\n\n⏰ Este convite expira em 7 dias.`;

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
        const adminMessage = `📧 *Convite Enviado*\n\n👤 ${name}\n📧 ${email}\n🔑 Role: ${roleLabel}\n\n✅ Aguardando preenchimento do formulário.`;

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
      message_body: `Convite criado para ${name} (${email}) com role ${role}`,
      status: "success",
      metadata: { token, role, sendViaEmail, sendViaWhatsapp }
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
