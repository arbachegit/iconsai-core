import { ReactNode, useEffect, useRef, useState } from "react";

interface ParallaxSectionProps {
  children: ReactNode;
  speed?: number; // Intensidade do parallax (0.1 = suave, 0.5 = forte)
}

export const ParallaxSection = ({ children, speed = 0.15 }: ParallaxSectionProps) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;

      const rect = sectionRef.current.getBoundingClientRect();
      const scrollPosition = window.scrollY;
      const elementTop = rect.top + scrollPosition;
      const elementHeight = rect.height;
      const windowHeight = window.innerHeight;

      // Calcular offset quando a seção está visível
      if (rect.top < windowHeight && rect.bottom > 0) {
        const scrolled = scrollPosition + windowHeight - elementTop;
        const parallaxOffset = scrolled * speed;
        setOffset(parallaxOffset);
      }
    };

    handleScroll(); // Calcular offset inicial
    window.addEventListener("scroll", handleScroll, { passive: true });
    
    return () => window.removeEventListener("scroll", handleScroll);
  }, [speed]);

  return (
    <div ref={sectionRef} className="relative">
      <div
        style={{
          transform: `translateY(${-offset}px)`,
          transition: "transform 0.1s ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
};
