import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get admin settings
    const { data: settings, error: settingsError } = await supabase
      .from("admin_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (settingsError) {
      console.error("Error fetching settings:", settingsError);
      throw settingsError;
    }

    if (!settings?.ml_accuracy_alert_enabled) {
      console.log("ML accuracy alerts disabled");
      return new Response(
        JSON.stringify({ success: true, message: "Alerts disabled" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const threshold = settings.ml_accuracy_threshold || 0.70;
    const alertEmail = settings.ml_accuracy_alert_email || settings.alert_email;

    if (!alertEmail) {
      console.log("No alert email configured");
      return new Response(
        JSON.stringify({ success: true, message: "No alert email configured" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Calculate ML accuracy from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: routingLogs, error: logsError } = await supabase
      .from("document_routing_log")
      .select("action_type")
      .in("action_type", ["ml_accepted", "ml_rejected"])
      .gte("created_at", sevenDaysAgo.toISOString());

    if (logsError) {
      console.error("Error fetching routing logs:", logsError);
      throw logsError;
    }

    if (!routingLogs || routingLogs.length === 0) {
      console.log("No ML routing data available");
      return new Response(
        JSON.stringify({ success: true, message: "No ML data available" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const totalML = routingLogs.length;
    const accepted = routingLogs.filter(l => l.action_type === "ml_accepted").length;
    const accuracyRate = totalML > 0 ? accepted / totalML : 0;

    console.log(`ML Accuracy: ${(accuracyRate * 100).toFixed(1)}% (threshold: ${(threshold * 100).toFixed(0)}%)`);

    // Check if we need to send alert
    if (accuracyRate >= threshold) {
      console.log("Accuracy above threshold, no alert needed");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Accuracy OK",
          accuracyRate: accuracyRate,
          threshold: threshold
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if we already sent an alert in the last 24 hours
    const lastAlert = settings.ml_accuracy_last_alert;
    if (lastAlert) {
      const lastAlertDate = new Date(lastAlert);
      const hoursSinceLastAlert = (Date.now() - lastAlertDate.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastAlert < 24) {
        console.log(`Alert already sent ${hoursSinceLastAlert.toFixed(1)} hours ago`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Alert already sent recently",
            hoursSinceLastAlert
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Send email alert
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resend = new Resend(resendApiKey);

    const emailResponse = await resend.emails.send({
      from: "KnowYOU <onboarding@resend.dev>",
      to: [alertEmail],
      subject: `⚠️ Alerta: Taxa de Acerto ML abaixo do threshold (${(accuracyRate * 100).toFixed(1)}%)`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #e53935;">⚠️ Alerta de Acurácia ML</h1>
          
          <p>A taxa de acerto do sistema de roteamento ML caiu abaixo do threshold configurado.</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Métricas (últimos 7 dias)</h3>
            <ul style="list-style: none; padding: 0;">
              <li><strong>Taxa de Acerto Atual:</strong> <span style="color: #e53935; font-size: 1.2em;">${(accuracyRate * 100).toFixed(1)}%</span></li>
              <li><strong>Threshold Configurado:</strong> ${(threshold * 100).toFixed(0)}%</li>
              <li><strong>Total de Sugestões:</strong> ${totalML}</li>
              <li><strong>Aceitas:</strong> ${accepted}</li>
              <li><strong>Rejeitadas:</strong> ${totalML - accepted}</li>
            </ul>
          </div>
          
          <h3>Recomendações:</h3>
          <ol>
            <li>Revise as regras de roteamento ML no painel de administração</li>
            <li>Analise os padrões de documentos rejeitados recentemente</li>
            <li>Considere ajustar o threshold de confiança mínimo para sugestões</li>
            <li>Verifique se houve mudanças nos tipos de documentos enviados</li>
          </ol>
          
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            Este email foi enviado automaticamente pelo sistema KnowYOU.<br>
            Para configurar alertas, acesse o painel de administração.
          </p>
        </div>
      `,
    });

    console.log("Email sent:", emailResponse);

    // Update last alert timestamp
    await supabase
      .from("admin_settings")
      .update({ ml_accuracy_last_alert: new Date().toISOString() })
      .eq("id", settings.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Alert email sent",
        accuracyRate,
        threshold,
        emailResponse
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in check-ml-accuracy:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
