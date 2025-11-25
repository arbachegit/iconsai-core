import { useEffect, useRef, useState } from "react";

const TuringLegacy = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [parallaxOffset, setParallaxOffset] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(sectionRef.current);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!sectionRef.current) return;

    const handleScroll = () => {
      if (!sectionRef.current) return;
      
      const rect = sectionRef.current.getBoundingClientRect();
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
  }, []);

  return (
    <section className="py-10 border-t border-border/50">
      <div className="container mx-auto px-4">
        <div 
          ref={sectionRef}
          className={`max-w-4xl mx-auto text-center space-y-6 transition-opacity duration-1000 ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gradient">O Legado de Turing</h2>
          <blockquote className="text-xl md:text-2xl italic bg-gradient-to-r from-accent via-secondary to-primary bg-clip-text text-transparent font-medium leading-relaxed">
            "Muito antes de falarmos com computadores, ele ousou perguntar se eles poderiam pensar. Decifrar o Enigma venceu a guerra, mas o 'Jogo da Imitação' venceu o tempo."
          </blockquote>
          <p className="text-xs text-muted-foreground/60">by Fernando Arbache</p>
        </div>
      </div>
    </section>
  );
};

export default TuringLegacy;
