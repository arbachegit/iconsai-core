// ============================================
// VERSÃO: 5.5.0 | DEPLOY: 2026-01-11
// FIX: SEMPRE retorna HTTP 200 com success:true/false
// Elimina erros "non-2xx" no frontend
// ============================================

const FUNCTION_VERSION = "5.5.0";

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
// TEMPLATES
// ===========================================
interface TemplateConfig {
  sid: string;
  description: string;
  type: "authentication" | "utility";
  totalVariables: number;
  variableNames: string[];
}

const TEMPLATES: Record<string, TemplateConfig> = {
  otp: {
    sid: "HX15dbff375b023b2d1514038027db6ad0",
    description: "Código de verificação OTP (knowyou_otp)",
    type: "authentication",
    totalVariables: 0,
    variableNames: [],
  },
  resend_code: {
    sid: "HX026907ac8e769389acfda75829c5d543",
    description: "Reenvio de código OTP (knowyou_resend_code)",
    type: "authentication",
    totalVariables: 0,
    variableNames: [],
  },
  welcome: {
    sid: "HX35461ac69adc68257f54eb030fafe4b1",
    description: "Boas-vindas após verificação (knowyou_welcome)",
    type: "utility",
    totalVariables: 1,
    variableNames: ["nome"],
  },
  invitation: {
    sid: "HX76217d9d436086e8adc6d1e185c7e2ee",
    description: "Convite de acesso ao PWA (knowyou_invitation_v3)",
    type: "utility",
    totalVariables: 3,
    variableNames: ["nome", "quem_convidou", "path_url"],
  },
  resend_welcome: {
    sid: "HX9ccbe49ea4063c9155c3ebd67738556e",
    description: "Reenvio de boas-vindas (knowyou_resend_welcome)",
    type: "utility",
    totalVariables: 1,
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
  errorCode?: string;
  provider?: string;
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
// ENVIO SMS VIA send-sms function
// ===========================================
async function sendSmsViaFunction(
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

    // A função send-sms agora sempre retorna 200, então verificamos success no payload
    if (smsError) {
      console.error(`[SMS] Invoke error:`, smsError);
      return {
        success: false,
        channel: "sms",
        error: smsError.message || "Erro ao invocar send-sms",
        errorCode: "INVOKE_ERROR",
      };
    }

    return {
      success: !!smsData?.success,
      channel: "sms",
      messageId: smsData?.messageId,
      error: smsData?.error,
      errorCode: smsData?.error_code,
      provider: smsData?.provider || "unknown",
    };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[SMS] ERRO: ${errMsg}`);
    return {
      success: false,
      channel: "sms",
      error: errMsg,
      errorCode: "EXCEPTION",
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

  // Helper para resposta padronizada (SEMPRE HTTP 200)
  const respond = (payload: Record<string, unknown>, logResult = true) => {
    const processingTime = Date.now() - startTime;
    const responseBody = { ...payload, processingTimeMs: processingTime, version: FUNCTION_VERSION };
    
    if (logResult) {
      console.log(`\n${"=".repeat(60)}`);
      console.log(`[RESULTADO]`);
      console.log(`Sucesso: ${payload.success ? "✅" : "❌"}`);
      console.log(`Canal: ${payload.channel || "N/A"}`);
      console.log(`Tempo: ${processingTime}ms`);
      if (payload.error) console.log(`Erro: ${payload.error}`);
      console.log(`${"=".repeat(60)}\n`);
    }
    
    return new Response(JSON.stringify(responseBody), {
      status: 200, // SEMPRE 200
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  };

  try {
    const body = (await req.json()) as NotificationRequest;
    const { to, template, variables, channel = "whatsapp", userId } = body;

    console.log(`[REQUEST] Template: ${template}`);
    console.log(`[REQUEST] Canal solicitado: ${channel}`);
    console.log(`[REQUEST] Telefone: ${to?.slice(0, 5)}***`);
    console.log(`[REQUEST] Variáveis recebidas: ${JSON.stringify(variables)}`);

    // Validações - retornam 200 com success:false
    if (!to) {
      return respond({
        success: false,
        error: "Campo 'to' obrigatório",
        error_code: "VALIDATION_ERROR",
      });
    }

    if (!template) {
      return respond({
        success: false,
        error: "Campo 'template' obrigatório",
        error_code: "VALIDATION_ERROR",
      });
    }

    const templateConfig = TEMPLATES[template];
    if (!templateConfig) {
      return respond({
        success: false,
        error: `Template '${template}' não existe. Disponíveis: ${Object.keys(TEMPLATES).join(", ")}`,
        error_code: "VALIDATION_ERROR",
      });
    }

    console.log(`[TEMPLATE] Nome: ${template}`);
    console.log(`[TEMPLATE] Descrição: ${templateConfig.description}`);
    console.log(`[TEMPLATE] Tipo: ${templateConfig.type}`);
    console.log(`[TEMPLATE] Total de variáveis esperadas: ${templateConfig.totalVariables}`);

    // Normalizar telefone
    const phone = normalizePhone(to);
    console.log(`[TELEFONE] Normalizado: ${phone}`);

    if (!phone.match(/^\+[1-9]\d{10,14}$/)) {
      return respond({
        success: false,
        error: "Formato de telefone inválido",
        error_code: "VALIDATION_ERROR",
      });
    }

    // Validar variáveis
    if (templateConfig.type === "utility" && templateConfig.totalVariables > 0) {
      const missingVars: string[] = [];
      for (let i = 1; i <= templateConfig.totalVariables; i++) {
        if (!variables[String(i)] || variables[String(i)].trim() === "") {
          const varName = templateConfig.variableNames[i - 1] || `var${i}`;
          missingVars.push(`{{${i}}} (${varName})`);
        }
      }

      if (missingVars.length > 0) {
        return respond({
          success: false,
          error: `Variáveis faltando para template '${template}': ${missingVars.join(", ")}`,
          error_code: "VALIDATION_ERROR",
          expected: templateConfig.totalVariables,
          expectedNames: templateConfig.variableNames,
          received: Object.keys(variables).length,
        });
      }
    }

    // ===========================================
    // ENVIO - Forçando SMS (WhatsApp pendente aprovação)
    // ===========================================
    console.log("\n[ESTRATÉGIA] FORÇANDO SMS - Templates WhatsApp pendentes");

    const result = await sendSmsViaFunction(phone, template, variables);

    // ===========================================
    // LOGGING
    // ===========================================
    try {
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

      await supabase.from("notification_logs").insert({
        event_type: "pwa_notification",
        recipient: phone,
        channel: result.channel,
        subject: `${template} notification`,
        status: result.success ? "success" : "failed",
        message_sid: result.messageId || null,
        error_message: result.error || null,
        metadata: {
          user_id: userId || null,
          template,
          templateType: templateConfig.type,
          variables,
          originalChannel: channel,
          forcedSms: true,
          provider: result.provider,
          errorCode: result.errorCode,
          version: FUNCTION_VERSION,
          processingTimeMs: Date.now() - startTime,
        },
      });
    } catch (logError) {
      console.warn("[LOG] Falha ao registrar:", logError);
    }

    return respond({
      success: result.success,
      channel: result.channel,
      templateType: templateConfig.type,
      messageId: result.messageId || null,
      error: result.error || null,
      error_code: result.errorCode || null,
      provider: result.provider || null,
      attempts: 1,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`\n[ERRO FATAL] ${errMsg}`);

    return respond({
      success: false,
      error: errMsg,
      error_code: "INTERNAL_ERROR",
    });
  }
});
