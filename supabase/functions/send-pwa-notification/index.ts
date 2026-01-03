// ============================================
// VERSAO: 3.0.0 | DEPLOY: 2026-01-02
// CORRECAO CRITICA: Erro 63016 - Templates obrigatórios
// REGRA: NUNCA enviar freeform, SEMPRE usar templates
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Twilio Config
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;
const TWILIO_WHATSAPP_NUMBER = "+17727323860";
const TWILIO_SMS_NUMBER = "+17727323860";

// ===========================================
// TEMPLATES APROVADOS NO TWILIO CONSOLE
// TODOS DEVEM ESTAR COM STATUS "APPROVED"
// ===========================================
const TEMPLATES: Record<string, { sid: string; description: string }> = {
  otp: {
    sid: "HX15dbff375b023b2d1514038027db6ad0",
    description: "Código de verificação OTP",
  },
  welcome: {
    sid: "HX35461ac69adc68257f54eb030fafe4b1",
    description: "Boas-vindas após verificação",
  },
  resend_code: {
    sid: "HX026907ac8e769389acfda75829c5d543",
    description: "Reenvio de código OTP",
  },
  invitation: {
    sid: "HX56dca3b12701c186f1f3daa58f5785c3",
    description: "Convite de acesso ao PWA",
  },
  resend_welcome: {
    sid: "HX9ccbe49ea4063c9155c3ebd67738556e",
    description: "Reenvio de boas-vindas",
  },
};

interface NotificationRequest {
  to: string;
  template: string;
  variables: Record<string, string>;
  channel?: "whatsapp" | "sms";
  userId?: string;
}

interface SendResult {
  success: boolean;
  channel: "whatsapp" | "sms";
  messageId?: string;
  error?: string;
  errorCode?: number;
}

// ===========================================
// NORMALIZAÇÃO DE TELEFONE (E.164)
// ===========================================
function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");

  // Adicionar código do Brasil se necessário
  if (cleaned.length === 10 || cleaned.length === 11) {
    cleaned = "55" + cleaned;
  }

  // Garantir que começa com +
  if (!cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }

  return cleaned;
}

// ===========================================
// MAPEAMENTO DE ERROS TWILIO
// ===========================================
const TWILIO_ERROR_MESSAGES: Record<number, string> = {
  63016: "Mensagem freeform fora da janela de 24h. Use templates aprovados.",
  63024: "Número não está habilitado para WhatsApp Business.",
  63025: "Taxa de envio excedida. Aguarde alguns minutos.",
  63026: "Conta não está conectada ao WhatsApp Business.",
  21408: "Número não está no sandbox do Twilio.",
  21608: "Número não registrado no WhatsApp.",
  21610: "Número bloqueado ou não pode receber mensagens.",
  21614: "Número de destino inválido.",
  21211: "Número de origem inválido.",
  20003: "Autenticação falhou - verifique credenciais.",
  20404: "Recurso não encontrado.",
  30004: "Mensagem bloqueada pelo destinatário.",
  30005: "Número desconhecido ou destino inválido.",
  30006: "Número de destino não pode receber SMS.",
};

