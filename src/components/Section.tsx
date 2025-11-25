import { ReactNode, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { TooltipIcon } from "@/components/TooltipIcon";
import { SectionImageCarousel } from "@/components/SectionImageCarousel";

interface SectionProps {
  id: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  reverse?: boolean;
  imageUrl?: string;
  imageAlt?: string;
  priority?: boolean;
  quote?: string;
}

const Section = ({ id, title, subtitle, children, reverse = false, imageUrl, imageAlt, priority = false, quote }: SectionProps) => {
  const quoteRef = useRef<HTMLDivElement>(null);
  const [isQuoteVisible, setIsQuoteVisible] = useState(false);
  const [parallaxOffset, setParallaxOffset] = useState(0);

  useEffect(() => {
    if (!quote || !quoteRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsQuoteVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(quoteRef.current);

    return () => observer.disconnect();
  }, [quote]);

  useEffect(() => {
    if (!quote || !quoteRef.current) return;

    const handleScroll = () => {
      if (!quoteRef.current) return;
      
      const rect = quoteRef.current.getBoundingClientRect();
      const scrollPosition = window.scrollY;
      const elementTop = rect.top + scrollPosition;
      const windowHeight = window.innerHeight;
      
      // Calculate parallax only when element is in viewport
      if (rect.top < windowHeight && rect.bottom > 0) {
        const scrolled = scrollPosition + windowHeight - elementTop;
        const offset = scrolled * 0.08; // Parallax speed factor
        setParallaxOffset(offset);
      }
    };

    handleScroll(); // Initial calculation
    window.addEventListener("scroll", handleScroll, { passive: true });
    
    return () => window.removeEventListener("scroll", handleScroll);
  }, [quote]);

  // Define gradient colors for each section
  const getQuoteGradient = () => {
    switch(id) {
      case "internet":
        return "from-primary via-secondary to-accent";
      case "tech-sem-proposito":
        return "from-secondary via-accent to-primary";
      case "kubrick":
        return "from-accent via-primary to-secondary";
      case "watson":
        return "from-primary via-accent to-secondary";
      case "ia-nova-era":
        return "from-secondary via-primary to-accent";
      default:
        return "from-primary via-secondary to-accent";
    }
  };

  return (
    <section id={id} className="py-8 relative">
      <div className="container mx-auto px-4">
        <div
          className={`grid lg:grid-cols-2 gap-8 items-center ${
            reverse ? "lg:flex-row-reverse" : ""
          }`}
        >
          <div className={`space-y-6 ${reverse ? "lg:order-2" : ""}`}>
            <div className="inline-flex items-center gap-2">
              <div className="px-4 py-1 bg-primary/10 rounded-full border border-primary/20">
                <span className="text-sm text-primary font-medium">{subtitle}</span>
              </div>
              <TooltipIcon sectionId={id} />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold">{title}</h2>
            <div className="prose prose-invert max-w-none text-muted-foreground">
              {children}
            </div>
            {quote && (
              <div 
                ref={quoteRef}
                className={`mt-6 pt-4 border-t border-border/30 transition-opacity duration-1000 ${
                  isQuoteVisible ? 'opacity-100' : 'opacity-0'
                }`}
                style={{
                  transform: `translateY(${-parallaxOffset}px)`,
                  transition: 'transform 0.1s ease-out',
                }}
              >
                <blockquote className={`text-lg md:text-xl italic bg-gradient-to-r ${getQuoteGradient()} bg-clip-text text-transparent font-medium leading-relaxed`}>
                  "{quote}"
                </blockquote>
                <p className="text-xs text-muted-foreground/60 mt-2">by Fernando Arbache</p>
              </div>
            )}
          </div>

          <div className={reverse ? "lg:order-1" : ""}>
            <Card className="p-8 bg-card/50 backdrop-blur-sm border-primary/10 glow-effect-secondary">
              <div className="aspect-square rounded-lg bg-gradient-subtle flex items-center justify-center overflow-hidden">
                <SectionImageCarousel sectionId={id} priority={priority} />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Section;
