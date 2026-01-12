// ============================================
// VERSÃO: 5.6.0 | DEPLOY: 2026-01-12
// FIX: URL shortener + mensagens com nome do usuário
// ============================================

const FUNCTION_VERSION = "5.6.0";
const SITE_URL = "https://fia.iconsai.ai";

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    description: "Código de verificação OTP",
    type: "authentication",
    totalVariables: 1,
    variableNames: ["codigo"],
  },
  resend_code: {
    sid: "HX026907ac8e769389acfda75829c5d543",
    description: "Reenvio de código OTP",
    type: "authentication",
    totalVariables: 1,
    variableNames: ["codigo"],
  },
  welcome: {
    sid: "HX35461ac69adc68257f54eb030fafe4b1",
    description: "Boas-vindas após verificação",
    type: "utility",
    totalVariables: 1,
    variableNames: ["nome"],
  },
  invitation: {
    sid: "HX76217d9d436086e8adc6d1e185c7e2ee",
    description: "Convite de acesso ao PWA",
    type: "utility",
    totalVariables: 3,
    variableNames: ["nome", "quem_convidou", "url"],
  },
  resend_welcome: {
    sid: "HX9ccbe49ea4063c9155c3ebd67738556e",
    description: "Reenvio de boas-vindas",
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
// URL SHORTENER - TinyURL API (gratuita)
// ===========================================
async function shortenUrl(longUrl: string): Promise<string> {
  try {
    console.log(`[URL-SHORTENER] Encurtando: ${longUrl.slice(0, 50)}...`);

    const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`, {
      method: "GET",
    });

    if (response.ok) {
      const shortUrl = await response.text();
      console.log(`[URL-SHORTENER] Resultado: ${shortUrl}`);
      return shortUrl.trim();
    }

    console.warn(`[URL-SHORTENER] HTTP ${response.status}, usando URL original`);
  } catch (e) {
    console.warn(`[URL-SHORTENER] Erro: ${e}, usando URL original`);
  }

  return longUrl;
}

// ===========================================
// EXTRAIR PRIMEIRO NOME
// ===========================================
function getFirstName(fullName: string): string {
  if (!fullName) return "Voce";
  return fullName.split(" ")[0] || "Voce";
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
  console.log(`[SMS] Template: ${templateName}`);
  console.log(`[SMS] Variáveis: ${JSON.stringify(variables)}`);

  let smsText = "";
  const nome = getFirstName(variables["1"] || "");

  switch (templateName) {
    case "otp":
    case "resend_code":
      // Código de verificação - COM NOME
      smsText = `KnowYOU: Ola ${nome}! Codigo: ${variables["1"]}. Valido 2min.`;
      break;

    case "welcome":
      smsText = `KnowYOU: Ola ${nome}! Bem-vindo. Acesse: ${SITE_URL}/pwa`;
      break;

    case "resend_welcome":
      smsText = `KnowYOU: Ola ${nome}! Acesse: ${SITE_URL}/pwa`;
      break;

    case "invitation": {
      // Convite - URL já deve vir encurtada
      let inviteUrl = variables["3"] || `${SITE_URL}/pwa-register`;

      // Se URL ainda é longa, encurtar
      if (inviteUrl.length > 30) {
        inviteUrl = await shortenUrl(inviteUrl);
      }

      smsText = `KnowYOU: Ola ${nome}! Voce foi convidado. Acesse: ${inviteUrl}`;
      break;
    }

    default:
      smsText = `KnowYOU: ${Object.values(variables).join(" ")}`;
  }

  console.log(`[SMS] To: ${to.slice(0, 5)}***`);
  console.log(`[SMS] Texto (${smsText.length} chars): ${smsText}`);
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

  const respond = (payload: Record<string, unknown>) => {
    const processingTime = Date.now() - startTime;
    const responseBody = { ...payload, processingTimeMs: processingTime, version: FUNCTION_VERSION };

    console.log(`[RESULTADO] Sucesso: ${payload.success ? "✅" : "❌"} | Tempo: ${processingTime}ms`);

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  };

  try {
    const body = (await req.json()) as NotificationRequest;
    const { to, template, variables, channel = "sms", userId } = body;

    console.log(`[REQUEST] Template: ${template} | Canal: ${channel}`);

    // Validações
    if (!to) {
      return respond({ success: false, error: "Campo 'to' obrigatório", error_code: "VALIDATION_ERROR" });
    }

    if (!template) {
      return respond({ success: false, error: "Campo 'template' obrigatório", error_code: "VALIDATION_ERROR" });
    }

    const templateConfig = TEMPLATES[template];
    if (!templateConfig) {
      return respond({
        success: false,
        error: `Template '${template}' não existe. Disponíveis: ${Object.keys(TEMPLATES).join(", ")}`,
        error_code: "VALIDATION_ERROR",
      });
    }

    const phone = normalizePhone(to);

    if (!phone.match(/^\+[1-9]\d{10,14}$/)) {
      return respond({ success: false, error: "Formato de telefone inválido", error_code: "VALIDATION_ERROR" });
    }

    // Envio via SMS
    const result = await sendSmsViaFunction(phone, template, variables);

    // Logging
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
          variables,
          provider: result.provider,
          version: FUNCTION_VERSION,
        },
      });
    } catch (logError) {
      console.warn("[LOG] Falha ao registrar:", logError);
    }

    return respond({
      success: result.success,
      channel: result.channel,
      messageId: result.messageId || null,
      error: result.error || null,
      provider: result.provider || null,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[ERRO FATAL] ${errMsg}`);
    return respond({ success: false, error: errMsg, error_code: "INTERNAL_ERROR" });
  }
});
