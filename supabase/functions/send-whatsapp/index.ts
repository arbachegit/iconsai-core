import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sanitize phone number: remove spaces, parentheses, hyphens, and other formatting
const sanitizePhoneNumber = (phone: string): string => {
  // Remove all non-digit characters
  let numbers = phone.replace(/\D/g, '');
  
  // If it starts with country code (55 for Brazil), keep it
  // If not and it's 11 digits (DDD + number), add +55
  if (numbers.length === 11) {
    numbers = '55' + numbers;
  }
  
  // Return with + prefix
  return '+' + numbers;
};

// Map common Twilio error codes to user-friendly messages
const twilioErrorMessages: Record<string, string> = {
  '21608': 'O número de destino não está registrado no WhatsApp',
  '21614': 'Número de destino inválido',
  '21211': 'Número "From" inválido - verifique TWILIO_FROM_NUMBER',
  '21408': 'O usuário precisa enviar uma mensagem para o sandbox primeiro (join <code>)',
  '21610': 'Número bloqueado ou não pode receber mensagens',
  '20003': 'Autenticação falhou - verifique TWILIO_ACCOUNT_SID e TWILIO_AUTH_TOKEN',
  '20404': 'Recurso não encontrado - verifique TWILIO_FROM_NUMBER',
  '63016': 'Template de mensagem não aprovado',
  '63024': 'Janela de 24h expirou - usuário precisa enviar mensagem primeiro',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { 
      phoneNumber: rawPhoneNumber, 
      message, 
      eventType,
      contentSid,        // SID do template (ex: HXxxxxxxxxx)
      contentVariables   // Variáveis do template (ex: {"1": "123456"})
    } = await req.json();
    
    // Validate required inputs
    if (!rawPhoneNumber) {
      console.error('[WhatsApp] Missing required field: phoneNumber');
      throw new Error('phoneNumber is required');
    }
    
    if (!message && !contentSid) {
      console.error('[WhatsApp] Missing required field: message or contentSid');
      throw new Error('message or contentSid is required');
    }

    // Sanitize phone number before validation
    const phoneNumber = sanitizePhoneNumber(rawPhoneNumber);
    console.log(`[WhatsApp] Sanitized phone: ${phoneNumber.slice(0, 4)}***${phoneNumber.slice(-2)}`);

    // Validate phone number format (E.164: should start with + and country code)
    if (!phoneNumber.match(/^\+[1-9]\d{10,14}$/)) {
      console.error('[WhatsApp] Invalid phone number format after sanitization');
      throw new Error('Número de telefone inválido. Verifique o DDD e o número.');
    }

    // Get Twilio credentials from environment
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER');

    if (!accountSid || !authToken || !fromNumber) {
      console.error('[WhatsApp] Twilio credentials not configured:', {
        hasAccountSid: !!accountSid,
        hasAuthToken: !!authToken,
        hasFromNumber: !!fromNumber
      });
      throw new Error('Credenciais do Twilio não configuradas. Verifique TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN e TWILIO_FROM_NUMBER.');
    }

    // Validate fromNumber format
    if (!fromNumber.startsWith('+')) {
      console.error('[WhatsApp] TWILIO_FROM_NUMBER must start with +');
      throw new Error('TWILIO_FROM_NUMBER deve começar com + (ex: +14155238886)');
    }

    console.log(`[WhatsApp] Sending message for event: ${eventType || 'manual'}`);
    console.log(`[WhatsApp] From: whatsapp:${fromNumber} To: whatsapp:${phoneNumber}`);

    // Use Twilio REST API directly
    const twilioApiUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append('From', `whatsapp:${fromNumber}`);
    formData.append('To', `whatsapp:${phoneNumber}`);
    
    // Se tem ContentSid, usar template; senão, mensagem livre
    if (contentSid) {
      formData.append('ContentSid', contentSid);
      if (contentVariables) {
        formData.append('ContentVariables', JSON.stringify(contentVariables));
      }
      console.log(`[WhatsApp] Using template: ${contentSid}`);
    } else {
      formData.append('Body', message);
    }

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
      console.error('[WhatsApp] Twilio API error:', JSON.stringify({
        status: response.status,
        statusText: response.statusText,
        errorCode: responseData.code,
        errorMessage: responseData.message,
        moreInfo: responseData.more_info
      }));
      
      // Get friendly error message
      const friendlyError = twilioErrorMessages[responseData.code?.toString()] || responseData.message || `Erro do Twilio: ${response.status}`;
      throw new Error(friendlyError);
    }

    console.log(`[WhatsApp] Message sent successfully: ${responseData.sid}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sid: responseData.sid,
        status: responseData.status 
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: any) {
    console.error('[WhatsApp] Error:', error.message);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});