import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Play, Pause, Share2, Download, FileText, 
  MessageSquare 
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Conversation {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  transcript?: string;
  audioUrl?: string;
  summary?: string;
}

interface ConversationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
}

export const ConversationDrawer: React.FC<ConversationDrawerProps> = ({
  isOpen,
  onClose,
  conversations,
}) => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [audioElements] = useState<Map<string, HTMLAudioElement>>(new Map());

  const handlePlayPause = (id: string, audioUrl?: string) => {
    if (!audioUrl) return;

    if (playingId === id) {
      audioElements.get(id)?.pause();
      setPlayingId(null);
    } else {
      if (playingId) {
        audioElements.get(playingId)?.pause();
      }

      let audio = audioElements.get(id);
      if (!audio) {
        audio = new Audio(audioUrl);
        audio.onended = () => setPlayingId(null);
        audioElements.set(id, audio);
      }
      audio.play();
      setPlayingId(id);
    }
  };

  const handleShare = async (conv: Conversation) => {
    const dateStr = conv.createdAt.toLocaleDateString("pt-BR");
    const text = `KnowYOU - Conversa de ${dateStr}:\n\n${conv.transcript || conv.summary || "Sem transcrição disponível"}`;
    
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch (e) {
        // User cancelled or error
        console.log("Share cancelled");
      }
    } else {
      const encoded = encodeURIComponent(text);
      window.open(`https://wa.me/?text=${encoded}`, "_blank");
    }
  };

  const handleDownload = (conv: Conversation) => {
    if (!conv.audioUrl) return;
    
    const a = document.createElement("a");
    a.href = conv.audioUrl;
    a.download = `knowyou-${conv.id}.mp3`;
    a.click();
  };

  const handleTranscribe = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatDuration = (start: Date, end: Date) => {
    const seconds = Math.round((end.getTime() - start.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer - slides from top */}
          <motion.div
            className="fixed inset-x-0 top-0 z-50 bg-background rounded-b-2xl shadow-2xl max-h-[80vh] flex flex-col"
            initial={{ y: "-100%" }}
            animate={{ y: 0 }}
            exit={{ y: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">Histórico</h2>
                  <p className="text-xs text-muted-foreground">
                    {conversations.length} conversa{conversations.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onClose}
                className="rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Conversations list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageSquare className="w-12 h-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground">Nenhuma conversa ainda</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <motion.div
                    key={conv.id}
                    layout
                    className="bg-card/50 rounded-xl border border-border/30 overflow-hidden"
                  >
                    {/* Conversation header */}
                    <div className="flex items-center gap-3 p-3">
                      {/* Play/Pause button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-full bg-primary/10 hover:bg-primary/20"
                        onClick={() => handlePlayPause(conv.id, conv.audioUrl)}
                        disabled={!conv.audioUrl}
                      >
                        {playingId === conv.id ? (
                          <Pause className="w-5 h-5 text-primary" />
                        ) : (
                          <Play className="w-5 h-5 text-primary ml-0.5" />
                        )}
                      </Button>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">
                          {conv.summary || conv.transcript?.slice(0, 50) || "Conversa sem resumo"}
                          {conv.transcript && conv.transcript.length > 50 ? "..." : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {conv.createdAt.toLocaleDateString("pt-BR")} • {conv.createdAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          {` • ${formatDuration(conv.createdAt, conv.updatedAt)}`}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => handleShare(conv)}
                          title="Compartilhar"
                        >
                          <Share2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => handleDownload(conv)}
                          disabled={!conv.audioUrl}
                          title="Baixar áudio"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => handleTranscribe(conv.id)}
                          title="Ver transcrição"
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Expanded transcript */}
                    <AnimatePresence>
                      {expandedId === conv.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-3 pb-3 pt-0">
                            <div className="bg-background/50 rounded-lg p-3 text-sm text-muted-foreground">
                              {conv.transcript || "Transcrição não disponível"}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))
              )}
            </div>

            {/* Handle visual indicator */}
            <div className="flex justify-center pb-4 pt-2">
              <div className="w-12 h-1 rounded-full bg-muted-foreground/30" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ConversationDrawer;
