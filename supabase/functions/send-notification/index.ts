// ============================================
// VERSAO: 2.0.0 | DEPLOY: 2026-01-01
// AUDITORIA: Forcado redeploy - Lovable Cloud
// ============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

interface NotificationRequest {
  phoneNumber: string;
  message: string;
  eventType?: string;
  preferredChannel?: 'whatsapp' | 'sms' | 'auto';
  forceSms?: boolean;
}

interface NotificationResult {
  success: boolean;
  channel: 'whatsapp' | 'sms' | null;
  sid?: string;
  error?: string;
  fallbackUsed?: boolean;
}

const sanitizePhoneNumber = (phone: string): string => {
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (!cleaned.startsWith('+')) {
    cleaned = cleaned.replace(/^0+/, '');
    if (!cleaned.startsWith('55')) {
      cleaned = '55' + cleaned;
    }
    cleaned = '+' + cleaned;
  }
  return cleaned;
};

async function sendWhatsApp(phoneNumber: string, message: string): Promise<NotificationResult> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER');

  if (!accountSid || !authToken || !fromNumber) {
    return { success: false, channel: null, error: 'WhatsApp not configured' };
  }

  try {
    const twilioApiUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append('Body', message);
    formData.append('From', `whatsapp:${fromNumber}`);
    formData.append('To', `whatsapp:${phoneNumber}`);

    const response = await fetch(twilioApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, channel: 'whatsapp', error: data.message || 'WhatsApp send failed' };
    }

    return { success: true, channel: 'whatsapp', sid: data.sid };
  } catch (error: any) {
    return { success: false, channel: 'whatsapp', error: error.message };
  }
}

async function sendSMS(phoneNumber: string, message: string): Promise<NotificationResult> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_SMS_NUMBER');

  if (!accountSid || !authToken || !fromNumber) {
    return { success: false, channel: null, error: 'SMS not configured' };
  }

  try {
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

    const data = await response.json();

    if (!response.ok) {
      return { success: false, channel: 'sms', error: data.message || 'SMS send failed' };
    }

    return { success: true, channel: 'sms', sid: data.sid };
  } catch (error: any) {
    return { success: false, channel: 'sms', error: error.message };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json() as NotificationRequest;
    const { phoneNumber, message, eventType, preferredChannel = 'auto', forceSms = false } = body;

    if (!phoneNumber || !message) {
      throw new Error('phoneNumber and message are required');
    }

    const sanitizedPhone = sanitizePhoneNumber(phoneNumber);
    
    // Validar formato E.164
    if (!sanitizedPhone.match(/^\+[1-9]\d{7,14}$/)) {
      throw new Error('Invalid phone number format');
    }

    console.log(`[Notification] Processing for event: ${eventType || 'manual'}, channel: ${preferredChannel}, forceSms: ${forceSms}`);

    let result: NotificationResult;

    // Se forçar SMS ou preferir SMS
    if (forceSms || preferredChannel === 'sms') {
      result = await sendSMS(sanitizedPhone, message);
    }
    // Se preferir WhatsApp sem fallback
    else if (preferredChannel === 'whatsapp') {
      result = await sendWhatsApp(sanitizedPhone, message);
    }
    // Auto: WhatsApp com fallback para SMS
    else {
      result = await sendWhatsApp(sanitizedPhone, message);
      
      // Se WhatsApp falhou, tentar SMS
      if (!result.success) {
        console.warn(`[Notification] WhatsApp failed: ${result.error}, trying SMS fallback`);
        
        const smsResult = await sendSMS(sanitizedPhone, message);
        
        if (smsResult.success) {
          result = { ...smsResult, fallbackUsed: true };
          console.log(`[Notification] SMS fallback successful: ${result.sid}`);
        } else {
          // Ambos falharam
          result = {
            success: false,
            channel: null,
            error: `WhatsApp: ${result.error}. SMS: ${smsResult.error}`,
            fallbackUsed: true
          };
        }
      }
    }

    // Logar resultado no banco
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      await supabase.from('notification_logs').insert({
        event_type: eventType || 'manual',
        channel: result.channel,
        recipient: sanitizedPhone,
        subject: eventType || 'Notificação',
        message_body: message.substring(0, 500),
        status: result.success ? 'sent' : 'failed',
        message_sid: result.sid || null,
        error_message: result.error || null,
        fallback_used: result.fallbackUsed || false,
        metadata: { preferredChannel, forceSms }
      });
    } catch (logError) {
      console.warn('[Notification] Failed to log notification:', logError);
    }

    if (result.success) {
      return new Response(
        JSON.stringify({
          success: true,
          channel: result.channel,
          sid: result.sid,
          fallbackUsed: result.fallbackUsed || false
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: result.error,
          fallbackUsed: result.fallbackUsed || false
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error: any) {
    console.error('[Notification] Error:', error.message);
    
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
