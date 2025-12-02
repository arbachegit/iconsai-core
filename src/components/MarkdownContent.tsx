import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { ChatChartRenderer } from './ChatChartRenderer';
import { MermaidDiagram } from './MermaidDiagram';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

interface ContentPart {
  type: 'text' | 'chart' | 'mermaid';
  content: string;
  id?: string;
}

// Extrai JSON balanceado considerando chaves aninhadas
const extractBalancedJson = (str: string, startIndex: number): string | null => {
  let depth = 0;
  let start = -1;
  
  for (let i = startIndex; i < str.length; i++) {
    if (str[i] === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (str[i] === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        return str.slice(start, i + 1);
      }
    }
  }
  
  return null;
};

// Parse content to extract charts and mermaid diagrams
const parseContentWithCharts = (content: string): ContentPart[] => {
  const parts: ContentPart[] = [];
  let partIndex = 0;
  
  // Primeiro, processar CHART_DATA com balanceamento de chaves
  const chartMarker = 'CHART_DATA:';
  let processedContent = content;
  const chartParts: { start: number; end: number; json: string }[] = [];
  
  let searchIndex = 0;
  while (searchIndex < processedContent.length) {
    const chartStart = processedContent.indexOf(chartMarker, searchIndex);
    
    if (chartStart === -1) break;
    
    // Encontrar início do JSON (após os espaços)
    let jsonStart = chartStart + chartMarker.length;
    while (jsonStart < processedContent.length && processedContent[jsonStart] === ' ') {
      jsonStart++;
    }
    
    // Extrair JSON balanceado
    const jsonContent = extractBalancedJson(processedContent, jsonStart);
    
    if (jsonContent) {
      chartParts.push({
        start: chartStart,
        end: jsonStart + jsonContent.length,
        json: jsonContent
      });
      searchIndex = jsonStart + jsonContent.length;
    } else {
      searchIndex = chartStart + chartMarker.length;
    }
  }
  
  // Processar Mermaid com regex (funciona bem para blocos de código)
  const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
  const mermaidParts: { start: number; end: number; code: string }[] = [];
  let mermaidMatch;
  
  while ((mermaidMatch = mermaidRegex.exec(processedContent)) !== null) {
    mermaidParts.push({
      start: mermaidMatch.index,
      end: mermaidMatch.index + mermaidMatch[0].length,
      code: mermaidMatch[1].trim()
    });
  }
  
  // Combinar e ordenar todas as partes especiais por posição
  const allSpecialParts = [
    ...chartParts.map(p => ({ ...p, type: 'chart' as const })),
    ...mermaidParts.map(p => ({ ...p, type: 'mermaid' as const }))
  ].sort((a, b) => a.start - b.start);
  
  // Construir array de partes final
  let lastIndex = 0;
  
  for (const special of allSpecialParts) {
    // Adicionar texto antes
    if (special.start > lastIndex) {
      const textBefore = processedContent.slice(lastIndex, special.start).trim();
      if (textBefore) {
        parts.push({ type: 'text', content: textBefore });
      }
    }
    
    // Adicionar parte especial
    if (special.type === 'chart') {
      parts.push({
        type: 'chart',
        content: (special as typeof chartParts[0] & { type: 'chart' }).json,
        id: `chart-${partIndex++}`
      });
    } else {
      parts.push({
        type: 'mermaid',
        content: (special as typeof mermaidParts[0] & { type: 'mermaid' }).code,
        id: `mermaid-${partIndex++}`
      });
    }
    
    lastIndex = special.end;
  }
  
  // Adicionar texto restante
  if (lastIndex < processedContent.length) {
    const remainingText = processedContent.slice(lastIndex).trim();
    if (remainingText) {
      parts.push({ type: 'text', content: remainingText });
    }
  }
  
  // Se não encontrou nada especial, retornar conteúdo original como texto
  if (parts.length === 0) {
    parts.push({ type: 'text', content: content });
  }
  
  return parts;
};

export const MarkdownContent = ({ content, className }: MarkdownContentProps) => {
  const parts = useMemo(() => parseContentWithCharts(content), [content]);

  return (
    <div className={cn("space-y-4", className)}>
      {parts.map((part, index) => {
        if (part.type === 'chart') {
          return (
            <ChatChartRenderer 
              key={part.id || index} 
              chartData={part.content} 
            />
          );
        }

        if (part.type === 'mermaid') {
          return (
            <MermaidDiagram
              key={part.id || index}
              id={part.id || `mermaid-${index}`}
              chart={part.content}
              theme="dark"
            />
          );
        }

        return (
          <div key={index} className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                li: ({ children }) => <li className="mb-1">{children}</li>,
                strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                code: ({ children }) => (
                  <code className="bg-muted px-1 py-0.5 rounded text-xs">{children}</code>
                ),
                pre: ({ children }) => (
                  <pre className="bg-muted p-2 rounded-lg overflow-x-auto text-xs my-2">{children}</pre>
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto my-2">
                    <table className="w-full border-collapse border border-border text-xs">{children}</table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-muted/50">{children}</thead>
                ),
                tbody: ({ children }) => (
                  <tbody>{children}</tbody>
                ),
                tr: ({ children }) => (
                  <tr className="border-b border-border">{children}</tr>
                ),
                th: ({ children }) => (
                  <th className="border border-border px-2 py-1 text-left font-semibold">{children}</th>
                ),
                td: ({ children }) => (
                  <td className="border border-border px-2 py-1">{children}</td>
                ),
              }}
            >
              {part.content}
            </ReactMarkdown>
          </div>
        );
      })}
    </div>
  );
};
