import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Subtopic {
  name: string;
  confidence: number;
}

interface TopicDrillDownProps {
  topic: string;
  isNew?: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onSubtopicClick: (subtopic: string) => void;
  getSubtopics: (theme: string) => Promise<Subtopic[]>;
  cachedSubtopics?: Subtopic[];
  className?: string;
}

export function TopicDrillDown({
  topic,
  isNew = false,
  isExpanded,
  onToggle,
  onSubtopicClick,
  getSubtopics,
  cachedSubtopics,
  className
}: TopicDrillDownProps) {
  const [subtopics, setSubtopics] = useState<Subtopic[]>(cachedSubtopics || []);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (cachedSubtopics) {
      setSubtopics(cachedSubtopics);
    }
  }, [cachedSubtopics]);

  const handleToggle = async () => {
    if (!isExpanded && subtopics.length === 0) {
      setIsLoading(true);
      try {
        const fetchedSubtopics = await getSubtopics(topic);
        setSubtopics(fetchedSubtopics);
      } catch (error) {
        console.error('Error fetching subtopics:', error);
      } finally {
        setIsLoading(false);
      }
    }
    onToggle();
  };

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Badge principal com toggle */}
      <Button
        onClick={handleToggle}
        variant="outline"
        size="sm"
        className={cn(
          "text-[10px] h-6 px-2 rounded-full",
          "border border-primary/50 hover:border-primary",
          "hover:bg-primary hover:text-primary-foreground",
          "transition-colors",
          isExpanded && "bg-primary/10 border-primary"
        )}
      >
        {isNew && (
          <>
            <Sparkles className="h-3 w-3 mr-1 text-primary" />
            <span className="font-bold uppercase tracking-wide">NOVO</span>
            <span className="mx-1 text-muted-foreground">·</span>
          </>
        )}
        <span className="max-w-[100px] truncate">{topic}</span>
        {isLoading ? (
          <Loader2 className="h-3 w-3 ml-1 animate-spin" />
        ) : isExpanded ? (
          <ChevronUp className="h-3 w-3 ml-1" />
        ) : (
          <ChevronDown className="h-3 w-3 ml-1" />
        )}
      </Button>

      {/* Subtópicos expandidos */}
      {isExpanded && subtopics.length > 0 && (
        <div className="mt-1 ml-2 pl-2 border-l-2 border-primary/30 flex flex-wrap gap-1">
          {subtopics.map((subtopic, idx) => (
            <Button
              key={`${topic}-sub-${idx}`}
              variant="ghost"
              size="sm"
              onClick={() => onSubtopicClick(subtopic.name)}
              className="text-[10px] h-5 px-2 rounded-full bg-muted/50 hover:bg-primary/20 hover:text-primary"
            >
              {subtopic.name}
            </Button>
          ))}
        </div>
      )}

      {/* Mensagem se não há subtópicos */}
      {isExpanded && !isLoading && subtopics.length === 0 && (
        <div className="mt-1 ml-2 text-[10px] text-muted-foreground italic">
          Clique para perguntar sobre "{topic}"
        </div>
      )}
    </div>
  );
}
