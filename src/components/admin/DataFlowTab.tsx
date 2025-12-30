import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShoppingCart, Wrench, Brain, Heart, Network, 
  ChevronRight, Smartphone, Info, 
  Maximize2, Minimize2, X,
  LucideIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLandscapeMode } from "@/hooks/useLandscapeMode";
import { cn } from "@/lib/utils";

// Módulos
import { 
  RetailSystemDiagram, 
  AutoControlDiagram, 
  TutorDiagram, 
  HealthCareDiagram 
} from "@/components/DataFlowDiagram/modules";
import DataFlowDiagram from "@/components/DataFlowDiagram";

interface Module {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bgGradient: string;
  component: React.ComponentType;
  badge?: string;
}

const modules: Module[] = [
  {
    id: "gov-system",
    name: "Gov System AI",
    description: "Visualização do fluxo de dados governamentais",
    icon: Network,
    color: "#10B981",
    bgGradient: "from-emerald-500/20 to-teal-500/20",
    component: DataFlowDiagram
  },
  {
    id: "retail",
    name: "Sistema de Varejo",
    description: "Fluxo de dados do varejo brasileiro",
    icon: ShoppingCart,
    color: "#F59E0B",
    bgGradient: "from-amber-500/20 to-yellow-500/20",
    component: RetailSystemDiagram,
    badge: "Novo"
  },
  {
    id: "autocontrol",
    name: "AutoControle",
    description: "Sistema de auto-monitoramento de robôs",
    icon: Wrench,
    color: "#8B5CF6",
    bgGradient: "from-violet-500/20 to-purple-500/20",
    component: AutoControlDiagram,
    badge: "Novo"
  },
  {
    id: "tutor",
    name: "Tutor",
    description: "Conheça seu cérebro, desenvolva hábitos",
    icon: Brain,
    color: "#EC4899",
    bgGradient: "from-pink-500/20 to-rose-500/20",
    component: TutorDiagram,
    badge: "Novo"
  },
  {
    id: "healthcare",
    name: "Saúde",
    description: "Sua companheira de saúde inteligente",
    icon: Heart,
    color: "#F43F5E",
    bgGradient: "from-rose-500/20 to-red-500/20",
    component: HealthCareDiagram,
    badge: "Novo"
  }
];

const tips = [
  "Clique nos elementos para ver detalhes",
  "Use o modo paisagem no celular para melhor visualização",
  "Ative o áudio para ouvir explicações",
  "Compartilhe via WhatsApp com seus contatos"
];

interface ModuleCardProps {
  module: Module;
  isActive: boolean;
  onClick: () => void;
}

const ModuleCard: React.FC<ModuleCardProps> = ({ module, isActive, onClick }) => {
  const Icon = module.icon;
  
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative p-4 rounded-xl text-left transition-all duration-300",
        "bg-gradient-to-br border",
        module.bgGradient,
        isActive 
          ? "border-2 shadow-lg" 
          : "border-gray-700/50 hover:border-gray-600"
      )}
      style={{ 
        borderColor: isActive ? module.color : undefined,
        boxShadow: isActive ? `0 0 20px ${module.color}30` : undefined
      }}
    >
      {/* Indicator bar */}
      {isActive && (
        <motion.div
          layoutId="activeIndicator"
          className="absolute left-0 top-2 bottom-2 w-1 rounded-full"
          style={{ backgroundColor: module.color }}
        />
      )}

      {/* Badge */}
      {module.badge && (
        <Badge 
          className="absolute top-2 right-2 text-xs bg-primary/80 text-primary-foreground"
        >
          {module.badge}
        </Badge>
      )}

      <div className="flex items-start gap-3">
        <div 
          className="p-2 rounded-lg"
          style={{ backgroundColor: `${module.color}20` }}
        >
          <Icon 
            className="w-5 h-5" 
            style={{ color: module.color }}
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-sm truncate">
            {module.name}
          </h3>
          <p className="text-xs text-gray-400 line-clamp-2 mt-0.5">
            {module.description}
          </p>
        </div>

        <motion.div
          animate={{ rotate: isActive ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight 
            className="w-4 h-4 text-gray-500" 
            style={{ color: isActive ? module.color : undefined }}
          />
        </motion.div>
      </div>
    </motion.button>
  );
};

const InfoPanel: React.FC = () => (
  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
    <div className="flex items-start gap-3">
      <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
      <div>
        <h4 className="font-medium text-blue-300 text-sm mb-2">Dicas de Uso</h4>
        <ul className="space-y-1">
          {tips.map((tip, index) => (
            <li key={index} className="text-xs text-blue-300/70 flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-blue-400" />
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  </div>
);

interface LandscapePromptProps {
  onDismiss: () => void;
}

const LandscapePrompt: React.FC<LandscapePromptProps> = ({ onDismiss }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
    onClick={onDismiss}
  >
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      onClick={(e) => e.stopPropagation()}
      className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full text-center"
    >
      <motion.div
        animate={{ rotate: [0, 90, 90, 0] }}
        transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
        className="inline-block mb-4"
      >
        <Smartphone className="w-16 h-16 text-primary" />
      </motion.div>

      <h3 className="text-xl font-bold text-white mb-2">
        Gire seu dispositivo
      </h3>
      <p className="text-sm text-gray-400 mb-6">
        Para uma melhor experiência com os diagramas interativos, 
        use o modo paisagem no seu celular.
      </p>

      <Button onClick={onDismiss} className="w-full">
        Entendi
      </Button>
    </motion.div>
  </motion.div>
);

export const DataFlowTab: React.FC = () => {
  const [activeModule, setActiveModule] = useState<string>("gov-system");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLandscapePrompt, setShowLandscapePrompt] = useState(false);

  const { isLandscape, isMobile, requestLandscape } = useLandscapeMode();

  // Landscape prompt logic
  useEffect(() => {
    const hasShown = sessionStorage.getItem('landscape-prompt-shown');
    if (isMobile && !isLandscape && !hasShown) {
      const timer = setTimeout(() => {
        setShowLandscapePrompt(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isMobile, isLandscape]);

  const dismissLandscapePrompt = () => {
    sessionStorage.setItem('landscape-prompt-shown', 'true');
    setShowLandscapePrompt(false);
  };

  // Fullscreen logic
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Get active module component
  const activeModuleData = modules.find(m => m.id === activeModule);
  const ActiveComponent = activeModuleData?.component || DataFlowDiagram;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">DataFlow</h2>
          <p className="text-sm text-gray-400">
            Visualizações interativas do fluxo de dados KnowYOU
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isMobile && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={requestLandscape}
              className="text-xs"
            >
              <Smartphone className="w-4 h-4 mr-1.5" />
              Paisagem
            </Button>
          )}
          <Button 
            variant="outline" 
            size="icon"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Grid de Módulos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {modules.map(module => (
          <ModuleCard 
            key={module.id}
            module={module}
            isActive={activeModule === module.id}
            onClick={() => setActiveModule(module.id)}
          />
        ))}
      </div>

      {/* Área do Módulo Ativo */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeModule}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="min-h-[600px] bg-gray-900/50 rounded-xl border border-gray-700 overflow-hidden"
        >
          <ActiveComponent />
        </motion.div>
      </AnimatePresence>

      {/* Info Panel */}
      <InfoPanel />

      {/* Landscape Prompt Modal */}
      <AnimatePresence>
        {showLandscapePrompt && (
          <LandscapePrompt onDismiss={dismissLandscapePrompt} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default DataFlowTab;
