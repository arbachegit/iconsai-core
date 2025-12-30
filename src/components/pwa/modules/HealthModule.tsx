import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ChevronRight, Send, Loader2, Check, MessageSquare } from "lucide-react";
import { usePWAStore } from "@/stores/pwaStore";
import { useVoiceRecognition } from "@/hooks/useVoiceRecognition";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { MicrophoneButton } from "../voice/MicrophoneButton";

type HealthStage = "greeting" | "chief_complaint" | "oldcarts" | "summary";

const oldcartsQuestions = [
  { 
    key: "onset", 
    question: "Quando isso começou?", 
    followUp: "Foi de repente ou foi gradual?",
    icon: "O"
  },
  { 
    key: "location", 
    question: "Onde exatamente você sente?", 
    followUp: "A dor se espalha para algum lugar?",
    icon: "L"
  },
  { 
    key: "duration", 
    question: "Quanto tempo dura?", 
    followUp: "É constante ou vai e volta?",
    icon: "D"
  },
  { 
    key: "character", 
    question: "Como você descreveria essa sensação?", 
    followUp: "É uma dor aguda, queimação, pressão?",
    icon: "C"
  },
  { 
    key: "aggravating", 
    question: "O que piora?", 
    followUp: "Movimento, comida, estresse?",
    icon: "A"
  },
  { 
    key: "relieving", 
    question: "O que melhora?", 
    followUp: "Descanso, medicação, posição específica?",
    icon: "R"
  },
  { 
    key: "timing", 
    question: "Em que momento do dia é pior?", 
    followUp: "Manhã, noite, após refeições?",
    icon: "T"
  },
  { 
    key: "severity", 
    question: "De 0 a 10, qual a intensidade?", 
    followUp: "Sendo 10 a pior dor imaginável.",
    icon: "S"
  },
];

