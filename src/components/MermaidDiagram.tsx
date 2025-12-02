import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { AlertTriangle, Code } from 'lucide-react';

interface MermaidDiagramProps {
  chart: string;
  id: string;
  theme?: 'dark' | 'light';
}

// Valid Mermaid diagram type declarations
const VALID_DIAGRAM_STARTS = [
  'graph', 'flowchart', 'sequencediagram', 'classdiagram', 
  'statediagram', 'erdiagram', 'journey', 'gantt', 'pie', 
  'gitgraph', 'mindmap', 'timeline', 'quadrantchart', 'xychart'
];

// Sanitize chart to remove problematic characters in node labels
const sanitizeChart = (chart: string): string => {
  let sanitized = chart;
  
  // 1. Replace parentheses inside [] nodes with hyphens: [text (something)] → [text - something]
  sanitized = sanitized.replace(/\[([^\]]*)\(([^\)]*)\)([^\]]*)\]/g, '[$1- $2$3]');
  
  // 2. Replace parentheses inside {} nodes with hyphens: {text (something)} → {text - something}
  sanitized = sanitized.replace(/\{([^\}]*)\(([^\)]*)\)([^\}]*)\}/g, '{$1- $2$3}');
  
  // 3. Remove question marks at end of node labels: [text?] → [text]
  sanitized = sanitized.replace(/\[([^\]]*)\?\]/g, '[$1]');
  sanitized = sanitized.replace(/\{([^\}]*)\?\}/g, '{$1}');
  
  // 4. Replace double quotes with single quotes: [text "quoted"] → [text 'quoted']
  sanitized = sanitized.replace(/\[([^\]]*)"([^\]]*)\]/g, "[$1'$2]");
  sanitized = sanitized.replace(/\{([^\}]*)"([^\}]*)\}/g, "{$1'$2}");
  
  // 5. Replace nested brackets inside [] with hyphens: [Array[0]] → [Array-0]
  sanitized = sanitized.replace(/\[([^\[\]]*)\[([^\[\]]*)\]([^\[\]]*)\]/g, '[$1-$2$3]');
  
  // 6. Replace nested curly braces inside {} with hyphens: {Config{item}} → {Config-item}
  sanitized = sanitized.replace(/\{([^\{\}]*)\{([^\{\}]*)\}([^\{\}]*)\}/g, '{$1-$2$3}');
  
  // 7. Replace < and > with text equivalents
  sanitized = sanitized.replace(/\[([^\]]*)<([^\]]*)\]/g, '[$1 menor que $2]');
  sanitized = sanitized.replace(/\[([^\]]*)>([^\]]*)\]/g, '[$1 maior que $2]');
  sanitized = sanitized.replace(/\{([^\}]*)<([^\}]*)\}/g, '{$1 menor que $2}');
  sanitized = sanitized.replace(/\{([^\}]*)>([^\}]*)\}/g, '{$1 maior que $2}');
  
  // 8. Replace ampersand & with "e"
  sanitized = sanitized.replace(/\[([^\]]*)&([^\]]*)\]/g, '[$1 e $2]');
  sanitized = sanitized.replace(/\{([^\}]*)&([^\}]*)\}/g, '{$1 e $2}');
  
  // 9. Replace hash # with "No."
  sanitized = sanitized.replace(/\[([^\]]*)#([^\]]*)\]/g, '[$1No.$2]');
  sanitized = sanitized.replace(/\{([^\}]*)#([^\}]*)\}/g, '{$1No.$2}');
  
  // 10. Replace semicolon ; with comma
  sanitized = sanitized.replace(/\[([^\]]*);([^\]]*)\]/g, '[$1,$2]');
  sanitized = sanitized.replace(/\{([^\}]*);([^\}]*)\}/g, '{$1,$2}');
  
  // 11. Replace pipe | inside nodes with "ou" (conflicts with edge labels)
  sanitized = sanitized.replace(/\[([^\]]*)\|([^\]]*)\]/g, '[$1 ou $2]');
  sanitized = sanitized.replace(/\{([^\}]*)\|([^\}]*)\}/g, '{$1 ou $2}');
  
  // 12. Replace parentheses in subgraph titles: subgraph Name (Text) → subgraph Name - Text
  sanitized = sanitized.replace(/subgraph\s+([^\n(]*)\(([^)]*)\)/gi, 'subgraph $1- $2');
  
  // 13. Replace + operator between nodes (H + E --> causes parsing issues)
  // Simplify by removing the + combination entirely
  sanitized = sanitized.replace(/(\w+)\s*\+\s*(\w+)\s*(-->)/g, '$1 $3');
  
  if (sanitized !== chart) {
    console.log('[MermaidDiagram] Auto-sanitized chart: removed problematic characters from nodes');
  }
  
  return sanitized;
};

// Auto-fix chart if missing diagram type declaration
const autoFixChart = (chart: string): string => {
  const trimmedChart = chart.trim();
  const firstLine = trimmedChart.split('\n')[0].toLowerCase().trim();
  
  // Check if chart already starts with a valid diagram type
  const hasValidStart = VALID_DIAGRAM_STARTS.some(start => 
    firstLine.startsWith(start)
  );
  
  if (hasValidStart) {
    return trimmedChart;
  }
  
  // Auto-add 'graph TD' if missing
  console.log('[MermaidDiagram] Auto-fixing chart: adding "graph TD" declaration');
  return `graph TD\n${trimmedChart}`;
};

// Apply all fixes to chart
const processChart = (chart: string): string => {
  return autoFixChart(sanitizeChart(chart));
};

export const MermaidDiagram = ({ chart, id, theme = 'dark' }: MermaidDiagramProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [finalChart, setFinalChart] = useState<string>('');

  useEffect(() => {
    if (containerRef.current) {
      setError(null);
      
      // Apply all fixes (sanitize + auto-fix)
      const fixedChart = processChart(chart);
      setFinalChart(fixedChart);
      
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
          // Generate unique ID to avoid conflicts
          const uniqueId = `${id}-${Date.now()}`;
          const { svg } = await mermaid.render(uniqueId, fixedChart);
          if (containerRef.current) {
            containerRef.current.innerHTML = svg;
          }
        } catch (err) {
          console.error('Error rendering mermaid diagram:', err);
          const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
          setError(errorMessage);
        }
      };

      renderDiagram();
    }
  }, [chart, id, theme]);

  if (error) {
    return (
      <div className="my-6 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <div className="flex items-center gap-2 text-destructive mb-3">
          <AlertTriangle className="h-5 w-5" />
          <span className="font-medium">Erro ao renderizar diagrama</span>
        </div>
        <p className="text-sm text-muted-foreground mb-3 font-mono text-xs">
          {error}
        </p>
        <button
          onClick={() => setShowCode(!showCode)}
          className="flex items-center gap-2 text-xs text-primary hover:underline"
        >
          <Code className="h-4 w-4" />
          {showCode ? 'Ocultar código' : 'Ver código fonte'}
        </button>
        {showCode && (
          <pre className="mt-3 p-3 bg-background/50 rounded text-xs overflow-x-auto border border-border">
            <code>{finalChart}</code>
          </pre>
        )}
      </div>
    );
  }

  return <div ref={containerRef} className="mermaid-diagram my-6" />;
};
