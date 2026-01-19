/**
 * ============================================================
 * PWACityContainer.tsx - Container principal do PWA City
 * ============================================================
 * Versão: 2.0.0
 * Data: 2026-01-19
 *
 * Descrição: Container raiz do PWA City que gerencia o estado
 * do chat e integração com pwacity-agent (microserviço).
 * Fallback chain: Perplexity → Gemini → OpenAI
 * Demo Mode Support
 * ============================================================
 */

import React, { useState, useCallback, useEffect } from "react";
import { PWACityHeader } from "./PWACityHeader";
import { ResultArea, Message } from "./ResultArea";
import { PromptArea } from "./PromptArea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useDemoMode } from "@/hooks/useDemoMode";
import { useDemoStore } from "@/stores/demoStore";

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
  // DEMO MODE
  const { isDemoMode, demoType } = useDemoMode();
  const { seededConversations, demoUser } = useDemoStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Debug: Log quando componente monta/desmonta
  useEffect(() => {
    console.log("[PWA City] 🟢 Componente MONTADO");
    return () => {
      console.log("[PWA City] 🔴 Componente DESMONTADO");
    };
  }, []);

  // Carregar histórico seeded se demo=seeded
  useEffect(() => {
    if (isDemoMode && demoType === "seeded") {
      console.log("[PWA City] Carregando histórico seeded para demo");

      const seededMessages: Message[] = seededConversations.pwacity.map((msg, index) => ({
        id: `seeded-${index}`,
        content: msg.content,
        role: msg.role,
        timestamp: new Date(Date.now() - (seededConversations.pwacity.length - index) * 60000), // Espaçar por 1 min
      }));

      setMessages(seededMessages);
    }
  }, [isDemoMode, demoType, seededConversations.pwacity]);

  /**
   * Enviar mensagem para o pwacity-agent (microserviço com fallback)
   * Fallback chain: Perplexity → Gemini → OpenAI
   */
  const handleSendMessage = useCallback(
    async (content: string) => {
      console.log("[PWA City] === INÍCIO handleSendMessage ===");
      console.log("[PWA City] Content:", content);

      // Adicionar mensagem do usuário
      const userMessage: Message = {
        id: generateUUID(),
        content,
        role: "user",
        timestamp: new Date(),
      };

      console.log("[PWA City] Adicionando mensagem do usuário");
      setMessages((prev) => {
        console.log("[PWA City] Messages ANTES:", prev.length);
        const newMessages = [...prev, userMessage];
        console.log("[PWA City] Messages DEPOIS:", newMessages.length);
        return newMessages;
      });
      setIsLoading(true);

      try {
        console.log("[PWA City] Chamando pwacity-agent...");

        // Chamar Edge Function pwacity-agent (com fallback automático)
        const { data: apiResponse, error: apiError } = await supabase.functions.invoke(
          "pwacity-agent",
          {
            body: {
              prompt: content,
              sessionId,
              userPhone,
            },
          }
        );

        console.log("[PWA City] Resposta da API:", { apiResponse, apiError });

        if (apiError) {
          console.error("[PWA City] API Error:", apiError);
          throw new Error(apiError.message || "Erro ao processar resposta");
        }

        if (!apiResponse || !apiResponse.response) {
          console.error("[PWA City] Resposta inválida:", apiResponse);
          throw new Error("Resposta vazia da API");
        }

        const apiProvider = apiResponse.provider || "agent";

        console.log("[PWA City] ✅ Resposta recebida de:", apiProvider);
        if (apiResponse.fallbackUsed) {
          console.log("[PWA City] Fallback utilizado:", apiResponse.fallbackReason);
        }

        // Adicionar resposta da IA
        const assistantMessage: Message = {
          id: generateUUID(),
          content: apiResponse.response,
          role: "assistant",
          timestamp: new Date(),
          apiProvider,
        };

        console.log("[PWA City] Adicionando resposta do assistente");
        setMessages((prev) => {
          console.log("[PWA City] Messages ANTES (resposta):", prev.length);
          const newMessages = [...prev, assistantMessage];
          console.log("[PWA City] Messages DEPOIS (resposta):", newMessages.length);
          return newMessages;
        });

        // Salvar conversa no banco (APENAS se NÃO for demo mode)
        // NOTA: Tabela pwacity_conversations pode não existir - ignorar erro
        if (!isDemoMode) {
          const { error: dbError } = await supabase.from("pwacity_conversations").insert({
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
          if (dbError) {
            console.warn("[PWA City] Erro ao salvar no banco (ignorado):", dbError.message);
          }
        } else {
          console.log("[PWA City] Demo mode: pulando salvamento no banco");
        }
      } catch (error) {
        console.error("[PWA City] ❌ Erro ao enviar mensagem:", error);

        const errorMessage: Message = {
          id: generateUUID(),
          content: error instanceof Error ? error.message : "Erro ao processar sua mensagem. Tente novamente.",
          role: "error",
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, errorMessage]);
        toast.error("Erro ao enviar mensagem");
      } finally {
        console.log("[PWA City] === FIM handleSendMessage ===");
        setIsLoading(false);
      }
    },
    [sessionId, userPhone, isDemoMode]
  );

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Header */}
      <PWACityHeader
        userName={userName}
        onLogout={onLogout}
      />

      {/* Área de mensagens - flex-1 com scroll */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <ResultArea messages={messages} isLoading={isLoading} />
      </div>

      {/* Área de input - fixa no fundo */}
      <PromptArea
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        placeholder="Digite sua mensagem..."
      />
    </div>
  );
};

export default PWACityContainer;
