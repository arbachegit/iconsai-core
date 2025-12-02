import { supabase } from "@/integrations/supabase/client";

type ActionCategory = 
  | "LOGIN" 
  | "LOGOUT" 
  | "DOCUMENT" 
  | "CONFIG" 
  | "CONTENT" 
  | "NAVIGATION" 
  | "RAG" 
  | "EXPORT" 
  | "DELETE"
  | "VERSION"
  | "TAG"
  | "IMAGE";

export const useActivityLogger = () => {
  const logActivity = async (
    action: string,
    category: ActionCategory,
    details?: Record<string, any>
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      await supabase.from("user_activity_logs").insert({
        user_id: user.id,
        user_email: user.email || "unknown",
        user_name: user.user_metadata?.full_name || null,
        action,
        action_category: category,
        details: details || {},
        user_agent: navigator.userAgent
      });
    } catch (error) {
      console.error("Error logging activity:", error);
    }
  };

  return { logActivity };
};
