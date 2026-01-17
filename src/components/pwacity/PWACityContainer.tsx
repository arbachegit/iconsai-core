/**
 * ============================================================
 * PWACityContainer.tsx - Container principal do PWA City
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-17
 *
 * Descrição: Container raiz do PWA City que gerencia o estado
 * do chat e integração com APIs (OpenAI/Gemini).
 * ============================================================
 */

import React, { useState, useCallback } from "react";
import { PWACityHeader } from "./PWACityHeader";
import { ResultArea, Message } from "./ResultArea";
import { PromptArea } from "./PromptArea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Generate UUID using browser's crypto API
const generateUUID = () => crypto.randomUUID();

interface PWACityContainerProps {
  /** Nome do usuário logado */
  userName?: string | null;
  /** ID da sessão */
  sessionId?: string | null;
  /** Telefone do usuário */
  userPhone?: string | null;
  /** Callback para logout */
  onLogout?: () => void;
}

export const PWACityContainer: React.FC<PWACityContainerProps> = ({
  userName,
  sessionId,
  userPhone,
  onLogout,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  /**
   * Enviar mensagem para a API
   */
  const handleSendMessage = useCallback(
    async (content: string) => {
      // Adicionar mensagem do usuário
      const userMessage: Message = {
        id: generateUUID(),
        content,
        role: "user",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        // Buscar configuração da API (openai ou gemini)
        const { data: configData, error: configError } = await supabase
          .from("pwacity_config")
          .select("config_value")
          .eq("config_key", "default_api_provider")
          .single();

        if (configError) {
          throw new Error("Erro ao buscar configuração da API");
        }

        const apiProvider = configData?.config_value || "openai";

        console.log("[PWA City] Enviando mensagem para:", apiProvider);

        // Chamar Edge Function correspondente
        const functionName = `pwacity-${apiProvider}`;
        const { data: apiResponse, error: apiError } = await supabase.functions.invoke(
          functionName,
          {
            body: {
              prompt: content,
              sessionId,
              userPhone,
            },
          }
        );

        if (apiError) {
          throw new Error(apiError.message || "Erro ao processar resposta");
        }

        if (!apiResponse || !apiResponse.response) {
          throw new Error("Resposta vazia da API");
        }

        // Adicionar resposta da IA
        const assistantMessage: Message = {
          id: generateUUID(),
          content: apiResponse.response,
          role: "assistant",
          timestamp: new Date(),
          apiProvider,
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Salvar conversa no banco
        try {
          await supabase.from("pwacity_conversations").insert({
            phone: userPhone || "unknown",
            session_id: sessionId || null,
            prompt: content,
            response: apiResponse.response,
            api_provider: apiProvider,
            model_used: apiResponse.model || null,
            tokens_used: apiResponse.tokens || null,
            response_time_ms: apiResponse.responseTime || null,
            status: "completed",
          });
        } catch (dbError) {
          console.error("[PWA City] Erro ao salvar no banco:", dbError);
          // Não bloquear o usuário se falhar salvar no banco
        }
      } catch (error) {
        console.error("[PWA City] Erro ao enviar mensagem:", error);

        const errorMessage: Message = {
          id: generateUUID(),
          content: error instanceof Error ? error.message : "Erro ao processar sua mensagem. Tente novamente.",
          role: "error",
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, errorMessage]);
        toast.error("Erro ao enviar mensagem");
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId, userPhone]
  );

  /**
   * Abrir menu de configurações
   */
  const handleMenuClick = () => {
    setMenuOpen(true);
    toast.info("Menu de configurações em desenvolvimento");
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950">
      {/* Header */}
      <PWACityHeader
        userName={userName}
        onMenuClick={handleMenuClick}
        onLogout={onLogout}
      />

      {/* Área de mensagens */}
      <ResultArea messages={messages} isLoading={isLoading} />

      {/* Área de input */}
      <PromptArea
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        placeholder="Digite sua mensagem..."
      />
    </div>
  );
};

export default PWACityContainer;
