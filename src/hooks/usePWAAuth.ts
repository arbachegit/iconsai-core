import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceFingerprint, getDeviceInfo } from '@/lib/device-fingerprint';

export type PWAAuthStatus = 
  | 'loading'
  | 'verified' 
  | 'blocked' 
  | 'needs_registration' 
  | 'needs_verification'
  | 'error';

interface PWAAuthState {
  status: PWAAuthStatus;
  fingerprint: string;
  userName: string | null;
  userPhone: string | null;
  userEmail: string | null;
  pwaAccess: string[];
  blockReason: string | null;
  verificationCode: string | null; // Para teste - em produção o código vai por SMS
  errorMessage: string | null;
}

interface RegisterParams {
  phone: string;
  name?: string;
  email?: string;
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
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Verificar status de acesso do dispositivo
   */
  const checkAccess = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, status: 'loading', errorMessage: null }));
      
      const fingerprint = getDeviceFingerprint();
      
      const { data, error } = await supabase.rpc('check_pwa_access', {
        p_device_id: fingerprint,
        p_agent_slug: null,
      });

      if (error) {
        console.error('[PWA Auth] Error checking access:', error);
        setState(prev => ({
          ...prev,
          fingerprint,
          status: 'error',
          errorMessage: 'Erro ao verificar acesso. Tente novamente.',
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
      };

      // Dispositivo bloqueado
      if (result.is_blocked) {
        setState(prev => ({
          ...prev,
          fingerprint,
          status: 'blocked',
          blockReason: result.block_reason || 'Dispositivo bloqueado',
        }));
        return;
      }

      // Tem acesso (verificado)
      if (result.has_access) {
        setState(prev => ({
          ...prev,
          fingerprint,
          status: 'verified',
          userName: result.user_name || null,
          pwaAccess: result.pwa_access || [],
        }));
        return;
      }

      // Precisa verificação (já registrado mas não verificado)
      if (result.needs_verification) {
        setState(prev => ({
          ...prev,
          fingerprint,
          status: 'needs_verification',
        }));
        return;
      }

      // Não registrado
      setState(prev => ({
        ...prev,
        fingerprint,
        status: 'needs_registration',
      }));

    } catch (err) {
      console.error('[PWA Auth] Unexpected error:', err);
      setState(prev => ({
        ...prev,
        status: 'error',
        errorMessage: 'Erro inesperado. Tente novamente.',
      }));
    }
  }, []);

  /**
   * Registrar novo dispositivo
   */
  const register = useCallback(async (params: RegisterParams): Promise<{ success: boolean; error?: string }> => {
    if (isSubmitting) return { success: false, error: 'Operação em andamento' };
    
    setIsSubmitting(true);
    
    try {
      const deviceInfo = getDeviceInfo();
      
      const { data, error } = await supabase.rpc('register_pwa_device', {
        p_fingerprint: deviceInfo.fingerprint,
        p_phone_number: params.phone,
        p_user_name: params.name || null,
        p_user_email: params.email || null,
        p_os_name: deviceInfo.osName,
        p_os_version: deviceInfo.osVersion,
        p_browser_name: deviceInfo.browserName,
        p_browser_version: deviceInfo.browserVersion,
        p_device_vendor: deviceInfo.deviceVendor,
        p_device_model: deviceInfo.deviceModel,
        p_screen_width: deviceInfo.screenWidth,
        p_screen_height: deviceInfo.screenHeight,
        p_pixel_ratio: deviceInfo.pixelRatio,
        p_has_touch: deviceInfo.hasTouch,
        p_has_microphone: deviceInfo.hasMicrophone,
        p_user_agent: deviceInfo.userAgent,
      });

      if (error) {
        console.error('[PWA Auth] Register error:', error);
        return { success: false, error: error.message };
      }

      const result = data as {
        success: boolean;
        message?: string;
        verification_code?: string;
        error?: string;
      };

      if (!result.success) {
        return { success: false, error: result.error || 'Erro ao registrar' };
      }

      // Enviar código via WhatsApp/SMS
      if (result.verification_code) {
        try {
          console.log('[PWA Auth] Sending verification code via WhatsApp/SMS...');
          const { data: sendResult, error: sendError } = await supabase.functions.invoke('send-pwa-verification-direct', {
            body: {
              phone: params.phone,
              code: result.verification_code,
              name: params.name || ''
            }
          });
          
          if (sendError) {
            console.warn('[PWA Auth] Failed to send code:', sendError);
          } else {
            console.log('[PWA Auth] Code sent via:', sendResult?.channel || 'unknown');
          }
        } catch (err) {
          console.warn('[PWA Auth] Error sending code:', err);
        }
      }

      // Atualizar estado
      setState(prev => ({
        ...prev,
        status: 'needs_verification',
        userPhone: params.phone,
        userName: params.name || null,
        userEmail: params.email || null,
        verificationCode: result.verification_code || null, // Mantido para debug
      }));

      return { success: true };

    } catch (err) {
      console.error('[PWA Auth] Register unexpected error:', err);
      return { success: false, error: 'Erro inesperado. Tente novamente.' };
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting]);

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
        console.error('[PWA Auth] Verify error:', error);
        return { success: false, error: error.message };
      }

      const result = data as {
        success: boolean;
        message?: string;
        pwa_access?: string[];
        error?: string;
      };

      if (!result.success) {
        return { success: false, error: result.error || 'Código inválido' };
      }

      // Verificação bem sucedida
      setState(prev => ({
        ...prev,
        status: 'verified',
        pwaAccess: result.pwa_access || [],
        verificationCode: null,
      }));

      return { success: true };

    } catch (err) {
      console.error('[PWA Auth] Verify unexpected error:', err);
      return { success: false, error: 'Erro inesperado. Tente novamente.' };
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting]);

  /**
   * Reenviar código de verificação
   */
  const resendCode = useCallback(async (): Promise<{ success: boolean; code?: string; error?: string }> => {
    if (isSubmitting) return { success: false, error: 'Operação em andamento' };
    
    setIsSubmitting(true);
    
    try {
      const fingerprint = getDeviceFingerprint();
      
      // Chamar função para reenviar código
      const { data, error } = await supabase.rpc('register_pwa_device', {
        p_fingerprint: fingerprint,
        p_phone_number: state.userPhone || '',
        p_user_name: state.userName,
        p_user_email: state.userEmail,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      const result = data as {
        success: boolean;
        verification_code?: string;
        error?: string;
      };

      if (!result.success) {
        return { success: false, error: result.error || 'Erro ao reenviar código' };
      }

      // Enviar código via WhatsApp/SMS
      if (result.verification_code) {
        try {
          console.log('[PWA Auth] Resending verification code via WhatsApp/SMS...');
          await supabase.functions.invoke('send-pwa-verification-direct', {
            body: {
              phone: state.userPhone,
              code: result.verification_code,
              name: state.userName || ''
            }
          });
        } catch (err) {
          console.warn('[PWA Auth] Error resending code:', err);
        }
      }

      // Atualizar código de verificação
      setState(prev => ({
        ...prev,
        verificationCode: result.verification_code || null,
      }));

      return { success: true, code: result.verification_code };

    } catch (err) {
      return { success: false, error: 'Erro inesperado' };
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, state.userPhone, state.userName, state.userEmail]);

  /**
   * Voltar para tela de registro
   */
  const backToRegister = useCallback(() => {
    setState(prev => ({
      ...prev,
      status: 'needs_registration',
      verificationCode: null,
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
    
    // Ações
    register,
    verify,
    resendCode,
    backToRegister,
    refresh,
  };
}
