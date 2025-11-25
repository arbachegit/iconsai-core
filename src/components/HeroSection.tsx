import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const HeroSection = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Background grid points
    const gridSpacing = 80;
    const gridPoints: Array<{ x: number; y: number }> = [];
    
    for (let x = 0; x < canvas.width; x += gridSpacing) {
      for (let y = 0; y < canvas.height; y += gridSpacing) {
        gridPoints.push({ x, y });
      }
    }

    // Enhanced particles
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      opacity: number;
      pulsePhase: number;
      hue: number;
    }> = [];

    // Create more particles with varied properties
    for (let i = 0; i < 100; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 3 + 1,
        opacity: Math.random() * 0.5 + 0.3,
        pulsePhase: Math.random() * Math.PI * 2,
        hue: 180 + Math.random() * 60, // Blue to purple range
      });
    }

    let animationFrame: number;
    let lastTime = 0;

    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      // Fade effect instead of full clear
      ctx.fillStyle = "rgba(10, 14, 39, 0.1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw static grid in background
      ctx.strokeStyle = "rgba(0, 217, 255, 0.03)";
      ctx.lineWidth = 1;
      
      gridPoints.forEach((point, i) => {
        gridPoints.forEach((otherPoint, j) => {
          if (i >= j) return;
          const dx = point.x - otherPoint.x;
          const dy = point.y - otherPoint.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < gridSpacing * 1.5) {
            ctx.beginPath();
            ctx.moveTo(point.x, point.y);
            ctx.lineTo(otherPoint.x, otherPoint.y);
            ctx.stroke();
          }
        });
      });

      // Draw and update particles
      particles.forEach((particle, index) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.pulsePhase += 0.02;

        // Bounce off edges
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

        // Pulse effect
        const pulseScale = 1 + Math.sin(particle.pulsePhase) * 0.3;
        const currentRadius = particle.radius * pulseScale;
        const currentOpacity = particle.opacity * (0.7 + Math.sin(particle.pulsePhase) * 0.3);

        // Draw particle with glow
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, currentRadius * 3
        );
        gradient.addColorStop(0, `hsla(${particle.hue}, 100%, 50%, ${currentOpacity})`);
        gradient.addColorStop(0.5, `hsla(${particle.hue}, 100%, 50%, ${currentOpacity * 0.3})`);
        gradient.addColorStop(1, `hsla(${particle.hue}, 100%, 50%, 0)`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, currentRadius * 3, 0, Math.PI * 2);
        ctx.fill();

        // Draw connections between nearby particles
        particles.forEach((otherParticle, otherIndex) => {
          if (index >= otherIndex) return;
          
          const dx = particle.x - otherParticle.x;
          const dy = particle.y - otherParticle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            const connectionOpacity = (1 - distance / 150) * 0.2;
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(otherParticle.x, otherParticle.y);
            
            const avgHue = (particle.hue + otherParticle.hue) / 2;
            ctx.strokeStyle = `hsla(${avgHue}, 100%, 50%, ${connectionOpacity})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // Recalculate grid
      gridPoints.length = 0;
      for (let x = 0; x < canvas.width; x += gridSpacing) {
        for (let y = 0; y < canvas.height; y += gridSpacing) {
          gridPoints.push({ x, y });
        }
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ opacity: 0.6 }}
      />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-card/50 backdrop-blur-sm px-4 py-2 rounded-full border border-primary/20">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">
              A Revolução da IA na Saúde
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            Transformando a{" "}
            <span className="text-gradient">Comunicação</span> na Era da
            Inteligência Artificial
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Explore a jornada da evolução tecnológica e descubra como a IA está
            revolucionando a comunicação no setor de saúde com o KnowYOU.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              size="lg"
              className="bg-gradient-primary hover:opacity-90 transition-opacity glow-effect group"
              onClick={() =>
                document.querySelector("#knowyou")?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Fale de saúde com o KnowYOU
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-primary/50 hover:bg-primary/10"
              onClick={() => setIsHistoryModalOpen(true)}
            >
              Explorar a história da IA
            </Button>
          </div>
        </div>
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background pointer-events-none" />

      {/* Modal de História da IA */}
      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold text-gradient">
              A História da Inteligência Artificial
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-8 mt-6">
            {/* Era 1 */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <h3 className="text-xl font-semibold text-primary">
                  1. O Nascimento e a Era Simbólica (1950 – 1970)
                </h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Tudo começou com a pergunta de Alan Turing em 1950: "Máquinas podem pensar?". Em 1956, na histórica Conferência de Dartmouth, o termo "Inteligência Artificial" foi cunhado oficialmente. Nesta fase, a IA era baseada em lógica simbólica: programadores escreviam regras manuais para tudo. O otimismo era exagerado; acreditava-se que uma máquina tão inteligente quanto um humano surgiria em uma geração.
              </p>
              <div className="pl-4 border-l-2 border-primary/30 space-y-2">
                <p className="text-sm"><strong>O Foco:</strong> Resolver problemas lógicos (como damas ou teoremas matemáticos).</p>
                <p className="text-sm"><strong>A Limitação:</strong> As máquinas não aprendiam; elas apenas seguiam regras pré-definidas.</p>
              </div>
            </div>

            {/* Era 2 */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                <h3 className="text-xl font-semibold text-secondary">
                  2. Os Invernos da IA e os Sistemas Especialistas (1970 – 1990)
                </h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Como as promessas iniciais não foram cumpridas, o financiamento secou, levando aos chamados "Invernos da IA". A recuperação veio nos anos 80 com os Sistemas Especialistas. Em vez de tentar imitar um cérebro humano inteiro, criaram-se IAs focadas em domínios ultra-específicos (como diagnosticar doenças do sangue ou aprovar empréstimos) baseadas em árvores de decisão ("Se X acontece, então faça Y").
              </p>
              <div className="pl-4 border-l-2 border-secondary/30 space-y-2">
                <p className="text-sm"><strong>O Foco:</strong> Conhecimento profundo em áreas restritas.</p>
                <p className="text-sm"><strong>A Limitação:</strong> Eram "frágeis". Se algo saísse um pouco do script, o sistema falhava.</p>
              </div>
            </div>

            {/* Era 3 */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <h3 className="text-xl font-semibold text-accent">
                  3. A Era do Machine Learning e Big Data (1990 – 2015)
                </h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                A grande mudança de paradigma: em vez de programar as regras, começamos a programar as máquinas para aprenderem as regras sozinhas analisando dados. Com o "boom" da internet (mais dados disponíveis) e processadores mais potentes, as Redes Neurais (que imitam neurônios biológicos) voltaram com força. Marcos importantes:
              </p>
              <ul className="pl-4 space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1">•</span>
                  <span><strong>1997:</strong> Deep Blue (IBM) vence Garry Kasparov no xadrez (força bruta).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1">•</span>
                  <span><strong>2011:</strong> Watson (IBM) vence no Jeopardy! (processamento de linguagem natural inicial).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1">•</span>
                  <span><strong>2016:</strong> AlphaGo (Google DeepMind) vence o campeão mundial de Go (aprendizado profundo/intuição).</span>
                </li>
              </ul>
            </div>

            {/* Era 4 */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <h3 className="text-xl font-semibold text-gradient">
                  4. A Era Generativa e a Comunicação (2017 – Hoje)
                </h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                O ponto de virada atual ocorreu em 2017, com a publicação do artigo "Attention Is All You Need", que introduziu a arquitetura Transformer. Isso permitiu que as IAs não apenas classificassem dados (dizer se uma foto é de um gato ou cachorro), mas <strong>gerassem</strong> novos conteúdos e compreendessem o contexto da linguagem humana de forma profunda.
              </p>
              <div className="pl-4 border-l-2 border-primary/30 space-y-2">
                <p className="text-sm"><strong>O Foco:</strong> Comunicação, criatividade e compreensão semântica (ChatGPT, Gemini, Claude).</p>
                <p className="text-sm"><strong>A Revolução:</strong> A IA deixou de ser uma ferramenta de bastidores (análise de dados) para se tornar uma interface de conversação direta com o usuário final.</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default HeroSection;
