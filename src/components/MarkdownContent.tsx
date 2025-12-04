import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { InteractiveTable } from './InteractiveTable';
import { MermaidDiagram } from './MermaidDiagram';
import { ChatChartRenderer, parseChartData } from './ChatChartRenderer';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

// Helper function to extract text content from React children
const getTextContent = (children: React.ReactNode): string => {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (!children) return '';
  
  if (Array.isArray(children)) {
    return children.map(getTextContent).join('');
  }
  
  if (React.isValidElement(children) && children.props?.children) {
    return getTextContent(children.props.children);
  }
  
  return '';
};

// Extract table data from React children
const extractTableDataFromChildren = (children: React.ReactNode): { headers: string[]; rows: string[][] } | null => {
  const headers: string[] = [];
  const rows: string[][] = [];
  
  const processChildren = (node: React.ReactNode) => {
    if (!node) return;
    
    if (Array.isArray(node)) {
      node.forEach(processChildren);
      return;
    }
    
    if (!React.isValidElement(node)) return;
    
    const element = node as React.ReactElement<{ children?: React.ReactNode }>;
    const type = element.type;
    
    // Handle thead
    if (type === 'thead' || (typeof type === 'function' && (type as any).displayName === 'thead')) {
      const theadChildren = element.props?.children;
      if (theadChildren) {
        processTheadChildren(theadChildren);
      }
    }
    // Handle tbody
    else if (type === 'tbody' || (typeof type === 'function' && (type as any).displayName === 'tbody')) {
      const tbodyChildren = element.props?.children;
      if (tbodyChildren) {
        processTbodyChildren(tbodyChildren);
      }
    }
    // Recurse into other elements
    else if (element.props?.children) {
      processChildren(element.props.children);
    }
  };
  
  const processTheadChildren = (node: React.ReactNode) => {
    if (!node) return;
    
    if (Array.isArray(node)) {
      node.forEach(processTheadChildren);
      return;
    }
    
    if (!React.isValidElement(node)) return;
    
    const element = node as React.ReactElement<{ children?: React.ReactNode }>;
    const type = element.type;
    
    // Handle tr in thead
    if (type === 'tr' || (typeof type === 'function')) {
      const trChildren = element.props?.children;
      if (trChildren) {
        const cells = Array.isArray(trChildren) ? trChildren : [trChildren];
        cells.forEach((cell) => {
          if (React.isValidElement(cell)) {
            const cellElement = cell as React.ReactElement<{ children?: React.ReactNode }>;
            const text = getTextContent(cellElement.props?.children);
            if (text) headers.push(text.trim());
          }
        });
      }
    } else if (element.props?.children) {
      processTheadChildren(element.props.children);
    }
  };
  
  const processTbodyChildren = (node: React.ReactNode) => {
    if (!node) return;
    
    if (Array.isArray(node)) {
      node.forEach(processTbodyChildren);
      return;
    }
    
    if (!React.isValidElement(node)) return;
    
    const element = node as React.ReactElement<{ children?: React.ReactNode }>;
    const type = element.type;
    
    // Handle tr in tbody
    if (type === 'tr' || (typeof type === 'function')) {
      const trChildren = element.props?.children;
      if (trChildren) {
        const row: string[] = [];
        const cells = Array.isArray(trChildren) ? trChildren : [trChildren];
        cells.forEach((cell) => {
          if (React.isValidElement(cell)) {
            const cellElement = cell as React.ReactElement<{ children?: React.ReactNode }>;
            const text = getTextContent(cellElement.props?.children);
            row.push(text.trim());
          }
        });
        if (row.length > 0) rows.push(row);
      }
    } else if (element.props?.children) {
      processTbodyChildren(element.props.children);
    }
  };
  
  processChildren(children);
  
  if (headers.length > 0 && rows.length > 0) {
    return { headers, rows };
  }
  
  return null;
};

// Custom table renderer - accepts any props from react-markdown
const TableWrapper = ({ children, node, ...props }: any) => {
  const tableData = useMemo(() => {
    return extractTableDataFromChildren(children);
  }, [children]);

  // If we parsed the table successfully, render interactive version
  if (tableData && tableData.rows.length > 0) {
    return <InteractiveTable data={tableData} />;
  }

  // Fallback: render standard table
  return (
    <div className="my-3 overflow-x-auto">
      <table className="w-full text-xs border-collapse" {...props}>
        {children}
      </table>
    </div>
  );
};

