import { useMemo, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { ChatChartRenderer } from './ChatChartRenderer';
import { MermaidDiagram } from './MermaidDiagram';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

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

// Sortable Table Component inline
interface SortConfig {
  column: number;
  direction: 'asc' | 'desc';
}

// Helper function to extract table data (defined outside component to avoid recreation)
const extractTableDataFromNode = (node: React.ReactNode): { headers: string[]; rows: string[][] } | null => {
  const headers: string[] = [];
  const rows: string[][] = [];

  const extractText = (n: React.ReactNode): string => {
    if (typeof n === 'string' || typeof n === 'number') return String(n);
    if (Array.isArray(n)) return n.map(extractText).join('');
    if (typeof n === 'object' && n !== null && 'props' in n) {
      return extractText((n as React.ReactElement).props.children);
    }
    return '';
  };

  const processChildren = (children: React.ReactNode, isHeader = false, currentRow: string[] = []) => {
    if (!children) return;

    if (Array.isArray(children)) {
      children.forEach(child => processChildren(child, isHeader, currentRow));
      return;
    }

    if (typeof children === 'object' && children !== null && 'props' in children) {
      const element = children as React.ReactElement;
      const type = element.type;
      const props = element.props;

      if (type === 'thead') {
        processChildren(props.children, true);
      } else if (type === 'tbody') {
        processChildren(props.children, false);
      } else if (type === 'tr') {
        const row: string[] = [];
        processChildren(props.children, isHeader, row);
        if (isHeader) {
          headers.push(...row);
        } else if (row.length > 0) {
          rows.push(row);
        }
      } else if (type === 'th' || type === 'td') {
        const text = extractText(props.children);
        currentRow.push(text);
      } else {
        processChildren(props.children, isHeader, currentRow);
      }
    }
  };

  processChildren(node);
  return headers.length > 0 ? { headers, rows } : null;
};

const SortableTableWrapper = ({ children }: { children: React.ReactNode }) => {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  // FIXED: Use useMemo to compute tableData directly, no setState inside useMemo
  const tableData = useMemo(() => extractTableDataFromNode(children), [children]);

  const handleSort = useCallback((columnIndex: number) => {
    setSortConfig(prev => {
      if (prev?.column === columnIndex) {
        return prev.direction === 'asc' 
          ? { column: columnIndex, direction: 'desc' }
          : null;
      }
      return { column: columnIndex, direction: 'asc' };
    });
  }, []);

  const getSortIcon = (columnIndex: number) => {
    if (sortConfig?.column !== columnIndex) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50 inline" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="h-3 w-3 ml-1 text-primary inline" />
      : <ArrowDown className="h-3 w-3 ml-1 text-primary inline" />;
  };

  // If we have table data, render sortable version
  if (tableData) {
    const sortedRows = sortConfig 
      ? [...tableData.rows].sort((a, b) => {
          const aVal = a[sortConfig.column] || '';
          const bVal = b[sortConfig.column] || '';
          const aNum = parseFloat(aVal.replace(/[^0-9.-]/g, ''));
          const bNum = parseFloat(bVal.replace(/[^0-9.-]/g, ''));
          if (!isNaN(aNum) && !isNaN(bNum)) {
            return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
          }
          const comparison = aVal.localeCompare(bVal, 'pt-BR', { sensitivity: 'base' });
          return sortConfig.direction === 'asc' ? comparison : -comparison;
        })
      : tableData.rows;

    return (
      <div className="overflow-x-auto my-2">
        <table className="w-full border-collapse border border-border text-xs">
          <thead className="bg-muted/50">
            <tr className="border-b border-border">
              {tableData.headers.map((header, idx) => (
                <th
                  key={idx}
                  className="border border-border px-2 py-1 text-left font-semibold cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => handleSort(idx)}
                >
                  <span>{header}</span>
                  {getSortIcon(idx)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, rowIdx) => (
              <tr key={rowIdx} className="border-b border-border">
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx} className="border border-border px-2 py-1">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {sortConfig && (
          <p className="text-[10px] text-muted-foreground mt-1">
            Clique no cabeçalho para ordenar
          </p>
        )}
      </div>
    );
  }

  // Fallback: render original children
  return <div className="overflow-x-auto my-2">{children}</div>;
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
                  <SortableTableWrapper>{children}</SortableTableWrapper>
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
