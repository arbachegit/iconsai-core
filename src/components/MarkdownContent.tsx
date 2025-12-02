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

// Parse content to extract charts and mermaid diagrams
const parseContentWithCharts = (content: string): ContentPart[] => {
  const parts: ContentPart[] = [];
  let remaining = content;
  let partIndex = 0;

  // Pattern for CHART_DATA: {...}
  const chartRegex = /CHART_DATA:\s*(\{[\s\S]*?\})(?:\n|$)/g;
  
  // Pattern for ```mermaid ... ```
  const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;

  // Combined pattern to process in order of appearance
  const combinedRegex = /(?:CHART_DATA:\s*(\{[\s\S]*?\})(?:\n|$)|```mermaid\n([\s\S]*?)```)/g;

  let lastIndex = 0;
  let match;

  while ((match = combinedRegex.exec(remaining)) !== null) {
    // Add text before this match
    if (match.index > lastIndex) {
      const textBefore = remaining.slice(lastIndex, match.index).trim();
      if (textBefore) {
        parts.push({ type: 'text', content: textBefore });
      }
    }

    if (match[1]) {
      // CHART_DATA match
      parts.push({ 
        type: 'chart', 
        content: match[1],
        id: `chart-${partIndex++}`
      });
    } else if (match[2]) {
      // Mermaid match
      parts.push({ 
        type: 'mermaid', 
        content: match[2].trim(),
        id: `mermaid-${partIndex++}`
      });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < remaining.length) {
    const remainingText = remaining.slice(lastIndex).trim();
    if (remainingText) {
      parts.push({ type: 'text', content: remainingText });
    }
  }

  // If no special content found, return original as text
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
