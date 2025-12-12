import { useState, useCallback } from "react";
import { DebouncedInput } from "@/components/ui/debounced-input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { AdminTitleWithInfo } from "./AdminTitleWithInfo";
import { toast } from "sonner";
import {
  FolderTree,
  Plus,
  Trash2,
  Edit2,
  ChevronDown,
  Search,
  Filter,
  Loader2,
  AlertTriangle,
  BookOpen,
  Heart,
  Globe,
  Shield,
  Hash,
} from "lucide-react";

interface TaxonomyRule {
  id: string;
  rule_type: string;
  rule_value: string;
  domain: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

const RULE_TYPE_INFO = {
  stopword: { label: "Stopwords", icon: AlertTriangle, color: "text-amber-400", description: "Palavras sem valor semântico (preposições, artigos)" },
  generic: { label: "Termos Genéricos", icon: Globe, color: "text-blue-400", description: "Termos muito amplos para classificação" },
  pii_pattern: { label: "Padrões PII", icon: Shield, color: "text-red-400", description: "Padrões de dados pessoais sensíveis" },
  health_term: { label: "Termos de Saúde", icon: Heart, color: "text-pink-400", description: "Vocabulário específico do domínio saúde" },
  study_term: { label: "Termos de Estudo", icon: BookOpen, color: "text-purple-400", description: "Vocabulário específico do domínio estudo" },
  cardinality: { label: "Alta Cardinalidade", icon: Hash, color: "text-orange-400", description: "Padrões que criam muitas categorias únicas" },
};

export const ManageTaxonomyTab = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterDomain, setFilterDomain] = useState<string>("all");
  const [openSections, setOpenSections] = useState<string[]>(["stopword", "generic"]);
  const [editingRule, setEditingRule] = useState<TaxonomyRule | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newRule, setNewRule] = useState({ rule_type: "stopword", rule_value: "", domain: "general", description: "" });

  // Fetch taxonomy rules
  const { data: rules, isLoading } = useQuery({
    queryKey: ["taxonomy-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("taxonomy_rules")
        .select("*")
        .order("rule_type")
        .order("rule_value");

      if (error) throw error;
      return data as TaxonomyRule[];
    },
  });

  // Add rule mutation
  const addRuleMutation = useMutation({
    mutationFn: async (rule: typeof newRule) => {
      const { error } = await supabase.from("taxonomy_rules").insert({
        rule_type: rule.rule_type,
        rule_value: rule.rule_value.toLowerCase().trim(),
        domain: rule.domain,
        description: rule.description || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taxonomy-rules"] });
      toast.success("Regra adicionada com sucesso!");
      setIsAddModalOpen(false);
      setNewRule({ rule_type: "stopword", rule_value: "", domain: "general", description: "" });
    },
    onError: (error: any) => {
      if (error.message?.includes("duplicate")) {
        toast.error("Esta regra já existe!");
      } else {
        toast.error(`Erro ao adicionar regra: ${error.message}`);
      }
    },
  });

  // Update rule mutation
  const updateRuleMutation = useMutation({
    mutationFn: async (rule: TaxonomyRule) => {
      const { error } = await supabase
        .from("taxonomy_rules")
        .update({
          rule_value: rule.rule_value,
          domain: rule.domain,
          description: rule.description,
          is_active: rule.is_active,
        })
        .eq("id", rule.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taxonomy-rules"] });
      toast.success("Regra atualizada!");
      setEditingRule(null);
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  // Delete rule mutation
  const deleteRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase.from("taxonomy_rules").delete().eq("id", ruleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taxonomy-rules"] });
      toast.success("Regra excluída!");
    },
    onError: (error: any) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    },
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  // Filter rules
  const filteredRules = rules?.filter(rule => {
    const matchesSearch = rule.rule_value.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || rule.rule_type === filterType;
    const matchesDomain = filterDomain === "all" || rule.domain === filterDomain;
    return matchesSearch && matchesType && matchesDomain;
  }) || [];

  // Group by type
  const groupedRules = filteredRules.reduce((acc, rule) => {
    if (!acc[rule.rule_type]) acc[rule.rule_type] = [];
    acc[rule.rule_type].push(rule);
    return acc;
  }, {} as Record<string, TaxonomyRule[]>);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <AdminTitleWithInfo
          title="Gerenciar Taxonomia"
          level="h1"
          icon={FolderTree}
          tooltipText="Gerencie regras de validação de taxonomia"
          infoContent={
            <div className="space-y-3">
              <p>Configure regras usadas na validação de parent tags para adoção taxonômica.</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(RULE_TYPE_INFO).map(([key, info]) => (
                  <div key={key} className="flex items-center gap-2">
                    <info.icon className={`h-3 w-3 ${info.color}`} />
                    <span>{info.label}</span>
                  </div>
                ))}
              </div>
            </div>
          }
        />
        <Button onClick={() => setIsAddModalOpen(true)} className="gap-2 bg-cyan-600 hover:bg-cyan-700">
          <Plus className="h-4 w-4" />
          Nova Regra
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <DebouncedInput
              placeholder="Buscar regras..."
              value={searchTerm}
              onChange={setSearchTerm}
              delay={300}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tipos</SelectItem>
              {Object.entries(RULE_TYPE_INFO).map(([key, info]) => (
                <SelectItem key={key} value={key}>{info.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterDomain} onValueChange={setFilterDomain}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Domínio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="general">Geral</SelectItem>
              <SelectItem value="health">Saúde</SelectItem>
              <SelectItem value="study">Estudo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Rules by Type */}
      <div className="space-y-4">
        {Object.entries(RULE_TYPE_INFO).map(([typeKey, typeInfo]) => {
          const typeRules = groupedRules[typeKey] || [];
          const Icon = typeInfo.icon;

          return (
            <Collapsible
              key={typeKey}
              open={openSections.includes(typeKey)}
              onOpenChange={() => toggleSection(typeKey)}
            >
              <Card className="overflow-hidden">
                <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${typeInfo.color}`} />
                    <div className="text-left">
                      <h3 className="font-semibold">{typeInfo.label}</h3>
                      <p className="text-sm text-muted-foreground">{typeInfo.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{typeRules.length} regras</Badge>
                    <ChevronDown className={`h-4 w-4 transition-transform ${openSections.includes(typeKey) ? "rotate-180" : ""}`} />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border-t">
                    {typeRules.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        Nenhuma regra configurada para este tipo
                      </div>
                    ) : (
                      <ScrollArea className="max-h-[400px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Valor</TableHead>
                              <TableHead>Domínio</TableHead>
                              <TableHead>Descrição</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="w-[100px]">Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {typeRules.map((rule) => (
                              <TableRow key={rule.id}>
                                <TableCell className="font-mono">{rule.rule_value}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={
                                    rule.domain === "health" ? "border-pink-500/30 text-pink-400" :
                                    rule.domain === "study" ? "border-purple-500/30 text-purple-400" :
                                    "border-primary/30"
                                  }>
                                    {rule.domain === "health" ? "Saúde" : rule.domain === "study" ? "Estudo" : "Geral"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                  {rule.description || "-"}
                                </TableCell>
                                <TableCell>
                                  <Switch
                                    checked={rule.is_active}
                                    onCheckedChange={(checked) => {
                                      updateRuleMutation.mutate({ ...rule, is_active: checked });
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setEditingRule(rule)}
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-destructive hover:text-destructive"
                                      onClick={() => deleteRuleMutation.mutate(rule.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    )}
                  </div>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>

      {/* Add Rule Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-cyan-400" />
              Nova Regra de Taxonomia
            </DialogTitle>
            <DialogDescription>
              Adicione uma nova regra para validação de parent tags
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo de Regra</Label>
              <Select value={newRule.rule_type} onValueChange={(v) => setNewRule(prev => ({ ...prev, rule_type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RULE_TYPE_INFO).map(([key, info]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <info.icon className={`h-4 w-4 ${info.color}`} />
                        {info.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor</Label>
              <Input
                placeholder={newRule.rule_type === "pii_pattern" ? "Ex: \\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}" : "Ex: documento"}
                value={newRule.rule_value}
                onChange={(e) => setNewRule(prev => ({ ...prev, rule_value: e.target.value }))}
              />
            </div>
            <div>
              <Label>Domínio</Label>
              <Select value={newRule.domain} onValueChange={(v) => setNewRule(prev => ({ ...prev, domain: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Geral</SelectItem>
                  <SelectItem value="health">Saúde</SelectItem>
                  <SelectItem value="study">Estudo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Textarea
                placeholder="Descreva o motivo desta regra..."
                value={newRule.description}
                onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => addRuleMutation.mutate(newRule)}
              disabled={!newRule.rule_value.trim() || addRuleMutation.isPending}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              {addRuleMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Rule Modal */}
      <Dialog open={!!editingRule} onOpenChange={() => setEditingRule(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-cyan-400" />
              Editar Regra
            </DialogTitle>
          </DialogHeader>
          {editingRule && (
            <div className="space-y-4">
              <div>
                <Label>Valor</Label>
                <Input
                  value={editingRule.rule_value}
                  onChange={(e) => setEditingRule(prev => prev ? { ...prev, rule_value: e.target.value } : null)}
                />
              </div>
              <div>
                <Label>Domínio</Label>
                <Select
                  value={editingRule.domain}
                  onValueChange={(v) => setEditingRule(prev => prev ? { ...prev, domain: v } : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">Geral</SelectItem>
                    <SelectItem value="health">Saúde</SelectItem>
                    <SelectItem value="study">Estudo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={editingRule.description || ""}
                  onChange={(e) => setEditingRule(prev => prev ? { ...prev, description: e.target.value } : null)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRule(null)}>Cancelar</Button>
            <Button
              onClick={() => editingRule && updateRuleMutation.mutate(editingRule)}
              disabled={updateRuleMutation.isPending}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              {updateRuleMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageTaxonomyTab;
