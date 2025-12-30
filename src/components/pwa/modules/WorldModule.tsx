import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Send } from "lucide-react";
import { VoicePlayerBox } from "../voice/VoicePlayerBox";
import { MicrophoneOrb } from "../voice/MicrophoneOrb";
import { TranscriptArea } from "../voice/TranscriptArea";
import { useVoiceRecognition } from "@/hooks/useVoiceRecognition";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { usePWAVoiceStore, ConversationMessage } from "@/stores/pwaVoiceStore";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export const WorldModule: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [textInput, setTextInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasSpokenWelcome = useRef(false);
  
  const { 
    isListening, 
    transcript, 
    startListening, 
    stopListening,
    resetTranscript,
    isSupported,
  } = useVoiceRecognition();
  
  const { speak, isPlaying, isLoading, progress } = useTextToSpeech();
  const { setPlayerState, addMessageToCurrentConversation, userName } = usePWAVoiceStore();

  // Scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mensagem de boas-vindas
  useEffect(() => {
    if (hasSpokenWelcome.current) return;
    hasSpokenWelcome.current = true;
    
    const welcomeMessage = `Olá${userName ? ` ${userName}` : ""}! Sou seu assistente de conhecimento geral. Pergunte-me sobre qualquer assunto: ciência, história, tecnologia, cultura, ou o que você quiser saber. Toque no microfone para começar.`;
    speak(welcomeMessage);
    setMessages([{
      role: "assistant",
      content: welcomeMessage,
      timestamp: new Date(),
    }]);
  }, [speak, userName]);

  // Atualizar estado do player
  useEffect(() => {
    if (isLoading || isProcessing) {
      setPlayerState("loading");
    } else if (isPlaying) {
      setPlayerState("playing");
    } else if (isListening) {
      setPlayerState("listening");
    } else {
      setPlayerState("idle");
    }
  }, [isLoading, isPlaying, isListening, isProcessing, setPlayerState]);

  // Processar quando termina de ouvir
  useEffect(() => {
    if (!isListening && transcript) {
      handleUserInput(transcript);
      resetTranscript();
    }
  }, [isListening, transcript]);

  const handleUserInput = async (input: string) => {
    if (!input.trim()) return;

    // Adicionar mensagem do usuário
    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    addMessageToCurrentConversation({ role: "user", content: input, timestamp: new Date() });

    setIsProcessing(true);

    try {
      // Chamar edge function chat-router
      const { data, error } = await supabase.functions.invoke("chat-router", {
        body: {
          message: input,
          chatType: "world",
          sessionId: `pwa-world-${Date.now()}`,
        },
      });

      if (error) throw error;

      const aiResponse = data?.response || data?.message || "Desculpe, não consegui processar sua pergunta.";
      
      const assistantMessage: Message = {
        role: "assistant",
        content: aiResponse,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      addMessageToCurrentConversation({ role: "assistant", content: aiResponse, timestamp: new Date() });
      
      // Falar a resposta
      await speak(aiResponse);
      
    } catch (error) {
      console.error("Erro ao processar:", error);
      const errorMessage = "Desculpe, ocorreu um erro ao processar sua pergunta. Por favor, tente novamente.";
      setMessages(prev => [...prev, {
        role: "assistant",
        content: errorMessage,
        timestamp: new Date(),
      }]);
      await speak(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleMicTimeout = async () => {
    await speak("Não ouvi nada. Toque no microfone quando estiver pronto para perguntar.");
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      handleUserInput(textInput);
      setTextInput("");
    }
  };

  const getPlayerState = () => {
    if (isProcessing || isLoading) return "processing";
    if (isPlaying) return "playing";
    if (isListening) return "listening";
    return "idle";
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header do módulo */}
      <div className="flex items-center gap-3 p-4 border-b border-white/10">
        <motion.div
          className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/30 to-cyan-500/30 flex items-center justify-center"
          animate={{ 
            boxShadow: [
              "0 0 0 0 rgba(16, 185, 129, 0)",
              "0 0 20px 5px rgba(16, 185, 129, 0.3)",
              "0 0 0 0 rgba(16, 185, 129, 0)",
            ]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Globe className="w-5 h-5 text-emerald-400" />
        </motion.div>
        <div>
          <h2 className="text-lg font-bold text-white">Conhecimento Mundial</h2>
          <p className="text-xs text-slate-400">Pergunte sobre qualquer assunto</p>
        </div>
      </div>

      {/* Área de mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-emerald-500/20 text-white"
                    : "bg-white/10 text-slate-200"
                }`}
              >
                <p className="text-sm leading-relaxed">{message.content}</p>
                <p className="text-xs text-slate-500 mt-2">
                  {message.timestamp.toLocaleTimeString("pt-BR", { 
                    hour: "2-digit", 
                    minute: "2-digit" 
                  })}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Indicador de processamento */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex justify-start"
            >
              <div className="bg-white/10 rounded-2xl px-4 py-3 flex items-center gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 bg-emerald-400 rounded-full"
                    animate={{ y: [0, -6, 0] }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: i * 0.15,
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Transcript em tempo real */}
        {isListening && transcript && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-end"
          >
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl px-4 py-3">
              <p className="text-sm text-emerald-300">{transcript}...</p>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Área de input por voz */}
      <div className="p-4 border-t border-white/10">
        <div className="flex flex-col items-center gap-4">
          <VoicePlayerBox 
            state={getPlayerState()} 
            onMicClick={handleMicClick}
            showMic={false}
            audioProgress={progress}
          />
          
          <MicrophoneOrb
            isVisible={!isProcessing && !isPlaying}
            onCapture={(capturedTranscript) => handleUserInput(capturedTranscript)}
            onTimeout={handleMicTimeout}
            autoStart={false}
          />
          
          <TranscriptArea
            messages={messages.map(m => ({ role: m.role, content: m.content }))}
            interimTranscript={transcript}
            isListening={isListening}
          />

          {/* Fallback de texto */}
          {!isSupported && (
            <form onSubmit={handleTextSubmit} className="w-full flex gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Digite sua pergunta..."
                className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50"
              />
              <button
                type="submit"
                disabled={!textInput.trim() || isProcessing}
                className="p-2 bg-emerald-500 rounded-xl text-white disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorldModule;
