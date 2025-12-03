interface TypingIndicatorProps {
  isDrawing?: boolean;
}

// PROTEÇÃO ABSOLUTA: Este componente NÃO pode ter animações CSS
// Dots estáticos com opacidade graduada para indicar progresso sem causar latência
export const TypingIndicator = ({ isDrawing = false }: TypingIndicatorProps) => {
  return (
    <div className="flex items-center gap-2 p-4 bg-card/30 rounded-lg border border-border/50 w-fit">
      <div className="flex gap-1">
        {/* Dots ESTÁTICOS - SEM animate-bounce para evitar latência */}
        <div 
          className={`w-2 h-2 rounded-full ${
            isDrawing ? "bg-purple-500" : "bg-primary"
          } opacity-40`}
        />
        <div 
          className={`w-2 h-2 rounded-full ${
            isDrawing ? "bg-purple-500" : "bg-primary"
          } opacity-70`}
        />
        <div 
          className={`w-2 h-2 rounded-full ${
            isDrawing ? "bg-purple-500" : "bg-primary"
          }`}
        />
      </div>
      <span className="text-sm text-muted-foreground">
        {isDrawing ? "Desenhando..." : "Digitando..."}
      </span>
    </div>
  );
};
