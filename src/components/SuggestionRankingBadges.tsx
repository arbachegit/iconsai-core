import { TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
    <div className={cn(
      "flex items-center gap-1 flex-wrap",
      className
    )}>
      <TrendingUp className="h-3 w-3 text-muted-foreground flex-shrink-0" />
      {rankings.slice(0, 10).map((item, idx) => (
        <Button
          key={item.text}
          variant="ghost"
          size="sm"
          onClick={() => onRankingClick(item.text)}
          className="text-xs px-2 py-0.5 h-6 hover:bg-accent/50"
          title={`${item.text} (${item.clickCount} cliques)`}
        >
          <span className="text-primary font-bold">#{idx + 1}</span>
          <span className="ml-1 max-w-[80px] truncate text-muted-foreground">
            {item.text}
          </span>
        </Button>
      ))}
    </div>
  );
}
