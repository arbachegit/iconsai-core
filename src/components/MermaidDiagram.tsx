import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { ContentShareActions } from './ContentShareActions';
import { ZoomIn } from 'lucide-react';
import { Button } from './ui/button';
import { MermaidZoomModal } from './MermaidZoomModal';

interface MermaidDiagramProps {
  chart: string;
  id: string;
  theme?: 'dark' | 'light';
}

// Sanitize chart to remove problematic characters
const sanitizeChart = (chart: string): string => {
  let sanitized = chart
    // Remove parentheses in node labels
    .replace(/\(([^)]+)\)/g, '-$1-')
    // Remove question marks
    .replace(/\?/g, '')
    // Remove double quotes
    .replace(/"/g, '')
    // Remove nested brackets
    .replace(/\[([^\]]*)\[/g, '[$1')
    .replace(/\]([^\[]*)\]/g, ']$1')
    // Remove special characters that break Mermaid
    .replace(/[<>]/g, '')
    .replace(/&/g, 'e')
    .replace(/#/g, '')
    .replace(/;/g, '')
    .replace(/\|/g, '-');
  
  // Ensure chart starts with a valid diagram type
  const validStarts = ['graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'journey', 'gantt', 'pie', 'gitGraph'];
  const hasValidStart = validStarts.some(start => sanitized.trim().startsWith(start));
  
  if (!hasValidStart) {
    sanitized = 'graph TD\n' + sanitized;
  }
  
  return sanitized;
};

export const MermaidDiagram = ({ chart, id, theme = 'dark' }: MermaidDiagramProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [showZoomModal, setShowZoomModal] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      mermaid.initialize({
        startOnLoad: true,
        theme: theme === 'light' ? 'default' : 'dark',
        themeVariables: theme === 'light' ? {
          primaryColor: '#0ea5e9',
          primaryTextColor: '#1e293b',
          primaryBorderColor: '#0284c7',
          lineColor: '#64748b',
          secondaryColor: '#10b981',
          tertiaryColor: '#3b82f6',
          background: '#f8fafc',
          mainBkg: '#ffffff',
          textColor: '#1e293b',
        } : {
          primaryColor: '#8B5CF6',
          primaryTextColor: '#fff',
          primaryBorderColor: '#7C3AED',
          lineColor: '#A78BFA',
          secondaryColor: '#10B981',
          tertiaryColor: '#3B82F6',
          background: '#1a1a2e',
          mainBkg: '#16213e',
          textColor: '#fff',
        },
      });

      const renderDiagram = async () => {
        try {
          setRenderError(null);
          const sanitizedChart = sanitizeChart(chart);
          const { svg } = await mermaid.render(id, sanitizedChart);
          if (containerRef.current) {
            containerRef.current.innerHTML = svg;
          }
        } catch (error) {
          console.error('Error rendering mermaid diagram:', error);
          setRenderError('Não foi possível renderizar o diagrama');
          if (containerRef.current) {
            containerRef.current.innerHTML = `<pre class="text-xs text-muted-foreground p-2 bg-muted rounded">${chart}</pre>`;
          }
        }
      };

      renderDiagram();
    }
  }, [chart, id, theme]);

  return (
    <div className="my-3 rounded-lg border border-border/50 overflow-hidden bg-card">
      {/* Header with controls */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/30 border-b border-border/50">
        <span className="text-xs font-medium text-muted-foreground">Diagrama</span>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 px-2 text-xs"
            onClick={() => setShowZoomModal(true)}
            title="Ampliar"
          >
            <ZoomIn className="h-3 w-3" />
          </Button>
          <ContentShareActions 
            contentRef={wrapperRef} 
            filename="diagrama"
            title="Diagrama"
            compact
          />
        </div>
      </div>

      {/* Diagram */}
      <div ref={wrapperRef} className="p-4 bg-background overflow-x-auto">
        {renderError && (
          <p className="text-xs text-amber-500 mb-2">{renderError}</p>
        )}
        <div ref={containerRef} className="mermaid-diagram flex justify-center" />
      </div>

      {/* Zoom Modal */}
      <MermaidZoomModal
        open={showZoomModal}
        onOpenChange={setShowZoomModal}
        chart={chart}
        id={id}
        title="Diagrama"
        theme={theme}
      />
    </div>
  );
};
