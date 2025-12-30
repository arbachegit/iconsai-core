import React from "react";
import { motion } from "framer-motion";
import { HelpCircle, Globe, Heart, Lightbulb, ChevronRight, LucideIcon } from "lucide-react";
import { StatusIndicator } from "./StatusIndicator";
import type { ModuleId } from "@/stores/pwaStore";

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
    description: "Como usar o assistente",
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
  onSelect: (moduleId: ModuleId) => void;
  activeModule?: ModuleId | null;
}

export const ModuleSelector: React.FC<ModuleSelectorProps> = ({ 
  onSelect,
  activeModule,
}) => {
  return (
    <div className="p-4">
      {/* Título da seção */}
      <motion.div
        className="mb-4 text-center"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-lg font-semibold text-white">Como posso ajudar?</h2>
        <p className="text-sm text-slate-400">Escolha um módulo para começar</p>
      </motion.div>

      {/* Grid de módulos */}
      <div className="grid grid-cols-2 gap-3">
        {modules.map((module, index) => {
          const Icon = module.icon;
          const isActive = activeModule === module.id;

          return (
            <motion.button
              key={module.id}
              onClick={() => onSelect(module.id)}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ 
                delay: index * 0.1,
                type: "spring",
                stiffness: 200,
              }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={`
                relative p-4 rounded-2xl
                bg-gradient-to-br ${module.gradient}
                border ${module.borderColor}
                backdrop-blur-sm
                flex flex-col items-center gap-3
                transition-all duration-300
                ${isActive ? "ring-2 ring-white/30" : ""}
              `}
            >
              {/* Indicador de disponível */}
              <div className="absolute top-3 right-3">
                <StatusIndicator isActive size="sm" color={module.color} />
              </div>

              {/* Ícone com efeito de blink */}
              <motion.div
                animate={{ opacity: [1, 0.6, 1] }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: index * 0.5,
                }}
                className="relative"
              >
                {/* Glow atrás do ícone */}
                <div 
                  className="absolute inset-0 blur-xl opacity-50"
                  style={{ backgroundColor: module.color }}
                />
                <Icon className="relative w-10 h-10" color={module.color} />
              </motion.div>
              
              {/* Texto */}
              <div className="text-center">
                <h3 className="text-white font-semibold text-base">
                  {module.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  {module.description}
                </p>
              </div>

              {/* Seta indicando ação */}
              <motion.div
                className="absolute bottom-3 right-3 opacity-0"
                initial={{ opacity: 0, x: -5 }}
                whileHover={{ opacity: 1, x: 0 }}
              >
                <ChevronRight className="w-4 h-4" color={module.color} />
              </motion.div>
            </motion.button>
          );
        })}
      </div>

      {/* Dica de navegação */}
      <motion.p
        className="text-center text-xs text-slate-500 mt-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        Toque em um módulo para começar a conversa
      </motion.p>
    </div>
  );
};

export default ModuleSelector;
