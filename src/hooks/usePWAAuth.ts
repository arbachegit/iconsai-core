// =============================================
// PWA Auth Hook v9.0 - Com Cookie Backup
// Build: 2026-01-22
// Funções: login_pwa_by_phone_simple, verify_pwa_code_simple, check_pwa_access
// Tabelas: user_invitations, pwa_user_devices
// v9.0: Adicionado cookie de backup para persistência cross-browser
// src/hooks/usePWAAuth.ts
// =============================================

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "pwa-verified-phone";
const COOKIE_KEY = "pwa_phone";
const SESSION_DURATION_DAYS = 30;

// ============================================
// HELPERS PARA COOKIES
// ============================================
function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Strict`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

export type PWAAuthStatus =
  | "loading"
  | "verified"
  | "blocked"
  | "needs_login"
  | "needs_verification"
  | "sending_code"
  | "error";

export type CodeSentChannel = "whatsapp" | "sms" | null;

interface PWAAuthState {
  status: PWAAuthStatus;
  userName: string | null;
  userPhone: string | null;
  pwaAccess: string[];
  blockReason: string | null;
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
    status: "loading",
    userName: null,
    userPhone: null,
    pwaAccess: [],
    blockReason: null,
    errorMessage: null,
    codeSentVia: null,
    codeSentError: null,
    resendingCode: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Verificar status de acesso usando telefone do localStorage + cookie backup
   */
  const checkAccess = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, status: "loading", errorMessage: null }));

      // v9.0: Verificar localStorage primeiro, depois cookie como fallback
      let verifiedPhone = localStorage.getItem(STORAGE_KEY);

      // Se não encontrou no localStorage, tentar cookie
      if (!verifiedPhone) {
        const cookiePhone = getCookie(COOKIE_KEY);
        if (cookiePhone) {
          console.log("[PWA Auth v9.0] Restaurando sessão do cookie");
          verifiedPhone = cookiePhone;
          // Restaurar para localStorage também
          localStorage.setItem(STORAGE_KEY, cookiePhone);
        }
      }

      console.log("[PWA Auth v9.0] Checking access...");
      console.log("[PWA Auth v9.0] Verified phone:", verifiedPhone ? verifiedPhone.substring(0, 8) + "..." : "none");

      if (!verifiedPhone) {
        console.log("[PWA Auth v9.0] No verified phone -> needs_login");
        setState((prev) => ({ ...prev, status: "needs_login" }));
        return;
      }

      // Verificar acesso via RPC (nova função)
      const { data, error } = await supabase.rpc("check_pwa_access", {
        p_phone: verifiedPhone,
      });

      console.log("[PWA Auth v8.0] check_pwa_access response:", { data, error });

      if (error) {
        console.error("[PWA Auth v9.0] RPC Error:", error);
        // v9.0: Limpar tanto localStorage quanto cookie
        localStorage.removeItem(STORAGE_KEY);
        deleteCookie(COOKIE_KEY);
        setState((prev) => ({
          ...prev,
          status: "needs_login",
          errorMessage: "Erro ao verificar acesso. Faça login novamente.",
        }));
        return;
      }

      const result = data as {
        has_access: boolean;
        user_name?: string;
        expires_at?: string;
      };

      if (result.has_access) {
        console.log("[PWA Auth v8.0] Status: VERIFIED ✅");
        setState((prev) => ({
          ...prev,
          status: "verified",
          userName: result.user_name || null,
          userPhone: verifiedPhone,
        }));
        return;
      }

      // Sem acesso - precisa fazer login
      console.log("[PWA Auth v8.0] No access -> needs_login");
      localStorage.removeItem(STORAGE_KEY);
      setState((prev) => ({ ...prev, status: "needs_login" }));
    } catch (err) {
      console.error("[PWA Auth v8.0] Unexpected error:", err);
      setState((prev) => ({
        ...prev,
        status: "error",
        errorMessage: "Erro inesperado. Tente novamente.",
      }));
    }
  }, []);

  /**
   * Login por telefone
   */
  const login = useCallback(
    async (params: LoginParams): Promise<{ success: boolean; error?: string }> => {
      console.log("[PWA Auth v8.0] ===== LOGIN START =====");
      console.log("[PWA Auth v8.0] Phone:", params.phone);

      if (isSubmitting) {
        return { success: false, error: "Operação em andamento" };
      }

      setIsSubmitting(true);

      try {
        // Chamar função login_pwa_by_phone_simple que verifica user_invitations
        const { data, error } = await supabase.rpc("login_pwa_by_phone_simple", {
          p_phone: params.phone,
        });

        console.log("[PWA Auth v8.0] login_pwa_by_phone_simple response:", { data, error });

        if (error) {
          console.error("[PWA Auth v8.0] RPC ERROR:", error.message);
          return { success: false, error: error.message };
        }

        const result = data as {
          success: boolean;
          verification_code?: string;
          user_name?: string;
          phone?: string;
          normalized_phone?: string;  // _simple function returns this
          error?: string;
          message?: string;  // _simple functions return message
          already_verified?: boolean;
          pwa_access?: string[];
          expires_at?: string;
        };

        // Já verificado - salvar e recarregar
        if (result.already_verified) {
          console.log("[PWA Auth v8.0] Already verified");
          const phoneToSave = result.normalized_phone || result.phone || params.phone;
          localStorage.setItem(STORAGE_KEY, phoneToSave);
          await checkAccess();
          return { success: true };
        }

        if (!result.success) {
          console.log("[PWA Auth v8.0] Login failed:", result.error);
          if (result.error === "no_invitation") {
            return {
              success: false,
              error: "Você precisa de um convite para acessar o PWA. Solicite ao administrador.",
            };
          }
          if (result.error === "invalid_phone") {
            return {
              success: false,
              error: "Telefone inválido. Use o formato (DDD) 9XXXX-XXXX",
            };
          }
          return { success: false, error: result.message || result.error || "Erro ao fazer login" };
        }

        // Atualizar estado para envio de código
        const normalizedPhone = result.normalized_phone || result.phone || params.phone;
        setState((prev) => ({
          ...prev,
          status: "sending_code",
          userPhone: normalizedPhone,
          userName: result.user_name || null,
          codeSentVia: null,
          codeSentError: null,
        }));

        // Enviar SMS com código
        let sentChannel: CodeSentChannel = null;

        if (result.verification_code) {
          try {
            console.log("[PWA Auth v8.0] Enviando SMS...");

            const smsMessage = `KnowYOU: Seu codigo de verificacao: ${result.verification_code}. Valido por 10 minutos.`;

            const { data: smsResult, error: smsError } = await supabase.functions.invoke("send-sms", {
              body: {
                phoneNumber: normalizedPhone,
                message: smsMessage,
                eventType: "pwa_otp",
              },
            });

            console.log("[PWA Auth v8.0] SMS response:", smsResult);

            if (!smsError && smsResult?.success) {
              sentChannel = "sms";
              console.log("[PWA Auth v8.0] ✅ SMS enviado via:", smsResult.provider);
            } else {
              console.warn("[PWA Auth v8.0] SMS falhou:", smsError || smsResult?.error);
            }
          } catch (smsErr) {
            console.error("[PWA Auth v8.0] SMS exception:", smsErr);
          }
        }

        // Atualizar para tela de verificação
        setState((prev) => ({
          ...prev,
          status: "needs_verification",
          codeSentVia: sentChannel,
          codeSentError: sentChannel ? null : "Não foi possível enviar o código. Tente reenviar.",
        }));

        return { success: true };
      } catch (err) {
        console.error("[PWA Auth v8.0] Login exception:", err);
        return { success: false, error: "Erro inesperado. Tente novamente." };
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, checkAccess],
  );

  /**
   * Verificar código
   */
  const verify = useCallback(
    async (params: VerifyParams): Promise<{ success: boolean; error?: string }> => {
      console.log("[PWA Auth v8.0] ===== VERIFY START =====");

      if (isSubmitting) return { success: false, error: "Operação em andamento" };

      setIsSubmitting(true);

      try {
        const phone = state.userPhone;

        if (!phone) {
          return { success: false, error: "Telefone não encontrado. Faça login novamente." };
        }

        console.log("[PWA Auth v8.0] Verifying code for phone:", phone.substring(0, 8) + "...");

        // Chamar função verify_pwa_code_simple que atualiza pwa_user_devices
        const { data, error } = await supabase.rpc("verify_pwa_code_simple", {
          p_phone: phone,
          p_code: params.code,
        });

        console.log("[PWA Auth v8.0] verify_pwa_code_simple response:", { data, error });

        if (error) {
          console.error("[PWA Auth v8.0] Verify error:", error);
          return { success: false, error: error.message };
        }

        const result = data as {
          success: boolean;
          verified?: boolean;
          user_name?: string;
          phone?: string;
          pwa_access?: string[];
          expires_at?: string;
          error?: string;
          message?: string;
        };

        if (!result.success) {
          if (result.error === "invalid_code") {
            return { success: false, error: "Código inválido. Tente novamente." };
          }
          if (result.error === "code_expired") {
            return { success: false, error: "Código expirado. Solicite um novo código." };
          }
          if (result.error === "too_many_attempts") {
            setState((prev) => ({ ...prev, status: "blocked", blockReason: "Excesso de tentativas" }));
            return { success: false, error: "Bloqueado por excesso de tentativas." };
          }
          if (result.error === "session_not_found" || result.error === "internal_error") {
            return { success: false, error: result.message || "Sessão não encontrada. Faça login novamente." };
          }
          return { success: false, error: result.message || result.error || "Código inválido" };
        }

        // SUCESSO! Salvar telefone no localStorage E cookie
        console.log("[PWA Auth v9.0] ✅ Verification SUCCESS!");
        const phoneToSave = result.phone || phone;
        localStorage.setItem(STORAGE_KEY, phoneToSave);
        // v9.0: Cookie backup para persistência cross-browser
        setCookie(COOKIE_KEY, phoneToSave, SESSION_DURATION_DAYS);

        // Enviar mensagem de boas-vindas
        try {
          const userName = result.user_name || state.userName || "Usuário";
          const welcomeMessage = `KnowYOU: Ola ${userName}! Bem-vindo ao KnowYOU. Acesse: https://fia.iconsai.ai/pwa`;

          await supabase.functions.invoke("send-sms", {
            body: {
              phoneNumber: phone,
              message: welcomeMessage,
              eventType: "pwa_welcome",
            },
          });
          console.log("[PWA Auth v8.0] Welcome message sent");
        } catch (welcomeErr) {
          console.warn("[PWA Auth v8.0] Failed to send welcome message:", welcomeErr);
        }

        // Atualizar estado
        setState((prev) => ({
          ...prev,
          status: "verified",
          userName: result.user_name || prev.userName,
        }));

        return { success: true };
      } catch (err) {
        console.error("[PWA Auth v8.0] Verify exception:", err);
        return { success: false, error: "Erro inesperado. Tente novamente." };
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, state.userPhone, state.userName],
  );

  /**
   * Reenviar código de verificação
   */
  const resendCode = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (state.resendingCode) return { success: false, error: "Operação em andamento" };

    setState((prev) => ({ ...prev, resendingCode: true, codeSentError: null }));

    try {
      const phone = state.userPhone;

      if (!phone) {
        setState((prev) => ({ ...prev, resendingCode: false }));
        return { success: false, error: "Telefone não encontrado" };
      }

      // Chamar login_pwa_by_phone_simple para gerar novo código
      const { data, error } = await supabase.rpc("login_pwa_by_phone_simple", {
        p_phone: phone,
      });

      if (error) {
        setState((prev) => ({ ...prev, resendingCode: false, codeSentError: error.message }));
        return { success: false, error: error.message };
      }

      const result = data as {
        success: boolean;
        verification_code?: string;
        phone?: string;
        normalized_phone?: string;
        error?: string;
        message?: string;
      };

      if (!result.success) {
        setState((prev) => ({ ...prev, resendingCode: false, codeSentError: result.message || result.error || "Erro ao reenviar" }));
        return { success: false, error: result.message || result.error || "Erro ao reenviar código" };
      }

      // Enviar SMS
      let sentChannel: CodeSentChannel = null;
      const normalizedPhone = result.normalized_phone || result.phone || phone;

      if (result.verification_code) {
        try {
          console.log("[PWA Auth v8.0] Reenviando código via SMS...");

          const smsMessage = `KnowYOU: Seu codigo de verificacao: ${result.verification_code}. Valido por 10 minutos.`;

          const { data: smsResult, error: smsError } = await supabase.functions.invoke("send-sms", {
            body: {
              phoneNumber: normalizedPhone,
              message: smsMessage,
              eventType: "pwa_otp_resend",
            },
          });

          console.log("[PWA Auth v8.0] Resend response:", smsResult);

          if (!smsError && smsResult?.success) {
            sentChannel = "sms";
            console.log("[PWA Auth v8.0] ✅ Código reenviado via:", smsResult.provider);
          } else {
            setState((prev) => ({
              ...prev,
              resendingCode: false,
              codeSentError: "Não foi possível reenviar o código.",
            }));
            return { success: false, error: "Falha ao reenviar código" };
          }
        } catch (err) {
          console.warn("[PWA Auth v8.0] Error resending code:", err);
          setState((prev) => ({ ...prev, resendingCode: false, codeSentError: "Erro ao reenviar" }));
          return { success: false, error: "Erro ao reenviar código" };
        }
      }

      setState((prev) => ({
        ...prev,
        resendingCode: false,
        codeSentVia: sentChannel,
        codeSentError: null,
      }));

      return { success: true };
    } catch (err) {
      setState((prev) => ({ ...prev, resendingCode: false, codeSentError: "Erro inesperado" }));
      return { success: false, error: "Erro inesperado" };
    }
  }, [state.resendingCode, state.userPhone]);

  /**
   * Voltar para tela de login
   */
  const backToLogin = useCallback(() => {
    setState((prev) => ({
      ...prev,
      status: "needs_login",
      codeSentVia: null,
      codeSentError: null,
    }));
  }, []);

  /**
   * Logout - limpar localStorage, cookie e voltar para login
   */
  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    // v9.0: Limpar cookie também
    deleteCookie(COOKIE_KEY);
    setState((prev) => ({
      ...prev,
      status: "needs_login",
      userName: null,
      userPhone: null,
      pwaAccess: [],
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
