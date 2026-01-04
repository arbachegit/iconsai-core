import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, AlertTriangle, CheckCircle2 } from "lucide-react";
import { MicrophoneOrb } from "../voice/MicrophoneOrb";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { usePWAVoiceStore } from "@/stores/pwaVoiceStore";
import { useConfigPWA } from "@/hooks/useConfigPWA";

interface OldcartsQuestion {
  key: string;
  question: string;
  audioQuestion: string;
  followUp?: string;
}

const oldcartsQuestions: OldcartsQuestion[] = [
  {
    key: "onset",
    question: "Início",
    audioQuestion: "Quando isso começou? Foi de repente ou gradual?",
    followUp: "Há quanto tempo você está sentindo isso?",
  },
  {
    key: "location",
    question: "Localização",
    audioQuestion: "Onde exatamente você sente? A sensação se espalha para algum outro lugar?",
  },
  {
    key: "duration",
    question: "Duração",
    audioQuestion: "Quanto tempo dura cada episódio? É constante ou vai e volta?",
  },
  {
    key: "character",
    question: "Característica",
    audioQuestion: "Como você descreveria essa sensação? É uma dor aguda, queimação, pressão, ou algo diferente?",
  },
  {
    key: "aggravating",
    question: "Agravantes",
    audioQuestion: "O que piora? Movimento, comida, estresse, ou alguma outra coisa?",
  },
  {
    key: "relieving",
    question: "Alívio",
    audioQuestion: "O que melhora? Descanso, medicação, alguma posição específica?",
  },
  {
    key: "timing",
    question: "Temporalidade",
    audioQuestion: "Em que momento do dia é pior? Manhã, tarde, noite, ou após alguma atividade?",
  },
  {
    key: "severity",
    question: "Intensidade",
    audioQuestion: "De zero a dez, qual a intensidade? Sendo dez a pior sensação imaginável.",
  },
];

type HealthStage = "greeting" | "chief_complaint" | "oldcarts" | "summary" | "export";

interface HealthAnswer {
  question: string;
  answer: string;
}

export const HealthModule: React.FC = () => {
  const [stage, setStage] = useState<HealthStage>("greeting");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<HealthAnswer[]>([]);
  const [showMic, setShowMic] = useState(false);

  // Controle de autoplay - executa UMA vez por sessão do módulo
  const hasSpokenWelcome = useRef(false);

  const { speak, isPlaying, isLoading, progress } = useTextToSpeech();
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
      config.healthWelcomeText ||
      `Olá${userName ? ` ${userName}` : ""}! Sou seu assistente de triagem de saúde. Vou fazer algumas perguntas para entender melhor o que você está sentindo. Lembre-se: isso não substitui uma consulta médica. Quando estiver pronto, me diga: o que está te incomodando hoje?`;

    // Pequeno delay para garantir que a UI está pronta
    const timer = setTimeout(() => {
      speak(greeting)
        .then(() => setShowMic(true))
        .catch((err) => {
          console.warn("Autoplay bloqueado pelo navegador:", err);
          setShowMic(true);
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [speak, userName, config.healthWelcomeText]);

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

  const handleVoiceCapture = async (response: string) => {
    setShowMic(false);

    if (stage === "greeting") {
      setChiefComplaint(response);
      setStage("chief_complaint");

      const confirmation = `Entendi. Você está sentindo: ${response}. Vou fazer algumas perguntas para entender melhor. Pronto para começar?`;
      await speak(confirmation);

      // Pequeno delay e começa as perguntas
      setTimeout(() => {
        setStage("oldcarts");
        askCurrentQuestion();
      }, 2000);
    } else if (stage === "oldcarts") {
      // Salvar resposta
      const currentQuestion = oldcartsQuestions[currentQuestionIndex];
      setAnswers((prev) => [
        ...prev,
        {
          question: currentQuestion.question,
          answer: response,
        },
      ]);

      // Próxima pergunta ou finalizar
      if (currentQuestionIndex < oldcartsQuestions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1);
        setTimeout(() => askCurrentQuestion(), 500);
      } else {
        setStage("summary");
        generateSummary();
      }
    }
  };

  const askCurrentQuestion = async () => {
    const question = oldcartsQuestions[currentQuestionIndex];
    await speak(question.audioQuestion);
    setShowMic(true);
  };

  const generateSummary = async () => {
    const summary = `
      Perfeito! Aqui está o resumo da nossa conversa:
      
      Queixa principal: ${chiefComplaint}.
      
      ${answers.map((a) => `${a.question}: ${a.answer}`).join(". ")}
      
      Deseja enviar este resumo para seu médico via WhatsApp?
    `;
    await speak(summary);
    setStage("export");
  };

  const handleTimeout = async () => {
    await speak("Não ouvi sua resposta. Pode repetir, por favor?");
    setShowMic(true);
  };

  const handleExportWhatsApp = async () => {
    const message = `*Triagem de Saúde - KnowYOU*\n\n*Queixa:* ${chiefComplaint}\n\n${answers.map((a) => `*${a.question}:* ${a.answer}`).join("\n")}`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");

    await speak("O resumo está pronto para ser compartilhado. Escolha o contato do seu médico no WhatsApp.");
  };

  const stageProgress =
    stage === "oldcarts"
      ? ((currentQuestionIndex + 1) / oldcartsQuestions.length) * 100
      : stage === "summary" || stage === "export"
        ? 100
        : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center">
            <Heart className="w-6 h-6 text-rose-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Triagem de Saúde</h2>
            <p className="text-sm text-slate-400">Protocolo OLDCARTS</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-rose-500 to-rose-400"
              initial={{ width: 0 }}
              animate={{ width: `${stageProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span>
              {stage === "oldcarts"
                ? `Pergunta ${currentQuestionIndex + 1} de ${oldcartsQuestions.length}`
                : stage === "summary" || stage === "export"
                  ? "Resumo completo"
                  : "Iniciando..."}
            </span>
          </div>
        </div>
      </div>

      {/* Aviso importante */}
      <div className="mx-4 mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2">
        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-200">
          Esta triagem é informativa e não substitui uma consulta médica profissional.
        </p>
      </div>

      {/* Área principal */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          {/* Etapa de perguntas */}
          {stage === "oldcarts" && (
            <motion.div
              key="oldcarts"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="text-center">
                <span className="inline-block px-3 py-1 bg-rose-500/20 text-rose-300 text-sm rounded-full mb-2">
                  {oldcartsQuestions[currentQuestionIndex].question}
                </span>
              </div>
              <p className="text-lg text-white text-center">{oldcartsQuestions[currentQuestionIndex].audioQuestion}</p>
            </motion.div>
          )}

          {/* Resumo */}
          {(stage === "summary" || stage === "export") && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="bg-slate-800/50 rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-white font-medium">Resumo da Triagem</span>
                </div>
                <p className="text-sm text-slate-300 mb-4">
                  <span className="text-slate-400">Queixa:</span> {chiefComplaint}
                </p>
                <div className="space-y-2">
                  {answers.map((a, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 bg-slate-700/30 rounded-lg">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-slate-300">
                        <span className="text-slate-400">{a.question}:</span> {a.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleExportWhatsApp}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                Enviar para meu médico
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Microfone */}
      {stage !== "export" && showMic && !isPlaying && (
        <div className="p-4 flex justify-center">
          <MicrophoneOrb
            isVisible={true}
            onCapture={handleVoiceCapture}
            onTimeout={handleTimeout}
            maxDuration={config.micTimeoutSeconds || 10}
            hideCountdown={!config.enableCountdown}
          />
        </div>
      )}
    </div>
  );
};

export default HealthModule;
