import { supabase } from '@/integrations/supabase/client';

export type NotificationEventType = 
  | 'new_document'
  | 'document_failed'
  | 'new_contact_message'
  | 'security_alert'
  | 'ml_accuracy_drop'
  | 'new_conversation'
  // Security & Auth
  | 'password_reset'
  | 'login_alert'
  // Data Intelligence
  | 'sentiment_alert'
  | 'taxonomy_anomaly';

interface NotificationTemplate {
  id: string;
  event_type: string;
  platform_name: string;
  email_subject: string | null;
  email_body: string | null;
  whatsapp_message: string | null;
  variables_available: string[];
}

interface NotificationPayload {
  eventType: NotificationEventType;
  subject: string;
  message: string;
  metadata?: Record<string, string>;
}

interface DispatchResult {
  emailSent: boolean;
  whatsappSent: boolean;
  errors: string[];
}

/**
 * Replace template variables with actual values
 */
function injectVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '');
  }
  return result;
}

/**
 * Get custom template from database or return default fallback
 */
async function getTemplate(eventType: NotificationEventType): Promise<NotificationTemplate | null> {
  try {
    const { data, error } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('event_type', eventType)
      .single();

    if (error) {
      console.warn('[NotificationDispatcher] Template not found, using defaults for:', eventType);
      return null;
    }

    return data as NotificationTemplate;
  } catch (error) {
    console.error('[NotificationDispatcher] Error fetching template:', error);
    return null;
  }
}

/**
 * Dispatches notifications based on user preferences for the given event type.
 * Checks the notification_preferences table and sends via enabled channels.
 * Uses custom templates from notification_templates table when available.
 */
export async function dispatchNotification(payload: NotificationPayload): Promise<DispatchResult> {
  const result: DispatchResult = {
    emailSent: false,
    whatsappSent: false,
    errors: []
  };

  try {
    // Check notification preferences for this event type
    const { data: prefData, error: prefError } = await supabase
      .from('notification_preferences')
      .select('email_enabled, whatsapp_enabled')
      .eq('event_type', payload.eventType)
      .single();

    if (prefError) {
      console.error('[NotificationDispatcher] Error fetching preferences:', prefError);
      result.errors.push(`Preference fetch error: ${prefError.message}`);
      return result;
    }

    if (!prefData) {
      console.log('[NotificationDispatcher] No preferences found for event:', payload.eventType);
      return result;
    }

    // Get admin settings for email and phone targets
    const { data: settings, error: settingsError } = await supabase
      .from('admin_settings')
      .select('gmail_notification_email, whatsapp_target_phone, whatsapp_global_enabled, email_global_enabled')
      .single();

    if (settingsError) {
      console.error('[NotificationDispatcher] Error fetching admin settings:', settingsError);
      result.errors.push(`Settings fetch error: ${settingsError.message}`);
      return result;
    }

    // Get custom template
    const template = await getTemplate(payload.eventType);
    
    // Prepare template variables with standard platform name
    const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const variables: Record<string, string> = {
      timestamp,
      platform_name: 'Plataforma KnowYOU Health',
      ...(payload.metadata || {})
    };

    // Check if email_global_enabled (default true if not set)
    const emailGlobalEnabled = (settings as any)?.email_global_enabled !== false;

    // Send email notification if enabled (check global toggle too)
    if (prefData.email_enabled && emailGlobalEnabled && settings?.gmail_notification_email) {
      try {
        // Use custom template or fallback to payload
        const emailSubject = template?.email_subject 
          ? injectVariables(template.email_subject, variables)
          : payload.subject;
        const emailBody = template?.email_body 
          ? injectVariables(template.email_body, variables)
          : payload.message;

        // Never send empty messages
        if (!emailBody || emailBody.trim() === '') {
          result.errors.push('Email body is empty - skipping');
        } else {
          const { error } = await supabase.functions.invoke('send-email', {
            body: {
              to: settings.gmail_notification_email,
              subject: emailSubject || `[Plataforma KnowYOU Health] Notificação`,
              body: emailBody
            }
          });

          if (error) throw error;
          result.emailSent = true;
          console.log('[NotificationDispatcher] Email sent successfully for:', payload.eventType);
        }
      } catch (emailError: any) {
        console.error('[NotificationDispatcher] Email send error:', emailError);
        result.errors.push(`Email error: ${emailError.message}`);
      }
    }

    // Send WhatsApp notification if enabled (check global toggle too)
    if (
      prefData.whatsapp_enabled && 
      settings?.whatsapp_global_enabled && 
      settings?.whatsapp_target_phone
    ) {
      try {
        // Use custom template or fallback with standard format
        const whatsappMessage = template?.whatsapp_message 
          ? injectVariables(template.whatsapp_message, variables)
          : `${timestamp} - Plataforma KnowYOU Health: ${payload.subject}. ${payload.message}`;

        // Never send empty messages
        if (!whatsappMessage || whatsappMessage.trim() === '') {
          result.errors.push('WhatsApp message is empty - skipping');
        } else {
          const { data, error } = await supabase.functions.invoke('send-whatsapp', {
            body: {
              phoneNumber: settings.whatsapp_target_phone,
              message: whatsappMessage,
              eventType: payload.eventType
            }
          });

          if (error) throw error;
          if (!data?.success) throw new Error(data?.error || 'Unknown WhatsApp error');
          
          result.whatsappSent = true;
          console.log('[NotificationDispatcher] WhatsApp sent successfully for:', payload.eventType);
        }
      } catch (whatsappError: any) {
        console.error('[NotificationDispatcher] WhatsApp send error:', whatsappError);
        result.errors.push(`WhatsApp error: ${whatsappError.message}`);
      }
    }

  } catch (error: any) {
    console.error('[NotificationDispatcher] Unexpected error:', error);
    result.errors.push(`Unexpected error: ${error.message}`);
  }

  return result;
}

