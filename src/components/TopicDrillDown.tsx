import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sparkles, ChevronDown, Loader2 } from 'lucide-react';
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
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (cachedSubtopics) {
      setSubtopics(cachedSubtopics);
    }
  }, [cachedSubtopics]);

  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open);
    if (open && subtopics.length === 0) {
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

  const handleSubtopicClick = (subtopicName: string) => {
    setIsOpen(false);
    onSubtopicClick(subtopicName);
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "text-[10px] h-6 px-2 rounded-full shrink-0",
            "border border-primary/50 hover:border-primary",
            "hover:bg-primary hover:text-primary-foreground",
            "transition-colors",
            isOpen && "bg-primary/10 border-primary",
            className
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
          ) : (
            <ChevronDown className={cn(
              "h-3 w-3 ml-1 transition-transform",
              isOpen && "rotate-180"
            )} />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        side="bottom" 
        align="start" 
        className="w-auto p-2 max-w-[320px]"
        sideOffset={4}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="ml-2 text-xs text-muted-foreground">Carregando...</span>
          </div>
        ) : subtopics.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {subtopics.map((subtopic, idx) => (
              <Button
                key={`${topic}-sub-${idx}`}
                variant="ghost"
                size="sm"
                onClick={() => handleSubtopicClick(subtopic.name)}
                className="text-[10px] h-5 px-2 rounded-full bg-muted/50 hover:bg-primary/20 hover:text-primary"
              >
                {subtopic.name}
              </Button>
            ))}
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSubtopicClick(topic)}
            className="text-[10px] h-5 px-2 rounded-full bg-muted/50 hover:bg-primary/20 hover:text-primary w-full"
          >
            Perguntar sobre "{topic}"
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
