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
    // 1. Normalize line breaks
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    
    // 2. Remove emojis and problematic Unicode characters
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')  // Emoticons
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')  // Misc symbols & pictographs
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')  // Transport & map symbols
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')  // Flags
    .replace(/[\u{2600}-\u{26FF}]/gu, '')    // Misc symbols
    .replace(/[\u{2700}-\u{27BF}]/gu, '')    // Dingbats
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')  // Supplemental symbols
    .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '')  // Chess symbols
    .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '')  // Symbols extended-A
    .replace(/[\u{231A}-\u{231B}]/gu, '')    // Watch, hourglass
    .replace(/[\u{23E9}-\u{23F3}]/gu, '')    // Media symbols
    .replace(/[\u{23F8}-\u{23FA}]/gu, '')    // More media
    .replace(/[\u{25AA}-\u{25AB}]/gu, '')    // Squares
    .replace(/[\u{25B6}]/gu, '')             // Play button
    .replace(/[\u{25C0}]/gu, '')             // Reverse button
    .replace(/[\u{25FB}-\u{25FE}]/gu, '')    // More squares
    .replace(/[\u{2B05}-\u{2B07}]/gu, '')    // Arrows
    .replace(/[\u{2B1B}-\u{2B1C}]/gu, '')    // More squares
    .replace(/[\u{2B50}]/gu, '')             // Star
    .replace(/[\u{2B55}]/gu, '')             // Circle
    .replace(/[\u{3030}]/gu, '')             // Wavy dash
    .replace(/[\u{303D}]/gu, '')             // Part alternation mark
    .replace(/[\u{3297}]/gu, '')             // Circled ideograph
    .replace(/[\u{3299}]/gu, '')             // Circled ideograph secret
    .replace(/[🔴🟢🟡🔵⚪⚫🟠🟣🟤]/gu, '')   // Colored circles
    
    // 3. Handle colons in subgraph titles
    .replace(/subgraph\s+([^\n:]+):/g, 'subgraph $1 -')
    
    // 4. Replace parentheses in labels with hyphens
    .replace(/\(([^)]+)\)/g, '-$1-')
    
    // 5. Replace slashes with hyphens
    .replace(/\//g, '-')
    
    // 6. Remove all types of quotes
    .replace(/[""''`´]/g, '')
    .replace(/"/g, '')
    .replace(/'/g, '')
    
    // 7. Remove question marks
    .replace(/\?/g, '')
    
    // 8. Handle nested brackets
    .replace(/\[([^\]]*)\[/g, '[$1')
    .replace(/\]([^\[]*)\]/g, ']$1')
    
    // 9. Remove other problematic characters
    .replace(/[<>]/g, '')
    .replace(/&/g, 'e')
    .replace(/#/g, '')
    .replace(/;/g, '')
    .replace(/\|/g, '-')
    
    // 10. Handle colons (but preserve --> arrows)
    .replace(/(?<!-)(?<!>):(?!:)/g, ' -')
    
    // 11. Clean up multiple spaces and hyphens
    .replace(/--+/g, '--')
    .replace(/  +/g, ' ')
    .replace(/- -/g, '-');
  
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
