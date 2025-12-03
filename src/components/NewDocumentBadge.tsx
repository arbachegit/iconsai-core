import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NewDocumentBadgeProps {
  currentTheme: string;
  onThemeClick: () => void;
  className?: string;
}

export function NewDocumentBadge({ currentTheme, onThemeClick, className }: NewDocumentBadgeProps) {
  if (!currentTheme) return null;

  return (
    <Button
      onClick={onThemeClick}
      variant="outline"
      size="sm"
      className={cn(
        "relative overflow-hidden transition-all duration-300",
        "bg-gradient-to-r from-primary/20 to-accent/20",
        "border-primary/50 hover:border-primary",
        "text-foreground hover:text-primary-foreground hover:bg-primary",
        "shadow-lg hover:shadow-primary/25",
        "animate-pulse hover:animate-none",
        className
      )}
    >
      <Sparkles className="h-3 w-3 mr-1.5 text-primary" />
      <span className="font-bold text-xs uppercase tracking-wide">NOVO</span>
      <span className="mx-1.5 text-muted-foreground">·</span>
      <span className="transition-all duration-500 ease-in-out max-w-[120px] truncate">
        {currentTheme}
      </span>
    </Button>
  );
}
