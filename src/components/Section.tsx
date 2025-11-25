import { ReactNode } from "react";
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
  return (
    <section id={id} className="py-12 relative">
      <div className="container mx-auto px-4">
        <div
          className={`grid lg:grid-cols-2 gap-12 items-center ${
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
              <div className="mt-8 pt-6 border-t border-border/30">
                <blockquote className="text-lg md:text-xl italic text-muted-foreground">
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
