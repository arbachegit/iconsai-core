import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { phoneNumber, message, eventType } = await req.json();
    
    // Validate required inputs
    if (!phoneNumber || !message) {
      console.error('[WhatsApp] Missing required fields: phoneNumber or message');
      throw new Error('phoneNumber and message are required');
    }

    // Validate phone number format (should start with + and country code)
    if (!phoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
      console.error('[WhatsApp] Invalid phone number format:', phoneNumber);
      throw new Error('Invalid phone number format. Must include country code (e.g., +5511999999999)');
    }

    // Get Twilio credentials from environment
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER');

    if (!accountSid || !authToken || !fromNumber) {
      console.error('[WhatsApp] Twilio credentials not configured');
      throw new Error('Twilio credentials not configured. Please check TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER secrets.');
    }

    console.log(`[WhatsApp] Sending message for event: ${eventType || 'manual_test'}`);
    console.log(`[WhatsApp] Target phone: ${phoneNumber}`);

    // Use Twilio REST API directly instead of npm package
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

    const responseData = await response.json();

    if (!response.ok) {
      console.error('[WhatsApp] Twilio API error:', responseData);
      throw new Error(responseData.message || `Twilio API error: ${response.status}`);
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
