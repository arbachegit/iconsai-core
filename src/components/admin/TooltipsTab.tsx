import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Edit2, Save, X, FileText, ChevronDown, Edit3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AdminTitleWithInfo } from "./AdminTitleWithInfo";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TooltipContent {
  id: string;
  section_id: string;
  title: string;
  content: string;
  audio_url: string | null;
  is_active: boolean;
}

interface SectionContent {
  id: string;
  section_id: string;
  header: string | null;
  title: string;
  content: string;
}

export const TooltipsTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", content: "" });
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [editorForm, setEditorForm] = useState({ 
    header: "", 
    title: "", 
    content: "" 
  });

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

  const { data: sectionContents } = useQuery({
    queryKey: ["section-contents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("section_contents")
        .select("*")
        .order("section_id");
      if (error) throw error;
      return data as SectionContent[];
    },
  });

  const saveSectionMutation = useMutation({
    mutationFn: async (data: { section_id: string; header: string; title: string; content: string }) => {
      const { error } = await supabase
        .from("section_contents")
        .update({ 
          header: data.header, 
          title: data.title, 
          content: data.content, 
          updated_at: new Date().toISOString() 
        })
        .eq("section_id", data.section_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["section-contents"] });
      toast({
        title: "Salvo com sucesso",
        description: "Conteúdo da seção foi atualizado.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível atualizar o conteúdo da seção.",
        variant: "destructive",
      });
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

  const handleSectionChange = (sectionId: string) => {
    setSelectedSection(sectionId);
    const section = sectionContents?.find(s => s.section_id === sectionId);
    if (section) {
      setEditorForm({
        header: section.header || "",
        title: section.title,
        content: section.content,
      });
    }
  };

  const handleEditorSave = async () => {
    if (!selectedSection) {
      toast({
        title: "Erro",
        description: "Selecione uma seção para editar",
        variant: "destructive",
      });
      return;
    }
    
    await saveSectionMutation.mutateAsync({
      section_id: selectedSection,
      header: editorForm.header,
      title: editorForm.title,
      content: editorForm.content,
    });
  };

  const handleEditorCancel = () => {
    setIsEditorOpen(false);
    setSelectedSection("");
    setEditorForm({ header: "", title: "", content: "" });
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

      {/* Editor de Conteúdo Colapsável */}
      <Collapsible 
        open={isEditorOpen} 
        onOpenChange={setIsEditorOpen}
        className="mb-6"
      >
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between bg-primary/30 border-2 border-primary hover:bg-primary/50 hover:shadow-lg hover:shadow-primary/40 transition-all duration-300"
          >
            <span className="flex items-center gap-2">
              <Edit3 className="w-5 h-5" />
              Editor de Conteúdo
            </span>
            <ChevronDown 
              className={`w-5 h-5 transition-transform duration-300 ${
                isEditorOpen ? "rotate-180" : ""
              }`}
            />
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="animate-accordion-down">
          <Card className="mt-4 p-6 bg-card/50 backdrop-blur-sm border-primary/20">
            <div className="space-y-6">
              {/* Seletor de Seção */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  SEÇÃO
                </label>
                <Select value={selectedSection} onValueChange={handleSectionChange}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Selecione uma seção para editar" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {sectionContents?.map((section) => (
                      <SelectItem key={section.section_id} value={section.section_id}>
                        {section.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Header Section */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  HEADER
                </label>
                <Card className="p-4 bg-background/50">
                  <Input
                    value={editorForm.header}
                    onChange={(e) =>
                      setEditorForm({ ...editorForm, header: e.target.value })
                    }
                    placeholder="Informações gerais sobre a seção (opcional)"
                    className="bg-background/50"
                    disabled={!selectedSection}
                  />
                </Card>
              </div>

              {/* Título Section */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  TÍTULO
                </label>
                <Input
                  value={editorForm.title}
                  onChange={(e) =>
                    setEditorForm({ ...editorForm, title: e.target.value })
                  }
                  placeholder="Título principal da seção"
                  className="bg-background/50"
                  disabled={!selectedSection}
                />
              </div>

              {/* Conteúdo Section */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  CONTEÚDO
                </label>
                <Textarea
                  value={editorForm.content}
                  onChange={(e) =>
                    setEditorForm({ ...editorForm, content: e.target.value })
                  }
                  placeholder="Conteúdo completo da seção"
                  rows={8}
                  className="bg-background/50 resize-none"
                  disabled={!selectedSection}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={handleEditorSave}
                  className="gap-2"
                  disabled={!selectedSection || saveSectionMutation.isPending}
                >
                  <Save className="w-4 h-4" />
                  {saveSectionMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={handleEditorCancel} 
                  className="gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </Button>
              </div>
            </div>
          </Card>
        </CollapsibleContent>
      </Collapsible>

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
