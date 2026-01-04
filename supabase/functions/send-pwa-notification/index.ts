// ============================================
// VERSAO: 4.7.0 | DEPLOY: 2026-01-04
// FIX: Corrigido mapeamento de variáveis para Twilio Content API
// FIX: Template knowyou_invitation_v2 usa {{1}}, {{2}}, {{3}} sequencial
// ============================================

const FUNCTION_VERSION = "4.7.0";

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Twilio Config (apenas para WhatsApp)
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;
const TWILIO_WHATSAPP_NUMBER = "+16039454873";

// ===========================================
// INTERFACE PARA CONFIGURAÇÃO DE TEMPLATES
// ===========================================
interface TemplateConfig {
  sid: string;
  description: string;
  type: "authentication" | "utility";
  bodyVariables: number;      // Variáveis no corpo da mensagem
  buttonVariables: number;    // Variáveis no botão (URL dinâmica)
  totalVariables: number;     // Total para validação de entrada
}

// ===========================================
// TEMPLATES APROVADOS NO TWILIO CONSOLE
// IMPORTANTE: Variáveis são SEQUENCIAIS (body + button = 1, 2, 3...)
// Confirmado via twilio-content-inspector em 2026-01-04
// ===========================================
const TEMPLATES: Record<string, TemplateConfig> = {
  otp: {
    sid: "HX15dbff375b023b2d1514038027db6ad0",
    description: "Código de verificação OTP",
    type: "authentication",
    bodyVariables: 0,
    buttonVariables: 0,
    totalVariables: 0,
  },
  welcome: {
    sid: "HX35461ac69adc68257f54eb030fafe4b1",
    description: "Boas-vindas após verificação",
    type: "utility",
    bodyVariables: 1,      // {{1}} = nome
    buttonVariables: 1,    // {{1}} = path do botão (numeração separada!)
    totalVariables: 2,     // Total que recebemos: nome + path
  },
  resend_code: {
    sid: "HX026907ac8e769389acfda75829c5d543",
    description: "Reenvio de código OTP",
    type: "authentication",
    bodyVariables: 0,
    buttonVariables: 0,
    totalVariables: 0,
  },
  invitation: {
    sid: "HX56dca3b12701c186f1f3daa58f5785c3",
    description: "Convite de acesso ao PWA",
    type: "utility",
    bodyVariables: 2,      // {{1}} = nome, {{2}} = quem convidou
    buttonVariables: 1,    // {{1}} = path (numeração separada!)
    totalVariables: 3,     // Total que recebemos: nome + quemConvidou + path
  },
  resend_welcome: {
    sid: "HX9ccbe49ea4063c9155c3ebd67738556e",
    description: "Reenvio de boas-vindas",
    type: "utility",
    bodyVariables: 1,      // {{1}} = nome
    buttonVariables: 1,    // {{1}} = path do botão (numeração separada!)
    totalVariables: 2,     // Total que recebemos: nome + path
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
  63028: "Número de parâmetros não corresponde ao template.",
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
// ENVIO SMS VIA INFOBIP (não Twilio!)
// ===========================================
async function sendSmsViaInfobip(
  to: string,
  templateName: string,
  variables: Record<string, string>,
): Promise<SendResult> {
  console.log("\n[SMS-INFOBIP] ========================================");
  console.log("[SMS-INFOBIP] Redirecionando SMS para Infobip...");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Montar mensagem baseada no template
  let smsText = "";

  switch (templateName) {
    case "otp":
    case "resend_code":
      smsText = `KnowYOU: Seu codigo de verificacao e ${variables["1"]}. Valido por 10 minutos.`;
      break;
    case "welcome":
      smsText = `KnowYOU: Olá ${variables["1"] || "Usuário"}! Bem-vindo ao KnowYOU. Acesse: https://hmv.knowyou.app/${variables["2"] || "login"}`;
      break;
    case "resend_welcome":
      smsText = `KnowYOU: Olá ${variables["1"] || "Usuário"}! Notamos que você ainda não acessou. Entre em: https://hmv.knowyou.app/${variables["2"] || "login"}`;
      break;
    case "invitation":
      smsText = `KnowYOU: ${variables["1"] || "Você"} foi convidado por ${variables["2"] || "Equipe KnowYOU"}! Acesse: https://hmv.knowyou.app/${variables["3"] || ""}`;
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
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        phoneNumber: to,
        message: smsText,
        eventType: "notification_fallback",
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
    console.error(`[SMS-INFOBIP] 💥 EXCEÇÃO: ${errMsg}`);
    return {
      success: false,
      channel: "sms",
      error: errMsg,
    };
  }
}

// ===========================================
// ENVIO WHATSAPP VIA TWILIO (com templates)
// Suporta separação de variáveis body/button para templates com URL dinâmica
// ===========================================
async function sendWhatsAppViaTwilio(
  to: string,
  templateSid: string,
  bodyVariables: Record<string, string>,
  buttonVariables: Record<string, string>,
  templateName?: string,
): Promise<SendResult> {
  const fromNumber = `whatsapp:${TWILIO_WHATSAPP_NUMBER}`;
  const toNumber = `whatsapp:${to}`;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

  // Status Callback URL para rastrear entrega
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const statusCallbackUrl = `${supabaseUrl}/functions/v1/twilio-status-callback`;

  // ===========================================
  // FORMATO TWILIO CONTENT API:
  // As variáveis são SEQUENCIAIS: {{1}}, {{2}}, {{3}}, etc.
  // Tanto para body quanto para button URL.
  // Confirmado via twilio-content-inspector em 2026-01-04
  // ===========================================
  
  // Combinar bodyVariables com buttonVariables de forma sequencial
  // Body vars mantém sua numeração original (1, 2, ...)
  // Button vars continuam a sequência (3, 4, ...)
  const allVariables: Record<string, string> = { ...bodyVariables };
  
  // Adicionar variáveis do botão mantendo a numeração sequencial
  const bodyCount = Object.keys(bodyVariables).length;
  Object.entries(buttonVariables).forEach(([key, value], index) => {
    allVariables[String(bodyCount + index + 1)] = value;
  });

  const body = new URLSearchParams({
    From: fromNumber,
    To: toNumber,
    ContentSid: templateSid,
    ContentVariables: JSON.stringify(allVariables),
    StatusCallback: statusCallbackUrl,
  });

  console.log(`\n[WHATSAPP] ========================================`);
  console.log(`[WHATSAPP] From: ${fromNumber}`);
  console.log(`[WHATSAPP] To: ${toNumber}`);
  console.log(`[WHATSAPP] ContentSid: ${templateSid}`);
  console.log(`[WHATSAPP] Body Variables: ${JSON.stringify(bodyVariables)}`);
  console.log(`[WHATSAPP] Button Variables: ${JSON.stringify(buttonVariables)}`);
  console.log(`[WHATSAPP] Combined Variables: ${JSON.stringify(allVariables)}`);
  console.log(`[WHATSAPP] StatusCallback: ${statusCallbackUrl}`);
  console.log(`[WHATSAPP] ========================================`);
  
  // DEBUG: Log do payload completo enviado ao Twilio (Fase D - Observabilidade)
  console.log(`[WHATSAPP DEBUG PAYLOAD] ${body.toString()}`);
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
      console.log(`[WHATSAPP] ✅ ACEITO (aguardando entrega)`);
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
      console.error(`[WHATSAPP] Error Message: ${data.message}`);
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
    console.error(`[WHATSAPP] 💥 EXCEÇÃO: ${errMsg}`);
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
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log(`\n${"=".repeat(60)}`);
  console.log(`[SEND-PWA-NOTIFICATION v${FUNCTION_VERSION}] INICIANDO - ${new Date().toISOString()}`);
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
    console.log(`[TEMPLATE] Tipo: ${templateConfig.type}`);
    console.log(`[TEMPLATE] Body vars: ${templateConfig.bodyVariables}, Button vars: ${templateConfig.buttonVariables}`);
    console.log(`[TEMPLATE] Total esperado: ${templateConfig.totalVariables}`);

    // ===========================================
    // VALIDAÇÃO PREVENTIVA: Contagem de variáveis
    // Evita erro 63028 do Twilio
    // ===========================================
    const providedVarKeys = Object.keys(variables).filter(k => 
      variables[k] !== undefined && variables[k] !== null && variables[k] !== ''
    );
    const providedCount = providedVarKeys.length;
    const expectedCount = templateConfig.totalVariables;

    console.log(`[VARIÁVEIS ESPERADAS] ${expectedCount}`);
    console.log(`[VARIÁVEIS RECEBIDAS] ${providedCount} (${providedVarKeys.join(', ')})`);

    if (templateConfig.type === "utility" && providedCount !== expectedCount) {
      const errorMsg = `Template '${template}' espera ${expectedCount} variável(is) mas recebeu ${providedCount}. Chaves: [${providedVarKeys.join(', ')}]`;
      console.error(`[ERRO VALIDAÇÃO] ${errorMsg}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: errorMsg,
          expected: expectedCount,
          received: providedCount,
          template,
          variablesKeys: providedVarKeys
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    // Verificar credenciais Twilio (apenas para WhatsApp)
    if (channel === "whatsapp" && templateConfig.type === "utility" && (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN)) {
      console.error("[ERRO] Credenciais Twilio não configuradas");
      return new Response(JSON.stringify({ success: false, error: "Credenciais Twilio não configuradas" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===========================================
    // ESTRATÉGIA DE ENVIO
    // Authentication (otp, resend_code) → SMS Infobip (não suportam variáveis no WhatsApp)
    // Utility (welcome, invitation, etc) → WhatsApp Twilio com fallback SMS
    // ===========================================

    let result: SendResult;
    const attempts: SendResult[] = [];

    // Verificar se é template Authentication (não aceita variáveis no WhatsApp)
    const isAuthenticationTemplate = templateConfig.type === "authentication";

    if (isAuthenticationTemplate) {
      // FORÇAR SMS para templates de código
      console.log("\n[ESTRATÉGIA] Template AUTHENTICATION detectado - FORÇANDO SMS via Infobip");
      console.log("[MOTIVO] WhatsApp Authentication templates não aceitam variáveis customizadas");
      console.log(`[TEMPLATE] ${template} (${templateConfig.description})`);

      result = await sendSmsViaInfobip(phone, template, variables);
      attempts.push(result);

    } else if (channel === "sms") {
      // Canal SMS explicitamente solicitado
      console.log("\n[ESTRATÉGIA] Canal SMS solicitado explicitamente");

      result = await sendSmsViaInfobip(phone, template, variables);
      attempts.push(result);

    } else {
      // Templates UTILITY: WhatsApp primeiro, fallback SMS
      console.log("\n[ESTRATÉGIA] Template UTILITY - WhatsApp Twilio primeiro, fallback SMS Infobip");
      console.log(`[TEMPLATE] ${template} (${templateConfig.description})`);
      console.log(`[VARIÁVEIS] Body: ${templateConfig.bodyVariables}, Button: ${templateConfig.buttonVariables}`);

      // ===========================================
      // SEPARAÇÃO DE VARIÁVEIS BODY vs BUTTON
      // Twilio Content API: botões com URL dinâmica têm numeração separada
      // Body: {{1}}, {{2}} | Button: {{1}} (recomeça)
      // ===========================================
      const bodyVars: Record<string, string> = {};
      const buttonVars: Record<string, string> = {};
      
      // Preencher variáveis do body (1 até bodyVariables)
      for (let i = 1; i <= templateConfig.bodyVariables; i++) {
        bodyVars[String(i)] = variables[String(i)] || "";
      }
      
      // Preencher variáveis do botão (começa em 1, pega a partir de bodyVariables + 1 do input)
      for (let i = 1; i <= templateConfig.buttonVariables; i++) {
        const sourceKey = String(templateConfig.bodyVariables + i);
        buttonVars[String(i)] = variables[sourceKey] || "";
      }

      console.log(`[BODY VARS] ${JSON.stringify(bodyVars)}`);
      console.log(`[BUTTON VARS] ${JSON.stringify(buttonVars)}`);

      // Tentativa 1: WhatsApp via Twilio
      console.log("\n[TENTATIVA 1] WhatsApp via Twilio");
      result = await sendWhatsAppViaTwilio(phone, templateSid, bodyVars, buttonVars, template);
      attempts.push(result);

      // Se WhatsApp falhar, tentar SMS via Infobip
      if (!result.success) {
        console.log("\n[FALLBACK] WhatsApp falhou, tentando SMS via Infobip...");
        console.log("\n[TENTATIVA 2] SMS via Infobip");
        result = await sendSmsViaInfobip(phone, template, variables);
        attempts.push(result);
      }
    }

    // ===========================================
    // LOGGING NO SUPABASE
    // ===========================================

    try {
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

      // Status: pending se WhatsApp aceitou (aguardando callback), success/failed para resposta imediata
      const logStatus = result.channel === "whatsapp" && result.success 
        ? "pending"  // WhatsApp aceitou, aguardando callback de entrega
        : (result.success ? "success" : "failed");

      await supabase.from("notification_logs").insert({
        event_type: "pwa_notification",
        recipient: phone,
        channel: result.channel,
        subject: `${template} notification`,
        message_body: `Template: ${template}`,
        status: logStatus,
        message_sid: result.messageId || null,
        provider_status: result.success ? "accepted" : "rejected",
        error_message: result.error || null,
        metadata: {
          user_id: userId || null,
          template: template,
          phone: phone,
          attempts: attempts.map((a) => ({
            channel: a.channel,
            success: a.success,
            error: a.error || null,
            errorCode: a.errorCode || null,
            messageId: a.messageId || null,
          })),
          variables,
          templateSid,
          templateName: template,
          templateType: templateConfig.type,
          requestedChannel: channel,
          forcedSms: isAuthenticationTemplate,
          processingTimeMs: Date.now() - startTime,
          version: FUNCTION_VERSION,
          providers: {
            whatsapp: "twilio",
            sms: "infobip",
          },
          fallback_used: attempts.length > 1,
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
    console.log(`Provider: ${result.channel === "whatsapp" ? "Twilio" : "Infobip"}`);
    console.log(`Template Type: ${templateConfig.type}`);
    console.log(`Forçado SMS: ${isAuthenticationTemplate ? "SIM (Authentication)" : "NÃO"}`);
    console.log(`Message ID: ${result.messageId || "N/A"}`);
    console.log(`Erro: ${result.error || "Nenhum"}`);
    console.log(`Total de tentativas: ${attempts.length}`);
    console.log(`Tempo de processamento: ${processingTime}ms`);

    attempts.forEach((a, i) => {
      const provider = a.channel === "whatsapp" ? "Twilio" : "Infobip";
      console.log(`  [Tentativa ${i + 1}] ${a.channel} (${provider}): ${a.success ? "✅" : "❌"} ${a.error || ""}`);
    });

    console.log(`${"=".repeat(60)}\n`);

    return new Response(
      JSON.stringify({
        success: result.success,
        channel: result.channel,
        provider: result.channel === "whatsapp" ? "twilio" : "infobip",
        templateType: templateConfig.type,
        forcedSms: isAuthenticationTemplate,
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