/**
 * Quick helpers to send specific notification types with proper variable mapping
 */
export const notifyNewDocument = (fileName: string, uploadDate?: string) => 
  dispatchNotification({
    eventType: 'new_document',
    subject: 'Novo Documento RAG',
    message: fileName,
    metadata: {
      file_name: fileName,
      upload_date: uploadDate || new Date().toLocaleString('pt-BR')
    }
  });

export const notifyDocumentFailed = (fileName: string, errorCode: string, processId?: string) => 
  dispatchNotification({
    eventType: 'document_failed',
    subject: 'Falha no Processamento',
    message: `${fileName} - ${errorCode}`,
    metadata: {
      file_name: fileName,
      error_code: errorCode,
      process_id: processId || 'N/A'
    }
  });

export const notifyNewContactMessage = (senderName: string, snippet: string) => 
  dispatchNotification({
    eventType: 'new_contact_message',
    subject: 'Nova Mensagem de Contato',
    message: `De: ${senderName}`,
    metadata: {
      sender_name: senderName,
      snippet: snippet.substring(0, 100)
    }
  });

export const notifySecurityAlert = (severityLevel: string, threatType: string, affectedAsset: string) => {
  const severityIcons: Record<string, string> = { critical: '🔴', warning: '🟡', secure: '🟢' };
  return dispatchNotification({
    eventType: 'security_alert',
    subject: 'Alerta de Segurança',
    message: `${severityLevel}: ${threatType}`,
    metadata: {
      severity_level: severityLevel,
      severity_icon: severityIcons[severityLevel.toLowerCase()] || '⚪',
      threat_type: threatType,
      affected_asset: affectedAsset
    }
  });
};

export const notifyMLAccuracyDrop = (modelName: string, currentAccuracy: number, dropPercentage: number) => 
  dispatchNotification({
    eventType: 'ml_accuracy_drop',
    subject: 'Queda de Precisão ML',
    message: `${modelName}: ${currentAccuracy}%`,
    metadata: {
      model_name: modelName,
      current_accuracy: currentAccuracy.toFixed(1),
      drop_percentage: dropPercentage.toFixed(1)
    }
  });

export const notifyNewConversation = (senderName: string, snippet: string) => 
  dispatchNotification({
    eventType: 'new_conversation',
    subject: 'Nova Conversa',
    message: senderName,
    metadata: {
      sender_name: senderName,
      snippet: snippet.substring(0, 100)
    }
  });

// Security & Auth
export const notifyPasswordReset = (userName: string, otpCode: string) => 
  dispatchNotification({
    eventType: 'password_reset',
    subject: 'Solicitação de Recuperação de Senha',
    message: userName,
    metadata: {
      user_name: userName,
      otp_code: otpCode
    }
  });

export const notifyLoginAlert = (ipAddress: string, deviceName: string, location: string) => 
  dispatchNotification({
    eventType: 'login_alert',
    subject: 'Alerta de Login Suspeito',
    message: `${deviceName} - ${location}`,
    metadata: {
      ip_address: ipAddress,
      device_name: deviceName,
      location: location
    }
  });

// Data Intelligence
export const notifySentimentAlert = (userId: string, sentimentScore: string, triggerPhrase: string) => 
  dispatchNotification({
    eventType: 'sentiment_alert',
    subject: 'Alerta de Sentimento Negativo',
    message: `Score: ${sentimentScore}`,
    metadata: {
      user_id: userId,
      sentiment_score: sentimentScore,
      trigger_phrase: triggerPhrase.substring(0, 100)
    }
  });

export const notifyTaxonomyAnomaly = (category: string, conflictReason: string) => 
  dispatchNotification({
    eventType: 'taxonomy_anomaly',
    subject: 'Anomalia de Taxonomia',
    message: `${category}: ${conflictReason}`,
    metadata: {
      category: category,
      conflict_reason: conflictReason
    }
  });
