import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { GitBranch, Loader2 } from "lucide-react";

interface VersionWidgetProps {
  isCollapsed: boolean;
  onNavigateToVersionControl: () => void;
}

export const VersionWidget = ({ isCollapsed, onNavigateToVersionControl }: VersionWidgetProps) => {
  const { data: versionData, isLoading } = useQuery({
    queryKey: ["system-version"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_versions")
        .select("semver, major, minor, patch")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000,
  });

  const currentVersion = versionData?.semver || "1.0.0";

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center gap-2 px-2 py-3 border-t border-border">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-primary/10 transition-colors"
              onClick={onNavigateToVersionControl}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <GitBranch className="h-4 w-4" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            v{currentVersion}
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="px-3 py-3 border-t border-border">
      <button
        onClick={onNavigateToVersionControl}
        className="flex items-center justify-between w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4" />
          <span>Versão</span>
        </div>
        
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <span className="font-mono text-sm font-bold text-primary">
            v{currentVersion}
          </span>
        )}
      </button>
    </div>
  );
};
