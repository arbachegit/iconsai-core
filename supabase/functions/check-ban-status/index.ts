import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckBanPayload {
  deviceFingerprint: string;
  userEmail?: string;
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
                     null;

    const payload: CheckBanPayload = await req.json();
    const { deviceFingerprint, userEmail } = payload;

    console.log(`Checking ban status for fingerprint: ${deviceFingerprint?.substring(0, 16)}...`);

    // Check if device is banned
    const { data: bannedDevice, error: deviceError } = await supabase
      .from("banned_devices")
      .select("*")
      .eq("device_fingerprint", deviceFingerprint)
      .is("unbanned_at", null)
      .maybeSingle();

    if (deviceError) {
      console.error("Error checking device ban:", deviceError);
    }

    if (bannedDevice) {
      console.log(`Device is BANNED: ${bannedDevice.ban_reason}`);
      return new Response(
        JSON.stringify({
          isBanned: true,
          reason: bannedDevice.ban_reason,
          bannedAt: bannedDevice.banned_at,
          violationType: bannedDevice.violation_type,
          deviceId: deviceFingerprint.substring(0, 16),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Check by IP as well (secondary check)
    if (clientIP) {
      const { data: bannedByIP } = await supabase
        .from("banned_devices")
        .select("*")
        .eq("ip_address", clientIP)
        .is("unbanned_at", null)
        .maybeSingle();

      if (bannedByIP) {
        console.log(`IP is BANNED: ${bannedByIP.ban_reason}`);
        return new Response(
          JSON.stringify({
            isBanned: true,
            reason: bannedByIP.ban_reason,
            bannedAt: bannedByIP.banned_at,
            violationType: bannedByIP.violation_type,
            deviceId: deviceFingerprint.substring(0, 16),
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }
    }

    // Check if user email is banned
    if (userEmail) {
      const { data: bannedUser } = await supabase
        .from("user_registrations")
        .select("is_banned, ban_reason, banned_at, ban_type")
        .eq("email", userEmail)
        .eq("is_banned", true)
        .maybeSingle();

      if (bannedUser) {
        console.log(`User is BANNED: ${bannedUser.ban_reason}`);
        return new Response(
          JSON.stringify({
            isBanned: true,
            reason: bannedUser.ban_reason,
            bannedAt: bannedUser.banned_at,
            violationType: bannedUser.ban_type || "user_banned",
            deviceId: deviceFingerprint.substring(0, 16),
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }
    }

    // Not banned
    return new Response(
      JSON.stringify({
        isBanned: false,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error checking ban status:", error);
    return new Response(
      JSON.stringify({
        isBanned: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  }
});
