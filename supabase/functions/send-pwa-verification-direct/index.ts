import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, code, name } = await req.json();

    if (!phone || !code) {
      console.error("[send-pwa-verification-direct] Missing phone or code");
      return new Response(
        JSON.stringify({ success: false, error: "Phone and code are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[send-pwa-verification-direct] Sending code to ${phone}`);

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build message
    const greeting = name ? `Olá ${name}!` : "Olá!";
    const message = `${greeting}\n\nSeu código de verificação KnowYOU é:\n\n*${code}*\n\nEsse código expira em 10 minutos.`;

    let sendSuccess = false;
    let sendChannel = "whatsapp";
    let sendError = null;

    // Try WhatsApp first
    try {
      console.log("[send-pwa-verification-direct] Attempting WhatsApp...");
      
      const whatsappResponse = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          to: phone,
          message: message,
        }),
      });

      const whatsappResult = await whatsappResponse.json();
      
      if (whatsappResponse.ok && whatsappResult.success) {
        sendSuccess = true;
        console.log("[send-pwa-verification-direct] WhatsApp sent successfully");
      } else {
        console.warn("[send-pwa-verification-direct] WhatsApp failed:", whatsappResult);
        sendError = whatsappResult.error || "WhatsApp send failed";
      }
    } catch (waError) {
      console.error("[send-pwa-verification-direct] WhatsApp error:", waError);
      sendError = String(waError);
    }

    // Fallback to SMS if WhatsApp failed
    if (!sendSuccess) {
      try {
        console.log("[send-pwa-verification-direct] Falling back to SMS...");
        sendChannel = "sms";
        
        const smsMessage = `KnowYOU: Seu código é ${code}. Expira em 10 min.`;
        
        const smsResponse = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            to: phone,
            message: smsMessage,
          }),
        });

        const smsResult = await smsResponse.json();
        
        if (smsResponse.ok && smsResult.success) {
          sendSuccess = true;
          console.log("[send-pwa-verification-direct] SMS sent successfully");
        } else {
          console.error("[send-pwa-verification-direct] SMS also failed:", smsResult);
          sendError = smsResult.error || "SMS send failed";
        }
      } catch (smsError) {
        console.error("[send-pwa-verification-direct] SMS error:", smsError);
        sendError = String(smsError);
      }
    }

    // Log notification attempt
    try {
      await supabase.from("notification_logs").insert({
        event_type: "pwa_verification",
        channel: sendChannel,
        recipient: phone,
        subject: "Código de Verificação PWA",
        message_body: message,
        status: sendSuccess ? "sent" : "failed",
        error_message: sendSuccess ? null : sendError,
        fallback_used: sendChannel === "sms",
        metadata: { name, code_sent: true },
      });
    } catch (logError) {
      console.warn("[send-pwa-verification-direct] Failed to log notification:", logError);
    }

    if (sendSuccess) {
      return new Response(
        JSON.stringify({ success: true, channel: sendChannel }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({ success: false, error: sendError || "Failed to send verification code" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    console.error("[send-pwa-verification-direct] Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
