import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, ChevronRight, Volume2 } from "lucide-react";
import { VoicePlayerBox } from "../voice/VoicePlayerBox";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { usePWAStore } from "@/stores/pwaStore";

interface HelpStep {
  id: string;
  title: string;
  description: string;
  audioText: string;
}

const helpSteps: HelpStep[] = [
  {
    id: "welcome",
    title: "Bem-vindo ao KnowYOU",
    description: "Seu assistente de voz pessoal",
    audioText: "Olá! Eu sou o KnowYOU, seu assistente de voz pessoal. Vou te guiar pelas funcionalidades disponíveis.",
  },
  {
    id: "modules",
    title: "Módulos Disponíveis",
    description: "4 módulos para diferentes necessidades",
    audioText: "Você tem acesso a 4 módulos: Ajuda, para aprender a usar o aplicativo. Mundo, para perguntas gerais sobre qualquer assunto. Saúde, para triagem de sintomas. E Ideias, para validar e refinar suas ideias de negócio.",
  },
  {
    id: "voice",
    title: "Interação por Voz",
    description: "Fale naturalmente comigo",
    audioText: "Para interagir comigo, basta tocar no botão do microfone e falar naturalmente. Eu vou te ouvir, processar sua fala e responder em áudio.",
  },
  {
    id: "confirmation",
    title: "Confirmações por Voz",
    description: "Diga SIM ou NÃO para confirmar",
    audioText: "Quando eu fizer uma pergunta de confirmação, basta dizer SIM ou NÃO. Isso torna a experiência mais fluida e natural.",
  },
  {
    id: "complete",
    title: "Pronto para Começar!",
    description: "Você já sabe o básico",
    audioText: "Perfeito! Agora você já sabe o básico. Volte para a tela inicial e escolha um módulo para começar. Estou aqui para ajudar!",
  },
];

export const HelpModule: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const { speak, isPlaying, isLoading } = useTextToSpeech();
  const { setPlayerState } = usePWAStore();

  const currentHelpStep = helpSteps[currentStep];

  // Atualizar estado do player
  useEffect(() => {
    if (isLoading) {
      setPlayerState("loading");
    } else if (isPlaying) {
      setPlayerState("playing");
    } else {
      setPlayerState("idle");
    }
  }, [isLoading, isPlaying, setPlayerState]);

  const playCurrentStep = async () => {
    await speak(currentHelpStep.audioText);
    setCompletedSteps(prev => 
      prev.includes(currentHelpStep.id) ? prev : [...prev, currentHelpStep.id]
    );
  };

  const nextStep = () => {
    if (currentStep < helpSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const getPlayerState = () => {
    if (isLoading) return "loading";
    if (isPlaying) return "playing";
    return "idle";
  };

  return (
    <div className="flex flex-col h-full p-4">
      {/* Progress indicator */}
      <div className="flex justify-center gap-2 mb-6">
        {helpSteps.map((step, index) => (
          <motion.div
            key={step.id}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === currentStep
                ? "bg-blue-500 scale-125"
                : completedSteps.includes(step.id)
                ? "bg-emerald-500"
                : "bg-white/20"
            }`}
            animate={index === currentStep ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          />
        ))}
      </div>

      {/* Conteúdo do passo atual */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex-1 flex flex-col"
        >
          {/* Ícone e título */}
          <div className="text-center mb-6">
            <motion.div
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/20 mb-4"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <HelpCircle className="w-8 h-8 text-blue-400" />
            </motion.div>
            <h2 className="text-xl font-bold text-white mb-2">
              {currentHelpStep.title}
            </h2>
            <p className="text-slate-400">
              {currentHelpStep.description}
            </p>
          </div>

          {/* Voice Player */}
          <div className="flex-1 flex items-center justify-center">
            <VoicePlayerBox 
              state={getPlayerState()} 
              onMicClick={() => {}} 
              showMic={false}
            />
          </div>

          {/* Botão de play */}
          <motion.button
            onClick={playCurrentStep}
            disabled={isPlaying || isLoading}
            className={`
              w-full py-4 rounded-2xl font-semibold
              flex items-center justify-center gap-3
              transition-all duration-300
              ${isPlaying || isLoading
                ? "bg-blue-500/50 text-white/70"
                : "bg-blue-500 text-white hover:bg-blue-600"
              }
            `}
            whileHover={{ scale: isPlaying || isLoading ? 1 : 1.02 }}
            whileTap={{ scale: isPlaying || isLoading ? 1 : 0.98 }}
          >
            <Volume2 className="w-5 h-5" />
            {isPlaying ? "Reproduzindo..." : isLoading ? "Carregando..." : "Ouvir explicação"}
          </motion.button>
        </motion.div>
      </AnimatePresence>

      {/* Navegação */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
        <motion.button
          onClick={prevStep}
          disabled={currentStep === 0}
          className={`px-4 py-2 rounded-xl transition-all ${
            currentStep === 0
              ? "text-slate-600 cursor-not-allowed"
              : "text-slate-400 hover:text-white hover:bg-white/10"
          }`}
          whileTap={{ scale: currentStep === 0 ? 1 : 0.95 }}
        >
          Anterior
        </motion.button>

        <span className="text-slate-500 text-sm">
          {currentStep + 1} de {helpSteps.length}
        </span>

        <motion.button
          onClick={nextStep}
          disabled={currentStep === helpSteps.length - 1}
          className={`px-4 py-2 rounded-xl flex items-center gap-1 transition-all ${
            currentStep === helpSteps.length - 1
              ? "text-slate-600 cursor-not-allowed"
              : "text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
          }`}
          whileTap={{ scale: currentStep === helpSteps.length - 1 ? 1 : 0.95 }}
        >
          Próximo
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      </div>
    </div>
  );
};

export default HelpModule;
