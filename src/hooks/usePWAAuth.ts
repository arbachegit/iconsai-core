// =============================================
// PWA Auth Hook v4.0 - SIMPLIFICAÇÃO RADICAL
// Build: 2026-01-12T15:00:00Z
// Telefone como identificador principal
// Sem fingerprint instável
// Armazenamento: localStorage
// =============================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'pwa-verified-phone';

export type PWAAuthStatus = 
  | 'loading'
  | 'verified' 
  | 'blocked' 
  | 'needs_login'
  | 'needs_verification'
  | 'sending_code'
  | 'error';

export type CodeSentChannel = 'whatsapp' | 'sms' | null;

interface PWAAuthState {
  status: PWAAuthStatus;
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

/**
 * Hook simplificado para autenticação PWA
 * Usa telefone verificado no localStorage como sessão
 */
export function usePWAAuth() {
  const [state, setState] = useState<PWAAuthState>({
    status: 'loading',
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
   * Verificar status de acesso usando telefone do localStorage
   */
  const checkAccess = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, status: 'loading', errorMessage: null }));
      
      // Buscar telefone verificado do localStorage
      const verifiedPhone = localStorage.getItem(STORAGE_KEY);
      
      console.log('[PWA Auth v4.0] ========================================');
      console.log('[PWA Auth v4.0] Checking access...');
      console.log('[PWA Auth v4.0] Verified phone in storage:', verifiedPhone ? verifiedPhone.substring(0, 8) + '...' : 'none');

      // Se não tem telefone salvo, precisa fazer login
      if (!verifiedPhone) {
        console.log('[PWA Auth v4.0] No verified phone -> needs_login');
        setState(prev => ({
          ...prev,
          status: 'needs_login',
        }));
        return;
      }

      // Verificar acesso via RPC
      const { data, error } = await supabase.rpc('check_pwa_access_by_phone', {
        p_phone: verifiedPhone,
      });

      console.log('[PWA Auth v4.0] RPC Response:', { data, error });

      if (error) {
        console.error('[PWA Auth v4.0] RPC Error:', error);
        // Em caso de erro, limpar storage e pedir login
        localStorage.removeItem(STORAGE_KEY);
        setState(prev => ({
          ...prev,
          status: 'needs_login',
          errorMessage: 'Erro ao verificar acesso. Faça login novamente.',
        }));
        return;
      }

      const result = data as {
        has_access: boolean;
        reason?: string;
        message?: string;
        user_name?: string;
        user_phone?: string;
        pwa_access?: string[];
        is_blocked?: boolean;
        block_reason?: string;
        needs_verification?: boolean;
        needs_login?: boolean;
        expires_at?: string;
      };

      console.log('[PWA Auth v4.0] Result:', {
        has_access: result.has_access,
        is_blocked: result.is_blocked,
        needs_login: result.needs_login,
        reason: result.reason,
      });

      // Verificar cada condição
      if (result.is_blocked === true) {
        console.log('[PWA Auth v4.0] Status: BLOCKED ⛔');
        localStorage.removeItem(STORAGE_KEY);
        setState(prev => ({
          ...prev,
          status: 'blocked',
          blockReason: result.block_reason || 'Acesso bloqueado',
        }));
        return;
      }

      if (result.has_access === true) {
        console.log('[PWA Auth v4.0] Status: VERIFIED ✅');
        setState(prev => ({
          ...prev,
          status: 'verified',
          userName: result.user_name || null,
          userPhone: verifiedPhone,
          pwaAccess: result.pwa_access || [],
        }));
        return;
      }

      // Acesso expirado ou precisa login
      if (result.needs_login === true || result.reason === 'expired') {
        console.log('[PWA Auth v4.0] Status: NEEDS_LOGIN (expired or not found)');
        localStorage.removeItem(STORAGE_KEY);
        setState(prev => ({
          ...prev,
          status: 'needs_login',
          userPhone: verifiedPhone, // Manter para preencher campo
        }));
        return;
      }

