import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { InteractiveTable, parseMarkdownTable } from './InteractiveTable';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

// Custom table renderer that captures table HTML and converts to interactive
const TableWrapper = ({ children }: { children: React.ReactNode }) => {
  const tableRef = useRef<HTMLTableElement>(null);
  const [tableData, setTableData] = useState<{ headers: string[]; rows: string[][] } | null>(null);

  useEffect(() => {
    if (tableRef.current) {
      const data = parseMarkdownTable(tableRef.current.outerHTML);
      if (data && data.rows.length > 0) {
        setTableData(data);
      }
    }
  }, [children]);

  // If we parsed the table successfully, render interactive version
  if (tableData) {
    return <InteractiveTable data={tableData} />;
  }

  // Fallback: render standard table while parsing
  return (
    <div className="my-3 overflow-x-auto">
      <table ref={tableRef} className="w-full text-xs border-collapse">
        {children}
      </table>
    </div>
  );
};

export const MarkdownContent = ({ content, className }: MarkdownContentProps) => {
  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none", className)}>
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
          // Table components
          table: TableWrapper,
          thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr className="border-b border-border/30">{children}</tr>,
          th: ({ children }) => <th className="px-3 py-2 text-left font-semibold text-xs">{children}</th>,
          td: ({ children }) => <td className="px-3 py-2 text-xs">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
