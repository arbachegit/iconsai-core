// ============================================
// VERSÃO: 5.4.0 | DEPLOY: 2026-01-11
// FIX: Corrigido URL do convite SMS - domínio correto
// TEMPORÁRIO: Forçando SMS para TODOS os templates
// MOTIVO: Templates WhatsApp aguardando aprovação Twilio
// TODO: Reverter para WhatsApp quando templates aprovados
// ============================================

const FUNCTION_VERSION = "5.4.0";

// URL base do sistema
const SITE_URL = "https://fia.iconsai.ai";

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
// TEMPLATES - CONFIGURAÇÃO BASEADA NOS PRINTS DO TWILIO CONSOLE
//
// IMPORTANTE: As variáveis são SEQUENCIAIS em todo o template
// Body usa {{1}}, {{2}}, etc.
// Button URL continua a sequência: {{3}}, {{4}}, etc.
// ===========================================
interface TemplateConfig {
  sid: string;
  description: string;
  type: "authentication" | "utility";
  totalVariables: number; // Total de variáveis no template (body + button)
  variableNames: string[]; // Nomes descritivos para log
}

const TEMPLATES: Record<string, TemplateConfig> = {
  otp: {
    sid: "HX15dbff375b023b2d1514038027db6ad0",
    description: "Código de verificação OTP (knowyou_otp)",
    type: "authentication",
    totalVariables: 0, // Authentication: código hardcoded "403239"
    variableNames: [],
  },
  resend_code: {
    sid: "HX026907ac8e769389acfda75829c5d543",
    description: "Reenvio de código OTP (knowyou_resend_code)",
    type: "authentication",
    totalVariables: 0, // Authentication: código hardcoded "403239"
    variableNames: [],
  },
  welcome: {
    sid: "HX35461ac69adc68257f54eb030fafe4b1",
    description: "Boas-vindas após verificação (knowyou_welcome)",
    type: "utility",
    totalVariables: 1, // {{1}} = nome
    variableNames: ["nome"],
  },
  invitation: {
    sid: "HX76217d9d436086e8adc6d1e185c7e2ee",
    description: "Convite de acesso ao PWA (knowyou_invitation_v3)",
    type: "utility",
    totalVariables: 3, // {{1}} = nome, {{2}} = quem convidou, {{3}} = path URL
    variableNames: ["nome", "quem_convidou", "path_url"],
  },
  resend_welcome: {
    sid: "HX9ccbe49ea4063c9155c3ebd67738556e",
    description: "Reenvio de boas-vindas (knowyou_resend_welcome)",
    type: "utility",
    totalVariables: 1, // {{1}} = nome
    variableNames: ["nome"],
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
  21656: "ContentVariables inválido - verifique formato JSON.",
};

// ===========================================
// CONSTRUIR URL COMPLETA
// ===========================================
function buildFullUrl(urlOrPath: string): string {
  if (!urlOrPath) return `${SITE_URL}/pwa`;
  if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")) {
    return urlOrPath;
  }
  const cleanPath = urlOrPath.startsWith("/") ? urlOrPath.slice(1) : urlOrPath;
  return `${SITE_URL}/${cleanPath}`;
}

