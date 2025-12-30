import { create } from "zustand";

export type AppState = "splash" | "home" | "module" | "conversation" | "summary";
export type ModuleId = "help" | "world" | "health" | "ideas" | null;
export type PlayerState = "idle" | "loading" | "playing" | "listening" | "processing";

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface UserPreferences {
  interests: string[];
  communicationStyle: "formal" | "informal" | "neutral";
  healthProfile: Record<string, string>;
}

interface PWAStore {
  // Estado da aplicação
  appState: AppState;
  setAppState: (state: AppState) => void;
  
  // Módulo ativo
  activeModule: ModuleId;
  setActiveModule: (module: ModuleId) => void;
  
  // Estado do player
  playerState: PlayerState;
  setPlayerState: (state: PlayerState) => void;
  
  // Histórico de conversa
  conversationHistory: ConversationMessage[];
  addMessage: (role: "user" | "assistant", content: string) => void;
  clearHistory: () => void;
  
  // Preferências do usuário (aprendidas)
  userPreferences: UserPreferences;
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
  
  // Health module state (OLDCARTS)
  healthAnswers: Record<string, string>;
  setHealthAnswer: (key: string, value: string) => void;
  clearHealthAnswers: () => void;
  
  // Ideas module state
  ideaContent: string;
  setIdeaContent: (content: string) => void;
  ideaCritique: string[];
  addCritique: (critique: string) => void;
  clearIdea: () => void;
}

export const usePWAStore = create<PWAStore>((set) => ({
  appState: "splash",
  setAppState: (state) => set({ appState: state }),
  
  activeModule: null,
  setActiveModule: (module) => set({ activeModule: module }),
  
  playerState: "idle",
  setPlayerState: (state) => set({ playerState: state }),
  
  conversationHistory: [],
  addMessage: (role, content) => set((state) => ({
    conversationHistory: [...state.conversationHistory, { role, content, timestamp: new Date() }]
  })),
  clearHistory: () => set({ conversationHistory: [] }),
  
  userPreferences: {
    interests: [],
    communicationStyle: "neutral",
    healthProfile: {},
  },
  updatePreferences: (prefs) => set((state) => ({
    userPreferences: { ...state.userPreferences, ...prefs }
  })),
  
  healthAnswers: {},
  setHealthAnswer: (key, value) => set((state) => ({
    healthAnswers: { ...state.healthAnswers, [key]: value }
  })),
  clearHealthAnswers: () => set({ healthAnswers: {} }),
  
  ideaContent: "",
  setIdeaContent: (content) => set({ ideaContent: content }),
  ideaCritique: [],
  addCritique: (critique) => set((state) => ({
    ideaCritique: [...state.ideaCritique, critique]
  })),
  clearIdea: () => set({ ideaContent: "", ideaCritique: [] }),
}));
