import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

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

    console.log("Sending email to:", to);
    console.log("Subject:", subject);

    // Enviar via Resend
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    
    const { error: resendError, data } = await resend.emails.send({
      from: "KnowYOU <noreply@resend.dev>", // Use your verified domain
      to: [to],
      subject,
      html: body
    });

    if (resendError) {
      throw new Error(`Erro ao enviar email: ${resendError.message}`);
    }

    console.log("Email sent successfully:", data);

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully", emailId: data?.id }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-email function:", error);
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