// ===========================================
// ENVIO SMS VIA INFOBIP
// ===========================================
async function sendSmsViaInfobip(
  to: string,
  templateName: string,
  variables: Record<string, string>,
): Promise<SendResult> {
  console.log("\n[SMS] ========================================");
  console.log("[SMS] Enviando SMS via função send-sms...");
  console.log(`[INFO] SITE_URL configurado: ${SITE_URL}`);

  // Montar mensagem baseada no template
  let smsText = "";

  switch (templateName) {
    case "otp":
    case "resend_code":
      smsText = `KnowYOU: Seu codigo de verificacao e ${variables["1"]}. Valido por 10 minutos. Nao compartilhe.`;
      break;
    case "welcome":
      smsText = `KnowYOU: Ola ${variables["1"] || "Usuario"}! Bem-vindo ao KnowYOU. Acesse: ${SITE_URL}/pwa`;
      break;
    case "resend_welcome":
      smsText = `KnowYOU: Ola ${variables["1"] || "Usuario"}! Seu acesso esta ativo. Entre em: ${SITE_URL}/pwa`;
      break;
    case "invitation": {
      const fullUrl = buildFullUrl(variables["3"] || "pwa-register");
      smsText = `KnowYOU: Ola ${variables["1"] || "Voce"}! ${variables["2"] || "Equipe KnowYOU"} te convidou. Acesse: ${fullUrl}`;
      break;
    }
    default:
      smsText = `KnowYOU: ${Object.values(variables).join(" ")}`;
  }

  console.log(`[SMS] To: ${to.slice(0, 5)}***`);
  console.log(`[SMS] Template: ${templateName}`);
  console.log(`[SMS] Texto: ${smsText.slice(0, 60)}...`);
  console.log("[SMS] ========================================\n");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: smsData, error: smsError } = await supabase.functions.invoke("send-sms", {
      body: {
        phoneNumber: to,
        message: smsText,
        eventType: "pwa_notification",
      },
    });

    console.log(`[SMS] Provider: ${smsData?.provider || "unknown"}`);
    console.log(`[SMS] Response:`, JSON.stringify(smsData));

    return {
      success: !!smsData?.success && !smsError,
      channel: "sms",
      messageId: smsData?.messageId,
      error: smsError?.message || smsData?.error,
    };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[SMS] ERRO: ${errMsg}`);
    return {
      success: false,
      channel: "sms",
      error: errMsg,
    };
  }
}

// ===========================================
// ENVIO WHATSAPP VIA TWILIO
//
// IMPORTANTE: ContentVariables deve conter TODAS as variáveis
// sequencialmente (1, 2, 3, ...) conforme definido no template.
// Ref: https://www.twilio.com/docs/content/using-variables-with-content-api
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

  // ContentVariables deve ser um JSON string
  const contentVariablesJson = JSON.stringify(contentVariables);

  const body = new URLSearchParams({
    From: fromNumber,
    To: toNumber,
    ContentSid: templateSid,
    ContentVariables: contentVariablesJson,
    StatusCallback: statusCallbackUrl,
  });

  console.log(`\n[WHATSAPP] ========================================`);
  console.log(`[WHATSAPP] From: ${fromNumber}`);
  console.log(`[WHATSAPP] To: ${toNumber}`);
  console.log(`[WHATSAPP] ContentSid: ${templateSid}`);
  console.log(`[WHATSAPP] ContentVariables: ${contentVariablesJson}`);
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
      console.log(`[WHATSAPP] Status: ${data.status}`);
      return {
        success: true,
        channel: "whatsapp",
        messageId: data.sid,
      };
    } else {
      const errorCode = data.code || 0;
      const friendlyError = TWILIO_ERROR_MESSAGES[errorCode] || data.message || "Erro desconhecido";

      console.error(`[WHATSAPP] ❌ FALHA`);
      console.error(`[WHATSAPP] HTTP Status: ${response.status}`);
      console.error(`[WHATSAPP] Error Code: ${errorCode}`);
      console.error(`[WHATSAPP] Error: ${data.message}`);
      console.error(`[WHATSAPP] More Info: ${data.more_info || "N/A"}`);

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
    console.log(`[REQUEST] Canal solicitado: ${channel}`);
    console.log(`[REQUEST] Telefone: ${to?.slice(0, 5)}***`);
    console.log(`[REQUEST] Variáveis recebidas: ${JSON.stringify(variables)}`);

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
    console.log(`[TEMPLATE] Descrição: ${templateConfig.description}`);
    console.log(`[TEMPLATE] Tipo: ${templateConfig.type}`);
    console.log(`[TEMPLATE] Total de variáveis esperadas: ${templateConfig.totalVariables}`);
    console.log(`[TEMPLATE] Nomes das variáveis: ${templateConfig.variableNames.join(", ") || "nenhuma"}`);

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
    // VALIDAR VARIÁVEIS ANTES DE ENVIAR
    // ===========================================
    if (templateConfig.type === "utility" && templateConfig.totalVariables > 0) {
      const missingVars: string[] = [];
      for (let i = 1; i <= templateConfig.totalVariables; i++) {
        if (!variables[String(i)] || variables[String(i)].trim() === "") {
          const varName = templateConfig.variableNames[i - 1] || `var${i}`;
          missingVars.push(`{{${i}}} (${varName})`);
        }
      }

      if (missingVars.length > 0) {
        const errorMsg = `Variáveis faltando para template '${template}': ${missingVars.join(", ")}`;
        console.error(`[VALIDAÇÃO] ${errorMsg}`);
        return new Response(
          JSON.stringify({
            success: false,
            error: errorMsg,
            expected: templateConfig.totalVariables,
            expectedNames: templateConfig.variableNames,
            received: Object.keys(variables).length,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // ===========================================
    // ESTRATÉGIA DE ENVIO - v5.3.0
    // TEMPORÁRIO: Forçando SMS para TODOS os templates
    // MOTIVO: Templates WhatsApp aguardando aprovação Twilio
    // TODO: Reverter para WhatsApp quando templates aprovados
    // ===========================================
    let result: SendResult;
    const attempts: SendResult[] = [];

    console.log("\n[ESTRATÉGIA v5.3.0] FORÇANDO SMS - Templates WhatsApp pendentes");
    console.log(`[INFO] Template: ${template} (${templateConfig.type})`);
    console.log(`[INFO] Canal original solicitado: ${channel}`);
    console.log(`[INFO] Motivo: Templates aguardando aprovação Twilio`);

    result = await sendSmsViaInfobip(phone, template, variables);
    attempts.push(result);

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
          templateSid: templateConfig.sid,
          variables,
          totalVariablesExpected: templateConfig.totalVariables,
          originalChannel: channel,
          forcedSms: true,
          reason: "whatsapp_templates_pending_approval",
          attempts: attempts.map((a) => ({
            channel: a.channel,
            success: a.success,
            error: a.error || null,
            errorCode: a.errorCode || null,
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
    if (result.error) {
      console.log(`Erro: ${result.error}`);
    }
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
