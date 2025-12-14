import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EconomicCloseButtonProps {
  onClick: () => void;
  className?: string;
}

/**
 * Styled close button for Economic Indicators modals
 * White circle around X with red hover effect
 */
export function EconomicCloseButton({ onClick, className }: EconomicCloseButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "absolute right-4 top-4 z-50",
        "flex items-center justify-center",
        "h-8 w-8 rounded-full",
        "bg-white text-slate-700",
        "hover:bg-red-500 hover:text-white",
        "transition-colors duration-200",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        className
      )}
      aria-label="Fechar"
    >
      <X className="h-4 w-4" />
    </button>
  );
}
