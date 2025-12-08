import { useEffect, useState } from "react";

interface MLFlowDiagramProps {
  /** Activity level from 0 to 1, affects animation speed */
  activityLevel?: number;
}

export const MLFlowDiagram = ({ activityLevel = 0.5 }: MLFlowDiagramProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Calculate animation durations based on activity level (higher activity = faster)
  // Activity 0 = slowest (3s base), Activity 1 = fastest (0.5s base)
  const baseDuration = 3 - (activityLevel * 2.5); // Range: 0.5s to 3s
  const pulseDuration = 4 - (activityLevel * 3); // Range: 1s to 4s
  const travelDuration = 3 - (activityLevel * 2); // Range: 1s to 3s

  return (
    <div 
      className={`relative bg-gradient-to-br from-primary/5 to-secondary/5 rounded-lg border border-primary/20 p-3 transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
    >
      <div className="text-xs font-semibold text-center mb-2 text-primary">
        🔄 Ciclo de Aprendizado ML
      </div>
      
      <svg viewBox="0 0 480 200" className="w-full h-auto">
        <defs>
          {/* Gradients for nodes */}
          <linearGradient id="mlAdminGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
          </linearGradient>
          
          <linearGradient id="mlDbGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.1" />
          </linearGradient>
          
          <linearGradient id="mlAiGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.1" />
          </linearGradient>
          
          <linearGradient id="mlDocGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.1" />
          </linearGradient>

          {/* Arrow marker */}
          <marker 
            id="mlArrowhead" 
            markerWidth="10" 
            markerHeight="7" 
            refX="9" 
            refY="3.5" 
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--primary))" opacity="0.6" />
          </marker>
          
          <marker 
            id="mlArrowBlue" 
            markerWidth="10" 
            markerHeight="7" 
            refX="9" 
            refY="3.5" 
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#3B82F6" opacity="0.6" />
          </marker>
          
          <marker 
            id="mlArrowGreen" 
            markerWidth="10" 
            markerHeight="7" 
            refX="9" 
            refY="3.5" 
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#10B981" opacity="0.6" />
          </marker>
          
          <marker 
            id="mlArrowOrange" 
            markerWidth="10" 
            markerHeight="7" 
            refX="9" 
            refY="3.5" 
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#F59E0B" opacity="0.6" />
          </marker>
        </defs>

        {/* Background subtle grid */}
        <pattern id="mlGridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="hsl(var(--muted))" strokeWidth="0.3" opacity="0.3" />
        </pattern>
        <rect width="480" height="200" fill="url(#mlGridPattern)" />

        {/* NODE 1: Admin Merge - Top Left */}
        <g>
          <rect x="10" y="25" width="100" height="60" rx="10" 
            fill="url(#mlAdminGradient)" 
            stroke="hsl(var(--primary))" 
            strokeWidth="2"
          >
            <animate attributeName="stroke-opacity" values="0.6;1;0.6" dur={`${pulseDuration}s`} repeatCount="indefinite" />
          </rect>
          <text x="60" y="50" textAnchor="middle" fill="hsl(var(--primary))" fontSize="11" fontWeight="600">
            👤 Admin
          </text>
          <text x="60" y="68" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="8">
            Unifica tags
          </text>
          
          {/* Pulse effect */}
          <circle cx="60" cy="55" r="35" fill="none" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0">
            <animate attributeName="r" values="35;50;35" dur={`${pulseDuration}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.4;0;0.4" dur={`${pulseDuration}s`} repeatCount="indefinite" />
          </circle>
        </g>

        {/* ARROW 1: Admin → DB */}
        <g>
          <path 
            d="M 115 55 L 165 55" 
            stroke="hsl(var(--primary))" 
            strokeWidth="2" 
            fill="none"
            strokeDasharray="6 3"
            markerEnd="url(#mlArrowhead)"
          >
            <animate attributeName="stroke-dashoffset" from="9" to="0" dur={`${baseDuration}s`} repeatCount="indefinite" />
          </path>
          
          {/* Traveling data packet */}
          <circle r="4" fill="hsl(var(--primary))">
            <animateMotion dur={`${travelDuration}s`} repeatCount="indefinite">
              <mpath href="#path1" />
            </animateMotion>
          </circle>
          <path id="path1" d="M 115 55 L 165 55" fill="none" stroke="none" />
          
          <text x="140" y="45" textAnchor="middle" fill="hsl(var(--primary))" fontSize="7" fontWeight="500">
            1. INSERT
          </text>
        </g>

        {/* NODE 2: Database Rules - Top Center */}
        <g>
          <rect x="170" y="25" width="110" height="60" rx="10" 
            fill="url(#mlDbGradient)" 
            stroke="#3B82F6" 
            strokeWidth="2"
          >
            <animate attributeName="stroke-opacity" values="0.6;1;0.6" dur={`${pulseDuration * 1.2}s`} repeatCount="indefinite" />
          </rect>
          <text x="225" y="50" textAnchor="middle" fill="#3B82F6" fontSize="11" fontWeight="600">
            🗄️ Banco Regras
          </text>
          <text x="225" y="68" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="8">
            tag_merge_rules
          </text>
          
          <circle cx="225" cy="55" r="40" fill="none" stroke="#3B82F6" strokeWidth="1" opacity="0">
            <animate attributeName="r" values="40;55;40" dur={`${pulseDuration * 1.3}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.3;0;0.3" dur={`${pulseDuration * 1.3}s`} repeatCount="indefinite" />
          </circle>
        </g>

        {/* ARROW 2: DB → AI */}
        <g>
          <path 
            d="M 285 55 L 335 55" 
            stroke="#3B82F6" 
            strokeWidth="2" 
            fill="none"
            strokeDasharray="6 3"
            markerEnd="url(#mlArrowBlue)"
          >
            <animate attributeName="stroke-dashoffset" from="9" to="0" dur={`${baseDuration}s`} repeatCount="indefinite" />
          </path>
          
          <circle r="4" fill="#3B82F6">
            <animateMotion dur={`${travelDuration}s`} repeatCount="indefinite" begin="0.3s">
              <mpath href="#path2" />
            </animateMotion>
          </circle>
          <path id="path2" d="M 285 55 L 335 55" fill="none" stroke="none" />
          
          <text x="310" y="45" textAnchor="middle" fill="#3B82F6" fontSize="7" fontWeight="500">
            2. SELECT
          </text>
        </g>

        {/* NODE 3: AI Suggests - Top Right */}
        <g>
          <rect x="340" y="25" width="130" height="60" rx="10" 
            fill="url(#mlAiGradient)" 
            stroke="#10B981" 
            strokeWidth="2"
          >
            <animate attributeName="stroke-opacity" values="0.6;1;0.6" dur={`${pulseDuration * 1.1}s`} repeatCount="indefinite" />
          </rect>
          <text x="405" y="50" textAnchor="middle" fill="#10B981" fontSize="11" fontWeight="600">
            🤖 IA Sugere Tags
          </text>
          <text x="405" y="68" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="8">
            Aplica regras aprendidas
          </text>
          
          <circle cx="405" cy="55" r="45" fill="none" stroke="#10B981" strokeWidth="1" opacity="0">
            <animate attributeName="r" values="45;60;45" dur={`${pulseDuration * 1.4}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.3;0;0.3" dur={`${pulseDuration * 1.4}s`} repeatCount="indefinite" />
          </circle>
        </g>

        {/* ARROW 3: AI → Document (curved down) */}
        <g>
          <path 
            d="M 405 90 Q 405 130 350 145" 
            stroke="#10B981" 
            strokeWidth="2" 
            fill="none"
            strokeDasharray="6 3"
            markerEnd="url(#mlArrowGreen)"
          >
            <animate attributeName="stroke-dashoffset" from="9" to="0" dur={`${baseDuration}s`} repeatCount="indefinite" />
          </path>
          
          <circle r="4" fill="#10B981">
            <animateMotion dur={`${travelDuration}s`} repeatCount="indefinite" begin="0.6s">
              <mpath href="#path3" />
            </animateMotion>
          </circle>
          <path id="path3" d="M 405 90 Q 405 130 350 145" fill="none" stroke="none" />
          
          <text x="420" y="120" textAnchor="middle" fill="#10B981" fontSize="7" fontWeight="500">
            3. APLICA
          </text>
        </g>

        {/* NODE 4: Document - Bottom Center */}
        <g>
          <rect x="190" y="125" width="150" height="60" rx="10" 
            fill="url(#mlDocGradient)" 
            stroke="#F59E0B" 
            strokeWidth="2"
          >
            <animate attributeName="stroke-opacity" values="0.6;1;0.6" dur={`${pulseDuration}s`} repeatCount="indefinite" />
          </rect>
          <text x="265" y="150" textAnchor="middle" fill="#F59E0B" fontSize="11" fontWeight="600">
            📄 Documento Novo
          </text>
          <text x="265" y="168" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="8">
            Tags já corrigidas ✓
          </text>
          
          <circle cx="265" cy="155" r="50" fill="none" stroke="#F59E0B" strokeWidth="1" opacity="0">
            <animate attributeName="r" values="50;70;50" dur={`${pulseDuration}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.25;0;0.25" dur={`${pulseDuration}s`} repeatCount="indefinite" />
          </circle>
        </g>

        {/* ARROW 4: Document → Admin (curved feedback loop) */}
        <g>
          <path 
            d="M 185 155 Q 100 155 60 90" 
            stroke="#F59E0B" 
            strokeWidth="2" 
            fill="none"
            strokeDasharray="6 3"
            markerEnd="url(#mlArrowOrange)"
          >
            <animate attributeName="stroke-dashoffset" from="9" to="0" dur={`${baseDuration}s`} repeatCount="indefinite" />
          </path>
          
          <circle r="4" fill="#F59E0B">
            <animateMotion dur={`${travelDuration * 1.2}s`} repeatCount="indefinite" begin="0.9s">
              <mpath href="#path4" />
            </animateMotion>
          </circle>
          <path id="path4" d="M 185 155 Q 100 155 60 90" fill="none" stroke="none" />
          
          <text x="95" y="130" textAnchor="middle" fill="#F59E0B" fontSize="7" fontWeight="500">
            4. FEEDBACK
          </text>
        </g>

        {/* Center label */}
        <text x="240" y="105" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="9" fontStyle="italic">
          Ciclo contínuo de aprendizado
        </text>

        {/* Activity indicator */}
        {activityLevel > 0.7 && (
          <g>
            <circle cx="460" cy="15" r="6" fill="#10B981">
              <animate attributeName="opacity" values="0.5;1;0.5" dur="0.5s" repeatCount="indefinite" />
            </circle>
            <text x="445" y="18" textAnchor="end" fill="#10B981" fontSize="7" fontWeight="600">ALTA</text>
          </g>
        )}
      </svg>
      
      <div className="text-[10px] text-muted-foreground text-center mt-2 space-y-0.5">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-primary" /> Admin
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> Banco
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> IA
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Doc
          </span>
        </div>
      </div>
    </div>
  );
};