export const HealthModule: React.FC = () => {
  const { 
    healthAnswers, 
    setHealthAnswer, 
    clearHealthAnswers,
    setPlayerState 
  } = usePWAStore();
  
  const { 
    isListening, 
    transcript, 
    interimTranscript,
    startListening, 
    stopListening,
    resetTranscript 
  } = useVoiceRecognition();
  
  const { speak, isPlaying, isLoading: ttsLoading } = useTextToSpeech();

  const [stage, setStage] = useState<HealthStage>("greeting");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset on mount
  useEffect(() => {
    clearHealthAnswers();
    setStage("greeting");
    setCurrentQuestion(0);
  }, []);

  const handleStartTriage = () => {
    setStage("chief_complaint");
    speak("Olá! Vou te ajudar a descrever seus sintomas. Primeiro, me conte: qual é sua queixa principal hoje?");
  };

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
      if (transcript.trim()) {
        handleResponse(transcript);
      }
    } else {
      resetTranscript();
      startListening();
      setPlayerState("listening");
    }
  };

  const handleResponse = (response: string) => {
    if (stage === "chief_complaint") {
      setChiefComplaint(response);
      setStage("oldcarts");
      // Ask first OLDCARTS question
      const q = oldcartsQuestions[0];
      speak(`Entendi. Agora vou fazer algumas perguntas para entender melhor. ${q.question} ${q.followUp}`);
    } else if (stage === "oldcarts") {
      // Save answer
      setHealthAnswer(oldcartsQuestions[currentQuestion].key, response);
      
      if (currentQuestion < oldcartsQuestions.length - 1) {
        // Move to next question
        const nextQ = oldcartsQuestions[currentQuestion + 1];
        setCurrentQuestion(prev => prev + 1);
        speak(`${nextQ.question} ${nextQ.followUp}`);
      } else {
        // All questions answered, show summary
        setStage("summary");
        speak("Obrigado por responder todas as perguntas. Preparei um resumo dos seus sintomas que você pode compartilhar com seu médico.");
      }
    }
    resetTranscript();
  };

  const generateSummary = () => {
    let summary = `QUEIXA PRINCIPAL: ${chiefComplaint}\n\n`;
    summary += "AVALIAÇÃO OLDCARTS:\n";
    
    oldcartsQuestions.forEach((q) => {
      const answer = healthAnswers[q.key] || "Não informado";
      summary += `- ${q.key.toUpperCase()}: ${answer}\n`;
    });
    
    return summary;
  };

  const handleShareWhatsApp = () => {
    const summary = generateSummary();
    const encoded = encodeURIComponent(summary);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border/50">
        <div className="w-12 h-12 rounded-xl bg-rose-500/20 flex items-center justify-center">
          <Heart className="w-6 h-6 text-rose-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Saúde</h2>
          <p className="text-sm text-muted-foreground">Triagem de sintomas OLDCARTS</p>
        </div>
      </div>

      {/* Progress bar for OLDCARTS */}
      {stage === "oldcarts" && (
        <div className="px-4 py-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-muted-foreground">Progresso</span>
            <span className="text-xs font-medium text-primary">
              {currentQuestion + 1} de {oldcartsQuestions.length}
            </span>
          </div>
          <div className="flex gap-1">
            {oldcartsQuestions.map((q, i) => (
              <div
                key={q.key}
                className={`flex-1 h-2 rounded-full transition-colors ${
                  i < currentQuestion
                    ? "bg-green-500"
                    : i === currentQuestion
                    ? "bg-primary"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Greeting stage */}
        {stage === "greeting" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center gap-6"
          >
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-24 h-24 rounded-full bg-rose-500/10 flex items-center justify-center"
            >
              <Heart className="w-12 h-12 text-rose-500/60" />
            </motion.div>
            
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Triagem de Sintomas
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Vou te guiar por um questionário estruturado para entender melhor seus sintomas.
                O resultado pode ser enviado ao seu médico.
              </p>
            </div>

            <button
              onClick={handleStartTriage}
              className="px-6 py-3 rounded-xl bg-rose-500 text-white font-medium flex items-center gap-2 hover:bg-rose-600 transition-colors"
            >
              Iniciar Triagem
              <ChevronRight className="w-5 h-5" />
            </button>
          </motion.div>
        )}

        {/* Chief complaint stage */}
        {stage === "chief_complaint" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="bg-muted/30 rounded-xl p-4">
              <p className="text-foreground">
                Qual é sua queixa principal hoje?
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Descreva o que está sentindo
              </p>
            </div>

            {/* Show transcript while listening */}
            <AnimatePresence>
              {(isListening || transcript) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-primary/10 rounded-xl p-4"
                >
                  <p className="text-sm text-foreground italic">
                    {interimTranscript || transcript || "Ouvindo..."}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* OLDCARTS questions stage */}
        {stage === "oldcarts" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {/* Current question */}
            <motion.div
              key={currentQuestion}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-muted/30 rounded-xl p-4"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center">
                  <span className="text-lg font-bold text-rose-500">
                    {oldcartsQuestions[currentQuestion].icon}
                  </span>
                </div>
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  {oldcartsQuestions[currentQuestion].key}
                </span>
              </div>
              <p className="text-foreground text-lg">
                {oldcartsQuestions[currentQuestion].question}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {oldcartsQuestions[currentQuestion].followUp}
              </p>
            </motion.div>

            {/* Show transcript while listening */}
            <AnimatePresence>
              {(isListening || transcript) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-primary/10 rounded-xl p-4"
                >
                  <p className="text-sm text-foreground italic">
                    {interimTranscript || transcript || "Ouvindo..."}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Previous answers */}
            {Object.keys(healthAnswers).length > 0 && (
              <div className="space-y-2 mt-6">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Respostas anteriores
                </p>
                {oldcartsQuestions.slice(0, currentQuestion).map((q) => (
                  <div key={q.key} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">
                      <span className="font-medium text-foreground">{q.key}:</span>{" "}
                      {healthAnswers[q.key]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Summary stage */}
        {stage === "summary" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Check className="w-5 h-5 text-green-500" />
                <span className="font-medium text-green-500">Triagem Completa</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Abaixo está o resumo dos seus sintomas que pode ser compartilhado com seu médico.
              </p>
            </div>

            {/* Summary card */}
            <div className="bg-muted/30 rounded-xl p-4 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                  Queixa Principal
                </p>
                <p className="text-foreground">{chiefComplaint}</p>
              </div>

              <div className="border-t border-border/50 pt-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                  Avaliação OLDCARTS
                </p>
                <div className="space-y-2">
                  {oldcartsQuestions.map((q) => (
                    <div key={q.key} className="flex items-start gap-2 text-sm">
                      <span className="w-8 h-6 rounded bg-rose-500/20 text-rose-500 text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {q.icon}
                      </span>
                      <span className="text-muted-foreground">
                        {healthAnswers[q.key] || "Não informado"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Share button */}
            <button
              onClick={handleShareWhatsApp}
              className="w-full py-3 px-4 rounded-xl bg-green-500 text-white font-medium flex items-center justify-center gap-2 hover:bg-green-600 transition-colors"
            >
              <MessageSquare className="w-5 h-5" />
              Enviar para meu médico via WhatsApp
            </button>
          </motion.div>
        )}
      </div>

      {/* Mic button (hidden in greeting and summary) */}
      {(stage === "chief_complaint" || stage === "oldcarts") && (
        <div className="p-4 border-t border-border/50 flex justify-center">
          <MicrophoneButton
            isListening={isListening}
            isProcessing={isProcessing}
            onClick={handleMicClick}
            disabled={isPlaying || ttsLoading}
            size="lg"
          />
        </div>
      )}
    </motion.div>
  );
};

export default HealthModule;