// Extract mermaid diagrams from content
const extractMermaidBlocks = (content: string): { mermaidBlocks: { id: string; code: string }[]; cleanContent: string } => {
  const mermaidBlocks: { id: string; code: string }[] = [];
  let counter = 0;
  
  // Match ```mermaid ... ``` blocks
  const cleanContent = content.replace(/```mermaid\s*([\s\S]*?)```/gi, (match, code) => {
    const id = `mermaid-${Date.now()}-${counter++}`;
    mermaidBlocks.push({ id, code: code.trim() });
    return `[[MERMAID_PLACEHOLDER_${id}]]`;
  });
  
  return { mermaidBlocks, cleanContent };
};

export const MarkdownContent = ({ content, className }: MarkdownContentProps) => {
  // First, check for CHART_DATA blocks
  const chartResult = parseChartData(content);
  
  // Then extract mermaid blocks
  const { mermaidBlocks, cleanContent: contentAfterMermaid } = extractMermaidBlocks(
    chartResult ? chartResult.cleanContent : content
  );

  const finalContent = contentAfterMermaid;

  // Split content by mermaid placeholders to render them inline
  const renderContent = () => {
    if (mermaidBlocks.length === 0) {
      return (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
            li: ({ children }) => <li className="mb-1">{children}</li>,
            strong: ({ children }) => <strong className="font-bold">{children}</strong>,
            em: ({ children }) => <em className="italic">{children}</em>,
            code: ({ children, className }) => {
              // Don't render code blocks as inline code
              if (className?.includes('language-')) {
                return <code className={className}>{children}</code>;
              }
              return (
                <code className="bg-muted px-1 py-0.5 rounded text-xs">{children}</code>
              );
            },
            pre: ({ children }) => (
              <pre className="bg-muted p-2 rounded-lg overflow-x-auto text-xs my-2">{children}</pre>
            ),
            // Table components
            table: TableWrapper,
            thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
            tbody: ({ children }) => <tbody>{children}</tbody>,
            tr: ({ children }) => <tr className="border-b border-border/30">{children}</tr>,
            th: ({ children }) => <th className="px-3 py-2 text-left font-semibold text-xs">{children}</th>,
            td: ({ children }) => <td className="px-3 py-2 text-xs">{children}</td>,
          }}
        >
          {finalContent}
        </ReactMarkdown>
      );
    }

    // Split by placeholders and render mixed content
    const parts = finalContent.split(/\[\[MERMAID_PLACEHOLDER_(mermaid-\d+-\d+)\]\]/);
    
    return parts.map((part, index) => {
      // Check if this part is a mermaid ID
      const mermaidBlock = mermaidBlocks.find(b => b.id === part);
      
      if (mermaidBlock) {
        return <MermaidDiagram key={mermaidBlock.id} chart={mermaidBlock.code} id={mermaidBlock.id} />;
      }
      
      // Regular markdown content
      if (part.trim()) {
        return (
          <ReactMarkdown
            key={`md-${index}`}
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
              li: ({ children }) => <li className="mb-1">{children}</li>,
              strong: ({ children }) => <strong className="font-bold">{children}</strong>,
              em: ({ children }) => <em className="italic">{children}</em>,
              code: ({ children, className }) => {
                if (className?.includes('language-')) {
                  return <code className={className}>{children}</code>;
                }
                return (
                  <code className="bg-muted px-1 py-0.5 rounded text-xs">{children}</code>
                );
              },
              pre: ({ children }) => (
                <pre className="bg-muted p-2 rounded-lg overflow-x-auto text-xs my-2">{children}</pre>
              ),
              table: TableWrapper,
              thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
              tbody: ({ children }) => <tbody>{children}</tbody>,
              tr: ({ children }) => <tr className="border-b border-border/30">{children}</tr>,
              th: ({ children }) => <th className="px-3 py-2 text-left font-semibold text-xs">{children}</th>,
              td: ({ children }) => <td className="px-3 py-2 text-xs">{children}</td>,
            }}
          >
            {part}
          </ReactMarkdown>
        );
      }
      
      return null;
    });
  };

  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none", className)}>
      {/* Render chart if present */}
      {chartResult && <ChatChartRenderer data={chartResult.chartData} />}
      
      {/* Render markdown content with mermaid diagrams */}
      {renderContent()}
    </div>
  );
};
