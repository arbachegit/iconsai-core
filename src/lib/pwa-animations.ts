// Cores por agente
export const AGENT_COLORS: Record<string, {
  primary: string;
  bg: string;
  glow: string;
  accent: string;
}> = {
  economia: {
    primary: "text-emerald-500",
    bg: "from-emerald-900/20 via-slate-900 to-slate-950",
    glow: "shadow-emerald-500/30",
    accent: "bg-emerald-500",
  },
  health: {
    primary: "text-blue-500",
    bg: "from-blue-900/20 via-slate-900 to-slate-950",
    glow: "shadow-blue-500/30",
    accent: "bg-blue-500",
  },
  ideias: {
    primary: "text-amber-500",
    bg: "from-amber-900/20 via-slate-900 to-slate-950",
    glow: "shadow-amber-500/30",
    accent: "bg-amber-500",
  },
  inovacao: {
    primary: "text-purple-500",
    bg: "from-purple-900/20 via-slate-900 to-slate-950",
    glow: "shadow-purple-500/30",
    accent: "bg-purple-500",
  },
};

// Ícones por agente
export const AGENT_ICONS: Record<string, string> = {
  economia: "💹",
  health: "🏥",
  ideias: "💡",
  inovacao: "🚀",
};

// Nomes por agente
export const AGENT_NAMES: Record<string, string> = {
  economia: "Economista",
  health: "Saúde",
  ideias: "Ideias",
  inovacao: "Inovação",
};

// Classes CSS para estados
export const PWA_STATE_CLASSES = {
  idle: "",
  recording: "animate-pulse",
  processing: "animate-spin",
  ready: "",
};

// Durations e easings
export const ANIMATION_TIMING = {
  slugChange: 300,
  stateChange: 200,
  buttonScale: 150,
  fadeIn: 300,
  slideUp: 400,
};

// Estilos de botão por estado
export const BUTTON_STYLES: Record<string, string> = {
  idle: "bg-primary shadow-lg shadow-primary/30 hover:scale-105 active:scale-95",
  recording: "bg-red-500 shadow-lg shadow-red-500/30 animate-pulse",
  processing: "bg-card",
  ready: "bg-emerald-500 shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95",
};

// Helper para obter configuração de agente
export function getAgentConfig(slug: string) {
  return {
    icon: AGENT_ICONS[slug] || "💬",
    name: AGENT_NAMES[slug] || slug,
    colors: AGENT_COLORS[slug] || AGENT_COLORS.economia,
  };
}
