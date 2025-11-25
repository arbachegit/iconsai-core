import { useState } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
  aspectRatio?: "square" | "video";
}

export const OptimizedImage = ({
  src,
  alt,
  priority = false,
  className,
  aspectRatio = "square",
}: OptimizedImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Define dimensões baseadas no aspect ratio
  const dimensions = aspectRatio === "square" 
    ? { width: 1024, height: 1024 }
    : { width: 800, height: 450 };

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Placeholder com gradiente animado */}
      {!isLoaded && (
        <div 
          className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/20 to-primary/20 animate-pulse-slow"
          aria-hidden="true"
        />
      )}
      
      {/* Imagem otimizada */}
      <img
        src={src}
        alt={alt}
        width={dimensions.width}
        height={dimensions.height}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        onLoad={() => setIsLoaded(true)}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-500",
          isLoaded ? "opacity-100" : "opacity-0",
          className
        )}
      />
    </div>
  );
};
