import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { GitBranch, Plus, Loader2 } from "lucide-react";
import { QuickVersionModal } from "./QuickVersionModal";

interface VersionWidgetProps {
  isCollapsed: boolean;
  onNavigateToVersionControl: () => void;
}

export const VersionWidget = ({ isCollapsed, onNavigateToVersionControl }: VersionWidgetProps) => {
  const [quickModalOpen, setQuickModalOpen] = useState(false);

  const { data: versionData, isLoading } = useQuery({
    queryKey: ["current-version"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("version-control", {
        method: "GET",
      });
      if (error) throw error;
      return data;
    },
    refetchInterval: 60000, // Refetch every minute
  });

  const currentVersion = versionData?.current_version || "0.0.0";

  if (isCollapsed) {
    return (
      <>
        <div className="flex flex-col items-center gap-2 px-2 py-3 border-t border-border">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full hover:bg-primary/10"
                onClick={onNavigateToVersionControl}
              >
                <GitBranch className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              Versão: {currentVersion}
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full hover:bg-green-500/20 text-green-500"
                onClick={() => setQuickModalOpen(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              Registrar Implementação
            </TooltipContent>
          </Tooltip>
        </div>

        <QuickVersionModal open={quickModalOpen} onOpenChange={setQuickModalOpen} />
      </>
    );
  }

  return (
    <>
      <div className="px-3 py-3 border-t border-border space-y-2">
        <div className="flex items-center justify-between">
          <button
            onClick={onNavigateToVersionControl}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <GitBranch className="h-4 w-4" />
            <span>Versão</span>
          </button>
          
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <span className="font-mono text-sm font-bold text-primary">
              v{currentVersion}
            </span>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 text-xs h-8 border-green-500/30 text-green-500 hover:bg-green-500/10 hover:text-green-400"
          onClick={() => setQuickModalOpen(true)}
        >
          <Plus className="h-3 w-3" />
          Registrar Implementação
        </Button>
      </div>

      <QuickVersionModal open={quickModalOpen} onOpenChange={setQuickModalOpen} />
    </>
  );
};
