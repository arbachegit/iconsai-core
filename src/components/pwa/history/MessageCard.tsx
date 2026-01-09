/**
 * MessageCard.tsx - Card individual de mensagem no histórico
 */

import { motion } from "framer-motion";
import { User, Bot } from "lucide-react";
import type { AudioMessage } from "@/components/pwa/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MessageCardProps {
  message: AudioMessage;
  moduleColor: string;
  index: number;
}

export const MessageCard = ({ message, moduleColor, index }: MessageCardProps) => {
  const isUser = message.role === "user";
  
  const truncate = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + "...";
  };

  const formatTime = (date: Date): string => {
    return format(new Date(date), "HH:mm", { locale: ptBR });
  };

  const content = message.transcription || message.title || "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      className="flex gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
    >
      {/* Avatar */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          backgroundColor: isUser ? "hsl(var(--muted))" : `${moduleColor}20`,
        }}
      >
        {isUser ? (
          <User className="w-5 h-5 text-muted-foreground" />
        ) : (
          <Bot className="w-5 h-5" style={{ color: moduleColor }} />
        )}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-sm font-medium text-foreground">
            {isUser ? "Você" : "Assistente"}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatTime(message.timestamp)}
          </span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {truncate(content, 200)}
        </p>
      </div>
    </motion.div>
  );
};
