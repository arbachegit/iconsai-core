import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sanitize phone number: remove spaces, parentheses, hyphens
const sanitizePhoneNumber = (phone: string): string => {
  let numbers = phone.replace(/\D/g, '');
  
  // Add Brazil country code if needed
  if (numbers.length === 11) {
    numbers = '55' + numbers;
  } else if (numbers.length === 10) {
    numbers = '55' + numbers;
  }
  
  return '+' + numbers;
};

// Map common Twilio error codes to user-friendly messages
const twilioErrorMessages: Record<string, string> = {
  '21608': 'Número não registrado no WhatsApp',
  '21614': 'Número de destino inválido',
  '21211': 'Número de origem inválido - verifique TWILIO_FROM_NUMBER',
  '21408': 'Número não está no sandbox do Twilio',
  '21610': 'Número bloqueado ou não pode receber mensagens',
  '20003': 'Autenticação falhou - verifique Account SID e Auth Token',
  '20404': 'Recurso não encontrado - verifique TWILIO_FROM_NUMBER',
  '63015': 'Número não está no sandbox - use WhatsApp Business',
  '63016': 'Template não aprovado pelo WhatsApp',
  '63024': 'Janela de 24h expirada - use template aprovado',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log("=== SEND-WHATSAPP START ===");

  try {
    const body = await req.json();
    
    // Retrocompatibility: accept both 'phoneNumber' and 'to'
    const rawPhoneNumber = body.phoneNumber || body.to;
    const { message, eventType, contentSid, contentVariables } = body;
    
    console.log('📥 Request body keys:', Object.keys(body));
    
    // Validações
    if (!rawPhoneNumber) {
      console.error('❌ Missing phoneNumber/to');
      return new Response(
        JSON.stringify({ success: false, error: 'phoneNumber ou to é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!message && !contentSid) {
      console.error('❌ Missing message or contentSid');
      return new Response(
        JSON.stringify({ success: false, error: 'message ou contentSid é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitizar telefone
    const phoneNumber = sanitizePhoneNumber(rawPhoneNumber);
    console.log(`📱 Phone: ${phoneNumber.slice(0, 5)}***${phoneNumber.slice(-2)}`);

    // Validar formato
    if (!phoneNumber.match(/^\+[1-9]\d{10,14}$/)) {
      console.error('❌ Invalid phone format:', phoneNumber);
      return new Response(
        JSON.stringify({ success: false, error: 'Formato de telefone inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar credenciais
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER');

    console.log('🔑 Credentials check:', {
      hasAccountSid: !!accountSid,
      hasAuthToken: !!authToken,
      hasFromNumber: !!fromNumber,
      fromNumberPrefix: fromNumber?.slice(0, 5) || 'N/A'
    });

    if (!accountSid || !authToken || !fromNumber) {
      const missing = [];
      if (!accountSid) missing.push('TWILIO_ACCOUNT_SID');
      if (!authToken) missing.push('TWILIO_AUTH_TOKEN');
      if (!fromNumber) missing.push('TWILIO_FROM_NUMBER');
      
      console.error('❌ Missing credentials:', missing);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Credenciais não configuradas: ${missing.join(', ')}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar fromNumber
    if (!fromNumber.startsWith('+')) {
      console.error('❌ TWILIO_FROM_NUMBER must start with +');
      return new Response(
        JSON.stringify({ success: false, error: 'TWILIO_FROM_NUMBER deve começar com +' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📤 Sending: From whatsapp:${fromNumber} To whatsapp:${phoneNumber}`);
    if (eventType) {
      console.log(`📋 Event type: ${eventType}`);
    }

    // Preparar request
    const twilioApiUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append('From', `whatsapp:${fromNumber}`);
    formData.append('To', `whatsapp:${phoneNumber}`);
    
    if (contentSid) {
      formData.append('ContentSid', contentSid);
      if (contentVariables) {
        formData.append('ContentVariables', JSON.stringify(contentVariables));
      }
      console.log(`📋 Using template: ${contentSid}`);
    } else {
      formData.append('Body', message);
      console.log(`📝 Message length: ${message.length} chars`);
    }

    // Enviar
    const response = await fetch(twilioApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('❌ Twilio API error:', {
        status: response.status,
        code: responseData.code,
        message: responseData.message,
        moreInfo: responseData.more_info
      });
      
      // Get friendly error message
      const friendlyError = twilioErrorMessages[responseData.code?.toString()] || responseData.message || `Erro Twilio: ${response.status}`;
      
      return new Response(
        JSON.stringify({ success: false, error: friendlyError, code: responseData.code }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Message sent: ${responseData.sid}`);
    console.log("=== SEND-WHATSAPP END ===");

    return new Response(
      JSON.stringify({ success: true, sid: responseData.sid, status: responseData.status }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('=== SEND-WHATSAPP FATAL ERROR ===', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
