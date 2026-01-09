/**
 * ============================================================
 * components/pwa/history/MessageCard.tsx
 * ============================================================
 * Versao: 1.0.0 - 2026-01-08
 * PRD: Histo_rico_objeto.zip
 * Card individual de mensagem com funcionalidades de audio
 * ============================================================
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, FileText, Play, Pause, Download, ChevronDown, ChevronUp } from "lucide-react";
import {
  MESSAGE_COLORS,
  MESSAGE_TEXT_COLORS,
  MESSAGE_ICONS,
  MESSAGE_LABELS,
  type HistoryMessage,
} from "@/types/pwa-history";
import { formatTime } from "@/stores/historyStore";

interface MessageCardProps {
  message: HistoryMessage;
  onShare: (message: HistoryMessage) => void;
  onPlay: (message: HistoryMessage) => void;
  onDownload: (message: HistoryMessage) => void;
  isPlaying?: boolean;
}

export const MessageCard: React.FC<MessageCardProps> = ({
  message,
  onShare,
  onPlay,
  onDownload,
  isPlaying = false,
}) => {
  const [showTranscription, setShowTranscription] = useState(false);

  const colorClass = MESSAGE_COLORS[message.role];
  const textColorClass = MESSAGE_TEXT_COLORS[message.role];
  const icon = MESSAGE_ICONS[message.role];
  const label = MESSAGE_LABELS[message.role];

  // Verificar se ha transcricao diferente do conteudo
  const hasExpandableTranscription =
    message.transcription &&
    message.transcription !== message.content &&
    message.transcription.length > message.content.length;

  // Formatar duracao do audio
  const formatDuration = (seconds?: number): string => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <motion.div
      className={`rounded-2xl p-4 mx-4 mb-3 shadow-sm ${colorClass}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header com icone e label */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          {label && (
            <span className={`text-xs font-bold uppercase tracking-wide ${textColorClass} opacity-70`}>{label}</span>
          )}
        </div>
        {message.audioDuration && message.audioDuration > 0 && (
          <span className="text-xs text-gray-500">{formatDuration(message.audioDuration)}</span>
        )}
      </div>

      {/* Conteudo da mensagem */}
      <p className={`text-sm leading-relaxed ${textColorClass}`}>{message.content}</p>

      {/* Transcricao expandida */}
      <AnimatePresence>
        {showTranscription && hasExpandableTranscription && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 p-3 bg-black/5 rounded-xl"
          >
            <p className="text-xs text-gray-700 leading-relaxed">{message.transcription}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timestamp */}
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-gray-500">{formatTime(message.timestamp)}</span>

        {/* Botao de expandir transcricao */}
        {hasExpandableTranscription && (
          <button
            onClick={() => setShowTranscription(!showTranscription)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
          >
            {showTranscription ? (
              <>
                <ChevronUp className="w-3 h-3" />
                Menos
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                Transcricao completa
              </>
            )}
          </button>
        )}
      </div>

      {/* Footer com acoes */}
      <div className="flex justify-around mt-4 pt-3 border-t border-black/10">
        <ActionButton icon={Share2} label="Compartilhar" onClick={() => onShare(message)} />
        <ActionButton
          icon={FileText}
          label="Transcrever"
          onClick={() => setShowTranscription(!showTranscription)}
          active={showTranscription}
        />
        <ActionButton
          icon={isPlaying ? Pause : Play}
          label={isPlaying ? "Pausar" : "Play"}
          onClick={() => onPlay(message)}
          active={isPlaying}
          highlight
        />
        <ActionButton
          icon={Download}
          label="Download"
          onClick={() => onDownload(message)}
          disabled={!message.audioUrl}
        />
      </div>
    </motion.div>
  );
};

// ============================================================
// Componente ActionButton
// ============================================================
interface ActionButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  active?: boolean;
  highlight?: boolean;
  disabled?: boolean;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  icon: Icon,
  label,
  onClick,
  active = false,
  highlight = false,
  disabled = false,
}) => {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex flex-col items-center gap-1 p-2 rounded-xl transition-all
        ${disabled ? "opacity-30 cursor-not-allowed" : "hover:bg-black/5 active:scale-95"}
        ${active ? "bg-black/10" : ""}
        ${highlight && !disabled ? "text-emerald-600" : "text-gray-600"}
      `}
      whileTap={disabled ? {} : { scale: 0.95 }}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-medium">{label}</span>
    </motion.button>
  );
};

export default MessageCard;
