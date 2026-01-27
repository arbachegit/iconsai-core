import { useChat, type UseChatConfig, type Message } from "./useChat";

const HEALTH_CONFIG: UseChatConfig = {
  chatType: "health",
  storageKey: "iconsai_chat_history",
  sessionIdPrefix: "chat_",
  defaultSuggestions: [
    "O que é telemedicina?",
    "Como prevenir doenças crônicas?",
    "Tendências em saúde digital",
  ],
  imageEndpoint: "generate-image",
  guardrailMessage: "Sou especializado em auxiliar profissionais de saúde. Não posso criar imagens sobre",
};

interface UseChatIconsAI BusinessOptions {
  userRegion?: string;
}

export type { Message };

export function useChatIconsAI Business(options: UseChatIconsAI BusinessOptions = {}) {
  return useChat(HEALTH_CONFIG, options);
}
