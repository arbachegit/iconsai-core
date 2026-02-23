// Tabelas de notificação foram removidas do banco
// notification_templates, notification_preferences, notification_logs
// Funções mantidas como no-ops para compatibilidade

export type NotificationEventType =
  | 'new_document'
  | 'document_failed'
  | 'new_contact_message'
  | 'security_alert'
  | 'ml_accuracy_drop'
  | 'new_conversation'
  | 'password_reset'
  | 'login_alert'
  | 'sentiment_alert'
  | 'taxonomy_anomaly'
  | 'user_registration_request'
  | 'user_registration_approved'
  | 'user_registration_rejected'
  | 'api_ready_for_implementation';

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
 * Dispatches notifications - DISABLED
 * Tabelas de notificação foram removidas do banco
 */
export async function dispatchNotification(_payload: NotificationPayload): Promise<DispatchResult> {
  return {
    emailSent: false,
    whatsappSent: false,
    errors: ['Notification system disabled - tables removed']
  };
}

// Quick helpers - all return no-op results
export const notifyNewDocument = (_fileName: string, _uploadDate?: string) =>
  dispatchNotification({ eventType: 'new_document', subject: '', message: '' });

export const notifyDocumentFailed = (_fileName: string, _errorCode: string, _processId?: string) =>
  dispatchNotification({ eventType: 'document_failed', subject: '', message: '' });

export const notifyNewContactMessage = (_senderName: string, _snippet: string) =>
  dispatchNotification({ eventType: 'new_contact_message', subject: '', message: '' });

export const notifySecurityAlert = (_severityLevel: string, _threatType: string, _affectedAsset: string) =>
  dispatchNotification({ eventType: 'security_alert', subject: '', message: '' });

export const notifyMLAccuracyDrop = (_modelName: string, _currentAccuracy: number, _dropPercentage: number) =>
  dispatchNotification({ eventType: 'ml_accuracy_drop', subject: '', message: '' });

export const notifyNewConversation = (_senderName: string, _snippet: string) =>
  dispatchNotification({ eventType: 'new_conversation', subject: '', message: '' });

export const notifyPasswordReset = (_userName: string, _otpCode: string) =>
  dispatchNotification({ eventType: 'password_reset', subject: '', message: '' });

export const notifyLoginAlert = (_ipAddress: string, _deviceName: string, _location: string) =>
  dispatchNotification({ eventType: 'login_alert', subject: '', message: '' });

export const notifySentimentAlert = (_userId: string, _sentimentScore: string, _triggerPhrase: string) =>
  dispatchNotification({ eventType: 'sentiment_alert', subject: '', message: '' });

export const notifyTaxonomyAnomaly = (_category: string, _conflictReason: string) =>
  dispatchNotification({ eventType: 'taxonomy_anomaly', subject: '', message: '' });

export const notifyUserRegistrationRequest = (
  _userName: string,
  _userEmail: string,
  _dnsOrigin: string,
  _institutionWork?: string,
  _institutionStudy?: string
) =>
  dispatchNotification({ eventType: 'user_registration_request', subject: '', message: '' });

export const notifyUserRegistrationApproved = (_userName: string, _userEmail: string, _recoveryLink: string) =>
  dispatchNotification({ eventType: 'user_registration_approved', subject: '', message: '' });

export const notifyUserRegistrationRejected = (_userName: string, _userEmail: string, _reason?: string) =>
  dispatchNotification({ eventType: 'user_registration_rejected', subject: '', message: '' });

export const notifyApiReadyForImplementation = (
  _apiName: string,
  _provider: string,
  _selectedVariables: string[],
  _periodStart: string,
  _periodEnd: string
) =>
  dispatchNotification({ eventType: 'api_ready_for_implementation', subject: '', message: '' });
