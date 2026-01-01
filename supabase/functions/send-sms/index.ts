// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

const sanitizePhoneNumber = (phone: string): string => {
  // Manter apenas + e dígitos
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Se não começar com +, assumir Brasil
  if (!cleaned.startsWith('+')) {
    // Remover 0 inicial se houver
    cleaned = cleaned.replace(/^0+/, '');
    // Adicionar código do Brasil
    if (!cleaned.startsWith('55')) {
      cleaned = '55' + cleaned;
    }
    cleaned = '+' + cleaned;
  }
  
  return cleaned;
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { phoneNumber: rawPhoneNumber, message, eventType } = await req.json();
    
    // Validar inputs
    if (!rawPhoneNumber || !message) {
      console.error('[SMS] Missing required fields: phoneNumber or message');
      throw new Error('phoneNumber and message are required');
    }

    const phoneNumber = sanitizePhoneNumber(rawPhoneNumber);
    
    // Validar formato E.164
    if (!phoneNumber.match(/^\+[1-9]\d{7,14}$/)) {
      console.error('[SMS] Invalid phone number format');
      throw new Error('Invalid phone number format. Must include country code (e.g., +5511999999999)');
    }

    // Obter credenciais Twilio
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromNumber = Deno.env.get('TWILIO_SMS_NUMBER');

    if (!accountSid || !authToken || !fromNumber) {
      console.error('[SMS] Twilio SMS credentials not configured');
      throw new Error('Twilio SMS credentials not configured. Please check TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_SMS_NUMBER secrets.');
    }

    console.log(`[SMS] Sending message for event: ${eventType || 'manual_test'}`);

    // Chamar API Twilio para SMS (sem prefixo whatsapp:)
    const twilioApiUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append('Body', message);
    formData.append('From', fromNumber);
    formData.append('To', phoneNumber);

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
      console.error('[SMS] Twilio API error:', responseData);
      throw new Error(responseData.message || `Twilio API error: ${response.status}`);
    }

    console.log(`[SMS] Message sent successfully: ${responseData.sid}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sid: responseData.sid,
        status: responseData.status,
        channel: 'sms'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: any) {
    console.error('[SMS] Error:', error.message);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        channel: 'sms'
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
