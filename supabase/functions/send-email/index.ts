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
  replyTo?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, body, replyTo }: EmailRequest = await req.json();

    if (!to || !subject || !body) {
      throw new Error("Campos obrigatórios: to, subject, body");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      throw new Error("Email inválido");
    }

    if (subject.length > 200) {
      throw new Error("Assunto muito longo (máximo 200 caracteres)");
    }

    if (body.length > 10000) {
      throw new Error("Corpo muito longo (máximo 10000 caracteres)");
    }

    console.log("[Resend] Processing email request to:", to);

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const emailPayload: any = {
      from: "KnowYOU <onboarding@resend.dev>",
      to: [to],
      subject: subject,
      html: body,
    };

    if (replyTo && emailRegex.test(replyTo)) {
      emailPayload.reply_to = replyTo;
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[Resend] Error sending email:", data);
      throw new Error(data.message || "Failed to send email");
    }

    console.log("[Resend] Email sent successfully:", data?.id);

    return new Response(
      JSON.stringify({ success: true, message: "Email enviado com sucesso", id: data?.id }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("[Resend] Error in send-email function:", error);
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
