import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Bot } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface TranscriptAreaProps {
  messages: Message[];
  interimTranscript?: string;
  isListening?: boolean;
  maxHeight?: string;
}

export const TranscriptArea: React.FC<TranscriptAreaProps> = ({
  messages,
  interimTranscript = "",
  isListening = false,
  maxHeight = "30vh",
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, interimTranscript]);

  if (messages.length === 0 && !interimTranscript) {
    return null;
  }

  return (
    <div className="w-full px-4">
      <div
        ref={scrollRef}
        className="rounded-xl bg-background/30 backdrop-blur-md border border-border/20 p-4 overflow-y-auto pwa-scrollable-area"
        style={{ maxHeight }}
      >
        <AnimatePresence mode="popLayout">
          {messages.map((message, index) => (
            <motion.div
              key={`message-${index}`}
              className={`flex items-start gap-3 mb-3 last:mb-0 ${
                message.role === "user" ? "flex-row-reverse" : ""
              }`}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              {/* Avatar */}
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === "user"
                    ? "bg-primary/20"
                    : "bg-secondary/40"
                }`}
              >
                {message.role === "user" ? (
                  <User className="w-4 h-4 text-primary" />
                ) : (
                  <Bot className="w-4 h-4 text-secondary-foreground" />
                )}
              </div>

              {/* Mensagem */}
              <div
                className={`flex-1 rounded-lg px-3 py-2 text-sm ${
                  message.role === "user"
                    ? "bg-primary/10 text-foreground ml-8"
                    : "bg-muted/50 text-foreground mr-8"
                }`}
              >
                {message.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Transcrição em tempo real */}
        <AnimatePresence>
          {isListening && interimTranscript && (
            <motion.div
              className="flex items-start gap-3 mt-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>

              <div className="flex-1 rounded-lg px-3 py-2 bg-primary/5 border border-primary/20 ml-8">
                <p className="text-sm text-muted-foreground italic">
                  {interimTranscript}...
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TranscriptArea;
