// ============================================
// VERSAO: 5.1.0 | DEPLOY: 2026-01-09
// FIX: OTP sempre via SMS (Authentication não aceita variáveis)
// FIX: Templates Utility com variáveis corretas
// FIX: invitation_v3 com URL dinâmica no botão ({{3}})
// ============================================

const FUNCTION_VERSION = "5.1.0";

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Twilio Config
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;
const TWILIO_WHATSAPP_NUMBER = "+16039454873";

// ===========================================
// TEMPLATES - CONFIGURAÇÃO CORRETA
// Baseado nos prints de tela do Twilio Console
// ===========================================
interface TemplateConfig {
  sid: string;
  description: string;
  type: "authentication" | "utility";
  bodyVariables: number; // Quantas variáveis o body aceita
  buttonVariables: number; // Quantas variáveis o botão aceita (URL dinâmica)
}

const TEMPLATES: Record<string, TemplateConfig> = {
  otp: {
    sid: "HX15dbff375b023b2d1514038027db6ad0",
    description: "Código de verificação OTP",
    type: "authentication",
    bodyVariables: 0, // ❌ Authentication: código hardcoded "403239"
    buttonVariables: 0,
  },
  resend_code: {
    sid: "HX026907ac8e769389acfda75829c5d543",
    description: "Reenvio de código OTP",
    type: "authentication",
    bodyVariables: 0, // ❌ Authentication: código hardcoded "403239"
    buttonVariables: 0,
  },
  welcome: {
    sid: "HX35461ac69adc68257f54eb030fafe4b1",
    description: "Boas-vindas após verificação",
    type: "utility",
    bodyVariables: 1, // {{1}} = nome
    buttonVariables: 0,
  },
  invitation: {
    sid: "HX76217d9d436086e8adc6d1e185c7e2ee",
    description: "Convite de acesso ao PWA (knowyou_invitation_v3)",
    type: "utility",
    bodyVariables: 2, // {{1}} = nome, {{2}} = quem convidou
    buttonVariables: 1, // {{3}} = path da URL do botão
  },
  resend_welcome: {
    sid: "HX9ccbe49ea4063c9155c3ebd67738556e",
    description: "Reenvio de boas-vindas",
    type: "utility",
    bodyVariables: 1, // {{1}} = nome
    buttonVariables: 0,
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
  if (cleaned.length === 10 || cleaned.length === 11) {
    cleaned = "55" + cleaned;
  }
  if (!cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }
  return cleaned;
}

// ===========================================
// MAPEAMENTO DE ERROS TWILIO
// ===========================================
const TWILIO_ERROR_MESSAGES: Record<number, string> = {
  63016: "Mensagem freeform fora da janela de 24h. Use templates.",
  63024: "Número não habilitado para WhatsApp Business.",
  63025: "Taxa de envio excedida. Aguarde.",
  63026: "Conta não conectada ao WhatsApp Business.",
  63028: "Número de parâmetros não corresponde ao template.",
  21408: "Número não está no sandbox.",
  21608: "Número não registrado no WhatsApp.",
  21610: "Número bloqueado.",
  21614: "Número de destino inválido.",
};

// ===========================================
// ENVIO SMS VIA INFOBIP
// ===========================================
async function sendSmsViaInfobip(
  to: string,
  templateName: string,
  variables: Record<string, string>,
): Promise<SendResult> {
  console.log("\n[SMS-INFOBIP] ========================================");
  console.log("[SMS-INFOBIP] Enviando via Infobip...");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Montar mensagem baseada no template
  let smsText = "";

  switch (templateName) {
    case "otp":
    case "resend_code":
      smsText = `KnowYOU: Seu codigo de verificacao e ${variables["1"]}. Valido por 10 minutos. Nao compartilhe.`;
      break;
    case "welcome":
      smsText = `KnowYOU: Ola ${variables["1"] || "Usuario"}! Bem-vindo ao KnowYOU. Acesse: https://hmv.knowyou.app/pwa`;
      break;
    case "resend_welcome":
      smsText = `KnowYOU: Ola ${variables["1"] || "Usuario"}! Seu acesso esta ativo. Entre em: https://hmv.knowyou.app/pwa`;
      break;
    case "invitation":
      smsText = `KnowYOU: ${variables["1"] || "Voce"} foi convidado por ${variables["2"] || "Equipe KnowYOU"}! Acesse: https://hmv.knowyou.app/pwa-register`;
      break;
    default:
      smsText = `KnowYOU: ${Object.values(variables).join(" ")}`;
  }

  console.log(`[SMS-INFOBIP] To: ${to.slice(0, 5)}***`);
  console.log(`[SMS-INFOBIP] Template: ${templateName}`);
  console.log(`[SMS-INFOBIP] Texto: ${smsText.slice(0, 50)}...`);
  console.log("[SMS-INFOBIP] ========================================\n");

  try {
    const smsResponse = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        phoneNumber: to,
        message: smsText,
        eventType: "pwa_notification",
      }),
    });

    const smsData = await smsResponse.json();
    console.log(`[SMS-INFOBIP] Response:`, JSON.stringify(smsData));

    return {
      success: smsData.success,
      channel: "sms",
      messageId: smsData.messageId,
      error: smsData.error,
    };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[SMS-INFOBIP] ERRO: ${errMsg}`);
    return {
      success: false,
      channel: "sms",
      error: errMsg,
    };
  }
}

// ===========================================
// ENVIO WHATSAPP VIA TWILIO
// ===========================================
async function sendWhatsAppViaTwilio(
  to: string,
  templateSid: string,
  contentVariables: Record<string, string>,
  templateName?: string,
): Promise<SendResult> {
  const fromNumber = `whatsapp:${TWILIO_WHATSAPP_NUMBER}`;
  const toNumber = `whatsapp:${to}`;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const statusCallbackUrl = `${supabaseUrl}/functions/v1/twilio-status-callback`;

  const body = new URLSearchParams({
    From: fromNumber,
    To: toNumber,
    ContentSid: templateSid,
    ContentVariables: JSON.stringify(contentVariables),
    StatusCallback: statusCallbackUrl,
  });

  console.log(`\n[WHATSAPP] ========================================`);
  console.log(`[WHATSAPP] From: ${fromNumber}`);
  console.log(`[WHATSAPP] To: ${toNumber}`);
  console.log(`[WHATSAPP] ContentSid: ${templateSid}`);
  console.log(`[WHATSAPP] ContentVariables: ${JSON.stringify(contentVariables)}`);
  console.log(`[WHATSAPP] ========================================\n`);

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
      console.log(`[WHATSAPP] ✅ ACEITO`);
      console.log(`[WHATSAPP] Message SID: ${data.sid}`);
      return {
        success: true,
        channel: "whatsapp",
        messageId: data.sid,
      };
    } else {
      const errorCode = data.code || 0;
      const friendlyError = TWILIO_ERROR_MESSAGES[errorCode] || data.message || "Erro desconhecido";

      console.error(`[WHATSAPP] ❌ FALHA`);
      console.error(`[WHATSAPP] Error Code: ${errorCode}`);
      console.error(`[WHATSAPP] Error: ${data.message}`);

      return {
        success: false,
        channel: "whatsapp",
        error: `[${errorCode}] ${friendlyError}`,
        errorCode,
      };
    }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[WHATSAPP] EXCEÇÃO: ${errMsg}`);
    return {
      success: false,
      channel: "whatsapp",
      error: errMsg,
    };
  }
}

