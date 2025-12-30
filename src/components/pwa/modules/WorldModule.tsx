import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Mic, Send, Loader2 } from "lucide-react";
import { usePWAStore } from "@/stores/pwaStore";
import { useVoiceRecognition } from "@/hooks/useVoiceRecognition";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { MicrophoneButton } from "../voice/MicrophoneButton";
import { supabase } from "@/integrations/supabase/client";

export const WorldModule: React.FC = () => {
  const { 
    playerState, 
    setPlayerState, 
    conversationHistory, 
    addMessage 
  } = usePWAStore();
  
  const { 
    isListening, 
    transcript, 
    interimTranscript,
    startListening, 
    stopListening,
    resetTranscript,
    isSupported 
  } = useVoiceRecognition();
  
  const { speak, isPlaying, isLoading: ttsLoading } = useTextToSpeech();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [textInput, setTextInput] = useState("");

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
      if (transcript.trim()) {
        processQuery(transcript);
      }
    } else {
      resetTranscript();
      startListening();
      setPlayerState("listening");
    }
  };

  const processQuery = async (query: string) => {
    if (!query.trim()) return;
    
    setIsProcessing(true);
    setPlayerState("processing");
    addMessage("user", query);

    try {
      // Call chat-router edge function
      const { data, error } = await supabase.functions.invoke("chat-router", {
        body: {
          message: query,
          chatType: "economia", // Using existing agent
          sessionId: `pwa-world-${Date.now()}`,
        },
      });

      if (error) throw error;

      const response = data?.response || "Desculpe, não consegui processar sua pergunta.";
      addMessage("assistant", response);
      
      // Speak the response
      setPlayerState("playing");
      await speak(response);
      setPlayerState("idle");
      
    } catch (err) {
      console.error("Error processing query:", err);
      addMessage("assistant", "Ocorreu um erro ao processar sua pergunta. Tente novamente.");
      setPlayerState("idle");
    } finally {
      setIsProcessing(false);
      resetTranscript();
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      processQuery(textInput);
      setTextInput("");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border/50">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
          <Globe className="w-6 h-6 text-emerald-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Mundo</h2>
          <p className="text-sm text-muted-foreground">Pergunte sobre qualquer assunto</p>
        </div>
      </div>

      {/* Conversation area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversationHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center"
            >
              <Globe className="w-10 h-10 text-emerald-500/60" />
            </motion.div>
            <div>
              <p className="text-muted-foreground">
                Faça uma pergunta sobre qualquer assunto
              </p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                Toque no microfone para começar
              </p>
            </div>
          </div>
        ) : (
          conversationHistory.map((msg, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-2xl ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted text-foreground rounded-bl-md"
                }`}
              >
                <p className="text-sm">{msg.content}</p>
              </div>
            </motion.div>
          ))
        )}

        {/* Listening indicator */}
        <AnimatePresence>
          {isListening && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex justify-end"
            >
              <div className="max-w-[80%] p-3 rounded-2xl bg-primary/20 text-primary rounded-br-md">
                <p className="text-sm italic">
                  {interimTranscript || transcript || "Ouvindo..."}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Processing indicator */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex justify-start"
            >
              <div className="p-3 rounded-2xl bg-muted flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Pensando...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-border/50 space-y-4">
        {/* Voice button */}
        <div className="flex justify-center">
          <MicrophoneButton
            isListening={isListening}
            isProcessing={isProcessing}
            onClick={handleMicClick}
            disabled={isPlaying || ttsLoading}
            size="lg"
          />
        </div>

        {/* Text input fallback */}
        <form onSubmit={handleTextSubmit} className="flex gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Ou digite sua pergunta..."
            disabled={isProcessing || isListening}
            className="flex-1 px-4 py-2 rounded-xl bg-muted/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            type="submit"
            disabled={!textInput.trim() || isProcessing}
            className="p-2 rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </motion.div>
  );
};

export default WorldModule;
