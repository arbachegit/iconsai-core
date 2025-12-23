import { HelpCircle } from "lucide-react";
import { AGENT_ICONS, AGENT_NAMES, AGENT_COLORS } from "@/lib/pwa-animations";

interface PWABottomBarProps {
  activeSlug: string;
  availableSlugs: string[];
  onSlugChange: (slug: string) => void;
  onHelpClick: () => void;
}

export function PWABottomBar({
  activeSlug,
  availableSlugs,
  onSlugChange,
  onHelpClick,
}: PWABottomBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-lg border-t border-border safe-area-bottom">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Help button */}
        <button
          onClick={onHelpClick}
          className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-muted/50 transition-colors"
          aria-label="Ajuda"
        >
          <HelpCircle className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground hidden sm:inline">Ajuda</span>
        </button>

        {/* Agent slugs */}
        <div className="flex gap-2">
          {availableSlugs.map((slug) => {
            const icon = AGENT_ICONS[slug] || "💬";
            const name = AGENT_NAMES[slug] || slug;
            const isActive = activeSlug === slug;
            const colors = AGENT_COLORS[slug];

            return (
              <button
                key={slug}
                onClick={() => onSlugChange(slug)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? `${colors?.accent || 'bg-primary'} text-white shadow-md scale-105`
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
                aria-pressed={isActive}
              >
                <span className="text-base">{icon}</span>
                <span className="hidden sm:inline">{name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default PWABottomBar;
