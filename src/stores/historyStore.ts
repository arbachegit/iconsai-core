/**
 * ============================================================
 * historyStore.ts - Store de Histórico de Conversas
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-04
 * ============================================================
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AudioMessage, ModuleType } from "@/components/pwa/types";

interface HistoryState {
  // Mensagens por módulo
  messages: Record<ModuleType, AudioMessage[]>;
  
  // Perfil do usuário
  userInitials: string;
  
  // Ações
  addMessage: (moduleType: ModuleType, message: Omit<AudioMessage, "id" | "timestamp" | "moduleType">) => void;
  getMessages: (moduleType: ModuleType) => AudioMessage[];
  getAllMessages: () => AudioMessage[];
  clearHistory: (moduleType?: ModuleType) => void;
  updateTranscription: (messageId: string, transcription: string) => void;
  setUserInitials: (initials: string) => void;
  setTranscribing: (messageId: string, isTranscribing: boolean) => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      messages: {
        home: [],
        help: [],
        world: [],
        health: [],
        ideas: [],
      },
      
      userInitials: "FA",
      
      addMessage: (moduleType, message) => {
        const newMessage: AudioMessage = {
          ...message,
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
          moduleType,
        };
        
        set((state) => ({
          messages: {
            ...state.messages,
            [moduleType]: [...state.messages[moduleType], newMessage],
          },
        }));
      },
      
      getMessages: (moduleType) => {
        return get().messages[moduleType] || [];
      },
      
      getAllMessages: () => {
        const state = get();
        const allMessages: AudioMessage[] = [];
        
        Object.values(state.messages).forEach((msgs) => {
          allMessages.push(...msgs);
        });
        
        // Ordenar por timestamp (mais recente primeiro)
        return allMessages.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      },
      
      clearHistory: (moduleType) => {
        if (moduleType) {
          set((state) => ({
            messages: {
              ...state.messages,
              [moduleType]: [],
            },
          }));
        } else {
          set({
            messages: {
              home: [],
              help: [],
              world: [],
              health: [],
              ideas: [],
            },
          });
        }
      },
      
      updateTranscription: (messageId, transcription) => {
        set((state) => {
          const newMessages = { ...state.messages };
          
          (Object.keys(newMessages) as ModuleType[]).forEach((moduleKey) => {
            newMessages[moduleKey] = newMessages[moduleKey].map((msg) =>
              msg.id === messageId
                ? { ...msg, transcription, isTranscribing: false }
                : msg
            );
          });
          
          return { messages: newMessages };
        });
      },
      
      setTranscribing: (messageId, isTranscribing) => {
        set((state) => {
          const newMessages = { ...state.messages };
          
          (Object.keys(newMessages) as ModuleType[]).forEach((moduleKey) => {
            newMessages[moduleKey] = newMessages[moduleKey].map((msg) =>
              msg.id === messageId
                ? { ...msg, isTranscribing }
                : msg
            );
          });
          
          return { messages: newMessages };
        });
      },
      
      setUserInitials: (initials) => {
        set({ userInitials: initials });
      },
    }),
    {
      name: "pwa-history-storage",
    }
  )
);

export default useHistoryStore;
