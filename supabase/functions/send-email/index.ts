import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  body: string;
}

// Function to get access token using refresh token
async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get("GMAIL_CLIENT_ID");
  const clientSecret = Deno.env.get("GMAIL_CLIENT_SECRET");
  const refreshToken = Deno.env.get("GMAIL_REFRESH_TOKEN");

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Gmail API credentials not configured");
  }

  console.log("[Gmail] Refreshing access token...");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Gmail] Token refresh failed:", errorText);
    throw new Error(`Failed to refresh access token: ${errorText}`);
  }

  const data = await response.json();
  console.log("[Gmail] Access token refreshed successfully");
  return data.access_token;
}

// Function to create raw email in RFC 2822 format
function createRawEmail(to: string, subject: string, body: string, from: string): string {
  const email = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=UTF-8`,
    ``,
    body,
  ].join("\r\n");

  // Base64 URL-safe encoding
  const base64 = btoa(unescape(encodeURIComponent(email)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return base64;
}

// Function to get user's email address
async function getUserEmail(accessToken: string): Promise<string> {
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to get user profile");
  }

  const data = await response.json();
  return data.emailAddress;
}

// Function to send email via Gmail API
async function sendGmailEmail(to: string, subject: string, body: string): Promise<void> {
  const accessToken = await getAccessToken();
  const fromEmail = await getUserEmail(accessToken);

  console.log("[Gmail] Sending email from:", fromEmail, "to:", to);

  const rawEmail = createRawEmail(to, subject, body, fromEmail);

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      raw: rawEmail,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Gmail] Send failed:", errorText);
    throw new Error(`Failed to send email: ${errorText}`);
  }

  const result = await response.json();
  console.log("[Gmail] Email sent successfully, message ID:", result.id);
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, body }: EmailRequest = await req.json();

    // Input validation
    if (!to || !subject || !body) {
      throw new Error("Campos obrigatórios: to, subject, body");
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      throw new Error("Email inválido");
    }

    // Length validation
    if (subject.length > 200) {
      throw new Error("Assunto muito longo (máximo 200 caracteres)");
    }

    if (body.length > 10000) {
      throw new Error("Corpo muito longo (máximo 10000 caracteres)");
    }

    console.log("[Gmail] Processing email request to:", to);

    // Send via Gmail API
    await sendGmailEmail(to, subject, body);

    return new Response(
      JSON.stringify({ success: true, message: "Email enviado com sucesso via Gmail" }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("[Gmail] Error in send-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
