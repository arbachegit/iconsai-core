import { supabase } from "@/integrations/supabase/client";

type OperationType = 'INSERT' | 'UPDATE' | 'DELETE' | 'BULK_INSERT';

interface LogIncrementParams {
  operationType: OperationType;
  operationSource: string;
  tablesAffected: string[];
  summary: string;
  details?: Record<string, any>;
}

export const useSystemIncrement = () => {
  const logIncrement = async ({
    operationType,
    operationSource,
    tablesAffected,
    summary,
    details = {}
  }: LogIncrementParams) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.warn("Cannot log increment: no authenticated user");
        return;
      }

      const { error } = await supabase.from("system_increments").insert({
        triggered_by_user_id: user.id,
        triggered_by_email: user.email || "unknown",
        operation_type: operationType,
        operation_source: operationSource,
        tables_affected: tablesAffected,
        summary,
        details
      });

      if (error) {
        console.error("Error logging system increment:", error);
      } else {
        console.log(`✅ System increment logged: ${operationType} on ${tablesAffected.join(", ")}`);
      }
    } catch (error) {
      console.error("Error logging system increment:", error);
    }
  };

  return { logIncrement };
};
