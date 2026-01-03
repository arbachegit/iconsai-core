// ============================================
// VERSAO: 4.0.0 | DEPLOY: 2026-01-03
// MIGRACAO: Twilio -> Infobip para SMS
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const sanitizePhoneNumber = (phone: string): string => {
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned.startsWith('+')) {
    cleaned = cleaned.replace(/^0+/, '');
    if (!cleaned.startsWith('55')) {
      cleaned = '55' + cleaned;
    }
  }
  // Infobip não usa + no número
  return cleaned.replace('+', '');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log("\n=== SEND-SMS v4.0 (INFOBIP) START ===");
  console.log(`[TIMESTAMP] ${new Date().toISOString()}`);

  try {
    const { phoneNumber: rawPhone, message, eventType } = await req.json();
    
    if (!rawPhone || !message) {
      console.error("❌ Campos obrigatórios faltando");
      throw new Error('phoneNumber and message are required');
    }

    const phoneNumber = sanitizePhoneNumber(rawPhone);
    console.log(`📱 [TELEFONE] Original: ${rawPhone}`);
    console.log(`📱 [TELEFONE] Formatado: ${phoneNumber.slice(0, 6)}***`);
    console.log(`📝 [EVENTO] ${eventType || 'manual'}`);

    // Credenciais Infobip
    const apiKey = Deno.env.get('INFOBIP_API_KEY');
    const baseUrl = Deno.env.get('INFOBIP_BASE_URL') || '5589kd.api.infobip.com';
    const sender = Deno.env.get('INFOBIP_SENDER') || 'KnowYOU';

    if (!apiKey) {
      console.error("❌ INFOBIP_API_KEY não configurada");
      throw new Error('INFOBIP_API_KEY não configurada');
    }

    console.log(`\n📤 [INFOBIP] ========================================`);
    console.log(`📤 [INFOBIP] Base URL: ${baseUrl}`);
    console.log(`📤 [INFOBIP] From: ${sender}`);
    console.log(`📤 [INFOBIP] To: ${phoneNumber}`);
    console.log(`📤 [INFOBIP] Message: ${message.slice(0, 50)}...`);
    console.log(`📤 [INFOBIP] ========================================\n`);

    const response = await fetch(`https://${baseUrl}/sms/2/text/advanced`, {
      method: 'POST',
      headers: {
        'Authorization': `App ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{
          destinations: [{ to: phoneNumber }],
          from: sender,
          text: message
        }]
      }),
    });

    const data = await response.json();
    console.log(`📩 [INFOBIP] Response Status: ${response.status}`);
    console.log(`📩 [INFOBIP] Response:`, JSON.stringify(data));

    const messageStatus = data.messages?.[0];
    
    if (!messageStatus) {
      throw new Error('Resposta inválida da Infobip');
    }

    // Verificar status
    const groupName = messageStatus.status?.groupName;
    
    if (groupName === 'REJECTED') {
      console.error(`❌ [INFOBIP] SMS REJEITADO: ${messageStatus.status.description}`);
      throw new Error(`SMS rejeitado: ${messageStatus.status.description}`);
    }

    if (groupName === 'PENDING' || groupName === 'PENDING_ACCEPTED') {
      console.log(`✅ [SUCESSO] SMS aceito para envio`);
    }

    console.log(`✅ [SUCESSO] Message ID: ${messageStatus.messageId}`);
    console.log(`✅ [SUCESSO] Status: ${messageStatus.status?.name}`);
    console.log("=== SEND-SMS v4.0 (INFOBIP) END ===\n");

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: messageStatus.messageId,
        status: messageStatus.status?.name,
        statusGroup: messageStatus.status?.groupName,
        channel: 'sms',
        provider: 'infobip'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ [ERRO]', error.message);
    console.log("=== SEND-SMS v4.0 (INFOBIP) END (ERROR) ===\n");
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message, 
        channel: 'sms',
        provider: 'infobip'
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
