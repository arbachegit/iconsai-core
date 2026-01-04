import React from "react";
import { motion } from "framer-motion";
import { HelpCircle, Globe, Heart, Lightbulb, LucideIcon } from "lucide-react";
import type { ModuleId } from "@/stores/pwaVoiceStore";

interface Module {
  id: ModuleId;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  gradient: string;
  borderColor: string;
}

const modules: Module[] = [
  {
    id: "help",
    name: "Ajuda",
    description: "Como usar",
    icon: HelpCircle,
    color: "#3B82F6",
    gradient: "from-blue-500/20 to-cyan-500/20",
    borderColor: "border-blue-500/30",
  },
  {
    id: "world",
    name: "Mundo",
    description: "Conhecimento geral",
    icon: Globe,
    color: "#10B981",
    gradient: "from-emerald-500/20 to-teal-500/20",
    borderColor: "border-emerald-500/30",
  },
  {
    id: "health",
    name: "Saúde",
    description: "Triagem de sintomas",
    icon: Heart,
    color: "#F43F5E",
    gradient: "from-rose-500/20 to-pink-500/20",
    borderColor: "border-rose-500/30",
  },
  {
    id: "ideas",
    name: "Ideias",
    description: "Validação de ideias",
    icon: Lightbulb,
    color: "#F59E0B",
    gradient: "from-amber-500/20 to-yellow-500/20",
    borderColor: "border-amber-500/30",
  },
];

interface ModuleSelectorProps {
  onSelect: (moduleId: Exclude<ModuleId, null>) => void;
  activeModule?: ModuleId | null;
  isPlaying?: boolean; // NOVA PROP: controla se o áudio está tocando
}

export const ModuleSelector: React.FC<ModuleSelectorProps> = ({
  onSelect,
  activeModule,
  isPlaying = false, // Default false
}) => {
  return (
    <motion.div
      className="h-full flex flex-col justify-center px-2"
      // ANIMAÇÃO DE DESCIDA quando isPlaying
      animate={{
        y: isPlaying ? 48 : 0, // Desce 48px quando está tocando (espaço para spectrum)
        opacity: isPlaying ? 0.85 : 1, // Levemente mais transparente quando tocando
      }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        duration: 0.4,
      }}
    >
      {/* Grid de módulos - COMPACTO, SEM TEXTOS EXTRAS */}
      <div className="grid grid-cols-2 gap-3">
        {modules.map((module, index) => {
          const Icon = module.icon;
          const isActive = activeModule === module.id;

          return (
            <motion.button
              key={module.id}
              onClick={() => onSelect(module.id)}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: index * 0.08,
                type: "spring",
                stiffness: 200,
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className={`
                relative p-4 rounded-2xl
                bg-gradient-to-br ${module.gradient}
                border ${module.borderColor}
                backdrop-blur-sm
                flex flex-col items-center justify-center gap-2
                transition-all duration-200
                min-h-[100px]
                ${isActive ? "ring-2 ring-white/30" : ""}
              `}
            >
              {/* Ícone */}
              <motion.div
                animate={{ opacity: [0.8, 1, 0.8] }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: index * 0.3,
                }}
                className="relative"
              >
                <Icon className="w-8 h-8" style={{ color: module.color }} />
              </motion.div>

              {/* Nome do módulo */}
              <h3 className="text-white font-semibold text-sm">{module.name}</h3>

              {/* Descrição curta */}
              <p className="text-[10px] text-slate-400 text-center leading-tight">{module.description}</p>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
};

export default ModuleSelector;
