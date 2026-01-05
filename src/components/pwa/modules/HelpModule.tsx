import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, Mic, Globe, Heart, Lightbulb, History, Play, CheckCircle2, Volume2 } from "lucide-react";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { usePWAVoiceStore } from "@/stores/pwaVoiceStore";
import { useConfigPWA } from "@/hooks/useConfigPWA";

interface TutorialStep {
  icon: React.ElementType;
  title: string;
  description: string;
  audioDescription: string;
  color: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    icon: Mic,
    title: "Microfone",
    description: "Toque e segure para gravar sua voz",
    audioDescription: "O microfone é o botão principal. Toque nele para começar a gravar sua voz. Quando terminar de falar, solte o botão e o aplicativo vai processar sua mensagem.",
    color: "text-blue-400",
  },
  {
    icon: Globe,
    title: "Mundo",
    description: "Pergunte sobre qualquer assunto",
    audioDescription: "No módulo Mundo, você pode perguntar sobre qualquer assunto: ciência, história, tecnologia, cultura, ou curiosidades. É como ter uma enciclopédia falante.",
    color: "text-emerald-400",
  },
  {
    icon: Heart,
    title: "Saúde",
    description: "Triagem de sintomas com protocolo médico",
    audioDescription: "No módulo Saúde, você faz uma triagem de sintomas usando o protocolo OLDCARTS. Responda às perguntas e no final pode enviar um resumo para seu médico via WhatsApp.",
    color: "text-rose-400",
  },
  {
    icon: Lightbulb,
    title: "Ideias",
    description: "Valide suas ideias de negócio",
    audioDescription: "No módulo Ideias, você descreve sua ideia de negócio e eu faço perguntas desafiadoras para fortalecer seu projeto. É como ter um consultor testando sua proposta.",
    color: "text-amber-400",
  },
  {
    icon: History,
    title: "Histórico",
    description: "Veja suas conversas anteriores",
    audioDescription: "O ícone de histórico aparece no topo da tela quando você está em um módulo. Toque nele para ver suas conversas anteriores e continuar de onde parou.",
    color: "text-purple-400",
  },
  {
    icon: Play,
    title: "Ouvir Novamente",
    description: "Repita qualquer mensagem de áudio",
    audioDescription: "Você pode tocar no botão de play quantas vezes quiser para ouvir novamente qualquer mensagem. Não tenha pressa, estou aqui para ajudar.",
    color: "text-cyan-400",
  },
];

export const HelpModule: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Controle de autoplay - executa UMA vez por sessão do módulo
  const hasSpokenWelcome = useRef(false);

  const { speak, isPlaying, isLoading } = useTextToSpeech();
  const { setPlayerState, userName } = usePWAVoiceStore();
  const { config } = useConfigPWA();

  // ============================================================
  // AUTOPLAY: Executa texto de boas-vindas do módulo
  // ============================================================
  useEffect(() => {
    if (hasSpokenWelcome.current) return;
    hasSpokenWelcome.current = true;

    // Usa o texto configurado no admin ou um padrão
    const greeting =
      config.helpWelcomeText ||
      `Bem-vindo${userName ? `, ${userName}` : ""}! Este é o módulo de Ajuda. Aqui você aprende a usar todas as funcionalidades do KnowYOU. Toque em qualquer item abaixo para ouvir a explicação.`;

    // Pequeno delay para garantir que a UI está pronta
    const timer = setTimeout(() => {
      speak(greeting).catch((err) => {
        console.warn("Autoplay bloqueado pelo navegador:", err);
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [speak, userName, config.helpWelcomeText]);

  // Atualizar estado do player
  useEffect(() => {
    if (isLoading) {
      setPlayerState("processing");
    } else if (isPlaying) {
      setPlayerState("playing");
    } else {
      setPlayerState("waiting");
    }
  }, [isLoading, isPlaying, setPlayerState]);

  const handleStepClick = async (index: number) => {
    if (isPlaying) return; // Não permite clicar enquanto está falando

    setCurrentStep(index);
    const step = tutorialSteps[index];

    // Falar a explicação do passo
    await speak(step.audioDescription);

    // Marcar como completo
    if (!completedSteps.includes(index)) {
      setCompletedSteps((prev) => [...prev, index]);
    }
  };

  const progress = (completedSteps.length / tutorialSteps.length) * 100;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <motion.div
            className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center"
            animate={{
              boxShadow: isPlaying
                ? [
                    "0 0 0 0 rgba(59, 130, 246, 0)",
                    "0 0 20px 5px rgba(59, 130, 246, 0.4)",
                    "0 0 0 0 rgba(59, 130, 246, 0)",
                  ]
                : "none",
            }}
            transition={{ duration: 1.5, repeat: isPlaying ? Infinity : 0 }}
          >
            <HelpCircle className="w-6 h-6 text-blue-400" />
          </motion.div>
          <div>
            <h2 className="text-xl font-bold text-white">Como Usar o KnowYOU</h2>
            <p className="text-sm text-slate-400">Tutorial interativo com áudio</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-400"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>
              {completedSteps.length} de {tutorialSteps.length} concluídos
            </span>
            {completedSteps.length === tutorialSteps.length && (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Tutorial completo!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Lista de passos */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence>
          {tutorialSteps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = completedSteps.includes(index);
            const isActive = currentStep === index;

            return (
              <motion.button
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleStepClick(index)}
                disabled={isPlaying && !isActive}
                className={`w-full p-4 rounded-xl border transition-all text-left ${
                  isActive
                    ? "bg-blue-500/20 border-blue-500/50"
                    : isCompleted
                      ? "bg-slate-800/50 border-emerald-500/30"
                      : "bg-slate-800/30 border-white/10 hover:border-white/20"
                } ${isPlaying && !isActive ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isActive ? "bg-blue-500/30" : isCompleted ? "bg-emerald-500/20" : "bg-white/10"
                    }`}
                  >
                    {isCompleted && !isActive ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Icon className={`w-5 h-5 ${step.color}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-white">{step.title}</h3>
                      {isActive && isPlaying && (
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 0.5, repeat: Infinity }}
                        >
                          <Volume2 className="w-4 h-4 text-blue-400" />
                        </motion.div>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 mt-0.5">{step.description}</p>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Dica no rodapé */}
      <div className="p-4 border-t border-white/10">
        <div className="text-center text-sm text-slate-400">
          {isPlaying ? (
            <motion.span
              className="flex items-center justify-center gap-2 text-blue-400"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Volume2 className="w-4 h-4" />
              Ouvindo explicação...
            </motion.span>
          ) : (
            <span>Toque em qualquer item para ouvir a explicação</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default HelpModule;