// ===========================================
// ENVIO VIA TWILIO COM TEMPLATE (OBRIGATÓRIO)
// ===========================================
async function sendWithTemplate(
  to: string,
  channel: "whatsapp" | "sms",
  templateSid: string,
  variables: Record<string, string>,
): Promise<SendResult> {
  const isWhatsApp = channel === "whatsapp";
  const fromNumber = isWhatsApp ? `whatsapp:${TWILIO_WHATSAPP_NUMBER}` : TWILIO_SMS_NUMBER;
  const toNumber = isWhatsApp ? `whatsapp:${to}` : to;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

  // IMPORTANTE: Usar ContentSid e ContentVariables para templates
  const body = new URLSearchParams({
    From: fromNumber,
    To: toNumber,
    ContentSid: templateSid,
    ContentVariables: JSON.stringify(variables),
  });

  console.log(`\n[${channel.toUpperCase()}] ========================================`);
  console.log(`[${channel.toUpperCase()}] From: ${fromNumber}`);
  console.log(`[${channel.toUpperCase()}] To: ${toNumber}`);
  console.log(`[${channel.toUpperCase()}] ContentSid: ${templateSid}`);
  console.log(`[${channel.toUpperCase()}] ContentVariables: ${JSON.stringify(variables)}`);
  console.log(`[${channel.toUpperCase()}] ========================================\n`);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
      },
      body: body.toString(),
    });

    const data = await response.json();

    if (response.ok && data.sid) {
      console.log(`[${channel.toUpperCase()}] ✅ SUCESSO`);
      console.log(`[${channel.toUpperCase()}] Message SID: ${data.sid}`);
      console.log(`[${channel.toUpperCase()}] Status: ${data.status}`);
      return {
        success: true,
        channel,
        messageId: data.sid,
      };
    } else {
      const errorCode = data.code || 0;
      const friendlyError = TWILIO_ERROR_MESSAGES[errorCode] || data.message || "Erro desconhecido";

      console.error(`[${channel.toUpperCase()}] ❌ FALHA`);
      console.error(`[${channel.toUpperCase()}] HTTP Status: ${response.status}`);
      console.error(`[${channel.toUpperCase()}] Error Code: ${errorCode}`);
      console.error(`[${channel.toUpperCase()}] Error Message: ${data.message}`);
      console.error(`[${channel.toUpperCase()}] More Info: ${data.more_info || "N/A"}`);

      return {
        success: false,
        channel,
        error: `[${errorCode}] ${friendlyError}`,
        errorCode,
      };
    }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[${channel.toUpperCase()}] 💥 EXCEÇÃO: ${errMsg}`);
    return {
      success: false,
      channel,
      error: errMsg,
    };
  }
}

// ===========================================
// HANDLER PRINCIPAL
// ===========================================
serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log(`\n${"=".repeat(60)}`);
  console.log(`[SEND-PWA-NOTIFICATION] INICIANDO - ${new Date().toISOString()}`);
  console.log(`${"=".repeat(60)}\n`);

  try {
    const body = (await req.json()) as NotificationRequest;
    const { to, template, variables, channel = "whatsapp", userId } = body;

    console.log(`[REQUEST] Template: ${template}`);
    console.log(`[REQUEST] Canal solicitado: ${channel}`);
    console.log(`[REQUEST] Telefone: ${to?.slice(0, 5)}***`);
    console.log(`[REQUEST] Variáveis: ${JSON.stringify(variables)}`);
    console.log(`[REQUEST] User ID: ${userId || "N/A"}`);

    // ===========================================
    // VALIDAÇÕES OBRIGATÓRIAS
    // ===========================================

    // Validar campos obrigatórios
    if (!to) {
      console.error("[ERRO] Campo 'to' é obrigatório");
      return new Response(JSON.stringify({ success: false, error: "Campo 'to' (telefone) é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!template) {
      console.error("[ERRO] Campo 'template' é obrigatório");
      return new Response(JSON.stringify({ success: false, error: "Campo 'template' é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!variables || typeof variables !== "object") {
      console.error("[ERRO] Campo 'variables' é obrigatório e deve ser um objeto");
      return new Response(JSON.stringify({ success: false, error: "Campo 'variables' é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validar se template existe
    const templateConfig = TEMPLATES[template];
    if (!templateConfig) {
      const availableTemplates = Object.keys(TEMPLATES).join(", ");
      console.error(`[ERRO] Template '${template}' não existe`);
      console.error(`[ERRO] Templates disponíveis: ${availableTemplates}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Template '${template}' não existe. Disponíveis: ${availableTemplates}`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const templateSid = templateConfig.sid;
    console.log(`[TEMPLATE] Nome: ${template}`);
    console.log(`[TEMPLATE] SID: ${templateSid}`);
    console.log(`[TEMPLATE] Descrição: ${templateConfig.description}`);

    // Normalizar telefone
    const phone = normalizePhone(to);
    console.log(`[TELEFONE] Original: ${to}`);
    console.log(`[TELEFONE] Normalizado: ${phone}`);

    // Validar formato E.164
    if (!phone.match(/^\+[1-9]\d{10,14}$/)) {
      console.error(`[ERRO] Formato de telefone inválido: ${phone}`);
      return new Response(
        JSON.stringify({ success: false, error: "Formato de telefone inválido. Use formato E.164" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verificar credenciais Twilio
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      console.error("[ERRO] Credenciais Twilio não configuradas");
      return new Response(JSON.stringify({ success: false, error: "Credenciais Twilio não configuradas" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===========================================
    // ENVIO COM FALLBACK (SEMPRE TEMPLATE!)
    // ===========================================

    let result: SendResult;
    const attempts: SendResult[] = [];

    if (channel === "sms") {
      // CANAL SMS: Enviar apenas por SMS com template
      console.log("\n[ESTRATÉGIA] Canal SMS solicitado - enviando SMS com template");

      result = await sendWithTemplate(phone, "sms", templateSid, variables);
      attempts.push(result);
    } else {
      // CANAL WHATSAPP: Tentar WhatsApp primeiro, fallback para SMS
      console.log("\n[ESTRATÉGIA] Canal WhatsApp - WhatsApp primeiro, fallback SMS");

      // Tentativa 1: WhatsApp com template
      console.log("\n[TENTATIVA 1] WhatsApp com template");
      result = await sendWithTemplate(phone, "whatsapp", templateSid, variables);
      attempts.push(result);

      // Se WhatsApp falhar, tentar SMS com template
      if (!result.success) {
        console.log("\n[FALLBACK] WhatsApp falhou, tentando SMS com template...");

        // Tentativa 2: SMS com template
        console.log("\n[TENTATIVA 2] SMS com template");
        result = await sendWithTemplate(phone, "sms", templateSid, variables);
        attempts.push(result);
      }
    }

    // ===========================================
    // LOGGING NO SUPABASE
    // ===========================================

    try {
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

      await supabase.from("notification_logs").insert({
        user_id: userId || null,
        phone_number: phone,
        template: template,
        channel: result.channel,
        status: result.success ? "delivered" : "failed",
        twilio_sid: result.messageId || null,
        error_message: result.error || null,
        metadata: {
          attempts: attempts.map((a) => ({
            channel: a.channel,
            success: a.success,
            error: a.error || null,
            errorCode: a.errorCode || null,
            messageId: a.messageId || null,
          })),
          variables,
          templateSid,
          requestedChannel: channel,
          processingTimeMs: Date.now() - startTime,
        },
      });
      console.log("\n[LOG] Notificação registrada no banco de dados");
    } catch (logError) {
      console.warn("[LOG] Falha ao registrar no banco:", logError);
    }

    // ===========================================
    // RESULTADO FINAL
    // ===========================================

    const processingTime = Date.now() - startTime;

    console.log(`\n${"=".repeat(60)}`);
    console.log(`[RESULTADO FINAL]`);
    console.log(`${"=".repeat(60)}`);
    console.log(`Sucesso: ${result.success ? "✅ SIM" : "❌ NÃO"}`);
    console.log(`Canal usado: ${result.channel}`);
    console.log(`Message ID: ${result.messageId || "N/A"}`);
    console.log(`Erro: ${result.error || "Nenhum"}`);
    console.log(`Total de tentativas: ${attempts.length}`);
    console.log(`Tempo de processamento: ${processingTime}ms`);

    attempts.forEach((a, i) => {
      console.log(`  [Tentativa ${i + 1}] ${a.channel}: ${a.success ? "✅" : "❌"} ${a.error || ""}`);
    });

    console.log(`${"=".repeat(60)}\n`);

    return new Response(
      JSON.stringify({
        success: result.success,
        channel: result.channel,
        messageId: result.messageId || null,
        error: result.error || null,
        attempts: attempts.length,
        processingTimeMs: processingTime,
      }),
      {
        status: result.success ? 200 : 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`\n[ERRO FATAL] ${errMsg}`);
    console.error(error);

    return new Response(JSON.stringify({ success: false, error: errMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
