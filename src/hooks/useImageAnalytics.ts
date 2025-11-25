import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ImageAnalytics {
  totalGenerated: number;
  totalSuccess: number;
  totalFailures: number;
  cacheHits: number;
  averageGenerationTime: number;
  successRate: number;
  cacheHitRate: number;
  bySection: Record<string, {
    total: number;
    success: number;
    failures: number;
    avgTime: number;
  }>;
  recentErrors: Array<{
    section_id: string;
    prompt_key: string;
    error_message: string;
    created_at: string;
  }>;
  performanceOverTime: Array<{
    date: string;
    count: number;
    avgTime: number;
  }>;
}

export const useImageAnalytics = () => {
  return useQuery({
    queryKey: ["image-analytics"],
    queryFn: async (): Promise<ImageAnalytics> => {
      // Buscar todos os analytics
      const { data: analytics, error } = await supabase
        .from("image_analytics")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const totalGenerated = analytics?.length || 0;
      const totalSuccess = analytics?.filter(a => a.success).length || 0;
      const totalFailures = totalGenerated - totalSuccess;
      const cacheHits = analytics?.filter(a => a.cached).length || 0;
      
      const successfulGenerations = analytics?.filter(a => a.success && !a.cached) || [];
      const avgTime = successfulGenerations.length > 0
        ? successfulGenerations.reduce((sum, a) => sum + (a.generation_time_ms || 0), 0) / successfulGenerations.length
        : 0;

      const successRate = totalGenerated > 0 ? (totalSuccess / totalGenerated) * 100 : 0;
      const cacheHitRate = totalGenerated > 0 ? (cacheHits / totalGenerated) * 100 : 0;

      // Analytics por seção
      const bySection: Record<string, any> = {};
      analytics?.forEach(a => {
        if (!bySection[a.section_id]) {
          bySection[a.section_id] = { total: 0, success: 0, failures: 0, times: [] };
        }
        bySection[a.section_id].total++;
        if (a.success) bySection[a.section_id].success++;
        else bySection[a.section_id].failures++;
        if (a.generation_time_ms && !a.cached) {
          bySection[a.section_id].times.push(a.generation_time_ms);
        }
      });

      Object.keys(bySection).forEach(key => {
        const times = bySection[key].times;
        bySection[key].avgTime = times.length > 0 
          ? times.reduce((sum: number, t: number) => sum + t, 0) / times.length 
          : 0;
        delete bySection[key].times;
      });

      // Erros recentes
      const recentErrors = analytics
        ?.filter(a => !a.success && a.error_message)
        .slice(0, 10)
        .map(a => ({
          section_id: a.section_id,
          prompt_key: a.prompt_key,
          error_message: a.error_message || "Unknown error",
          created_at: a.created_at || "",
        })) || [];

      // Performance ao longo do tempo (últimos 7 dias)
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const recentAnalytics = analytics?.filter(a => {
        const createdAt = new Date(a.created_at || "");
        return createdAt >= sevenDaysAgo && a.success && !a.cached;
      }) || [];

      const byDay: Record<string, { times: number[], count: number }> = {};
      recentAnalytics.forEach(a => {
        const date = new Date(a.created_at || "").toISOString().split("T")[0];
        if (!byDay[date]) byDay[date] = { times: [], count: 0 };
        byDay[date].count++;
        if (a.generation_time_ms) byDay[date].times.push(a.generation_time_ms);
      });

      const performanceOverTime = Object.entries(byDay)
        .map(([date, data]) => ({
          date,
          count: data.count,
          avgTime: data.times.length > 0 
            ? data.times.reduce((sum, t) => sum + t, 0) / data.times.length 
            : 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        totalGenerated,
        totalSuccess,
        totalFailures,
        cacheHits,
        averageGenerationTime: avgTime,
        successRate,
        cacheHitRate,
        bySection,
        recentErrors,
        performanceOverTime,
      };
    },
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });
};
