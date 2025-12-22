import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Check,
  X,
  Edit2,
  RefreshCw,
  CheckCheck,
  XCircle,
  Brain,
  FileText,
  Tag,
  TrendingUp,
  Clock,
  BarChart3,
} from "lucide-react";
import {
  useTagSuggestions,
  useTagFeedbackStats,
  useApproveSuggestion,
  useRejectSuggestion,
  useCorrectSuggestion,
  useBulkApproveSuggestions,
  useBulkRejectSuggestions,
  useTagFeedbackHistory,
  type TagSuggestion,
} from "@/hooks/useTagFeedback";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const percent = Math.round(confidence * 100);
  const variant = percent >= 90 ? "default" : percent >= 70 ? "secondary" : "outline";
  return (
    <Badge variant={variant} className="text-xs">
      {percent}%
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    pending: { variant: "outline", label: "Pendente" },
    approved: { variant: "default", label: "Aprovado" },
    rejected: { variant: "destructive", label: "Rejeitado" },
    corrected: { variant: "secondary", label: "Corrigido" },
  };
  const { variant, label } = config[status] || { variant: "outline", label: status };
  return <Badge variant={variant}>{label}</Badge>;
}

export default function TagSuggestionReviewTab() {
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [correctionModal, setCorrectionModal] = useState<{
    open: boolean;
    suggestion: TagSuggestion | null;
  }>({ open: false, suggestion: null });
  const [correctionTaxonomyId, setCorrectionTaxonomyId] = useState("");
  const [correctionNotes, setCorrectionNotes] = useState("");

  const { data: suggestions, isLoading, refetch } = useTagSuggestions(activeTab);
  const { data: stats } = useTagFeedbackStats();
  const { data: history } = useTagFeedbackHistory();
  const { data: taxonomyList } = useQuery({
    queryKey: ["taxonomy-list-for-correction"],
    queryFn: async () => {
      const { data } = await supabase
        .from("global_taxonomy")
        .select("id, code, name, level")
        .eq("status", "approved")
        .order("code");
      return data || [];
    },
  });

  const approveMutation = useApproveSuggestion();
  const rejectMutation = useRejectSuggestion();
  const correctMutation = useCorrectSuggestion();
  const bulkApproveMutation = useBulkApproveSuggestions();
  const bulkRejectMutation = useBulkRejectSuggestions();

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    if (!suggestions) return;
    if (selectedIds.size === suggestions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(suggestions.map((s) => s.id)));
    }
  };

  const handleBulkApprove = () => {
    if (selectedIds.size === 0) return;
    bulkApproveMutation.mutate(Array.from(selectedIds), {
      onSuccess: () => setSelectedIds(new Set()),
    });
  };

  const handleBulkReject = () => {
    if (selectedIds.size === 0) return;
    bulkRejectMutation.mutate(Array.from(selectedIds), {
      onSuccess: () => setSelectedIds(new Set()),
    });
  };

  const openCorrectionModal = (suggestion: TagSuggestion) => {
    setCorrectionModal({ open: true, suggestion });
    setCorrectionTaxonomyId("");
    setCorrectionNotes("");
  };

  const handleCorrection = () => {
    if (!correctionModal.suggestion || !correctionTaxonomyId) return;
    correctMutation.mutate(
      {
        suggestionId: correctionModal.suggestion.id,
        correctTaxonomyId: correctionTaxonomyId,
        notes: correctionNotes,
      },
      {
        onSuccess: () => {
          setCorrectionModal({ open: false, suggestion: null });
        },
      }
    );
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-card/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Pendentes</p>
                <p className="text-xl font-bold">{stats?.pending_count || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Aprovados</p>
                <p className="text-xl font-bold">{stats?.approved_count || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <X className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-xs text-muted-foreground">Rejeitados</p>
                <p className="text-xl font-bold">{stats?.rejected_count || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Edit2 className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">Corrigidos</p>
                <p className="text-xl font-bold">{stats?.corrected_count || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Taxa Aprovação</p>
                <p className="text-xl font-bold">{stats?.approval_rate || 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Revisão de Sugestões ML
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="pending" className="gap-1">
                  <Clock className="h-3 w-3" />
                  Pendentes
                  {stats?.pending_count ? (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {stats.pending_count}
                    </Badge>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger value="approved">Aprovados</TabsTrigger>
                <TabsTrigger value="rejected">Rejeitados</TabsTrigger>
                <TabsTrigger value="corrected">Corrigidos</TabsTrigger>
                <TabsTrigger value="history">
                  <BarChart3 className="h-3 w-3 mr-1" />
                  Histórico
                </TabsTrigger>
              </TabsList>

              {activeTab === "pending" && selectedIds.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {selectedIds.size} selecionados
                  </span>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={handleBulkApprove}
                    disabled={bulkApproveMutation.isPending}
                  >
                    <CheckCheck className="h-4 w-4 mr-1" />
                    Aprovar Todos
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleBulkReject}
                    disabled={bulkRejectMutation.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Rejeitar Todos
                  </Button>
                </div>
              )}
            </div>

            <TabsContent value="pending" className="mt-0">
              <SuggestionList
                suggestions={suggestions || []}
                isLoading={isLoading}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onSelectAll={selectAll}
                onApprove={(id) => approveMutation.mutate(id)}
                onReject={(id) => rejectMutation.mutate({ suggestionId: id })}
                onCorrect={openCorrectionModal}
                showActions
              />
            </TabsContent>

            <TabsContent value="approved" className="mt-0">
              <SuggestionList
                suggestions={suggestions || []}
                isLoading={isLoading}
              />
            </TabsContent>

            <TabsContent value="rejected" className="mt-0">
              <SuggestionList
                suggestions={suggestions || []}
                isLoading={isLoading}
              />
            </TabsContent>

            <TabsContent value="corrected" className="mt-0">
              <SuggestionList
                suggestions={suggestions || []}
                isLoading={isLoading}
                showCorrection
              />
            </TabsContent>

            <TabsContent value="history" className="mt-0">
              <FeedbackHistory history={history || []} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Correction Modal */}
      <Dialog
        open={correctionModal.open}
        onOpenChange={(open) =>
          !open && setCorrectionModal({ open: false, suggestion: null })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Corrigir Sugestão de Tag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {correctionModal.suggestion && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Sugestão original:</p>
                <p className="font-mono text-sm">
                  {correctionModal.suggestion.suggested_code}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Documento: {correctionModal.suggestion.document?.filename}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Taxonomia correta:</label>
              <Select
                value={correctionTaxonomyId}
                onValueChange={setCorrectionTaxonomyId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a taxonomia correta" />
                </SelectTrigger>
                <SelectContent>
                  {taxonomyList?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <span className="font-mono text-xs mr-2">{t.code}</span>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notas (opcional):</label>
              <Textarea
                value={correctionNotes}
                onChange={(e) => setCorrectionNotes(e.target.value)}
                placeholder="Motivo da correção..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCorrectionModal({ open: false, suggestion: null })}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCorrection}
              disabled={!correctionTaxonomyId || correctMutation.isPending}
            >
              Confirmar Correção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Sub-components
function SuggestionList({
  suggestions,
  isLoading,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onApprove,
  onReject,
  onCorrect,
  showActions = false,
  showCorrection = false,
}: {
  suggestions: TagSuggestion[];
  isLoading: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onSelectAll?: () => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onCorrect?: (suggestion: TagSuggestion) => void;
  showActions?: boolean;
  showCorrection?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <RefreshCw className="h-5 w-5 animate-spin mr-2" />
        Carregando...
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma sugestão encontrada
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-2">
        {showActions && onSelectAll && (
          <div className="flex items-center gap-2 p-2 border-b">
            <Checkbox
              checked={selectedIds?.size === suggestions.length}
              onCheckedChange={onSelectAll}
            />
            <span className="text-sm text-muted-foreground">Selecionar todos</span>
          </div>
        )}

        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            {showActions && onToggleSelect && (
              <Checkbox
                checked={selectedIds?.has(suggestion.id)}
                onCheckedChange={() => onToggleSelect(suggestion.id)}
              />
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="font-mono text-xs">
                  {suggestion.suggested_code}
                </Badge>
                <ConfidenceBadge confidence={suggestion.confidence} />
                {!showActions && <StatusBadge status={suggestion.status} />}
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <FileText className="h-3 w-3" />
                <span className="truncate">
                  {suggestion.document?.filename || suggestion.document_id}
                </span>
              </div>
              {showCorrection && suggestion.corrected_taxonomy && (
                <div className="flex items-center gap-1 mt-1 text-xs text-green-600">
                  <Check className="h-3 w-3" />
                  Corrigido para: {suggestion.corrected_taxonomy.code}
                </div>
              )}
            </div>

            {showActions && onApprove && onReject && onCorrect && (
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                  onClick={() => onApprove(suggestion.id)}
                  title="Aprovar"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-100"
                  onClick={() => onCorrect(suggestion)}
                  title="Corrigir"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-100"
                  onClick={() => onReject(suggestion.id)}
                  title="Rejeitar"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

function FeedbackHistory({ history }: { history: any[] }) {
  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum feedback registrado ainda
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-2">
        {history.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 p-3 border rounded-lg"
          >
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center ${
                item.feedback_type === "approved"
                  ? "bg-green-100 text-green-600"
                  : item.feedback_type === "rejected"
                  ? "bg-red-100 text-red-600"
                  : "bg-amber-100 text-amber-600"
              }`}
            >
              {item.feedback_type === "approved" && <Check className="h-4 w-4" />}
              {item.feedback_type === "rejected" && <X className="h-4 w-4" />}
              {item.feedback_type === "corrected" && <Edit2 className="h-4 w-4" />}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs">{item.original_code}</span>
                {item.feedback_type === "corrected" && item.corrected_code && (
                  <>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-mono text-xs text-green-600">
                      {item.corrected_code}
                    </span>
                  </>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {item.document?.filename} •{" "}
                {new Date(item.created_at).toLocaleDateString("pt-BR")}
              </div>
              {item.admin_notes && (
                <p className="text-xs text-muted-foreground mt-1 italic">
                  "{item.admin_notes}"
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
