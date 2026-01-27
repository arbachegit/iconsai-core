// ============================================
// VERSAO: 3.0.0 | DEPLOY: 2026-01-28
// FIX: user_invitations → user_invites
// FIX: profiles → platform_users
// FIX: Removed user_registrations, notification_logs, admin_settings
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

interface VerifyCodeRequest {
  token: string;
  code: string;
  password: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { token, code, password }: VerifyCodeRequest = await req.json();

    // Fetch invitation
    const { data: invitation, error: fetchError } = await supabase
      .from("user_invites")
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

    // Check if code expired
    if (new Date(invitation.verification_code_expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Código expirado. Solicite um novo código." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check attempts limit (max 5)
    if (invitation.verification_attempts >= 5) {
      return new Response(
        JSON.stringify({ error: "Número máximo de tentativas excedido. Solicite um novo código." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Increment attempts
    await supabase
      .from("user_invites")
      .update({ 
        verification_attempts: invitation.verification_attempts + 1,
        updated_at: new Date().toISOString()
      })
      .eq("token", token);

    // Verify code
    if (invitation.verification_code !== code) {
      const remainingAttempts = 4 - invitation.verification_attempts;
      return new Response(
        JSON.stringify({ 
          error: `Código incorreto. ${remainingAttempts > 0 ? `${remainingAttempts} tentativas restantes.` : 'Solicite um novo código.'}` 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Code is correct! Create user in Supabase Auth or get existing
    let userId: string;
    
    // First, check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === invitation.email);
    
    if (existingUser) {
      console.log("User already exists, updating password...");
      userId = existingUser.id;
      
      // Update the existing user's password
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        password: password,
        email_confirm: true,
        user_metadata: {
          first_name: invitation.name.split(" ")[0],
          last_name: invitation.name.split(" ").slice(1).join(" ") || "",
          phone: invitation.phone
        }
      });
      
      if (updateError) {
        console.error("Error updating existing user:", updateError);
        return new Response(
          JSON.stringify({ error: `Erro ao atualizar usuário: ${updateError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // Create new user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: invitation.email,
        password: password,
        email_confirm: true,
        user_metadata: {
          first_name: invitation.name.split(" ")[0],
          last_name: invitation.name.split(" ").slice(1).join(" ") || "",
          phone: invitation.phone
        }
      });

      if (authError) {
        console.error("Error creating auth user:", authError);
        return new Response(
          JSON.stringify({ error: `Erro ao criar usuário: ${authError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      userId = authData.user.id;
    }

    

    // Assign role in user_roles table (delete+insert pattern for reliability)
    // First, remove any existing roles for this user to ensure correct role
    const { error: deleteRoleError } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId);

    if (deleteRoleError) {
      console.warn("Warning: Could not delete existing roles:", deleteRoleError);
    }

    // Now insert the correct role
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({
        user_id: userId,
        role: invitation.role
      });

    if (roleError) {
      console.error("CRITICAL: Error assigning role:", roleError);
      console.log(`[LOG] Role assignment error: ${invitation.email} - ${roleError.message}`);

      // Return error - role assignment is critical
      return new Response(
        JSON.stringify({
          error: "Erro ao configurar permissões. Contate o administrador.",
          details: roleError.message
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Role ${invitation.role} assigned successfully to user ${userId}`);

    // Create platform_user profile
    const nameParts = (invitation.name || invitation.first_name || "").split(" ");
    const { error: profileError } = await supabase
      .from("platform_users")
      .insert({
        auth_user_id: userId,
        first_name: nameParts[0] || invitation.first_name,
        last_name: nameParts.slice(1).join(" ") || invitation.last_name || null,
        email: invitation.email,
        phone: invitation.phone,
        role: invitation.role,
        status: "active",
        email_verified: true,
        phone_verified: true,
        password_set: true,
        institution_id: invitation.institution_id || null,
      });

    if (profileError) {
      console.error("Error creating platform_user profile:", profileError);
    }

    // Update invitation status to completed
    const { error: updateError } = await supabase
      .from("user_invites")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("token", token);

    if (updateError) {
      console.error("Error updating invitation status:", updateError);
    }

    // Log the event (admin_settings and notification_logs tables removed in v3.0)
    console.log(`[LOG] User registration completed: ${invitation.email} - role: ${invitation.role}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Cadastro concluído com sucesso! Você pode fazer login agora.",
        email: invitation.email
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in verify-invitation-code:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
