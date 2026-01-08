import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PWAAudioMessage } from './PWAAudioMessage';
import type { PWAConversationSession, PWAModuleConfig } from '@/types/pwa-conversations';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, MapPin, MessageSquare } from 'lucide-react';

interface PWAConversationBlocksProps {
  sessions: PWAConversationSession[];
  moduleConfig: PWAModuleConfig;
  selectedSessionId: string | null;
  registerRef: (sessionId: string, element: HTMLDivElement | null) => void;
}

export const PWAConversationBlocks = ({ 
  sessions, 
  moduleConfig, 
  selectedSessionId, 
  registerRef 
}: PWAConversationBlocksProps) => {
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
        <p>Nenhuma conversa encontrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sessions.map((session) => (
        <Card 
          key={session.id}
          ref={(el) => registerRef(session.id, el)} 
          className={`transition-all ${
            selectedSessionId === session.id 
              ? 'ring-2 ring-primary shadow-lg' 
              : 'hover:shadow-md'
          }`}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className="font-mono"
                  style={{ borderColor: moduleConfig.color, color: moduleConfig.color }}
                >
                  <Clock className="w-3 h-3 mr-1" />
                  {format(new Date(session.started_at), 'HH:mm', { locale: ptBR })}
                </Badge>
                
                {session.ended_at && (
                  <span className="text-xs text-muted-foreground">
                    → {format(new Date(session.ended_at), 'HH:mm', { locale: ptBR })}
                  </span>
                )}
              </div>

              {session.city && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  {session.city}
                  {session.country && `, ${session.country}`}
                </div>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="space-y-3">
            {/* Messages */}
            {session.messages && session.messages.length > 0 ? (
              session.messages.map((msg) => (
                <PWAAudioMessage 
                  key={msg.id} 
                  message={msg} 
                  moduleColor={moduleConfig.color} 
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma mensagem nesta sessão
              </p>
            )}

            {/* Summary */}
            {session.summary && (
              <div 
                className="mt-4 p-4 rounded-lg border-2"
                style={{ borderColor: moduleConfig.color + '40', backgroundColor: moduleConfig.color + '10' }}
              >
                <p className="text-sm font-medium mb-2" style={{ color: moduleConfig.color }}>
                  📋 Resumo da Conversa
                </p>
                <p className="text-sm text-foreground">
                  {session.summary.summary_text}
                </p>
                
                {/* Taxonomy Tags */}
                {session.summary.taxonomy_tags && session.summary.taxonomy_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {session.summary.taxonomy_tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
