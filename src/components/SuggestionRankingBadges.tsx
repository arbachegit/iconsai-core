import { TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SuggestionRanking {
  text: string;
  clickCount: number;
}

interface SuggestionRankingBadgesProps {
  rankings: SuggestionRanking[];
  onRankingClick: (text: string) => void;
  className?: string;
}

export function SuggestionRankingBadges({ 
  rankings, 
  onRankingClick, 
  className 
}: SuggestionRankingBadgesProps) {
  if (!rankings.length) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn(
        "flex items-center gap-1 flex-wrap",
        className
      )}>
        {/* Separador visual */}
        <div className="h-4 w-px bg-border/60 mx-1 flex-shrink-0" />
        
        <TrendingUp className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        {rankings.slice(0, 10).map((item, idx) => (
          <Tooltip key={item.text}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRankingClick(item.text)}
                className={cn(
                  "text-xs px-2 py-0.5 h-6 hover:bg-accent/50 opacity-0 animate-ranking-badge",
                  idx === 0 && "bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.3)] hover:from-amber-500/30 hover:to-yellow-500/30"
                )}
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <span className={cn(
                  "font-bold",
                  idx === 0 ? "text-amber-400" : "text-primary"
                )}>#{idx + 1}</span>
                <span className="ml-1 max-w-[80px] truncate text-muted-foreground">
                  {item.text}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[200px]">
              <p className="font-medium text-sm">{item.text}</p>
              <p className="text-xs text-muted-foreground mt-1">🔥 {item.clickCount} cliques</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
