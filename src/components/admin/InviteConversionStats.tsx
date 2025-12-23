import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp } from "lucide-react";

interface ConversionStats {
  total_sent: number;
  total_opened: number;
  total_completed: number;
  conversion_rate: number;
}

export function InviteConversionStats() {
  const [stats, setStats] = useState<ConversionStats>({
    total_sent: 0,
    total_opened: 0,
    total_completed: 0,
    conversion_rate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();

    // Update every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from("user_invitations")
        .select("status, first_opened_at");

      if (error) throw error;

      const total_sent = data?.length || 0;
      const total_opened = data?.filter((i) => i.first_opened_at).length || 0;
      const total_completed = data?.filter((i) => i.status === "completed").length || 0;
      const conversion_rate = total_sent > 0 ? (total_completed / total_sent) * 100 : 0;

      setStats({ total_sent, total_opened, total_completed, conversion_rate });
    } catch (err) {
      console.error("Error fetching conversion stats:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || stats.total_sent === 0) return null;

  const openedRate = stats.total_sent > 0 ? (stats.total_opened / stats.total_sent) * 100 : 0;
  const conversionWidth = Math.min(stats.conversion_rate, 100);
  const openedWidth = Math.min(openedRate, 100);

  return (
    <div className="flex items-center gap-3 text-sm">
      {/* Conversion count */}
      <div className="flex items-center gap-1.5">
        <TrendingUp className="h-4 w-4 text-emerald-500" />
        <span className="font-semibold text-cyan-400">
          {stats.total_completed.toLocaleString("pt-BR")}
        </span>
      </div>

      {/* Progress bar container */}
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">0%</span>
          
          <div className="relative w-24 h-2 bg-muted/30 rounded-full overflow-hidden">
            {/* Opened but not converted (gray) */}
            <div
              className="absolute inset-y-0 left-0 bg-muted-foreground/30 transition-all duration-500"
              style={{ width: `${openedWidth}%` }}
            />
            
            {/* Converted (gradient) */}
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${conversionWidth}%` }}
            />
          </div>
          
          <span className="text-xs text-muted-foreground">100%</span>
        </div>
        
        {/* Sent count */}
        <span className="text-[10px] text-muted-foreground text-center">
          ({stats.total_sent.toLocaleString("pt-BR")} enviados)
        </span>
      </div>

      {/* Conversion percentage */}
      <span className="font-semibold text-emerald-400">
        {stats.conversion_rate.toFixed(1)}%
      </span>
    </div>
  );
}
