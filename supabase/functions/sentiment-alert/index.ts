import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AlertRequest {
  session_id: string;
  sentiment_label: string;
  sentiment_score: number;
  last_messages: Array<{ role: string; content: string }>;
  alert_email: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { session_id, sentiment_label, sentiment_score, last_messages, alert_email }: AlertRequest = await req.json();

    console.log(`[ALERT] Negative sentiment detected: ${sentiment_label} (${sentiment_score}) for session ${session_id}`);

    // Montar resumo da conversa (últimas 3 mensagens)
    const messagesPreview = last_messages
      .slice(-3)
      .map((m) => `${m.role === "user" ? "👤 Usuário" : "🤖 KnowYOU"}: ${m.content}`)
      .join("\n\n");

    const emailBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
            .metric { display: inline-block; padding: 8px 16px; background: white; border-radius: 4px; margin: 8px 4px; border-left: 4px solid #ef4444; }
            .message-box { background: white; padding: 15px; margin: 10px 0; border-radius: 4px; border-left: 4px solid #6366f1; }
            .button { display: inline-block; padding: 12px 24px; background: #8b5cf6; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">🚨 ALERTA: Sentimento Muito Negativo</h1>
            </div>
            <div class="content">
              <h2 style="color: #111827;">Detalhes da Conversa</h2>
              
              <div class="metric">
                <strong>📊 Score:</strong> ${(sentiment_score * 100).toFixed(0)}% (${sentiment_label})
              </div>
              <div class="metric">
                <strong>📅 Data:</strong> ${new Date().toLocaleString("pt-BR")}
              </div>
              <div class="metric">
                <strong>💬 Sessão:</strong> ${session_id}
              </div>
              
              <h3 style="color: #111827; margin-top: 30px;">Últimas Mensagens:</h3>
              <div class="message-box">
                <pre style="white-space: pre-wrap; margin: 0; font-family: inherit;">${messagesPreview}</pre>
              </div>
              
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <strong>⚠️ Ação Recomendada:</strong><br>
                Revise esta conversa no painel administrativo para identificar possíveis problemas e tomar ações corretivas.
              </div>
              
              <a href="${Deno.env.get("SUPABASE_URL") || "https://knowyou.app"}/admin" class="button">
                Ver Conversa Completa no Admin
              </a>
            </div>
            <div class="footer">
              <p>Este é um alerta automático do sistema KnowYOU Analytics</p>
              <p>© ${new Date().getFullYear()} KnowRISK - Todos os direitos reservados</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: "KnowYOU Alerts <suporte@knowrisk.io>",
      to: [alert_email],
      subject: `🚨 Alerta: Conversa com Sentimento Negativo (${session_id})`,
      html: emailBody,
    });

    console.log("[ALERT] Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, email_id: emailResponse.id }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("[ALERT] Error sending alert:", error);
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
