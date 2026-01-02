import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Twilio Config
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;
const TWILIO_WHATSAPP_NUMBER = "whatsapp:+17727323860";
const TWILIO_SMS_NUMBER = "+17727323860";

// Templates SIDs
const TEMPLATES: Record<string, string> = {
  otp: "HX15dbff375b023b2d1514038027db6ad0",
  welcome: "HX35461ac69adc68257f54eb030fafe4b1",
  resend_code: "HX026907ac8e769389acfda75829c5d543",
  invitation: "HX56dca3b12701c186f1f3daa58f5785c3",
  resend_welcome: "HX9ccbe49ea4063c9155c3ebd67738556e",
};

interface NotificationRequest {
  to: string;
  template: string;
  variables: Record<string, string>;
  channel?: "whatsapp" | "sms" | "both";
  userId?: string;
}

interface SendResult {
  success: boolean;
  channel: "whatsapp" | "sms";
  messageId?: string;
  error?: string;
}

// Normalize phone to E.164
function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10 || cleaned.length === 11) {
    cleaned = "55" + cleaned;
  }
  return "+" + cleaned;
}

// Send via Twilio with template
async function sendTwilioTemplate(
  to: string,
  channel: "whatsapp" | "sms",
  templateSid: string,
  variables: Record<string, string>
): Promise<SendResult> {
  const fromNumber = channel === "whatsapp" ? TWILIO_WHATSAPP_NUMBER : TWILIO_SMS_NUMBER;
  const toNumber = channel === "whatsapp" ? `whatsapp:${to}` : to;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

  const body = new URLSearchParams({
    From: fromNumber,
    To: toNumber,
    ContentSid: templateSid,
    ContentVariables: JSON.stringify(variables),
  });

  try {
    console.log(`[${channel.toUpperCase()}] Sending to ${toNumber} with template ${templateSid}`);
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
      },
      body: body.toString(),
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`[${channel.toUpperCase()}] Success: ${data.sid}`);
      return { success: true, channel, messageId: data.sid };
    } else {
      console.error(`[${channel.toUpperCase()}] Failed: ${data.message}`);
      return { success: false, channel, error: data.message || "Unknown error" };
    }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[${channel.toUpperCase()}] Exception: ${errMsg}`);
    return { success: false, channel, error: errMsg };
  }
}

// Send plain SMS (final fallback)
async function sendPlainSMS(to: string, message: string): Promise<SendResult> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

  const body = new URLSearchParams({
    From: TWILIO_SMS_NUMBER,
    To: to,
    Body: message,
  });

  try {
    console.log(`[SMS-PLAIN] Sending to ${to}`);
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
      },
      body: body.toString(),
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`[SMS-PLAIN] Success: ${data.sid}`);
      return { success: true, channel: "sms", messageId: data.sid };
    } else {
      console.error(`[SMS-PLAIN] Failed: ${data.message}`);
      return { success: false, channel: "sms", error: data.message };
    }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[SMS-PLAIN] Exception: ${errMsg}`);
    return { success: false, channel: "sms", error: errMsg };
  }
}

// Generate fallback message based on template
function getFallbackMessage(template: string, variables: Record<string, string>): string {
  switch (template) {
    case "otp":
      return `KnowYOU - Seu código de acesso: ${variables["1"] || ""}. Válido por 10 minutos.`;
    case "welcome":
      return `Olá ${variables["1"] || ""}! Bem-vindo ao KnowYOU. Acesse: ${variables["2"] || ""}`;
    case "invitation":
      return `${variables["1"] || ""}, você foi convidado para o KnowYOU! Código: ${variables["2"] || ""}. Acesse: ${variables["3"] || ""}`;
    case "resend_code":
      return `KnowYOU - Novo código: ${variables["1"] || ""}. Use para acessar o app.`;
    case "resend_welcome":
      return `${variables["1"] || ""}, acesse o KnowYOU: ${variables["2"] || ""}`;
    default:
      return `KnowYOU - ${Object.values(variables).filter(Boolean).join(" ")}`;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to, template, variables, channel = "whatsapp", userId } = await req.json() as NotificationRequest;

    console.log(`[REQUEST] template=${template}, channel=${channel}, to=${to}`);

    // Validate required fields
    if (!to || !template || !variables) {
      return new Response(
        JSON.stringify({ success: false, error: "Campos obrigatórios: to, template, variables" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const templateSid = TEMPLATES[template];
    if (!templateSid) {
      return new Response(
        JSON.stringify({ success: false, error: `Template inválido: ${template}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize phone
    const phone = normalizePhone(to);
    console.log(`[PHONE] Normalized: ${phone}`);

    let result: SendResult;
    const attempts: SendResult[] = [];

    if (channel === "sms") {
      // SMS only
      result = await sendTwilioTemplate(phone, "sms", templateSid, variables);
      attempts.push(result);

      // Fallback to plain SMS if template fails
      if (!result.success) {
        const fallbackMsg = getFallbackMessage(template, variables);
        result = await sendPlainSMS(phone, fallbackMsg);
        attempts.push(result);
      }
    } else if (channel === "both") {
      // Send to both channels
      const waResult = await sendTwilioTemplate(phone, "whatsapp", templateSid, variables);
      attempts.push(waResult);

      const smsResult = await sendTwilioTemplate(phone, "sms", templateSid, variables);
      attempts.push(smsResult);

      result = waResult.success ? waResult : smsResult;
    } else {
      // WhatsApp with fallback to SMS
      result = await sendTwilioTemplate(phone, "whatsapp", templateSid, variables);
      attempts.push(result);

      if (!result.success) {
        console.log(`[FALLBACK] WhatsApp failed, trying SMS template...`);
        result = await sendTwilioTemplate(phone, "sms", templateSid, variables);
        attempts.push(result);

        // Final fallback: plain SMS
        if (!result.success) {
          console.log(`[FALLBACK] SMS template failed, trying plain SMS...`);
          const fallbackMsg = getFallbackMessage(template, variables);
          result = await sendPlainSMS(phone, fallbackMsg);
          attempts.push(result);
        }
      }
    }

    // Log to Supabase
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabase.from("notification_logs").insert({
      user_id: userId || null,
      phone_number: phone,
      template: template,
      channel: result.channel,
      status: result.success ? "delivered" : "failed",
      twilio_sid: result.messageId || null,
      error_message: result.error || null,
      metadata: { attempts, variables },
    });

    console.log(`[RESULT] success=${result.success}, channel=${result.channel}, attempts=${attempts.length}`);

    return new Response(
      JSON.stringify({
        success: result.success,
        channel: result.channel,
        messageId: result.messageId,
        error: result.error,
        attempts: attempts.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[ERROR]", errMsg);
    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
