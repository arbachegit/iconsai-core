import React from "react";
import { motion } from "framer-motion";
import { HelpCircle, Play, ChevronRight, Volume2 } from "lucide-react";
import { usePWAStore } from "@/stores/pwaStore";

const helpTopics = [
  {
    id: "getting-started",
    title: "Começando",
    description: "Aprenda o básico do assistente",
    steps: [
      "Toque no microfone para falar",
      "Fale sua pergunta ou comando",
      "Aguarde a resposta em áudio",
    ],
  },
  {
    id: "modules",
    title: "Módulos disponíveis",
    description: "Conheça as áreas de atuação",
    steps: [
      "Mundo: perguntas gerais e conhecimento",
      "Saúde: triagem de sintomas",
      "Ideias: validação de ideias de negócio",
    ],
  },
  {
    id: "tips",
    title: "Dicas de uso",
    description: "Melhore sua experiência",
    steps: [
      "Fale de forma clara e pausada",
      "Aguarde o fim do áudio antes de falar",
      "Use frases curtas e diretas",
    ],
  },
];

export const HelpModule: React.FC = () => {
  const { setPlayerState } = usePWAStore();
  const [expandedTopic, setExpandedTopic] = React.useState<string | null>(null);

  const playTopicAudio = (topicId: string) => {
    setPlayerState("loading");
    // Simulate audio playback
    setTimeout(() => {
      setPlayerState("playing");
      setTimeout(() => setPlayerState("idle"), 3000);
    }, 500);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col gap-4 p-4"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
          <HelpCircle className="w-6 h-6 text-blue-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Ajuda</h2>
          <p className="text-sm text-muted-foreground">Como usar o assistente</p>
        </div>
      </div>

      {/* Topics list */}
      <div className="flex flex-col gap-3">
        {helpTopics.map((topic, index) => (
          <motion.div
            key={topic.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden"
          >
            {/* Topic header */}
            <button
              onClick={() => setExpandedTopic(
                expandedTopic === topic.id ? null : topic.id
              )}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">{index + 1}</span>
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-foreground">{topic.title}</h3>
                  <p className="text-xs text-muted-foreground">{topic.description}</p>
                </div>
              </div>
              <motion.div
                animate={{ rotate: expandedTopic === topic.id ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </motion.div>
            </button>

            {/* Expanded content */}
            <motion.div
              initial={false}
              animate={{
                height: expandedTopic === topic.id ? "auto" : 0,
                opacity: expandedTopic === topic.id ? 1 : 0,
              }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-3">
                {/* Steps */}
                <ul className="space-y-2">
                  {topic.steps.map((step, stepIndex) => (
                    <li key={stepIndex} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs text-primary">{stepIndex + 1}</span>
                      </span>
                      {step}
                    </li>
                  ))}
                </ul>

                {/* Play button */}
                <button
                  onClick={() => playTopicAudio(topic.id)}
                  className="w-full mt-3 py-2 px-4 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors flex items-center justify-center gap-2"
                >
                  <Volume2 className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Ouvir explicação</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default HelpModule;
