import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface CodeChangeParams {
  summary: string;
  filesCreated?: string[];
  filesModified?: string[];
  filesDeleted?: string[];
  changeCategory?: string;
}

export const useCodeChangeLogger = () => {
  const logCodeChange = async ({
    summary,
    filesCreated = [],
    filesModified = [],
    filesDeleted = [],
    changeCategory = "IMPLEMENTATION"
  }: CodeChangeParams) => {
    try {
      const { data, error } = await supabase.functions.invoke('version-control', {
        body: {
          action: 'code_change',
          log_message: summary,
          associated_data: {
            files_created: filesCreated,
            files_modified: filesModified,
            files_deleted: filesDeleted,
            change_summary: summary,
            change_category: changeCategory,
            timestamp: new Date().toISOString()
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Mudança registrada",
        description: `Versão ${data.version} criada com sucesso`,
      });

      return data;
    } catch (error) {
      console.error('Error logging code change:', error);
      toast({
        title: "Erro ao registrar mudança",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
      throw error;
    }
  };

  return { logCodeChange };
};
