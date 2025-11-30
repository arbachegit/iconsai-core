import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Edit2, Save, X, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AdminTitleWithInfo } from "./AdminTitleWithInfo";

interface TooltipContent {
  id: string;
  section_id: string;
  title: string;
  content: string;
  audio_url: string | null;
  is_active: boolean;
}

export const TooltipsTab = () => {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", content: "" });

  const { data: tooltips, refetch } = useQuery({
    queryKey: ["all-tooltips"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tooltip_contents")
        .select("*")
        .order("section_id");

      if (error) throw error;
      return data as TooltipContent[];
    },
  });

  const handleEdit = (tooltip: TooltipContent) => {
    setEditingId(tooltip.id);
    setEditForm({ title: tooltip.title, content: tooltip.content });
  };

  const handleSave = async (id: string) => {
    try {
      const { error } = await supabase
        .from("tooltip_contents")
        .update({
          title: editForm.title,
          content: editForm.content,
        })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Salvo com sucesso",
        description: "O tooltip foi atualizado.",
      });

      setEditingId(null);
      refetch();
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível atualizar o tooltip.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({ title: "", content: "" });
  };

  return (
    <div className="space-y-6">
      <div>
        <AdminTitleWithInfo
          title="Gestão de Tooltips"
          level="h1"
          icon={FileText}
          tooltipText="Edite conteúdo dos tooltips"
          infoContent={
            <>
              <p>Gerencie o conteúdo exibido em cada tooltip das seções do landing page.</p>
              <p className="mt-2">Edite títulos e descrições para melhorar a experiência do usuário.</p>
            </>
          }
        />
        <p className="text-muted-foreground mt-2">
          Edite o conteúdo dos tooltips de cada seção
        </p>
      </div>

      <div className="grid gap-4">
        {tooltips?.map((tooltip) => (
          <Card
            key={tooltip.id}
            className="p-6 bg-card/50 backdrop-blur-sm border-primary/20"
          >
            {editingId === tooltip.id ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Seção: {tooltip.section_id}
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Título
                  </label>
                  <Input
                    value={editForm.title}
                    onChange={(e) =>
                      setEditForm({ ...editForm, title: e.target.value })
                    }
                    className="bg-background/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Conteúdo
                  </label>
                  <Textarea
                    value={editForm.content}
                    onChange={(e) =>
                      setEditForm({ ...editForm, content: e.target.value })
                    }
                    rows={6}
                    className="bg-background/50 resize-none"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleSave(tooltip.id)}
                    className="gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Salvar
                  </Button>
                  <Button variant="ghost" onClick={handleCancel} className="gap-2">
                    <X className="w-4 h-4" />
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">
                      {tooltip.section_id}
                    </div>
                    <h3 className="text-xl font-bold text-foreground">
                      {tooltip.title}
                    </h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(tooltip)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </div>

                <p className="text-muted-foreground line-clamp-3">
                  {tooltip.content}
                </p>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};
