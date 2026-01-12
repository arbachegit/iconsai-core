// =============================================
// PWA Auth Hook v3.0 - NUCLEAR FIX
// Build: 2026-01-12T12:00:00Z
// Login por telefone com verificação de convite
// Expiração de 90 dias
// =============================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceFingerprint, getDeviceInfo } from '@/lib/device-fingerprint';

export type PWAAuthStatus = 
  | 'loading'
  | 'verified' 
  | 'blocked' 
  | 'needs_login'           // Novo - dispositivo não encontrado ou expirado
  | 'needs_verification'
  | 'sending_code'
  | 'error';

export type CodeSentChannel = 'whatsapp' | 'sms' | null;

interface PWAAuthState {
  status: PWAAuthStatus;
  fingerprint: string;
  userName: string | null;
  userPhone: string | null;
  userEmail: string | null;
  pwaAccess: string[];
  blockReason: string | null;
  verificationCode: string | null;
  errorMessage: string | null;
  codeSentVia: CodeSentChannel;
  codeSentError: string | null;
  resendingCode: boolean;
}

interface LoginParams {
  phone: string;
}

interface VerifyParams {
  code: string;
}

export function usePWAAuth() {
  const [state, setState] = useState<PWAAuthState>({
    status: 'loading',
    fingerprint: '',
    userName: null,
    userPhone: null,
    userEmail: null,
    pwaAccess: [],
    blockReason: null,
    verificationCode: null,
    errorMessage: null,
    codeSentVia: null,
    codeSentError: null,
    resendingCode: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Verificar status de acesso do dispositivo
   */
  const checkAccess = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, status: 'loading', errorMessage: null }));
      
      const fingerprint = getDeviceFingerprint();
      
      console.log('[PWA Auth v3.0] ========================================');
      console.log('[PWA Auth v3.0] Checking access for device:', fingerprint);
      console.log('[PWA Auth v3.0] User-Agent:', navigator.userAgent.substring(0, 80));
      
      const { data, error } = await supabase.rpc('check_pwa_access', {
        p_device_id: fingerprint,
        p_agent_slug: null,
      });

      console.log('[PWA Auth v3.0] RPC Response:', { data, error });

      if (error) {
        console.error('[PWA Auth v3.0] RPC Error:', error);
        setState(prev => ({
          ...prev,
          fingerprint,
          status: 'error',
          errorMessage: `Erro ao verificar acesso: ${error.message}`,
        }));
        return;
      }

      const result = data as {
        has_access: boolean;
        reason?: string;
        message?: string;
        user_id?: string;
        user_name?: string;
        pwa_access?: string[];
        is_blocked?: boolean;
        block_reason?: string;
        needs_verification?: boolean;
        needs_login?: boolean;
        user_phone?: string;
        expires_at?: string;
      };

      console.log('[PWA Auth v3.0] Parsed result:', {
        has_access: result.has_access,
        is_blocked: result.is_blocked,
        needs_verification: result.needs_verification,
        needs_login: result.needs_login,
        reason: result.reason,
        user_name: result.user_name,
      });

      // Verificar cada condição explicitamente
      if (result.is_blocked === true) {
        console.log('[PWA Auth v3.0] Status: BLOCKED ⛔');
        setState(prev => ({
          ...prev,
          fingerprint,
          status: 'blocked',
          blockReason: result.block_reason || 'Dispositivo bloqueado',
        }));
        return;
      }

      if (result.has_access === true) {
        console.log('[PWA Auth v3.0] Status: VERIFIED ✅');
        setState(prev => ({
          ...prev,
          fingerprint,
          status: 'verified',
          userName: result.user_name || null,
          userPhone: result.user_phone || null,
          pwaAccess: result.pwa_access || [],
        }));
        return;
      }

      if (result.needs_verification === true) {
        console.log('[PWA Auth v3.0] Status: NEEDS_VERIFICATION 🔐');
        setState(prev => ({
          ...prev,
          fingerprint,
          status: 'needs_verification',
          userPhone: result.user_phone || null,
        }));
        return;
      }

      if (result.needs_login === true) {
        console.log('[PWA Auth v3.0] Status: NEEDS_LOGIN 📱', { reason: result.reason });
        setState(prev => ({
          ...prev,
          fingerprint,
          status: 'needs_login',
          userPhone: result.user_phone || null,
        }));
        return;
      }

      // Fallback: precisa login
      console.log('[PWA Auth v3.0] Status: FALLBACK to needs_login');
      setState(prev => ({
        ...prev,
        fingerprint,
        status: 'needs_login',
      }));

    } catch (err) {
      console.error('[PWA Auth v3.0] Unexpected error:', err);
      setState(prev => ({
        ...prev,
        status: 'error',
        errorMessage: 'Erro inesperado. Tente novamente.',
      }));
    }
  }, []);

  /**
   * Login por telefone (substitui register)
   * Verifica se o usuário tem convite antes de permitir
   */
  const login = useCallback(async (params: LoginParams): Promise<{ success: boolean; error?: string }> => {
    if (isSubmitting) return { success: false, error: 'Operação em andamento' };
    
    setIsSubmitting(true);
    
    try {
      const deviceInfo = getDeviceInfo();
      
      const { data, error } = await supabase.rpc('login_pwa_by_phone', {
        p_phone: params.phone,
        p_fingerprint: deviceInfo.fingerprint,
        p_device_info: {
          os_name: deviceInfo.osName,
          os_version: deviceInfo.osVersion,
          browser_name: deviceInfo.browserName,
          browser_version: deviceInfo.browserVersion,
          device_vendor: deviceInfo.deviceVendor,
          device_model: deviceInfo.deviceModel,
          screen_width: deviceInfo.screenWidth,
          screen_height: deviceInfo.screenHeight,
          pixel_ratio: deviceInfo.pixelRatio,
          has_touch: deviceInfo.hasTouch,
          has_microphone: deviceInfo.hasMicrophone,
          user_agent: deviceInfo.userAgent,
        },
      });

      if (error) {
        console.error('[PWA Auth v2] Login error:', error);
        return { success: false, error: error.message };
      }

      const result = data as {
        success: boolean;
        message?: string;
        verification_code?: string;
        user_name?: string;
        error?: string;
        already_verified?: boolean;
      };

      // Já verificado - recarregar status
      if (result.already_verified) {
        await checkAccess();
        return { success: true };
      }

      if (!result.success) {
        // Erro específico de convite
        if (result.error === 'no_invitation') {
          return { 
            success: false, 
            error: result.message || 'Não encontramos um convite para este telefone. Você precisa de um convite para acessar o KnowYOU.' 
          };
        }
        return { success: false, error: result.error || 'Erro ao fazer login' };
      }

      // Atualizar para estado de envio de código
      setState(prev => ({
        ...prev,
        status: 'sending_code',
        userPhone: params.phone,
        userName: result.user_name || null,
        codeSentVia: null,
        codeSentError: null,
      }));

      // Enviar código via SMS
      let sentChannel: CodeSentChannel = null;
      let sendError: string | null = null;

      if (result.verification_code) {
        try {
          console.log('[PWA Auth v2] Sending verification code via SMS...');
          const { data: sendResult, error: funcError } = await supabase.functions.invoke('send-pwa-notification', {
            body: {
              to: params.phone,
              template: "otp",
              variables: { "1": result.verification_code },
              channel: "sms", // v5.3.0 força SMS
              userId: null,
            }
          });
          
          if (funcError) {
            console.warn('[PWA Auth v2] Failed to send code:', funcError);
            sendError = 'Não foi possível enviar o código. Tente reenviar.';
          } else if (sendResult?.success) {
            sentChannel = sendResult?.channel === 'sms' ? 'sms' : 'whatsapp';
            console.log('[PWA Auth v2] Code sent via:', sentChannel);
          } else {
            sendError = sendResult?.error || 'Falha no envio do código.';
          }
        } catch (err) {
          console.warn('[PWA Auth v2] Error sending code:', err);
          sendError = 'Erro ao enviar código. Tente reenviar.';
        }
      }

      // Atualizar estado final
      setState(prev => ({
        ...prev,
        status: 'needs_verification',
        verificationCode: result.verification_code || null,
        codeSentVia: sentChannel,
        codeSentError: sendError,
      }));

      return { success: true };

    } catch (err) {
      console.error('[PWA Auth v2] Login unexpected error:', err);
      return { success: false, error: 'Erro inesperado. Tente novamente.' };
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, checkAccess]);

  /**
   * Verificar código SMS
   */
  const verify = useCallback(async (params: VerifyParams): Promise<{ success: boolean; error?: string }> => {
    if (isSubmitting) return { success: false, error: 'Operação em andamento' };
    
    setIsSubmitting(true);
    
    try {
      const fingerprint = getDeviceFingerprint();
      
      const { data, error } = await supabase.rpc('verify_pwa_device_code', {
        p_fingerprint: fingerprint,
        p_code: params.code,
      });

      if (error) {
        console.error('[PWA Auth v2] Verify error:', error);
        return { success: false, error: error.message };
      }

      const result = data as {
        success: boolean;
        message?: string;
        pwa_access?: string[];
        user_name?: string;
        expires_at?: string;
        error?: string;
        attempts_remaining?: number;
      };

      if (!result.success) {
        if (result.error === 'invalid_code') {
          return { 
            success: false, 
            error: `Código inválido. ${result.attempts_remaining !== undefined ? `Restam ${result.attempts_remaining} tentativas.` : ''}` 
          };
        }
        if (result.error === 'code_expired') {
          return { success: false, error: 'Código expirado. Solicite um novo código.' };
        }
        if (result.error === 'too_many_attempts') {
          setState(prev => ({ ...prev, status: 'blocked', blockReason: 'Excesso de tentativas' }));
          return { success: false, error: 'Dispositivo bloqueado por excesso de tentativas.' };
        }
        return { success: false, error: result.error || 'Código inválido' };
      }

      // Enviar mensagem de boas-vindas
      try {
        await supabase.functions.invoke('send-pwa-notification', {
          body: {
            to: state.userPhone,
            template: "welcome",
            variables: { 
              "1": result.user_name || state.userName || "Usuário", 
              "2": "pwa"
            },
            channel: "sms",
            userId: null,
          }
        });
        console.log('[PWA Auth v2] Welcome message sent');
      } catch (welcomeErr) {
        console.warn('[PWA Auth v2] Failed to send welcome message:', welcomeErr);
      }

      // Verificação bem sucedida
      setState(prev => ({
        ...prev,
        status: 'verified',
        userName: result.user_name || prev.userName,
        pwaAccess: result.pwa_access || [],
        verificationCode: null,
      }));

      return { success: true };

    } catch (err) {
      console.error('[PWA Auth v2] Verify unexpected error:', err);
      return { success: false, error: 'Erro inesperado. Tente novamente.' };
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, state.userPhone, state.userName]);

  /**
   * Reenviar código de verificação
   */
  const resendCode = useCallback(async (): Promise<{ success: boolean; code?: string; channel?: CodeSentChannel; error?: string }> => {
    if (state.resendingCode) return { success: false, error: 'Operação em andamento' };
    
    setState(prev => ({ ...prev, resendingCode: true, codeSentError: null }));
    
    try {
      const deviceInfo = getDeviceInfo();
      
      // Chamar login_pwa_by_phone para gerar novo código
      const { data, error } = await supabase.rpc('login_pwa_by_phone', {
        p_phone: state.userPhone || '',
        p_fingerprint: deviceInfo.fingerprint,
        p_device_info: {
          os_name: deviceInfo.osName,
          os_version: deviceInfo.osVersion,
          browser_name: deviceInfo.browserName,
          browser_version: deviceInfo.browserVersion,
        },
      });

      if (error) {
        setState(prev => ({ ...prev, resendingCode: false, codeSentError: error.message }));
        return { success: false, error: error.message };
      }

      const result = data as {
        success: boolean;
        verification_code?: string;
        error?: string;
      };

      if (!result.success) {
        setState(prev => ({ ...prev, resendingCode: false, codeSentError: result.error || 'Erro ao reenviar' }));
        return { success: false, error: result.error || 'Erro ao reenviar código' };
      }

      // Enviar código via SMS
      let sentChannel: CodeSentChannel = null;
      
      if (result.verification_code) {
        try {
          console.log('[PWA Auth v2] Resending verification code via SMS...');
          const { data: sendResult, error: funcError } = await supabase.functions.invoke('send-pwa-notification', {
            body: {
              to: state.userPhone,
              template: "resend_code",
              variables: { "1": result.verification_code },
              channel: "sms",
              userId: null,
            }
          });
          
          if (funcError) {
            console.warn('[PWA Auth v2] Failed to resend code:', funcError);
            setState(prev => ({ 
              ...prev, 
              resendingCode: false, 
              codeSentError: 'Não foi possível reenviar o código.',
              verificationCode: result.verification_code || null,
            }));
            return { success: false, error: 'Falha ao reenviar código' };
          } else if (sendResult?.success) {
            sentChannel = sendResult?.channel === 'sms' ? 'sms' : 'whatsapp';
          }
        } catch (err) {
          console.warn('[PWA Auth v2] Error resending code:', err);
        }
      }

      // Atualizar código de verificação
      setState(prev => ({
        ...prev,
        verificationCode: result.verification_code || null,
        resendingCode: false,
        codeSentVia: sentChannel,
        codeSentError: null,
      }));

      return { success: true, code: result.verification_code, channel: sentChannel };

    } catch (err) {
      setState(prev => ({ ...prev, resendingCode: false, codeSentError: 'Erro inesperado' }));
      return { success: false, error: 'Erro inesperado' };
    }
  }, [state.resendingCode, state.userPhone]);

  /**
   * Voltar para tela de login
   */
  const backToLogin = useCallback(() => {
    setState(prev => ({
      ...prev,
      status: 'needs_login',
      verificationCode: null,
      codeSentVia: null,
      codeSentError: null,
    }));
  }, []);

  /**
   * Atualizar para status de refresh
   */
  const refresh = useCallback(() => {
    checkAccess();
  }, [checkAccess]);

  // Verificar acesso ao montar
  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  return {
    // Estado
    status: state.status,
    fingerprint: state.fingerprint,
    userName: state.userName,
    userPhone: state.userPhone,
    pwaAccess: state.pwaAccess,
    blockReason: state.blockReason,
    verificationCode: state.verificationCode,
    errorMessage: state.errorMessage,
    isSubmitting,
    // Estados de feedback de envio de código
    codeSentVia: state.codeSentVia,
    codeSentError: state.codeSentError,
    resendingCode: state.resendingCode,
    
    // Ações
    login,              // Novo - substitui register
    verify,
    resendCode,
    backToLogin,        // Renomeado de backToRegister
    refresh,
  };
}
