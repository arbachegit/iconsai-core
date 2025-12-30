import React from "react";
import { motion } from "framer-motion";
import { HelpCircle, Globe, Heart, Lightbulb, ChevronRight } from "lucide-react";
import type { ModuleId } from "@/stores/pwaStore";

interface ModuleSelectorProps {
  onSelect: (moduleId: ModuleId) => void;
}

const modules = [
  {
    id: "help" as ModuleId,
    name: "Ajuda",
    description: "Como usar o assistente",
    icon: HelpCircle,
    color: "hsl(217, 91%, 60%)", // blue
    gradient: "from-blue-500/20 to-cyan-500/20",
    borderColor: "border-blue-500/30",
    hoverBorder: "hover:border-blue-500/60",
  },
  {
    id: "world" as ModuleId,
    name: "Mundo",
    description: "Conhecimento geral",
    icon: Globe,
    color: "hsl(160, 84%, 39%)", // emerald
    gradient: "from-emerald-500/20 to-teal-500/20",
    borderColor: "border-emerald-500/30",
    hoverBorder: "hover:border-emerald-500/60",
  },
  {
    id: "health" as ModuleId,
    name: "Saúde",
    description: "Triagem de sintomas",
    icon: Heart,
    color: "hsl(350, 89%, 60%)", // rose
    gradient: "from-rose-500/20 to-pink-500/20",
    borderColor: "border-rose-500/30",
    hoverBorder: "hover:border-rose-500/60",
  },
  {
    id: "ideas" as ModuleId,
    name: "Ideias",
    description: "Validação de ideias",
    icon: Lightbulb,
    color: "hsl(38, 92%, 50%)", // amber
    gradient: "from-amber-500/20 to-yellow-500/20",
    borderColor: "border-amber-500/30",
    hoverBorder: "hover:border-amber-500/60",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export const ModuleSelector: React.FC<ModuleSelectorProps> = ({ onSelect }) => {
  return (
    <motion.div
      className="grid grid-cols-2 gap-4 p-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {modules.map((module) => {
        const Icon = module.icon;
        
        return (
          <motion.button
            key={module.id}
            variants={itemVariants}
            onClick={() => onSelect(module.id)}
            className={`
              relative p-5 rounded-2xl 
              bg-gradient-to-br ${module.gradient} 
              border ${module.borderColor} ${module.hoverBorder}
              backdrop-blur-sm 
              flex flex-col items-center gap-3 
              active:scale-95 
              transition-all duration-300
              group
            `}
            whileTap={{ scale: 0.95 }}
            whileHover={{ y: -4 }}
          >
            {/* Subtle glow on hover */}
            <motion.div
              className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                background: `radial-gradient(circle at 50% 50%, ${module.color}20, transparent 70%)`,
              }}
            />
            
            {/* Icon with subtle animation */}
            <motion.div
              className="relative z-10"
              animate={{
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Icon 
                className="w-10 h-10" 
                style={{ color: module.color }}
              />
            </motion.div>
            
            {/* Text content */}
            <div className="relative z-10 text-center">
              <h3 className="font-semibold text-foreground">
                {module.name}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {module.description}
              </p>
            </div>
            
            {/* Arrow indicator */}
            <motion.div
              className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
              initial={{ x: -5 }}
              whileHover={{ x: 0 }}
            >
              <ChevronRight 
                className="w-4 h-4" 
                style={{ color: module.color }}
              />
            </motion.div>
          </motion.button>
        );
      })}
    </motion.div>
  );
};

export default ModuleSelector;
