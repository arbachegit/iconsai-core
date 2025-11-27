import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export const MarkdownContent = ({ content, className }: MarkdownContentProps) => {
  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none", className)}>
      <ReactMarkdown
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
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
