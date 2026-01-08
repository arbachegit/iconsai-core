import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { PWAConversationSummary } from './PWAConversationSummary';
import { PWAConversationBlocks } from './PWAConversationBlocks';
import { usePWAConversations } from '@/hooks/usePWAConversations';
import type { PWAConversationModalProps, PWAConversationSession, PWASummaryFilters } from '@/types/pwa-conversations';
import { PWA_MODULES } from '@/types/pwa-conversations';
import { Globe, Heart, Lightbulb, X, type LucideIcon } from 'lucide-react';

const ICONS: Record<string, LucideIcon> = { Globe, Heart, Lightbulb };

export const PWAConversationModal = ({ 
  isOpen, 
  onClose, 
  deviceId, 
  moduleType, 
  userName 
}: PWAConversationModalProps) => {
  const { sessions, isLoadingSessions, fetchSessionsForUser } = usePWAConversations();
  const [summaryFilters, setSummaryFilters] = useState<PWASummaryFilters>({});
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const sessionRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const moduleConfig = PWA_MODULES.find(m => m.type === moduleType);
  const ModuleIcon = moduleConfig ? ICONS[moduleConfig.icon] : Globe;

  useEffect(() => {
    if (isOpen && deviceId) {
      fetchSessionsForUser(deviceId, moduleType);
      setSelectedSessionId(null);
    }
  }, [isOpen, deviceId, moduleType, fetchSessionsForUser]);

  // Group sessions by date
  const sessionsByDate = sessions.reduce((acc, session) => {
    const date = new Date(session.started_at).toISOString().split('T')[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(session);
    return acc;
  }, {} as Record<string, PWAConversationSession[]>);

  // Scroll to selected session
  const scrollToSession = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    const element = sessionRefs.current.get(sessionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const registerRef = (sessionId: string, element: HTMLDivElement | null) => {
    if (element) {
      sessionRefs.current.set(sessionId, element);
    } else {
      sessionRefs.current.delete(sessionId);
    }
  };

  if (!moduleConfig) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <div 
                className="p-2 rounded-lg"
                style={{ backgroundColor: moduleConfig.color + '20' }}
              >
                <ModuleIcon className="w-5 h-5" style={{ color: moduleConfig.color }} />
              </div>
              <div>
                <span className="text-lg font-semibold">
                  Conversas - {moduleConfig.name}
                </span>
                {userName && (
                  <p className="text-sm text-muted-foreground font-normal">
                    {userName}
                  </p>
                )}
              </div>
            </DialogTitle>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Summary & Navigation */}
          <div className="w-72 border-r flex-shrink-0 bg-muted/30">
            <PWAConversationSummary
              sessionsByDate={sessionsByDate}
              filters={summaryFilters}
              onFiltersChange={setSummaryFilters}
              onDateClick={scrollToSession}
              selectedSessionId={selectedSessionId}
              isLoading={isLoadingSessions}
            />
          </div>

          {/* Right Content - Conversation Blocks */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6">
                <PWAConversationBlocks
                  sessions={sessions}
                  moduleConfig={moduleConfig}
                  selectedSessionId={selectedSessionId}
                  registerRef={registerRef}
                />
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
