import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, AlertTriangle, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { MicrophoneOrb } from "../voice/MicrophoneOrb";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { usePWAVoiceStore } from "@/stores/pwaVoiceStore";

type IdeaStage = "capture" | "critique" | "summary";

interface CritiquePoint {
  type: "strength" | "weakness" | "question" | "suggestion";
  content: string;
}

const critiqueQuestions = [
  "O que diferencia sua ideia das soluções existentes no mercado?",
  "Quem é seu público-alvo específico e como você validou essa demanda?",
  "Qual o investimento inicial necessário e em quanto tempo espera retorno?",
  "Quais são os 3 maiores riscos que podem fazer essa ideia falhar?",
  "Se um concorrente com mais recursos copiar sua ideia amanhã, o que te protege?",
];

export const IdeasModule: React.FC = () => {
  const [stage, setStage] = useState<IdeaStage>("capture");
  const [originalIdea, setOriginalIdea] = useState("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [critiquePoints, setCritiquePoints] = useState<CritiquePoint[]>([]);
  const [showMic, setShowMic] = useState(false);
  
  const { speak, isPlaying, isLoading, progress } = useTextToSpeech();
  const { setPlayerState, userName } = usePWAVoiceStore();

  // Mensagem de boas-vindas
  useEffect(() => {
    const greeting = `Olá${userName ? ` ${userName}` : ""}! Sou seu advogado do diabo construtivo. Meu trabalho é questionar sua ideia para fortalecê-la. Não vou aceitar nada sem escrutínio. Pronto para o desafio? Me conte sua ideia de negócio.`;
    speak(greeting).then(() => setShowMic(true));
  }, []);

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
    
    if (stage === "capture") {
      setOriginalIdea(response);
      
      // Primeira crítica - nunca validar imediatamente
      const firstCritique = `Interessante. Você quer ${response}. Antes de eu dizer se é uma boa ideia, preciso entender melhor. ${critiqueQuestions[0]}`;
      await speak(firstCritique);
      
      setStage("critique");
      setShowMic(true);
      
    } else if (stage === "critique") {
      setAnswers(prev => [...prev, response]);
      
      // Adicionar ponto de crítica baseado na resposta
      // TODO: Usar IA para gerar críticas reais
      const mockCritique: CritiquePoint = {
        type: Math.random() > 0.5 ? "weakness" : "question",
        content: `Sobre "${response.substring(0, 50)}..." - isso precisa ser mais específico.`,
      };
      setCritiquePoints(prev => [...prev, mockCritique]);
      
      if (currentQuestionIndex < critiqueQuestions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        
        // Transição crítica entre perguntas
        const transition = `Entendi. Mas ainda tenho dúvidas. ${critiqueQuestions[currentQuestionIndex + 1]}`;
        await speak(transition);
        setShowMic(true);
      } else {
        setStage("summary");
        generateSummary();
      }
    }
  };

  const generateSummary = async () => {
    // Gerar pontos fortes e fracos
    const strengths: CritiquePoint[] = [
      { type: "strength", content: "Você demonstrou conhecimento do problema" },
      { type: "strength", content: "A ideia tem potencial de diferenciação" },
    ];
    
    const weaknesses: CritiquePoint[] = [
      { type: "weakness", content: "Falta validação com clientes reais" },
      { type: "weakness", content: "Modelo de negócio precisa ser refinado" },
      { type: "suggestion", content: "Considere fazer um MVP antes de investir pesado" },
    ];
    
    setCritiquePoints([...strengths, ...weaknesses]);
    
    const summary = `Análise completa. Identifiquei ${strengths.length} pontos fortes e ${weaknesses.length} pontos de atenção. Sua ideia tem potencial, mas precisa de refinamento. Veja o resumo na tela.`;
    await speak(summary);
  };

  const handleTimeout = async () => {
    await speak("Não ouvi sua resposta. Pode repetir?");
    setShowMic(true);
  };

  const restartSession = async () => {
    setStage("capture");
    setOriginalIdea("");
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setCritiquePoints([]);
    await speak("Vamos recomeçar. Me conte sua nova ideia.");
    setShowMic(true);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Lightbulb className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Validador de Ideias</h2>
            <p className="text-sm text-slate-400">Advogado do Diabo Construtivo</p>
          </div>
        </div>
      </div>

      {/* Aviso */}
      <div className="mx-4 mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2">
        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-200">
          Vou questionar tudo. Não leve para o lado pessoal - é para fortalecer sua ideia.
        </p>
      </div>

      {/* Área principal */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          {/* Captura da ideia */}
          {stage === "capture" && (
            <motion.div
              key="capture"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-8"
            >
              <h3 className="text-2xl font-bold text-white mb-2">
                Qual é sua ideia de negócio?
              </h3>
              <p className="text-slate-400">
                Descreva em uma ou duas frases
              </p>
            </motion.div>
          )}

          {/* Fase de crítica */}
          {stage === "critique" && (
            <motion.div
              key="critique"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Ideia original */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                <p className="text-xs text-amber-300 mb-1">Sua ideia:</p>
                <p className="text-sm text-white">{originalIdea}</p>
              </div>

              {/* Pergunta atual */}
              <div className="bg-slate-800/50 rounded-xl p-4 border border-white/10">
                <div className="text-xs text-slate-400 mb-2">
                  Pergunta {currentQuestionIndex + 1} de {critiqueQuestions.length}
                </div>
                <p className="text-lg text-white font-medium">
                  {critiqueQuestions[currentQuestionIndex]}
                </p>
              </div>

              {/* Respostas anteriores */}
              {answers.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {answers.map((answer, i) => (
                    <div key={i} className="bg-slate-700/30 rounded-lg p-3">
                      <p className="text-xs text-slate-400 mb-1">{critiqueQuestions[i]}</p>
                      <p className="text-sm text-slate-300">{answer}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Resumo */}
          {stage === "summary" && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Ideia original */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                <p className="text-xs text-amber-300 mb-1">Ideia analisada:</p>
                <p className="text-sm text-white">{originalIdea}</p>
              </div>

              {/* Pontos fortes */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-emerald-300 font-medium">Pontos Fortes</span>
                </div>
                <div className="space-y-2">
                  {critiquePoints.filter(p => p.type === "strength").map((point, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <p className="text-sm text-emerald-200">{point.content}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pontos de atenção */}
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <XCircle className="w-5 h-5 text-rose-400" />
                  <span className="text-rose-300 font-medium">Pontos de Atenção</span>
                </div>
                <div className="space-y-2">
                  {critiquePoints.filter(p => p.type === "weakness" || p.type === "suggestion").map((point, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <p className="text-sm text-rose-200">{point.content}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botão recomeçar */}
              <button
                onClick={restartSession}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Testar outra ideia
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Microfone */}
      {stage !== "summary" && showMic && !isPlaying && (
        <div className="p-4 flex justify-center">
          <MicrophoneOrb
            isVisible={true}
            onCapture={handleVoiceCapture}
            onTimeout={handleTimeout}
          />
        </div>
      )}
    </div>
  );
};

export default IdeasModule;