      // Fallback: precisa login
      console.log('[PWA Auth v4.0] Status: FALLBACK -> needs_login');
      localStorage.removeItem(STORAGE_KEY);
      setState(prev => ({
        ...prev,
        status: 'needs_login',
      }));

    } catch (err) {
      console.error('[PWA Auth v4.0] Unexpected error:', err);
      setState(prev => ({
        ...prev,
        status: 'error',
        errorMessage: 'Erro inesperado. Tente novamente.',
      }));
    }
  }, []);

  /**
   * Login por telefone (simplificado, sem fingerprint)
   * v6.0 - Logging extensivo para debug
   */
  const login = useCallback(async (params: LoginParams): Promise<{ success: boolean; error?: string }> => {
    console.log('[PWA Auth v6.0] ========================================');
    console.log('[PWA Auth v6.0] ===== LOGIN START =====');
    console.log('[PWA Auth v6.0] Timestamp:', new Date().toISOString());
    console.log('[PWA Auth v6.0] Phone input:', params.phone);
    console.log('[PWA Auth v6.0] isSubmitting:', isSubmitting);
    
    if (isSubmitting) {
      console.log('[PWA Auth v6.0] BLOCKED - already submitting');
      return { success: false, error: 'Operação em andamento' };
    }
    
    setIsSubmitting(true);
    console.log('[PWA Auth v6.0] setIsSubmitting(true)');
    
    try {
      console.log('[PWA Auth v6.0] Calling RPC: login_pwa_by_phone_simple');
      const rpcStartTime = Date.now();
      
      const { data, error } = await supabase.rpc('login_pwa_by_phone_simple', {
        p_phone: params.phone,
      });
      
      const rpcElapsed = Date.now() - rpcStartTime;
      console.log('[PWA Auth v6.0] RPC responded in', rpcElapsed, 'ms');
      console.log('[PWA Auth v6.0] RPC data:', JSON.stringify(data));
      console.log('[PWA Auth v6.0] RPC error:', error);

      if (error) {
        console.error('[PWA Auth v6.0] RPC ERROR:', error.message);
        return { success: false, error: error.message };
      }

      const result = data as {
        success: boolean;
        message?: string;
        verification_code?: string;
        user_name?: string;
        error?: string;
        already_verified?: boolean;
        expires_at?: string;
        normalized_phone?: string;
      };

      console.log('[PWA Auth v6.0] Result parsed:', { 
        success: result.success, 
        already_verified: result.already_verified,
        has_verification_code: !!result.verification_code,
        verification_code: result.verification_code ? result.verification_code.substring(0, 2) + '****' : 'none',
        normalized_phone: result.normalized_phone,
        error: result.error 
      });

      // Já verificado - salvar e recarregar
      if (result.already_verified) {
        console.log('[PWA Auth v6.0] Already verified - saving phone and checking access');
        localStorage.setItem(STORAGE_KEY, params.phone);
        await checkAccess();
        return { success: true };
      }

      if (!result.success) {
        console.log('[PWA Auth v6.0] Login NOT successful:', result.error);
        if (result.error === 'no_invitation') {
          return { 
            success: false, 
            error: result.message || 'Não encontramos um convite para este telefone.' 
          };
        }
        return { success: false, error: result.error || 'Erro ao fazer login' };
      }

      // Atualizar para estado de envio de código
      console.log('[PWA Auth v6.0] Setting state to sending_code');
      setState(prev => ({
        ...prev,
        status: 'sending_code',
        userPhone: params.phone,
        userName: result.user_name || null,
        codeSentVia: null,
        codeSentError: null,
      }));

      // ============================================
      // ENVIO DE SMS - CHAMADA DIRETA v6.0
      // ============================================
      let sentChannel: CodeSentChannel = null;
      let sendError: string | null = null;
      
      const normalizedPhone = result.normalized_phone || params.phone;
      console.log('[PWA Auth v6.0] Normalized phone:', normalizedPhone);

      if (result.verification_code) {
        console.log('[PWA Auth v6.0] ===== SMS SEND BLOCK ENTERED =====');
        console.log('[PWA Auth v6.0] verification_code EXISTS, proceeding to send SMS');
        
        try {
          const smsMessage = `KnowYOU: Seu codigo de verificacao: ${result.verification_code}. Valido por 10 minutos.`;
          console.log('[PWA Auth v6.0] SMS message length:', smsMessage.length);
          console.log('[PWA Auth v6.0] SMS message preview:', smsMessage.substring(0, 30) + '...');
          
          console.log('[PWA Auth v6.0] Calling supabase.functions.invoke("send-sms")...');
          const smsStartTime = Date.now();
          
          const { data: smsResult, error: smsError } = await supabase.functions.invoke('send-sms', {
            body: {
              phoneNumber: normalizedPhone,
              message: smsMessage,
              eventType: 'pwa_otp'
            }
          });

          const smsElapsed = Date.now() - smsStartTime;
          console.log('[PWA Auth v6.0] send-sms responded in', smsElapsed, 'ms');
          console.log('[PWA Auth v6.0] send-sms data:', JSON.stringify(smsResult));
          console.log('[PWA Auth v6.0] send-sms error:', smsError ? JSON.stringify(smsError) : 'null');

          if (smsError) {
            console.error('[PWA Auth v6.0] SMS INVOCATION ERROR:', smsError);
            sendError = `Erro: ${smsError.message || JSON.stringify(smsError)}`;
          } else if (!smsResult) {
            console.error('[PWA Auth v6.0] SMS EMPTY RESPONSE');
            sendError = 'Resposta vazia do servidor';
          } else if (!smsResult.success) {
            console.error('[PWA Auth v6.0] SMS FAILED:', smsResult.error);
            sendError = smsResult.error || 'Falha ao enviar SMS';
          } else {
            sentChannel = 'sms';
            console.log('[PWA Auth v6.0] ✅ SMS SENT SUCCESSFULLY via:', smsResult.provider);
            console.log('[PWA Auth v6.0] SMS messageId:', smsResult.messageId);
          }
          console.log('[PWA Auth v6.0] ===== SMS SEND BLOCK COMPLETE =====');
        } catch (err: any) {
          console.error('[PWA Auth v6.0] SMS EXCEPTION:', err);
          console.error('[PWA Auth v6.0] SMS EXCEPTION stack:', err.stack);
          sendError = `Erro inesperado: ${err.message}`;
        }
      } else {
        console.log('[PWA Auth v6.0] NO verification_code - SMS block SKIPPED');
      }

      // Atualizar estado final
      console.log('[PWA Auth v6.0] Setting final state: needs_verification');
      console.log('[PWA Auth v6.0] sentChannel:', sentChannel);
      console.log('[PWA Auth v6.0] sendError:', sendError);
      
      setState(prev => ({
        ...prev,
        status: 'needs_verification',
        userPhone: normalizedPhone,
        verificationCode: result.verification_code || null,
        codeSentVia: sentChannel,
        codeSentError: sendError,
      }));

      console.log('[PWA Auth v6.0] ===== LOGIN END SUCCESS =====');
      return { success: true };

    } catch (err: any) {
      console.error('[PWA Auth v6.0] LOGIN UNEXPECTED ERROR:', err);
      console.error('[PWA Auth v6.0] LOGIN ERROR stack:', err.stack);
      return { success: false, error: 'Erro inesperado. Tente novamente.' };
    } finally {
      setIsSubmitting(false);
      console.log('[PWA Auth v6.0] setIsSubmitting(false)');
      console.log('[PWA Auth v6.0] ========================================');
    }
  }, [isSubmitting, checkAccess]);

  /**
   * Verificar código SMS (simplificado, usa telefone)
   */
  const verify = useCallback(async (params: VerifyParams): Promise<{ success: boolean; error?: string }> => {
    if (isSubmitting) return { success: false, error: 'Operação em andamento' };
    
    setIsSubmitting(true);
    
    try {
      const phone = state.userPhone;
      
      if (!phone) {
        return { success: false, error: 'Telefone não encontrado. Faça login novamente.' };
      }

      console.log('[PWA Auth v4.0] Verifying code for phone:', phone.substring(0, 8) + '...');
      
      const { data, error } = await supabase.rpc('verify_pwa_code_simple', {
        p_phone: phone,
        p_code: params.code,
      });

      if (error) {
        console.error('[PWA Auth v4.0] Verify error:', error);
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
        already_verified?: boolean;
      };

      console.log('[PWA Auth v4.0] Verify result:', { 
        success: result.success, 
        error: result.error,
        already_verified: result.already_verified 
      });

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
          return { success: false, error: 'Bloqueado por excesso de tentativas.' };
        }
        return { success: false, error: result.error || 'Código inválido' };
      }

      // SUCESSO! Salvar telefone no localStorage
      console.log('[PWA Auth v4.0] Verification SUCCESS! Saving phone to localStorage');
      localStorage.setItem(STORAGE_KEY, phone);

      // Enviar mensagem de boas-vindas
      try {
        await supabase.functions.invoke('send-pwa-notification', {
          body: {
            to: phone,
            template: "welcome",
            variables: { 
              "1": result.user_name || state.userName || "Usuário", 
              "2": "pwa"
            },
            channel: "sms",
            userId: null,
          }
        });
        console.log('[PWA Auth v4.0] Welcome message sent');
      } catch (welcomeErr) {
        console.warn('[PWA Auth v4.0] Failed to send welcome message:', welcomeErr);
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
      console.error('[PWA Auth v4.0] Verify unexpected error:', err);
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
      const phone = state.userPhone;
      
      if (!phone) {
        setState(prev => ({ ...prev, resendingCode: false }));
        return { success: false, error: 'Telefone não encontrado' };
      }
      
      // Chamar login para gerar novo código
      const { data, error } = await supabase.rpc('login_pwa_by_phone_simple', {
        p_phone: phone,
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

      // ============================================
      // REENVIO DE SMS - CHAMADA DIRETA v5.0
      // ============================================
      let sentChannel: CodeSentChannel = null;
      
      if (result.verification_code) {
        try {
          console.log('[PWA Auth v5.0] Reenviando código via SMS diretamente...');
          
          const smsMessage = `KnowYOU: Seu codigo de verificacao: ${result.verification_code}. Valido por 10 minutos.`;
          
          const { data: smsResult, error: smsError } = await supabase.functions.invoke('send-sms', {
            body: {
              phoneNumber: phone,
              message: smsMessage,
              eventType: 'pwa_otp_resend'
            }
          });

          console.log('[PWA Auth v5.0] Resend response:', JSON.stringify(smsResult));
          
          if (smsError) {
            console.warn('[PWA Auth v5.0] Failed to resend:', smsError);
            setState(prev => ({ 
              ...prev, 
              resendingCode: false, 
              codeSentError: 'Não foi possível reenviar o código.',
              verificationCode: result.verification_code || null,
            }));
            return { success: false, error: 'Falha ao reenviar código' };
          } else if (smsResult?.success) {
            sentChannel = 'sms';
            console.log('[PWA Auth v5.0] ✅ Código reenviado via:', smsResult.provider);
          }
        } catch (err) {
          console.warn('[PWA Auth v5.0] Error resending code:', err);
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
   * Logout - limpar localStorage e voltar para login
   */
  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState(prev => ({
      ...prev,
      status: 'needs_login',
      userName: null,
      userPhone: null,
      pwaAccess: [],
      verificationCode: null,
    }));
  }, []);

  /**
   * Refresh - verificar acesso novamente
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
    userName: state.userName,
    userPhone: state.userPhone,
    pwaAccess: state.pwaAccess,
    blockReason: state.blockReason,
    verificationCode: state.verificationCode,
    errorMessage: state.errorMessage,
    codeSentVia: state.codeSentVia,
    codeSentError: state.codeSentError,
    resendingCode: state.resendingCode,
    isSubmitting,
    
    // Ações
    login,
    verify,
    resendCode,
    backToLogin,
    logout,
    refresh,
  };
}

export default usePWAAuth;
