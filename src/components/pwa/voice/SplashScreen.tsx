import React, { useEffect, useMemo, useRef, useState } from "react";

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
  embedded?: boolean;
}

type Stage = "starsIn" | "grow" | "write" | "suction" | "done";

type Particle = {
  x: number;
  y: number;
  r: number;
  baseA: number;
  tw: number;
  ph: number;
  born: number;
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  duration = 5500,
  embedded = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const t0Ref = useRef<number>(0);

  const [stage, setStage] = useState<Stage>("starsIn");
  const [fadeOut, setFadeOut] = useState(false);
  const [starScale, setStarScale] = useState(0);
  const [starGlow, setStarGlow] = useState(0);

  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });

  // Partículas (220 mini-estrelas)
  const particles = useMemo<Particle[]>(() => {
    const count = 220;
    const arr: Particle[] = new Array(count).fill(0).map(() => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.65 + Math.random() * 1.6,
      baseA: 0.25 + Math.random() * 0.75,
      tw: 0.6 + Math.random() * 2.3,
      ph: Math.random() * Math.PI * 2,
      born: Math.random() * 1.0,
    }));
    return arr;
  }, []);

  // Timeline - adjusted for smoother transitions
  const TL = useMemo(() => {
    const tStarsIn = 1200;
    const tGrow = 1800;
    const tWrite = 1600;
    const tSuction = Math.max(600, duration - (tStarsIn + tGrow + tWrite));
    const t1 = tStarsIn;
    const t2 = t1 + tGrow;
    const t3 = t2 + tWrite;
    const t4 = t3 + tSuction;
    return { tStarsIn, tGrow, tWrite, tSuction, t1, t2, t3, t4 };
  }, [duration]);

  function setCanvasSize() {
    const c = canvasRef.current;
    if (!c) return;
    const parent = c.parentElement;
    const w = parent ? parent.clientWidth : window.innerWidth;
    const h = parent ? parent.clientHeight : window.innerHeight;
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    c.width = Math.floor(w * dpr);
    c.height = Math.floor(h * dpr);
    c.style.width = `${w}px`;
    c.style.height = `${h}px`;
    sizeRef.current = { w, h, dpr };
  }

  // Desenha mini estrela 4 pontas
  function drawSparkle4(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    alpha: number
  ) {
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x, y + size);
    ctx.moveTo(x - size, y);
    ctx.lineTo(x + size, y);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.35, size * 0.18), 0, Math.PI * 2);
    ctx.fill();
  }

  function renderFrame(now: number) {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    const { w, h, dpr } = sizeRef.current;
    const t = now - t0Ref.current;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;

    // Determina stage
    let st: Stage = "starsIn";
    if (t < TL.t1) st = "starsIn";
    else if (t < TL.t2) st = "grow";
    else if (t < TL.t3) st = "write";
    else if (t < TL.t4) st = "suction";
    else st = "done";
    if (st !== stage) setStage(st);

    // Progressos
    const pStars = clamp01(t / TL.t1);
    const pGrow = clamp01((t - TL.t1) / (TL.t2 - TL.t1));
    const pWrite = clamp01((t - TL.t2) / (TL.t3 - TL.t2));
    const pSuction = clamp01((t - TL.t3) / (TL.t4 - TL.t3));

    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.fillStyle = "rgba(255,255,255,0.95)";

    const suctionK = st === "suction" ? easeInOut(pSuction) : 0;

    // Desenha partículas
    for (let i = 0; i < particles.length; i++) {
      const P = particles[i];
      let x = P.x * w;
      let y = P.y * h;

      const bornGate = clamp01((pStars - P.born) / 0.25);
      const appear = st === "starsIn" ? easeOut(bornGate) : 1;
      const tw = 0.55 + 0.45 * Math.sin(P.ph + (now / 1000) * P.tw);

      if (suctionK > 0) {
        const dx = cx - x;
        const dy = cy - y;
        const dist = Math.max(1, Math.hypot(dx, dy));
        const pull = suctionK * suctionK * 22;
        x += (dx / dist) * pull * (1 + P.r * 0.5);
        y += (dy / dist) * pull * (1 + P.r * 0.5);
      }

      const fadeParticles = st === "suction" ? clamp01(1 - pSuction * 1.1) : 1;
      const a = P.baseA * tw * appear * fadeParticles;
      const s = P.r * (0.9 + tw * 0.35);

      if (s < 1.05) {
        ctx.globalAlpha = a;
        ctx.fillRect(x, y, 1, 1);
      } else {
        drawSparkle4(ctx, x, y, s, a);
      }
    }

    // Parâmetros da estrela central
    const growK = st === "grow" ? easeInOut(pGrow) : st === "write" ? 1 : st === "suction" ? 1 : st === "starsIn" ? 0 : 1;
    const glowK = st === "grow" ? easeOut(pGrow) * 0.75 : st === "write" ? 0.85 : st === "suction" ? 1.2 : 0;

    const suctionScaleBoost = st === "suction" ? 1 + easeInOut(pSuction) * 0.45 : 1;
    const suctionGlowBoost = st === "suction" ? 1 + easeInOut(pSuction) * 1.2 : 1;

    setStarScale(growK * suctionScaleBoost);
    setStarGlow(glowK * suctionGlowBoost);

    if (st === "done") {
      if (!fadeOut) {
        setFadeOut(true);
        window.setTimeout(() => onComplete(), 1100);
      }
      return;
    }

    rafRef.current = requestAnimationFrame(renderFrame);
  }

  useEffect(() => {
    setCanvasSize();
    const onResize = () => setCanvasSize();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    t0Ref.current = performance.now();
    rafRef.current = requestAnimationFrame(renderFrame);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const writingActive = stage === "write" || stage === "suction" || stage === "done";
  
  const textOpacity = stage === "suction" 
    ? clamp01(1 - easeInOut((performance.now() - t0Ref.current - TL.t3) / (TL.t4 - TL.t3)) * 1.25) 
    : 1;

  const overlayOpacity = fadeOut ? 0 : 1;

  return (
    <div
      className={`${embedded ? "absolute" : "fixed"} inset-0 z-50 bg-black overflow-hidden`}
      style={{
        opacity: overlayOpacity,
        transition: "opacity 1s ease-in-out",
      }}
    >
      {/* Canvas: estrelas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ background: "#000" }}
      />

      {/* Estrela central (4 pontas) */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          transform: `translate(-50%, -50%) scale(${starScale})`,
          transition: "transform 0.08s ease-out",
        }}
      >
        <CentralAIStar glow={starGlow} />
      </div>

      {/* Texto "KnowYOU AI" */}
      <div
        className="absolute left-1/2 top-[65%] -translate-x-1/2 pointer-events-none"
        style={{
          opacity: writingActive ? textOpacity : 0,
          transition: "opacity 0.15s ease-out",
        }}
      >
        <HandwritingTitle active={writingActive} />
      </div>
    </div>
  );
};

