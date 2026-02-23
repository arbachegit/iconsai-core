import { Send, Plus, Trash2, Edit, Search, Download } from "lucide-react";
import { type LucideIcon } from "lucide-react";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "warning"
  | "cyan"
  | "purple";

interface UIButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  icon?: LucideIcon;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    border-blue-600 text-blue-600 bg-blue-100
    hover:bg-blue-600 hover:text-white
  `,
  secondary: `
    border-green-600 text-green-600 bg-green-100
    hover:bg-green-600 hover:text-white
  `,
  danger: `
    border-red-600 text-red-600 bg-red-100
    hover:bg-red-600 hover:text-white
  `,
  warning: `
    border-yellow-600 text-yellow-600 bg-yellow-100
    hover:bg-yellow-600 hover:text-white
  `,
  cyan: `
    border-cyan-600 text-cyan-600 bg-cyan-100
    hover:bg-cyan-600 hover:text-white
  `,
  purple: `
    border-purple-600 text-purple-600 bg-purple-100
    hover:bg-purple-600 hover:text-white
  `,
};

export function UIButton({
  children,
  onClick,
  variant = "primary",
  icon: Icon = Send,
  disabled = false,
  type = "button",
  className = "",
}: UIButtonProps) {
  const baseStyles = `
    h-12
    flex items-center justify-center gap-2
    border-2
    transition-all duration-200 ease-in-out
    rounded-xl px-4
    font-medium
    disabled:opacity-50 disabled:cursor-not-allowed
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
  `;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
    >
      <Icon size={18} />
      {children}
    </button>
  );
}

export default UIButton;
