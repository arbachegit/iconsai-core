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
        "text-[10px] h-6 px-2 rounded-full shrink-0",
        "border border-primary/50 hover:border-primary",
        "hover:bg-primary hover:text-primary-foreground",
        "transition-colors",
        className
      )}
    >
      <Sparkles className="h-3 w-3 mr-1 text-primary" />
      <span className="font-bold uppercase tracking-wide">NOVO</span>
      <span className="mx-1 text-muted-foreground">·</span>
      <span className="max-w-[100px] truncate">
        {currentTheme}
      </span>
    </Button>
  );
}
