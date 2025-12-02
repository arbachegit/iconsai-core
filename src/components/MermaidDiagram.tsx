import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { AlertTriangle, Code } from 'lucide-react';

interface MermaidDiagramProps {
  chart: string;
  id: string;
  theme?: 'dark' | 'light';
}

export const MermaidDiagram = ({ chart, id, theme = 'dark' }: MermaidDiagramProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);

  useEffect(() => {
    if (containerRef.current) {
      setError(null);
      
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
          const { svg } = await mermaid.render(uniqueId, chart);
          if (containerRef.current) {
            containerRef.current.innerHTML = svg;
          }
        } catch (err) {
          console.error('Error rendering mermaid diagram:', err);
          setError(err instanceof Error ? err.message : 'Erro ao renderizar diagrama');
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
        <p className="text-sm text-muted-foreground mb-3">
          O código Mermaid contém caracteres não suportados (emojis ou acentos nos nós).
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
            <code>{chart}</code>
          </pre>
        )}
      </div>
    );
  }

  return <div ref={containerRef} className="mermaid-diagram my-6" />;
};
