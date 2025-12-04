import { memo, useMemo } from 'react';
import { Calculator, BarChart3, TrendingUp, Table } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContextualSuggestionsProps {
  suggestions: string[];
  lastAssistantMessage?: string;
  isLoading: boolean;
  onSuggestionClick: (suggestion: string) => void;
  chatType?: 'study' | 'health';
}

// 🔒 MEMOIZADO para não re-renderizar durante digitação
const ContextualSuggestions = memo(({
  suggestions,
  lastAssistantMessage,
  isLoading,
  onSuggestionClick,
  chatType = 'study'
}: ContextualSuggestionsProps) => {
  
  // 🔒 useMemo - detecta dados numéricos REAIS na resposta
  const { hasMathContext, mathSuggestions } = useMemo(() => {
    if (!lastAssistantMessage) return { hasMathContext: false, mathSuggestions: [] };
    
    // Padrões que indicam dados numéricos reais
    const numericPatterns = [
      /\d+[,.]?\d*\s*%/,           // Percentuais: 45%, 12.5%
      /\d{1,3}([.,]\d{3})+/,       // Números grandes: 1.000, 45,678
      /\b\d+[.,]\d+\b/,            // Decimais: 3.14, 0,5
      /\b[1-9]\d{2,}\b/,           // Números >= 100
      /R\$\s*[\d.,]+/i,            // Valores monetários
      /US\$\s*[\d.,]+/i,
      /\b\d+º|\b\d+ª/,             // Rankings: 1º, 45ª
      /posição\s*\d+/i,            // "posição 5"
      /rank\w*\s*\d+/i,            // "ranking 10"
    ];
    
    // Verificar se há pelo menos 2 números significativos ou padrões numéricos
    const hasNumericPatterns = numericPatterns.some(pattern => pattern.test(lastAssistantMessage));
    const numberMatches = lastAssistantMessage.match(/\b\d+[.,]?\d*\b/g) || [];
    const significantNumbers = numberMatches.filter(n => parseFloat(n.replace(',', '.')) >= 10);
    
    const hasMath = hasNumericPatterns || significantNumbers.length >= 3;
    
    const mathSuggs = hasMath ? [
      "📊 Gerar gráfico com estes dados",
      "📈 Mostrar tendência histórica",
      "📋 Criar tabela comparativa"
    ] : [];
    
    return { hasMathContext: hasMath, mathSuggestions: mathSuggs };
  }, [lastAssistantMessage]);
  
  // Combinar sugestões - máximo 3 em uma única linha
  const allSuggestions = useMemo(() => {
    if (hasMathContext) {
      // 2 matemáticas + 1 contextual
      const normalSuggestions = suggestions
        .filter(s => !s.includes('📊') && !s.includes('📈') && !s.includes('🔢'))
        .slice(0, 1);
      return [...mathSuggestions.slice(0, 2), ...normalSuggestions];
    }
    return suggestions.slice(0, 3);
  }, [suggestions, hasMathContext, mathSuggestions]);
  
  // Não renderizar se não há sugestões ou está carregando
  if (allSuggestions.length === 0 || isLoading) return null;
  
  // Função para obter ícone baseado no conteúdo
  const getIcon = (suggestion: string) => {
    if (suggestion.includes('📊') || suggestion.includes('gráfico')) return <BarChart3 className="h-3 w-3" />;
    if (suggestion.includes('📈') || suggestion.includes('tendência')) return <TrendingUp className="h-3 w-3" />;
    if (suggestion.includes('🔢') || suggestion.includes('calcular')) return <Calculator className="h-3 w-3" />;
    if (suggestion.includes('📋') || suggestion.includes('tabela')) return <Table className="h-3 w-3" />;
    return null;
  };
  
  // Remover emojis do texto para exibição limpa quando tem ícone
  const cleanText = (text: string) => {
    return text.replace(/^[📊📈🔢📋]\s*/, '');
  };
  
  return (
    <div className="px-4 py-2 border-t border-cyan-400/30 bg-gradient-to-r from-cyan-500/10 to-cyan-600/5">
      <div className="flex flex-nowrap gap-2 overflow-hidden">
        {allSuggestions.map((suggestion, index) => {
          const icon = getIcon(suggestion);
          const displayText = icon ? cleanText(suggestion) : suggestion;
          
          return (
            <button
              key={`${suggestion}-${index}`}
              onClick={() => onSuggestionClick(suggestion)}
              className={cn(
                "px-3 py-1.5 text-xs rounded-full inline-flex items-center gap-1.5",
                "bg-cyan-500/20 text-cyan-300 border border-cyan-400/60",
                "hover:bg-cyan-500 hover:text-cyan-950",
                "hover:scale-105 hover:shadow-[0_0_12px_rgba(34,211,238,0.4)]",
                "transition-all duration-200 cursor-pointer",
                "animate-fade-in"
              )}
              style={{ 
                animationDelay: `${index * 50}ms`,
                animationFillMode: 'both'
              }}
            >
              {icon}
              <span className="truncate max-w-[200px]">{displayText}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
});

ContextualSuggestions.displayName = 'ContextualSuggestions';

export default ContextualSuggestions;