// ===========================================
// HANDLER PRINCIPAL
// ===========================================
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log(`\n${"=".repeat(60)}`);
  console.log(`[SEND-PWA-NOTIFICATION v${FUNCTION_VERSION}] ${new Date().toISOString()}`);
  console.log(`${"=".repeat(60)}\n`);

  try {
    const body = (await req.json()) as NotificationRequest;
    const { to, template, variables, channel = "whatsapp", userId } = body;

    console.log(`[REQUEST] Template: ${template}`);
    console.log(`[REQUEST] Canal: ${channel}`);
    console.log(`[REQUEST] Telefone: ${to?.slice(0, 5)}***`);
    console.log(`[REQUEST] Variáveis: ${JSON.stringify(variables)}`);

    // Validações
    if (!to) {
      return new Response(JSON.stringify({ success: false, error: "Campo 'to' obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!template) {
      return new Response(JSON.stringify({ success: false, error: "Campo 'template' obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const templateConfig = TEMPLATES[template];
    if (!templateConfig) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Template '${template}' não existe. Disponíveis: ${Object.keys(TEMPLATES).join(", ")}`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`[TEMPLATE] Nome: ${template}`);
    console.log(`[TEMPLATE] Tipo: ${templateConfig.type}`);
    console.log(`[TEMPLATE] Variáveis esperadas: ${templateConfig.bodyVariables}`);

    // Normalizar telefone
    const phone = normalizePhone(to);
    console.log(`[TELEFONE] Normalizado: ${phone}`);

    if (!phone.match(/^\+[1-9]\d{10,14}$/)) {
      return new Response(JSON.stringify({ success: false, error: "Formato de telefone inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===========================================
    // ESTRATÉGIA DE ENVIO
    // ===========================================
    let result: SendResult;
    const attempts: SendResult[] = [];

    const isAuthenticationTemplate = templateConfig.type === "authentication";

    if (isAuthenticationTemplate) {
      // ============================================
      // OTP/CÓDIGOS: SEMPRE VIA SMS
      // Templates Authentication não aceitam variáveis customizadas
      // O código no template é hardcoded "403239"
      // ============================================
      console.log("\n[ESTRATÉGIA] Template AUTHENTICATION - FORÇANDO SMS");
      console.log("[MOTIVO] WhatsApp Authentication templates têm código hardcoded");
      console.log("[SOLUÇÃO] Enviando código real via SMS Infobip");

      result = await sendSmsViaInfobip(phone, template, variables);
      attempts.push(result);
    } else if (channel === "sms") {
      // Canal SMS explicitamente solicitado
      console.log("\n[ESTRATÉGIA] Canal SMS solicitado");

      result = await sendSmsViaInfobip(phone, template, variables);
      attempts.push(result);
    } else {
      // ============================================
      // UTILITY: WhatsApp primeiro, fallback SMS
      // ============================================
      console.log("\n[ESTRATÉGIA] Template UTILITY - WhatsApp primeiro");

      // Montar variáveis para body E botão
      // Twilio Content API: variáveis são SEQUENCIAIS
      // Body: {{1}}, {{2}} | Button: {{3}} (continua a sequência)
      const contentVariables: Record<string, string> = {};

      // Variáveis do body
      for (let i = 1; i <= templateConfig.bodyVariables; i++) {
        contentVariables[String(i)] = variables[String(i)] || "";
      }

      // Variáveis do botão (continuam a numeração)
      for (let i = 1; i <= templateConfig.buttonVariables; i++) {
        const varIndex = templateConfig.bodyVariables + i;
        contentVariables[String(varIndex)] = variables[String(varIndex)] || "";
      }

      const totalVars = templateConfig.bodyVariables + templateConfig.buttonVariables;
      console.log(
        `[VARIÁVEIS] Body: ${templateConfig.bodyVariables}, Button: ${templateConfig.buttonVariables}, Total: ${totalVars}`,
      );
      console.log(`[VARIÁVEIS] ${JSON.stringify(contentVariables)}`);

      // Validar se todas as variáveis foram fornecidas
      const missingVars = [];
      for (let i = 1; i <= totalVars; i++) {
        if (!contentVariables[String(i)]) {
          missingVars.push(`{{${i}}}`);
        }
      }

      if (missingVars.length > 0) {
        console.warn(`[AVISO] Variáveis faltando: ${missingVars.join(", ")}`);
      }

      if (missingVars.length > 0) {
        console.warn(`[AVISO] Variáveis faltando: ${missingVars.join(", ")}`);
      }

      // Tentativa 1: WhatsApp
      console.log("\n[TENTATIVA 1] WhatsApp via Twilio");
      result = await sendWhatsAppViaTwilio(phone, templateConfig.sid, contentVariables, template);
      attempts.push(result);

      // Fallback: SMS se WhatsApp falhar
      if (!result.success) {
        console.log("\n[FALLBACK] WhatsApp falhou - tentando SMS");
        result = await sendSmsViaInfobip(phone, template, variables);
        attempts.push(result);
      }
    }

    // ===========================================
    // LOGGING
    // ===========================================
    try {
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

      const logStatus =
        result.channel === "whatsapp" && result.success ? "pending" : result.success ? "success" : "failed";

      await supabase.from("notification_logs").insert({
        event_type: "pwa_notification",
        recipient: phone,
        channel: result.channel,
        subject: `${template} notification`,
        status: logStatus,
        message_sid: result.messageId || null,
        error_message: result.error || null,
        metadata: {
          user_id: userId || null,
          template,
          templateType: templateConfig.type,
          variables,
          attempts: attempts.map((a) => ({
            channel: a.channel,
            success: a.success,
            error: a.error || null,
          })),
          version: FUNCTION_VERSION,
          processingTimeMs: Date.now() - startTime,
        },
      });
    } catch (logError) {
      console.warn("[LOG] Falha ao registrar:", logError);
    }

    // ===========================================
    // RESULTADO
    // ===========================================
    const processingTime = Date.now() - startTime;

    console.log(`\n${"=".repeat(60)}`);
    console.log(`[RESULTADO]`);
    console.log(`Sucesso: ${result.success ? "✅" : "❌"}`);
    console.log(`Canal: ${result.channel}`);
    console.log(`Tentativas: ${attempts.length}`);
    console.log(`Tempo: ${processingTime}ms`);
    console.log(`${"=".repeat(60)}\n`);

    return new Response(
      JSON.stringify({
        success: result.success,
        channel: result.channel,
        templateType: templateConfig.type,
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

    return new Response(JSON.stringify({ success: false, error: errMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
