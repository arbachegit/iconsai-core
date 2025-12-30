import React from "react";
import { motion } from "framer-motion";
import { Smartphone, Volume2, Wifi } from "lucide-react";
import { PWAVoiceAssistant } from "@/components/pwa/voice/PWAVoiceAssistant";

interface PWASimulatorProps {
  showFrame?: boolean;
  scale?: number;
}

export const PWASimulator: React.FC<PWASimulatorProps> = ({ 
  showFrame = true,
  scale = 0.65 
}) => {
  if (!showFrame) {
    return (
      <div className="w-full h-full overflow-hidden">
        <PWAVoiceAssistant />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Title */}
      <div className="flex items-center gap-2 text-muted-foreground">
        <Smartphone className="w-4 h-4" />
        <span className="text-sm font-medium">Simulador PWA (Preview)</span>
      </div>

      {/* Phone Frame */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
        style={{ 
          width: 320 * scale, 
          height: 640 * scale,
        }}
      >
        {/* Outer frame with gradient */}
        <div 
          className="absolute inset-0 rounded-[40px] p-[3px]"
          style={{
            background: "linear-gradient(145deg, hsl(var(--border)) 0%, hsl(var(--muted)) 50%, hsl(var(--border)) 100%)",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255,255,255,0.1)"
          }}
        >
          {/* Inner black frame */}
          <div 
            className="w-full h-full rounded-[37px] overflow-hidden relative"
            style={{ 
              background: "hsl(225, 54%, 6%)",
              border: "1px solid hsl(var(--border)/0.3)"
            }}
          >
            {/* Status bar */}
            <div 
              className="absolute top-0 left-0 right-0 h-7 flex items-center justify-between px-6 z-20"
              style={{ 
                background: "linear-gradient(180deg, hsl(225, 54%, 8%) 0%, transparent 100%)" 
              }}
            >
              <span className="text-[10px] text-muted-foreground/60">9:41</span>
              <div className="flex items-center gap-1">
                <Wifi className="w-3 h-3 text-muted-foreground/60" />
                <Volume2 className="w-3 h-3 text-muted-foreground/60" />
                <div className="w-5 h-2 rounded-sm border border-muted-foreground/40 flex items-center justify-end p-px">
                  <div className="w-3 h-1 rounded-sm bg-green-500" />
                </div>
              </div>
            </div>

            {/* Dynamic Island / Notch */}
            <div 
              className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-6 rounded-full z-30"
              style={{ background: "hsl(0, 0%, 0%)" }}
            >
              {/* Camera dot */}
              <div 
                className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
                style={{ 
                  background: "radial-gradient(circle, hsl(210, 100%, 30%) 0%, hsl(210, 100%, 10%) 100%)",
                  boxShadow: "0 0 3px hsl(210, 100%, 50%, 0.3)"
                }}
              />
            </div>

            {/* Screen content - PWA App */}
            <div 
              className="absolute inset-0 pt-8 pb-1 overflow-hidden"
              style={{ 
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                width: `${100 / scale}%`,
                height: `${100 / scale}%`,
              }}
            >
              <div className="w-full h-full overflow-auto">
                <PWAVoiceAssistant />
              </div>
            </div>

            {/* Home indicator */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20">
              <div 
                className="w-28 h-1 rounded-full"
                style={{ background: "hsl(var(--muted-foreground)/0.4)" }}
              />
            </div>
          </div>
        </div>

        {/* Reflection effect */}
        <div 
          className="absolute inset-0 rounded-[40px] pointer-events-none"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%)",
          }}
        />
      </motion.div>

      {/* Instructions */}
      <p className="text-xs text-muted-foreground/60 text-center max-w-xs">
        Interaja com o simulador acima. Para testar funcionalidades de voz, 
        acesse <span className="text-primary">/pwa</span> em um dispositivo móvel.
      </p>
    </div>
  );
};

export default PWASimulator;
