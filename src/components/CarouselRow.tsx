import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CarouselRowProps {
  children: React.ReactNode;
  className?: string;
}

export function CarouselRow({ children, className }: CarouselRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [hiddenCount, setHiddenCount] = useState(0);
  
  // Drag-to-scroll states
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollStartLeft, setScrollStartLeft] = useState(0);

  const updateScrollState = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
    
    // Calculate hidden badges on the right
    if (scrollWidth > clientWidth) {
      const children = scrollRef.current.children;
      const visibleEnd = scrollLeft + clientWidth;
      let hiddenOnRight = 0;
      
      for (let i = 0; i < children.length; i++) {
        const child = children[i] as HTMLElement;
        const childRight = child.offsetLeft + child.offsetWidth;
        if (childRight > visibleEnd + 10) {
          hiddenOnRight++;
        }
      }
      setHiddenCount(hiddenOnRight);
    } else {
      setHiddenCount(0);
    }
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', updateScrollState);
      window.addEventListener('resize', updateScrollState);
    }
    return () => {
      if (el) el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [children, updateScrollState]);

  const scrollBy = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.6;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  // Drag-to-scroll handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollStartLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollRef.current.scrollLeft = scrollStartLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    if (isDragging) setIsDragging(false);
  };

  return (
    <div className="relative group">
      {/* Fade na borda esquerda */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-muted/80 to-transparent z-10 pointer-events-none transition-opacity duration-200",
        canScrollLeft ? "opacity-100" : "opacity-0"
      )} />
      
      {/* Seta esquerda */}
      <button
        onClick={() => scrollBy('left')}
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-background/90 border border-primary/40 shadow-md flex items-center justify-center hover:bg-primary/20 transition-all duration-200",
          canScrollLeft ? "opacity-0 group-hover:opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <ChevronLeft className="w-4 h-4 text-primary" />
      </button>

      {/* Container do carrossel com scroll suave */}
      <div
        ref={scrollRef}
        className={cn(
          "flex gap-1.5 items-center overflow-x-auto scrollbar-thin pb-1 px-2 select-none scroll-smooth",
          isDragging ? "cursor-grabbing" : "cursor-grab",
          className
        )}
        style={{ scrollBehavior: 'smooth' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {/* Wrapper para animação de filhos com layout shift suave */}
        {React.Children.map(children, (child, index) => (
          <div 
            key={index}
            className="carousel-badge-item"
            style={{ 
              animationDelay: `${index * 30}ms`,
            }}
          >
            {child}
          </div>
        ))}
      </div>

      {/* Indicador de badges ocultos */}
      {hiddenCount > 0 && canScrollRight && (
        <div className="absolute right-9 top-1/2 -translate-y-1/2 z-15 bg-primary/90 text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md pointer-events-none">
          +{hiddenCount}
        </div>
      )}

      {/* Fade na borda direita */}
      <div className={cn(
        "absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-muted/80 to-transparent z-10 pointer-events-none transition-opacity duration-200",
        canScrollRight ? "opacity-100" : "opacity-0"
      )} />

      {/* Seta direita */}
      <button
        onClick={() => scrollBy('right')}
        className={cn(
          "absolute right-0 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-background/90 border border-primary/40 shadow-md flex items-center justify-center hover:bg-primary/20 transition-all duration-200",
          canScrollRight ? "opacity-0 group-hover:opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <ChevronRight className="w-4 h-4 text-primary" />
      </button>
    </div>
  );
}
