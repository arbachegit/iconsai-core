/**
 * ============================================================
 * AudioMessageCard.tsx - Card de Mensagem de Áudio
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-04
 * ============================================================
 */

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, 
  Pause, 
  Share2, 
  FileText, 
  Send, 
  Download,
  Bot,
  Loader2,
  X
} from "lucide-react";
import type { AudioMessage } from "@/components/pwa/types";
import { supabase } from "@/integrations/supabase/client";

interface AudioMessageCardProps {
  message: AudioMessage;
  userInitials: string;
  onTranscriptionUpdate?: (messageId: string, transcription: string) => void;
}

export const AudioMessageCard: React.FC<AudioMessageCardProps> = ({
  message,
  userInitials,
  onTranscriptionUpdate,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showTranscription, setShowTranscription] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState(message.transcription || "");
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const isAssistant = message.role === "assistant";
  
  // Inicializar áudio
  useEffect(() => {
    audioRef.current = new Audio(message.audioUrl);
    
    audioRef.current.onplay = () => setIsPlaying(true);
    audioRef.current.onpause = () => setIsPlaying(false);
    audioRef.current.onended = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };
    audioRef.current.ontimeupdate = () => {
      if (audioRef.current) {
        const prog = (audioRef.current.currentTime / audioRef.current.duration) * 100;
        setProgress(prog);
        setCurrentTime(audioRef.current.currentTime);
      }
    };
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [message.audioUrl]);

  // Formatar tempo (mm:ss)
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Toggle play/pause
  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  // Seek no áudio
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    audioRef.current.currentTime = percentage * audioRef.current.duration;
  };

  // Ação: Compartilhar áudio
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: message.title,
          text: `Áudio do KnowYOU: ${message.title}`,
          url: message.audioUrl,
        });
      } else {
        await navigator.clipboard.writeText(message.audioUrl);
        alert("Link copiado!");
      }
    } catch (error) {
      console.error("Erro ao compartilhar:", error);
    }
  };

  // Ação: Transcrever áudio
  const handleTranscribe = async () => {
    if (transcription) {
      setShowTranscription(!showTranscription);
      return;
    }

    setIsTranscribing(true);
    
    try {
      // Buscar áudio e converter para base64
      const response = await fetch(message.audioUrl);
      const audioBlob = await response.blob();
      
      // Converter blob para base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(",")[1];
          resolve(base64);
        };
      });
      reader.readAsDataURL(audioBlob);
      const base64Audio = await base64Promise;
      
      // Chamar edge function
      const { data, error } = await supabase.functions.invoke("voice-to-text", {
        body: { audio: base64Audio },
      });
      
      if (error) throw error;
      
      const text = data?.text || "";
      setTranscription(text);
      setShowTranscription(true);
      
      // Atualizar no store
      onTranscriptionUpdate?.(message.id, text);
      
    } catch (error) {
      console.error("Erro ao transcrever:", error);
      alert("Erro ao transcrever áudio");
    } finally {
      setIsTranscribing(false);
    }
  };

  // Ação: Compartilhar transcrição
  const handleShareTranscription = async () => {
    if (!transcription) {
      await handleTranscribe();
      return;
    }
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: message.title,
          text: transcription,
        });
      } else {
        await navigator.clipboard.writeText(transcription);
        alert("Transcrição copiada!");
      }
    } catch (error) {
      console.error("Erro ao compartilhar:", error);
    }
  };

  // Ação: Download
  const handleDownload = async () => {
    try {
      const response = await fetch(message.audioUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = `${message.title.replace(/\s+/g, "_")}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao baixar:", error);
    }
  };

  return (
    <div className={`flex gap-3 ${isAssistant ? "flex-row" : "flex-row-reverse"}`}>
      {/* Avatar */}
      <div 
        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
          isAssistant 
            ? "bg-primary/20 text-primary" 
            : "bg-secondary/20 text-secondary"
        }`}
      >
        {isAssistant ? (
          <Bot className="w-5 h-5" />
        ) : (
          <span className="text-xs font-bold">{userInitials}</span>
        )}
      </div>

      {/* Card de áudio */}
      <div 
        className={`flex-1 max-w-[280px] rounded-2xl p-3 ${
          isAssistant 
            ? "bg-card border border-border" 
            : "bg-primary/10 border border-primary/20"
        }`}
      >
        {/* Título */}
        <p className="text-sm text-foreground font-medium mb-3 line-clamp-2">
          "{message.title}"
        </p>

        {/* Player de áudio */}
        <div className="flex items-center gap-3 mb-3">
          {/* Botão play/pause */}
          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary hover:bg-primary/30 transition-colors flex-shrink-0"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4 ml-0.5" />
            )}
          </button>

          {/* Barra de progresso */}
          <div className="flex-1 flex flex-col gap-1">
            <div
              onClick={handleSeek}
              className="h-2 bg-muted rounded-full cursor-pointer overflow-hidden"
            >
              <motion.div
                className="h-full bg-primary rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            
            {/* Tempo */}
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(message.duration)}</span>
            </div>
          </div>
        </div>

        {/* Botões de ação */}
        <div className="flex justify-between gap-1">
          {/* Compartilhar */}
          <button
            onClick={handleShare}
            className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-1"
          >
            <Share2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-[8px] text-muted-foreground">Compartilhar</span>
          </button>

          {/* Transcrever */}
          <button
            onClick={handleTranscribe}
            disabled={isTranscribing}
            className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-1 disabled:opacity-50"
          >
            {isTranscribing ? (
              <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
            ) : (
              <FileText className="w-4 h-4 text-muted-foreground" />
            )}
            <span className="text-[8px] text-muted-foreground">
              {transcription ? "Ver texto" : "Transcrever"}
            </span>
          </button>

          {/* Compartilhar transcrição */}
          <button
            onClick={handleShareTranscription}
            className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-1"
          >
            <Send className="w-4 h-4 text-muted-foreground" />
            <span className="text-[8px] text-muted-foreground">Enviar texto</span>
          </button>

          {/* Download */}
          <button
            onClick={handleDownload}
            className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-1"
          >
            <Download className="w-4 h-4 text-muted-foreground" />
            <span className="text-[8px] text-muted-foreground">Baixar</span>
          </button>
        </div>

        {/* Transcrição expandida (quando visível) */}
        <AnimatePresence>
          {showTranscription && transcription && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 p-3 bg-muted/50 rounded-lg relative">
                <button
                  onClick={() => setShowTranscription(false)}
                  className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/10"
                >
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
                <p className="text-xs text-muted-foreground pr-6">{transcription}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Timestamp */}
        <div className="text-right mt-2">
          <span className="text-[10px] text-muted-foreground/60">
            {new Date(message.timestamp).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AudioMessageCard;