// Estrela central de 4 pontas
function CentralAIStar({ glow }: { glow: number }) {
  const g = Math.max(0, glow);

  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      className="block"
      style={{
        filter: `drop-shadow(0 0 ${8 + g * 25}px rgba(220,235,255,${0.3 + g * 0.5})) drop-shadow(0 0 ${4 + g * 12}px rgba(180,210,255,${0.25 + g * 0.35}))`,
      }}
    >
      <defs>
        <linearGradient id="starGrad4" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="50%" stopColor="#e8f4ff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#d0e8ff" stopOpacity="0.9" />
        </linearGradient>
        <radialGradient id="starGlow4" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="40%" stopColor="#e0f0ff" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#b8d8ff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Glow background */}
      <circle cx="60" cy="60" r="55" fill="url(#starGlow4)" opacity={0.3 + g * 0.4} />

      {/* 4-pointed star shape */}
      <path
        d="M60 5 L65 50 L60 55 L55 50 Z M60 115 L55 70 L60 65 L65 70 Z M5 60 L50 55 L55 60 L50 65 Z M115 60 L70 65 L65 60 L70 55 Z"
        fill="url(#starGrad4)"
        stroke="rgba(255,255,255,0.8)"
        strokeWidth="1"
      />

      {/* Center circle */}
      <circle cx="60" cy="60" r="12" fill="url(#starGrad4)" />
    </svg>
  );
}

