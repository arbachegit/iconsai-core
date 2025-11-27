import { useEffect, useState } from "react";
import { Clock, Baby, Users, GraduationCap, Rocket, Bot, Sparkles, Snowflake, Skull, Crown, Home, Cat, Lightbulb } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Era {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  colorFrom: string;
  colorTo: string;
  items: Array<{
    icon: React.ComponentType<{ className?: string }>;
    text: string;
  }>;
}

interface MobileHistoryCarouselProps {
  eras: Era[];
  currentEraId: string;
  eraImages: Record<string, string>;
  loadingImages: boolean;
  onEraSelect?: (eraId: string) => void;
}

export const MobileHistoryCarousel = ({
  eras,
  currentEraId,
  eraImages,
  loadingImages,
  onEraSelect,
}: MobileHistoryCarouselProps) => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  // Auto-scroll quando o currentEraId muda
  useEffect(() => {
    if (!api) return;
    const eraIndex = eras.findIndex((era) => era.id === currentEraId);
    if (eraIndex !== -1 && eraIndex !== current) {
      api.scrollTo(eraIndex);
    }
  }, [currentEraId, api, eras, current]);

  return (
    <div className="w-full h-full flex flex-col">
      <Carousel setApi={setApi} className="w-full flex-1">
        <CarouselContent>
          {eras.map((era) => {
            const Icon = era.icon;
            return (
              <CarouselItem key={era.id}>
                <Card className="border-none bg-transparent">
                  <div className="p-6 space-y-4">
                    {/* Imagem da era */}
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted/50">
                      {loadingImages ? (
                        <Skeleton className="w-full h-full" />
                      ) : eraImages[era.id] ? (
                        <img
                          src={eraImages[era.id]}
                          alt={era.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Icon className="w-16 h-16 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>

                    {/* Ícone e título */}
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
                        style={{
                          background: `linear-gradient(to bottom right, hsl(var(--${era.colorFrom})), hsl(var(--${era.colorTo})))`,
                        }}
                      >
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3
                          className="text-lg font-bold bg-clip-text text-transparent"
                          style={{
                            backgroundImage: `linear-gradient(to right, hsl(var(--${era.colorFrom})), hsl(var(--${era.colorTo})))`,
                          }}
                        >
                          {era.title}
                        </h3>
                        <p className="text-xs text-muted-foreground italic">{era.subtitle}</p>
                      </div>
                    </div>

                    {/* Items da era */}
                    <ul className="space-y-3 text-sm">
                      {era.items.map((item, idx) => {
                        const ItemIcon = item.icon;
                        return (
                          <li key={idx} className="flex gap-3">
                            <ItemIcon className={`w-4 h-4 flex-shrink-0 mt-0.5 text-${era.colorFrom}`} />
                            <div>{item.text}</div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </Card>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious className="left-2" />
        <CarouselNext className="right-2" />
      </Carousel>

      {/* Dot indicators com ícones */}
      <div className="flex justify-center gap-2 py-4">
        {eras.map((era, index) => {
          const Icon = era.icon;
          return (
            <button
              key={era.id}
              onClick={() => {
                api?.scrollTo(index);
                onEraSelect?.(era.id);
              }}
              className={cn(
                "rounded-full transition-all flex items-center justify-center",
                index === current 
                  ? "w-8 h-8 bg-primary" 
                  : "w-6 h-6 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
              aria-label={`Ir para ${era.title}`}
            >
              {index === current && <Icon className="w-4 h-4 text-primary-foreground" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
