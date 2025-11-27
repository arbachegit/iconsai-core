import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { TooltipIcon } from "@/components/TooltipIcon";

interface SectionProps {
  id: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  reverse?: boolean;
  quote?: string;
  quoteAuthor?: string;
}

const Section = ({ id, title, subtitle, children, reverse = false, quote, quoteAuthor }: SectionProps) => {
  return (
    <section id={id} className="py-8 relative">
      <TooltipIcon sectionId={id} />
      <div className="container mx-auto px-4">
        <div
          className={`grid lg:grid-cols-2 gap-12 items-center ${
            reverse ? "lg:flex-row-reverse" : ""
          }`}
        >
          <div className={`space-y-6 ${reverse ? "lg:order-2" : ""}`}>
            <div className="inline-block px-4 py-1 bg-primary/10 rounded-full border border-primary/20">
              <span className="text-sm text-primary font-medium">{subtitle}</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold">{title}</h2>
            <div className="prose prose-invert max-w-none text-muted-foreground">
              {children}
            </div>
            
            {quote && (
              <blockquote className="mt-6 pt-4 border-t border-primary/20 italic text-gradient">
                "{quote}"
                {quoteAuthor && (
                  <footer className="mt-2 text-sm text-muted-foreground not-italic">
                    — {quoteAuthor}
                  </footer>
                )}
              </blockquote>
            )}
          </div>

          <div className={reverse ? "lg:order-1" : ""}>
            <Card className="p-8 bg-card/50 backdrop-blur-sm border-primary/10 glow-effect-secondary">
              <div className="aspect-square rounded-lg bg-gradient-subtle flex items-center justify-center">
                <div className="text-6xl text-primary/20">
                  {/* Placeholder for visual content */}
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-32 h-32 rounded-full bg-gradient-primary opacity-20 animate-pulse-slow" />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Section;
