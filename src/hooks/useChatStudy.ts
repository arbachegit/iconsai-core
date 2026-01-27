import { useChat, type UseChatConfig, type Message } from "./useChat";

const STUDY_CONFIG: UseChatConfig = {
  chatType: "study",
  storageKey: "iconsai_study_chat_history",
  sessionIdPrefix: "study_",
  defaultSuggestions: [
    "O que é a KnowRisk?",
    "Como funciona o ACC?",
    "O que é o IconsAI Business?",
  ],
  imageEndpoint: "generate-image-study",
  guardrailMessage: "Sou especializado em ajudar a estudar sobre a KnowRISK, IconsAI Business, ACC e o conteúdo deste website. Não posso criar imagens sobre",
};

interface UseChatStudyOptions {
  userRegion?: string;
}

export type { Message };

export function useChatStudy(options: UseChatStudyOptions = {}) {
  return useChat(STUDY_CONFIG, options);
}
