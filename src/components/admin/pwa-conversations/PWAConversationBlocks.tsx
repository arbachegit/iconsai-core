import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PWAAudioMessage } from './PWAAudioMessage';
import type { PWAConversationSession, PWAModuleConfig, KeyTopics } from '@/types/pwa-conversations';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, MapPin, MessageSquare, Users, Globe, Building2, Tag } from 'lucide-react';

interface PWAConversationBlocksProps {
  sessions: PWAConversationSession[];
  moduleConfig: PWAModuleConfig;
  selectedSessionId: string | null;
  registerRef: (sessionId: string, element: HTMLDivElement | null) => void;
}

// Componente para exibir key topics (pessoas, países, organizações)
const KeyTopicsDisplay = ({ keyTopics, color }: { keyTopics: KeyTopics | null; color: string }) => {
  if (!keyTopics) return null;
  const { people = [], countries = [], organizations = [] } = keyTopics;
  if (!people.length && !countries.length && !organizations.length) return null;
  
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {people.map((p: string, i: number) => (
        <Badge key={`person-${i}`} variant="outline" className="text-xs" style={{ borderColor: color, color }}>
          <Users className="w-3 h-3 mr-1" />
          {p}
        </Badge>
      ))}
      {countries.map((c: string, i: number) => (
        <Badge key={`country-${i}`} variant="outline" className="text-xs" style={{ borderColor: color, color }}>
          <Globe className="w-3 h-3 mr-1" />
          {c}
        </Badge>
      ))}
      {organizations.map((o: string, i: number) => (
        <Badge key={`org-${i}`} variant="outline" className="text-xs" style={{ borderColor: color, color }}>
          <Building2 className="w-3 h-3 mr-1" />
          {o}
        </Badge>
      ))}
    </div>
  );
};

// Componente para exibir taxonomias
const TaxonomyDisplay = ({ tags, color }: { tags: string[] | null; color: string }) => {
  if (!tags?.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {tags.map((tag, i) => (
        <Badge key={`tax-${i}`} variant="secondary" className="text-xs" style={{ backgroundColor: color + '20', color }}>
          <Tag className="w-3 h-3 mr-1" />
          {tag}
        </Badge>
      ))}
    </div>
  );
};

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
                <div key={msg.id}>
                  <PWAAudioMessage 
                    message={msg} 
                    moduleColor={moduleConfig.color} 
                  />
                  {/* KeyTopics e Taxonomias após cada mensagem */}
                  {msg.key_topics && <KeyTopicsDisplay keyTopics={msg.key_topics} color={moduleConfig.color} />}
                  {msg.taxonomy_tags && msg.taxonomy_tags.length > 0 && (
                    <TaxonomyDisplay tags={msg.taxonomy_tags} color={moduleConfig.color} />
                  )}
                </div>
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
                
                {/* Summary Taxonomy Tags */}
                {session.summary.taxonomy_tags && session.summary.taxonomy_tags.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Taxonomias:</p>
                    <TaxonomyDisplay tags={session.summary.taxonomy_tags} color={moduleConfig.color} />
                  </div>
                )}
                
                {/* Summary Key Topics */}
                {session.summary.key_topics && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Temas:</p>
                    <KeyTopicsDisplay keyTopics={session.summary.key_topics} color={moduleConfig.color} />
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
