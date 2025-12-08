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
  | 'taxonomy_anomaly'
  // System Status
  | 'scan_complete';

interface NotificationPayload {
  eventType: NotificationEventType;
  subject: string;
  message: string;
  metadata?: Record<string, any>;
}

interface DispatchResult {
  emailSent: boolean;
  whatsappSent: boolean;
  errors: string[];
}

/**
 * Dispatches notifications based on user preferences for the given event type.
 * Checks the notification_preferences table and sends via enabled channels.
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
      .select('gmail_notification_email, whatsapp_target_phone, whatsapp_global_enabled')
      .single();

    if (settingsError) {
      console.error('[NotificationDispatcher] Error fetching admin settings:', settingsError);
      result.errors.push(`Settings fetch error: ${settingsError.message}`);
      return result;
    }

    // Send email notification if enabled
    if (prefData.email_enabled && settings?.gmail_notification_email) {
      try {
        const { error } = await supabase.functions.invoke('send-email', {
          body: {
            to: settings.gmail_notification_email,
            subject: payload.subject,
            body: payload.message
          }
        });

        if (error) throw error;
        result.emailSent = true;
        console.log('[NotificationDispatcher] Email sent successfully for:', payload.eventType);
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
        const { data, error } = await supabase.functions.invoke('send-whatsapp', {
          body: {
            phoneNumber: settings.whatsapp_target_phone,
            message: `${payload.subject}\n\n${payload.message}`,
            eventType: payload.eventType
          }
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Unknown WhatsApp error');
        
        result.whatsappSent = true;
        console.log('[NotificationDispatcher] WhatsApp sent successfully for:', payload.eventType);
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
 * Quick helper to send a specific notification type
 */
export const notifyNewDocument = (documentName: string) => 
  dispatchNotification({
    eventType: 'new_document',
    subject: '📄 Novo Documento RAG Adicionado',
    message: `Um novo documento foi processado e adicionado ao sistema RAG: ${documentName}`
  });

export const notifyDocumentFailed = (documentName: string, error: string) => 
  dispatchNotification({
    eventType: 'document_failed',
    subject: '❌ Falha no Processamento de Documento',
    message: `O documento "${documentName}" falhou no processamento.\nErro: ${error}`
  });

export const notifyNewContactMessage = (email: string, subject: string) => 
  dispatchNotification({
    eventType: 'new_contact_message',
    subject: '📬 Nova Mensagem de Contato',
    message: `Nova mensagem de contato recebida de ${email}.\nAssunto: ${subject}`
  });

export const notifySecurityAlert = (alertType: string, details: string) => 
  dispatchNotification({
    eventType: 'security_alert',
    subject: '🛡️ Alerta de Segurança',
    message: `Alerta de segurança detectado: ${alertType}\n\nDetalhes: ${details}`
  });

export const notifyMLAccuracyDrop = (currentAccuracy: number, threshold: number) => 
  dispatchNotification({
    eventType: 'ml_accuracy_drop',
    subject: '📉 Queda de Precisão ML Detectada',
    message: `A precisão do sistema ML caiu para ${currentAccuracy.toFixed(1)}%, abaixo do limite de ${threshold}%.`
  });

export const notifyNewConversation = (sessionId: string, chatType: string) => 
  dispatchNotification({
    eventType: 'new_conversation',
    subject: '💬 Nova Conversa de Usuário',
    message: `Nova conversa iniciada no chat ${chatType}.\nSession ID: ${sessionId}`
  });

// Security & Auth
export const notifyPasswordReset = (email: string) => 
  dispatchNotification({
    eventType: 'password_reset',
    subject: '🔑 Solicitação de Recuperação de Senha',
    message: `Uma solicitação de recuperação de senha foi feita para: ${email}`
  });

export const notifyLoginAlert = (email: string, deviceInfo: string) => 
  dispatchNotification({
    eventType: 'login_alert',
    subject: '🚨 Alerta de Login Suspeito',
    message: `Login detectado em novo dispositivo para ${email}.\n\nDispositivo: ${deviceInfo}`
  });

// Data Intelligence
export const notifySentimentAlert = (sessionId: string, sentiment: string, message: string) => 
  dispatchNotification({
    eventType: 'sentiment_alert',
    subject: '😔 Alerta de Sentimento Negativo Detectado',
    message: `Sentimento ${sentiment} detectado na sessão ${sessionId}.\n\nMensagem: ${message}`
  });

export const notifyTaxonomyAnomaly = (tagName: string, issue: string) => 
  dispatchNotification({
    eventType: 'taxonomy_anomaly',
    subject: '⚠️ Anomalia de Taxonomia Detectada',
    message: `Problema detectado com a tag "${tagName}".\n\nDetalhes: ${issue}`
  });

// System Status
export const notifyScanComplete = (status: string, findingsCount: number) => 
  dispatchNotification({
    eventType: 'scan_complete',
    subject: '🔍 Scan de Segurança Concluído',
    message: `Scan finalizado com status: ${status}.\n\nProblemas encontrados: ${findingsCount}`
  });
