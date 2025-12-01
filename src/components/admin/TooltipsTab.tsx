import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Edit2, Save, X, FileText, ChevronDown, Edit3, ChevronUp, Download, Upload, Eye, EyeOff, History, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AdminTitleWithInfo } from "./AdminTitleWithInfo";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

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

interface SectionVersion {
  id: string;
  section_id: string;
  header: string | null;
  title: string;
  content: string;
  version_number: number;
  change_description: string | null;
  created_at: string;
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
  const [showPreview, setShowPreview] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const { data: versions = [] } = useQuery({
    queryKey: ["section-versions", selectedSection],
    queryFn: async () => {
      if (!selectedSection) return [];
      
      const { data, error } = await supabase
        .from("section_content_versions")
        .select("*")
        .eq("section_id", selectedSection)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as SectionVersion[];
    },
    enabled: !!selectedSection,
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

      // Create version entry
      const { data: lastVersion } = await supabase
        .from("section_content_versions")
        .select("version_number")
        .eq("section_id", data.section_id)
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      await supabase
        .from("section_content_versions")
        .insert({
          section_id: data.section_id,
          header: data.header,
          title: data.title,
          content: data.content,
          version_number: (lastVersion?.version_number || 0) + 1,
          change_description: "Atualização manual via admin"
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["section-contents"] });
      queryClient.invalidateQueries({ queryKey: ["section-versions"] });
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

  const handleExport = async () => {
    const { data, error } = await supabase
      .from("section_contents")
      .select("*");

    if (error) {
      toast({
        title: "Erro ao exportar",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `section-contents-${format(new Date(), "yyyy-MM-dd-HHmm")}.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Exportação concluída",
      description: "Arquivo JSON baixado com sucesso.",
    });
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importedData = JSON.parse(text) as SectionContent[];

      for (const section of importedData) {
        await supabase
          .from("section_contents")
          .update({
            header: section.header,
            title: section.title,
            content: section.content,
          })
          .eq("section_id", section.section_id);
      }

      queryClient.invalidateQueries({ queryKey: ["section-contents"] });
      toast({
        title: "Importação concluída",
        description: `${importedData.length} seções foram atualizadas.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao importar",
        description: "Arquivo JSON inválido.",
        variant: "destructive",
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRestoreVersion = async (version: SectionVersion) => {
    await supabase
      .from("section_contents")
      .update({
        header: version.header,
        title: version.title,
        content: version.content,
      })
      .eq("section_id", version.section_id);

    queryClient.invalidateQueries({ queryKey: ["section-contents"] });
    setSelectedSection(version.section_id);
    setEditorForm({
      header: version.header || "",
      title: version.title,
      content: version.content,
    });
    
    toast({
      title: "Versão restaurada",
      description: `Versão ${version.version_number} foi restaurada.`,
    });
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
              {/* Import/Export Buttons */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar JSON
                </Button>
                <Button variant="outline" size="sm" onClick={handleImport}>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar JSON
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Seletor de Seção */}
              <div className="space-y-2">
                <Label htmlFor="section-select" className="text-sm font-medium text-muted-foreground">
                  SEÇÃO
                </Label>
                <Select value={selectedSection} onValueChange={handleSectionChange}>
                  <SelectTrigger id="section-select" className="bg-background/50">
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
                <Label htmlFor="editor-header" className="text-sm font-medium text-muted-foreground">
                  HEADER
                </Label>
                <Card className="p-4 bg-background/50">
                  <Input
                    id="editor-header"
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
                <Label htmlFor="editor-title" className="text-sm font-medium text-muted-foreground">
                  TÍTULO
                </Label>
                <Input
                  id="editor-title"
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="editor-content" className="text-sm font-medium text-muted-foreground">
                    CONTEÚDO
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                    disabled={!selectedSection}
                  >
                    {showPreview ? (
                      <>
                        <EyeOff className="h-4 w-4 mr-2" />
                        Ocultar Preview
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Preview
                      </>
                    )}
                  </Button>
                </div>
                <Textarea
                  id="editor-content"
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

              {/* Preview */}
              {showPreview && editorForm.content && (
                <Card className="p-6 bg-muted/50">
                  <h4 className="text-sm font-semibold mb-4 text-muted-foreground">Preview em Tempo Real</h4>
                  <div className="space-y-4">
                    {editorForm.header && (
                      <div className="inline-block px-4 py-1 bg-primary/10 rounded-full border border-primary/20">
                        <span className="text-sm text-primary font-medium">{editorForm.header}</span>
                      </div>
                    )}
                    {editorForm.title && (
                      <h2 className="text-3xl md:text-4xl font-bold">{editorForm.title}</h2>
                    )}
                    <div className="prose prose-invert max-w-none text-muted-foreground">
                      <p className="whitespace-pre-wrap">{editorForm.content}</p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Version History */}
              {selectedSection && versions.length > 0 && (
                <Collapsible open={showVersions} onOpenChange={setShowVersions}>
                  <Card className="p-4 bg-muted/30">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-between">
                        <div className="flex items-center gap-2">
                          <History className="h-4 w-4" />
                          <span>Histórico de Versões ({versions.length})</span>
                        </div>
                        {showVersions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-4 space-y-2">
                      {versions.map((version) => (
                        <div
                          key={version.id}
                          className="flex items-center justify-between p-3 bg-background rounded-lg border"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">v{version.version_number}</span>
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(version.created_at), "dd/MM/yyyy HH:mm")}
                              </span>
                            </div>
                            {version.change_description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {version.change_description}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRestoreVersion(version)}
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Restaurar
                          </Button>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              )}

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