// Texto com efeito de escrita - ESPAÇAMENTO CORRIGIDO
function HandwritingTitle({ active }: { active: boolean }) {
  const common: React.SVGProps<SVGPathElement> = {
    fill: "none",
    stroke: "rgba(255,255,255,0.92)",
    strokeWidth: 3.5,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  const base = 0.1;
  const step = 0.13;

  return (
    <svg
      width="360"
      height="95"
      viewBox="0 0 360 95"
      className="block"
      style={{
        filter: "drop-shadow(0 0 12px rgba(200,220,255,0.5))",
      }}
    >
      <defs>
        <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#f0f8ff" />
          <stop offset="100%" stopColor="#e0f0ff" />
        </linearGradient>
      </defs>

      <g stroke="url(#textGrad)">
        {/* K - posição 15 */}
        <WritePath 
          d="M15 20 L15 55 M15 36 L38 20 M15 36 L38 55" 
          style={common} 
          active={active} 
          delaySec={base + step * 0} 
        />
        
        {/* n - posição 55 */}
        <WritePath 
          d="M55 35 L55 55 M55 42 C55 30 70 30 78 38 L78 55" 
          style={common} 
          active={active} 
          delaySec={base + step * 1} 
        />
        
        {/* o - posição 100 */}
        <WritePath 
          d="M115 45 A13 13 0 1 1 115 44.9" 
          style={common} 
          active={active} 
          delaySec={base + step * 2} 
        />
        
        {/* w - posição 150 */}
        <WritePath 
          d="M150 32 L160 55 L175 40 L190 55 L200 32" 
          style={common} 
          active={active} 
          delaySec={base + step * 3} 
        />
        
        {/* Y - posição 220 */}
        <WritePath 
          d="M220 20 L238 42 L238 55 M256 20 L238 42" 
          style={common} 
          active={active} 
          delaySec={base + step * 4} 
        />
        
        {/* O - posição 275 */}
        <WritePath 
          d="M292 37 A17 17 0 1 1 292 36.9" 
          style={common} 
          active={active} 
          delaySec={base + step * 5} 
        />
        
        {/* U - posição 325 */}
        <WritePath 
          d="M325 20 L325 45 C325 55 337 60 350 60 C363 60 375 55 375 45 L375 20" 
          style={common} 
          active={active} 
          delaySec={base + step * 6} 
        />
      </g>

      {/* AI - centralizado abaixo */}
      <g stroke="url(#textGrad)" transform="translate(150, 62)">
        {/* A */}
        <WritePath 
          d="M0 30 L18 5 L36 30 M6 22 L30 22" 
          style={{ ...common, strokeWidth: 3 }} 
          active={active} 
          delaySec={base + step * 7.5} 
        />
        {/* I */}
        <WritePath 
          d="M55 5 L55 30 M48 5 L62 5 M48 30 L62 30" 
          style={{ ...common, strokeWidth: 3 }} 
          active={active} 
          delaySec={base + step * 8.5} 
        />
      </g>

      <style>{`
        @keyframes writeStroke {
          0%   { stroke-dashoffset: var(--dash); opacity: 0.7; }
          100% { stroke-dashoffset: 0; opacity: 1; }
        }
      `}</style>
    </svg>
  );
}

interface WritePathProps {
  d: string;
  style: React.SVGProps<SVGPathElement>;
  active: boolean;
  delaySec: number;
}

function WritePath({ d, style, active, delaySec }: WritePathProps) {
  const dash = 800;

  return (
    <path
      d={d}
      {...style}
      style={{
        strokeDasharray: dash,
        strokeDashoffset: active ? dash : dash,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ["--dash" as any]: dash,
        animation: active ? `writeStroke 0.8s ease forwards ${delaySec}s` : "none",
      }}
    />
  );
}

export default SplashScreen;
