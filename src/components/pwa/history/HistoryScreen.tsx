/**
 * HistoryScreen.tsx - Tela de histórico de conversas do PWA
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Trash2, MessageSquare } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useHistoryStore } from "@/stores/historyStore";
import type { ModuleType, AudioMessage } from "@/components/pwa/types";
import { MessageCard } from "./MessageCard";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface HistoryScreenProps {
  moduleType: ModuleType;
  moduleName: string;
  moduleColor: string;
  onBack: () => void;
}

type GroupedMessages = Record<string, AudioMessage[]>;

const groupMessagesByDate = (messages: AudioMessage[]): GroupedMessages => {
  const groups: GroupedMessages = {};

  // Ordenar por timestamp decrescente (mais recentes primeiro)
  const sorted = [...messages].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  sorted.forEach((msg) => {
    const date = new Date(msg.timestamp);
    let label: string;

    if (isToday(date)) {
      label = "Hoje";
    } else if (isYesterday(date)) {
      label = "Ontem";
    } else {
      label = format(date, "dd/MM/yyyy", { locale: ptBR });
    }

    if (!groups[label]) groups[label] = [];
    groups[label].push(msg);
  });

  return groups;
};

export const HistoryScreen = ({
  moduleType,
  moduleName,
  moduleColor,
  onBack,
}: HistoryScreenProps) => {
  const { getMessages, clearHistory } = useHistoryStore();
  const messages = getMessages(moduleType);

  const groupedMessages = useMemo(() => groupMessagesByDate(messages), [messages]);
  const groupKeys = Object.keys(groupedMessages);

  const handleClearHistory = () => {
    if (messages.length === 0) return;
    
    clearHistory(moduleType);
    toast.success("Histórico limpo com sucesso");
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col h-full bg-background"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 pt-12 border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-10 w-10"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: moduleColor }}
          />
          <span className="font-medium text-foreground">
            Histórico - {moduleName}
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleClearHistory}
          disabled={messages.length === 0}
          className="h-10 w-10 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-5 h-5" />
        </Button>
      </div>

      {/* Conteúdo */}
      {messages.length === 0 ? (
        /* Estado vazio */
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${moduleColor}20` }}
          >
            <MessageSquare className="w-8 h-8" style={{ color: moduleColor }} />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-medium text-foreground mb-1">
              Nenhuma conversa ainda
            </h3>
            <p className="text-sm text-muted-foreground">
              Suas conversas aparecerão aqui
            </p>
          </div>
        </div>
      ) : (
        /* Lista de mensagens agrupadas */
        <ScrollArea className="flex-1">
          <div className="px-4 py-4 space-y-6">
            {groupKeys.map((dateLabel) => (
              <div key={dateLabel}>
                {/* Label da data */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {dateLabel}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Mensagens do grupo */}
                <div className="space-y-1">
                  {groupedMessages[dateLabel].map((msg, index) => (
                    <MessageCard
                      key={msg.id}
                      message={msg}
                      moduleColor={moduleColor}
                      index={index}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </motion.div>
  );
};
