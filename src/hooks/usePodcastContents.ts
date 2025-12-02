import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PodcastContent {
  id: string;
  spotify_episode_id: string;
  title: string;
  description: string;
  display_order: number;
  is_active: boolean;
}

export const usePodcastContents = () => {
  const { data: podcasts, isLoading, error } = useQuery({
    queryKey: ["podcast-contents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("podcast_contents")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as PodcastContent[];
    },
    staleTime: 5 * 60 * 1000,
  });

  return { podcasts, isLoading, error };
};
