import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-twilio-signature',
};

/**
 * Twilio Status Callback Endpoint
 * 
 * Receives delivery status updates from Twilio for WhatsApp/SMS messages.
 * Updates the notification_logs table with the final delivery status.
 * 
 * Twilio sends these statuses in order:
 * - queued: Message is queued to be sent
 * - sent: Message has been sent to the carrier
 * - delivered: Message was delivered to the recipient
 * - read: Message was read (WhatsApp only)
 * - undelivered: Message could not be delivered
 * - failed: Message failed to send
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log("=== TWILIO STATUS CALLBACK START ===");

  try {
    // Twilio sends data as application/x-www-form-urlencoded
    const formData = await req.formData();
    
    // Extract Twilio status data
    const messageSid = formData.get('MessageSid') as string;
    const messageStatus = formData.get('MessageStatus') as string;
    const errorCode = formData.get('ErrorCode') as string | null;
    const errorMessage = formData.get('ErrorMessage') as string | null;
    const to = formData.get('To') as string;
    const from = formData.get('From') as string;

    console.log('📬 Status callback received:', {
      messageSid,
      messageStatus,
      errorCode: errorCode || 'none',
      to: to?.slice(0, 10) + '***',
    });

    if (!messageSid || !messageStatus) {
      console.error('❌ Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing MessageSid or MessageStatus' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Map Twilio status to our final_status
    let finalStatus: string | null = null;
    if (['delivered', 'read'].includes(messageStatus)) {
      finalStatus = messageStatus;
    } else if (['undelivered', 'failed'].includes(messageStatus)) {
      finalStatus = messageStatus;
    }
    // For 'queued', 'sent', 'sending' we update provider_status but not final_status

    // Find and update the notification log by message_sid
    const { data: existingLog, error: findError } = await supabase
      .from('notification_logs')
      .select('id, delivery_attempts')
      .eq('message_sid', messageSid)
      .maybeSingle();

    if (findError) {
      console.error('❌ Error finding log:', findError);
      // Don't fail - Twilio will retry if we return error
    }

    if (existingLog) {
      // Prepare update data
      const updateData: Record<string, unknown> = {
        provider_status: messageStatus,
        delivery_attempts: (existingLog.delivery_attempts || 0) + 1,
      };

      // Only update final_status if it's a terminal status
      if (finalStatus) {
        updateData.final_status = finalStatus;
        updateData.final_status_at = new Date().toISOString();
      }

      // Add error info if present
      if (errorCode) {
        updateData.provider_error_code = errorCode;
      }
      if (errorMessage && finalStatus && ['undelivered', 'failed'].includes(finalStatus)) {
        updateData.error_message = errorMessage;
        updateData.status = 'failed';
      }

      const { error: updateError } = await supabase
        .from('notification_logs')
        .update(updateData)
        .eq('id', existingLog.id);

      if (updateError) {
        console.error('❌ Error updating log:', updateError);
      } else {
        console.log(`✅ Updated notification log: ${existingLog.id} -> ${messageStatus}`);
      }
    } else {
      console.log(`⚠️ No notification log found for SID: ${messageSid}`);
      
      // If no log found, create one for tracking purposes
      const { error: insertError } = await supabase
        .from('notification_logs')
        .insert({
          event_type: 'status_callback',
          channel: from?.includes('whatsapp') ? 'whatsapp' : 'sms',
          recipient: to?.replace('whatsapp:', '') || 'unknown',
          subject: 'Status callback (orphan)',
          message_body: `Twilio status update received for unknown message`,
          status: finalStatus === 'delivered' || finalStatus === 'read' ? 'success' : 
                  finalStatus === 'failed' || finalStatus === 'undelivered' ? 'failed' : 'pending',
          message_sid: messageSid,
          provider_status: messageStatus,
          final_status: finalStatus,
          final_status_at: finalStatus ? new Date().toISOString() : null,
          provider_error_code: errorCode,
          error_message: errorMessage,
          metadata: { orphan: true, from, to },
        });

      if (insertError) {
        console.error('❌ Error creating orphan log:', insertError);
      } else {
        console.log('📝 Created orphan log for tracking');
      }
    }

    console.log("=== TWILIO STATUS CALLBACK END ===");

    // Twilio expects 200 OK
    return new Response('OK', { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' } 
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('=== TWILIO STATUS CALLBACK ERROR ===', error);
    
    // Still return 200 to prevent Twilio from retrying
    return new Response('OK', { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' } 
    });
  }
});
