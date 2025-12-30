import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, Send, Loader2, AlertTriangle, CheckCircle, ArrowRight } from "lucide-react";
import { usePWAStore } from "@/stores/pwaStore";
import { useVoiceRecognition } from "@/hooks/useVoiceRecognition";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { MicrophoneButton } from "../voice/MicrophoneButton";
import { supabase } from "@/integrations/supabase/client";

type IdeaPhase = "capture" | "critique" | "refine" | "summary";

const critiquePrompts = [
  "Interessante. Mas como você planeja executar isso tecnicamente? Qual seria o primeiro passo concreto?",
  "Entendo. E qual o investimento inicial necessário? Você tem os recursos disponíveis?",
  "Certo. Quem são seus concorrentes diretos e o que te diferencia deles?",
  "Pense bem: o que poderia dar errado? Quais são os maiores riscos?",
  "Por último: em quanto tempo você espera ver resultados? Seja realista.",
];

export const IdeasModule: React.FC = () => {
  const { 
    ideaContent, 
    setIdeaContent, 
    ideaCritique, 
    addCritique, 
    clearIdea,
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
  
  const { speak, isPlaying } = useTextToSpeech();

  const [phase, setPhase] = useState<IdeaPhase>("capture");
  const [currentCritique, setCurrentCritique] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [responses, setResponses] = useState<string[]>([]);

  const handleStart = () => {
    clearIdea();
    setResponses([]);
    setCurrentCritique(0);
    speak("Olá! Sou seu advogado do diabo. Me conte sua ideia de negócio e vou questioná-la para fortalecê-la. Qual é sua ideia?");
    setPhase("capture");
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

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      handleResponse(textInput);
      setTextInput("");
    }
  };

  const handleResponse = async (response: string) => {
    if (phase === "capture") {
      setIdeaContent(response);
      setPhase("critique");
      // Start critique with AI
      await generateCritique(response);
    } else if (phase === "critique") {
      // Save response
      setResponses(prev => [...prev, response]);
      
      if (currentCritique < critiquePrompts.length - 1) {
        setCurrentCritique(prev => prev + 1);
        speak(critiquePrompts[currentCritique + 1]);
      } else {
        // All critiques done
        setPhase("summary");
        await generateSummary();
      }
    }
    resetTranscript();
  };

  const generateCritique = async (idea: string) => {
    setIsProcessing(true);
    setPlayerState("processing");

    try {
      // Use AI to generate initial critique
      const { data, error } = await supabase.functions.invoke("chat-router", {
        body: {
          message: `Analise criticamente esta ideia de negócio como um advogado do diabo construtivo. Seja direto e aponte falhas, mas de forma construtiva. Ideia: "${idea}"`,
          chatType: "economia",
          sessionId: `pwa-ideas-${Date.now()}`,
        },
      });

      if (data?.response) {
        addCritique(data.response);
        speak(data.response);
      } else {
        speak(critiquePrompts[0]);
      }
    } catch (err) {
      console.error("Error generating critique:", err);
      speak(critiquePrompts[0]);
    } finally {
      setIsProcessing(false);
      setPlayerState("idle");
    }
  };

  const generateSummary = async () => {
    setIsProcessing(true);
    setPlayerState("processing");

    try {
      const summaryPrompt = `
        Com base nesta análise de ideia de negócio:
        IDEIA: ${ideaContent}
        RESPOSTAS DO EMPREENDEDOR: ${responses.join("; ")}
        
        Gere um resumo executivo com:
        1. Pontos fortes identificados
        2. Pontos de atenção
        3. Próximos passos recomendados
        
        Seja conciso e prático.
      `;

      const { data, error } = await supabase.functions.invoke("chat-router", {
        body: {
          message: summaryPrompt,
          chatType: "economia",
          sessionId: `pwa-ideas-summary-${Date.now()}`,
        },
      });

      if (data?.response) {
        addCritique(data.response);
        speak("Aqui está minha análise final da sua ideia.");
      }
    } catch (err) {
      console.error("Error generating summary:", err);
    } finally {
      setIsProcessing(false);
      setPlayerState("idle");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border/50">
        <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
          <Lightbulb className="w-6 h-6 text-amber-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Ideias</h2>
          <p className="text-sm text-muted-foreground">Validador de ideias</p>
        </div>
      </div>

      {/* Progress indicator for critique phase */}
      {phase === "critique" && (
        <div className="px-4 py-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-muted-foreground">Questionamentos</span>
            <span className="text-xs font-medium text-primary">
              {currentCritique + 1} de {critiquePrompts.length}
            </span>
          </div>
          <div className="flex gap-1">
            {critiquePrompts.map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-2 rounded-full transition-colors ${
                  i <= currentCritique ? "bg-amber-500" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Initial state */}
        {phase === "capture" && !ideaContent && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center gap-6"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.05, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ duration: 3, repeat: Infinity }}
              className="w-24 h-24 rounded-full bg-amber-500/10 flex items-center justify-center"
            >
              <Lightbulb className="w-12 h-12 text-amber-500/60" />
            </motion.div>
            
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Advogado do Diabo
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Vou questionar sua ideia de negócio para identificar pontos fracos
                e ajudar a fortalecê-la.
              </p>
            </div>

            <button
              onClick={handleStart}
              className="px-6 py-3 rounded-xl bg-amber-500 text-white font-medium flex items-center gap-2 hover:bg-amber-600 transition-colors"
            >
              Apresentar minha ideia
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        )}

        {/* Capture phase - waiting for idea */}
        {phase === "capture" && !ideaContent && isListening && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="bg-muted/30 rounded-xl p-4">
              <p className="text-foreground">
                Me conte sua ideia de negócio
              </p>
            </div>
            
            <AnimatePresence>
              {(isListening || transcript) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-amber-500/10 rounded-xl p-4"
                >
                  <p className="text-sm text-foreground italic">
                    {interimTranscript || transcript || "Ouvindo..."}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Critique phase */}
        {phase === "critique" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {/* User's idea */}
            <div className="bg-primary/10 rounded-xl p-4">
              <p className="text-xs uppercase tracking-wider text-primary mb-1">Sua ideia</p>
              <p className="text-sm text-foreground">{ideaContent}</p>
            </div>

            {/* Current critique/question */}
            <motion.div
              key={currentCritique}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-muted/30 rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-xs uppercase tracking-wider text-amber-500">
                  Questionamento {currentCritique + 1}
                </span>
              </div>
              <p className="text-foreground">
                {ideaCritique[0] || critiquePrompts[currentCritique]}
              </p>
            </motion.div>

            {/* Listening indicator */}
            <AnimatePresence>
              {(isListening || transcript) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-amber-500/10 rounded-xl p-4"
                >
                  <p className="text-sm text-foreground italic">
                    {interimTranscript || transcript || "Ouvindo sua resposta..."}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Previous responses */}
            {responses.length > 0 && (
              <div className="space-y-2 mt-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Suas respostas
                </p>
                {responses.map((resp, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{resp}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Summary phase */}
        {phase === "summary" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="font-medium text-green-500">Análise Completa</span>
              </div>
            </div>

            {/* Summary content */}
            <div className="bg-muted/30 rounded-xl p-4 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                  Sua Ideia
                </p>
                <p className="text-foreground">{ideaContent}</p>
              </div>

              {ideaCritique.length > 1 && (
                <div className="border-t border-border/50 pt-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                    Análise Final
                  </p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {ideaCritique[ideaCritique.length - 1]}
                  </p>
                </div>
              )}
            </div>

            {/* Restart button */}
            <button
              onClick={handleStart}
              className="w-full py-3 px-4 rounded-xl bg-amber-500 text-white font-medium flex items-center justify-center gap-2 hover:bg-amber-600 transition-colors"
            >
              <Lightbulb className="w-5 h-5" />
              Analisar outra ideia
            </button>
          </motion.div>
        )}
      </div>

      {/* Input area */}
      {(phase === "capture" || phase === "critique") && (
        <div className="p-4 border-t border-border/50 space-y-4">
          {/* Voice button */}
          <div className="flex justify-center">
            <MicrophoneButton
              isListening={isListening}
              isProcessing={isProcessing}
              onClick={handleMicClick}
              disabled={isPlaying}
              size="lg"
            />
          </div>

          {/* Text input fallback */}
          <form onSubmit={handleTextSubmit} className="flex gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Ou digite sua resposta..."
              disabled={isProcessing || isListening}
              className="flex-1 px-4 py-2 rounded-xl bg-muted/50 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
            <button
              type="submit"
              disabled={!textInput.trim() || isProcessing}
              className="p-2 rounded-xl bg-amber-500 text-white disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      )}
    </motion.div>
  );
};

export default IdeasModule;
