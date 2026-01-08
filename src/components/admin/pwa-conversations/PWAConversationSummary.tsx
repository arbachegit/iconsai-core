import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { PWAConversationSession, PWASummaryFilters } from '@/types/pwa-conversations';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Search, Clock, MessageSquare } from 'lucide-react';

interface PWAConversationSummaryProps {
  sessionsByDate: Record<string, PWAConversationSession[]>;
  filters: PWASummaryFilters;
  onFiltersChange: (filters: PWASummaryFilters) => void;
  onDateClick: (sessionId: string) => void;
  selectedSessionId: string | null;
  isLoading: boolean;
}

export const PWAConversationSummary = ({ 
  sessionsByDate, 
  filters, 
  onFiltersChange, 
  onDateClick, 
  selectedSessionId, 
  isLoading 
}: PWAConversationSummaryProps) => {
  const [dateFilter, setDateFilter] = useState('');
  
  const sortedDates = Object.keys(sessionsByDate).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  const handleFilter = () => {
    onFiltersChange({ ...filters, date: dateFilter || undefined });
  };

  const totalSessions = Object.values(sessionsByDate).flat().length;

  return (
    <div className="flex flex-col h-full">
      {/* Filters Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-medium">Filtros</h3>
        </div>
        
        <div className="space-y-2">
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="h-8 text-sm"
          />
          <Button 
            onClick={handleFilter} 
            size="sm" 
            className="w-full"
            variant="secondary"
          >
            <Search className="w-3 h-3 mr-1" />
            Filtrar
          </Button>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <span>{sortedDates.length} dias</span>
          <span>{totalSessions} sessões</span>
        </div>
      </div>

      {/* Sessions List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : sortedDates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">Nenhuma conversa</p>
            </div>
          ) : (
            sortedDates.map(date => (
              <div key={date} className="mb-4">
                {/* Date Header */}
                <div className="sticky top-0 bg-background/95 backdrop-blur px-2 py-1.5 text-xs font-medium text-muted-foreground border-b mb-2">
                  {format(new Date(date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </div>

                {/* Sessions for this date */}
                <div className="space-y-1">
                  {sessionsByDate[date].map(session => {
                    const messageCount = session.messages?.length || 0;
                    const isSelected = selectedSessionId === session.id;
                    
                    return (
                      <button
                        key={session.id}
                        onClick={() => onDateClick(session.id)}
                        className={`w-full text-left p-2.5 rounded-lg transition-all ${
                          isSelected 
                            ? 'bg-primary/10 border-2 border-primary' 
                            : 'bg-card hover:bg-muted/50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {format(new Date(session.started_at), 'HH:mm')}
                            </span>
                          </div>
                          
                          {messageCount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {messageCount} msg
                            </Badge>
                          )}
                        </div>

                        {session.city && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            📍 {session.city}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
