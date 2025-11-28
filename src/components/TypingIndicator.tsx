export const TypingIndicator = () => {
  return (
    <div className="flex items-center gap-2 p-4 bg-card/30 rounded-lg border border-border/50 w-fit animate-fade-in">
      <div className="flex gap-1">
        <div 
          className="w-2 h-2 bg-primary rounded-full animate-bounce"
          style={{ animationDelay: '0ms', animationDuration: '1s' }}
        />
        <div 
          className="w-2 h-2 bg-primary rounded-full animate-bounce"
          style={{ animationDelay: '200ms', animationDuration: '1s' }}
        />
        <div 
          className="w-2 h-2 bg-primary rounded-full animate-bounce"
          style={{ animationDelay: '400ms', animationDuration: '1s' }}
        />
      </div>
      <span className="text-sm text-muted-foreground">Digitando...</span>
    </div>
  );
};
