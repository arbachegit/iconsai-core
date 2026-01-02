import { 
  MessageCircle, 
  Building2, 
  Landmark, 
  ShoppingCart, 
  Settings2, 
  GraduationCap, 
  Heart, 
  MessageSquare,
  LucideIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export interface FloatingAgentButtonProps {
  selectedTopic: string | null;
  onOpenAgent: () => void;
}

const topicIconMap: Record<string, LucideIcon> = {
  architecture: Building2,
  govsystem: Landmark,
  retail: ShoppingCart,
  autocontrol: Settings2,
  tutor: GraduationCap,
  healthcare: Heart,
  talkapp: MessageSquare,
};

export function FloatingAgentButton({ selectedTopic, onOpenAgent }: FloatingAgentButtonProps) {
  const IconComponent = selectedTopic && topicIconMap[selectedTopic] 
    ? topicIconMap[selectedTopic] 
    : MessageCircle;

  return (
    <button
      onClick={onOpenAgent}
      aria-label="Abrir agente de voz"
      role="button"
      className={cn(
        "fixed bottom-6 right-6 z-50",
        "w-14 h-14 rounded-full",
        "bg-red-500 hover:bg-red-600",
        "shadow-lg hover:shadow-xl",
        "flex items-center justify-center",
        "transition-all duration-300",
        "transform hover:scale-105 active:scale-95",
        selectedTopic && "animate-pulse"
      )}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedTopic || 'default'}
          initial={{ scale: 0.95, opacity: 0.8 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0.8 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <IconComponent className="w-6 h-6 text-white" />
        </motion.div>
      </AnimatePresence>
    </button>
  );
}
