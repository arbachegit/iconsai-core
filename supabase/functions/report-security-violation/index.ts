import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ViolationPayload {
  violationType: string;
  deviceFingerprint: string;
  userAgent: string;
  userEmail?: string;
  userId?: string;
  severity: "critical" | "warning";
  violationDetails?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get client IP from headers
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("x-real-ip") || 
                     "unknown";

    const payload: ViolationPayload = await req.json();
    const { 
      violationType, 
      deviceFingerprint, 
      userAgent, 
      userEmail, 
      userId, 
      severity,
      violationDetails 
    } = payload;

    console.log(`🚨 Security violation detected: ${violationType}`);
    console.log(`   Fingerprint: ${deviceFingerprint}`);
    console.log(`   IP: ${clientIP}`);
    console.log(`   User: ${userEmail || "anonymous"}`);

    // 1. Insert into security_violations log
    const { error: violationError } = await supabase
      .from("security_violations")
      .insert({
        device_fingerprint: deviceFingerprint,
        ip_address: clientIP !== "unknown" ? clientIP : null,
        user_id: userId || null,
        user_email: userEmail || null,
        violation_type: violationType,
        violation_details: violationDetails || {},
        action_taken: "banned",
        severity,
      });

    if (violationError) {
      console.error("Error inserting violation:", violationError);
    }

    // 2. Insert into banned_devices (permanent ban)
    const banReason = `Violação de segurança: ${violationType}`;
    
    const { error: banError } = await supabase
      .from("banned_devices")
      .insert({
        device_fingerprint: deviceFingerprint,
        ip_address: clientIP !== "unknown" ? clientIP : null,
        user_agent: userAgent,
        user_id: userId || null,
        user_email: userEmail || null,
        ban_reason: banReason,
        violation_type: violationType,
        is_permanent: true,
      });

    if (banError) {
      // Check if already banned (duplicate)
      if (!banError.message.includes("duplicate")) {
        console.error("Error banning device:", banError);
      } else {
        console.log("Device already banned, skipping...");
      }
    }

    // 3. If user is logged in, ban user in user_registrations
    if (userEmail) {
      const { error: userBanError } = await supabase
        .from("user_registrations")
        .update({
          is_banned: true,
          banned_at: new Date().toISOString(),
          ban_reason: banReason,
          ban_type: "security_violation",
        })
        .eq("email", userEmail);

      if (userBanError) {
        console.error("Error banning user:", userBanError);
      } else {
        console.log(`User ${userEmail} banned successfully`);
      }
    }

    // 4. Send WhatsApp alert to Super Admin
    try {
      // Get admin settings for WhatsApp
      const { data: settings } = await supabase
        .from("admin_settings")
        .select("whatsapp_target_phone, whatsapp_global_enabled")
        .single();

      if (settings?.whatsapp_global_enabled && settings?.whatsapp_target_phone) {
        const alertMessage = `🚨 *ALERTA DE SEGURANÇA KnowYOU*

⛔ *BANIMENTO AUTOMÁTICO*

📛 *Tipo:* ${violationType}
🔴 *Severidade:* ${severity.toUpperCase()}
👤 *Usuário:* ${userEmail || "Anônimo"}
🌐 *IP:* ${clientIP}
📱 *Dispositivo:* ${deviceFingerprint.substring(0, 16)}...

✅ Dispositivo banido permanentemente.
⏰ ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`;

        await supabase.functions.invoke("send-whatsapp", {
          body: {
            to: settings.whatsapp_target_phone,
            message: alertMessage,
          },
        });

        console.log("WhatsApp alert sent to Super Admin");
      }

      // 5. Log notification
      await supabase.from("notification_logs").insert({
        event_type: "security_violation_detected",
        channel: "system",
        recipient: userEmail || "unknown",
        subject: `Security Violation: ${violationType}`,
        message_body: banReason,
        status: "sent",
        metadata: {
          device_fingerprint: deviceFingerprint,
          ip_address: clientIP,
          violation_type: violationType,
          severity,
        },
      });
    } catch (notifyError) {
      console.error("Error sending notifications:", notifyError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        banned: true,
        message: "Violation recorded and device banned",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error processing security violation:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
