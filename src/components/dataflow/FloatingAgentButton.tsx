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
import { cn } from "@/lib/utils";

interface FloatingAgentButtonProps {
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
      <IconComponent 
        className={cn(
          "w-6 h-6 text-white",
          "transition-transform duration-300"
        )} 
      />
    </button>
  );
}
