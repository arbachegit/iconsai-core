import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GitBranch, Rocket, RefreshCw, Clock } from "lucide-react";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const VersionControlTab = () => {
  const [versionDialog, setVersionDialog] = useState<"minor" | "major" | null>(null);
  const [logMessage, setLogMessage] = useState("");
  const queryClient = useQueryClient();

  // Fetch version history
  const { data: versionData, isLoading } = useQuery({
    queryKey: ["version-control"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("version-control", {
        method: "GET",
      });

      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Increment version mutation
  const incrementVersion = useMutation({
    mutationFn: async ({ action, message }: { action: "minor" | "major"; message: string }) => {
      const { data, error } = await supabase.functions.invoke("version-control", {
        body: {
          action,
          log_message: message,
          associated_data: {
            manual_trigger: true,
            triggered_by: "admin",
            timestamp: new Date().toISOString(),
          },
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(
        `Versão atualizada: ${data.previous_version} → ${data.new_version}`
      );
      queryClient.invalidateQueries({ queryKey: ["version-control"] });
      setVersionDialog(null);
      setLogMessage("");
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar versão: ${error.message}`);
    },
  });

  const handleVersionUpdate = (action: "minor" | "major") => {
    if (!logMessage.trim()) {
      toast.error("Por favor, descreva a mudança");
      return;
    }
    incrementVersion.mutate({ action, message: logMessage });
  };

  const getTriggerTypeBadge = (type: string) => {
    const variants = {
      AUTO_PATCH: { variant: "secondary" as const, label: "Auto Patch" },
      MANUAL_MINOR: { variant: "default" as const, label: "Minor" },
      MANUAL_MAJOR: { variant: "destructive" as const, label: "Major" },
      INITIAL: { variant: "outline" as const, label: "Inicial" },
    };
    const config = variants[type as keyof typeof variants] || variants.INITIAL;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentVersion = versionData?.current_version || "0.0.0";
  const history = versionData?.history || [];
  const [major, minor, patch] = currentVersion.split(".");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gradient">Controle de Versão</h2>
          <p className="text-muted-foreground mt-1">
            Sistema de versionamento automático e manual
          </p>
        </div>
      </div>

      {/* Current Version Card */}
      <Card className="p-8 border-primary/20 bg-gradient-to-br from-card to-card/50">
        <div className="text-center space-y-6">
          <h3 className="text-xl font-semibold text-muted-foreground">
            Versão Atual
          </h3>
          
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <div className="text-6xl font-bold text-gradient">{major}</div>
              <div className="text-sm text-muted-foreground mt-2">Major</div>
            </div>
            <div className="text-4xl text-muted-foreground">.</div>
            <div className="text-center">
              <div className="text-6xl font-bold text-gradient">{minor}</div>
              <div className="text-sm text-muted-foreground mt-2">Minor</div>
            </div>
            <div className="text-4xl text-muted-foreground">.</div>
            <div className="text-center">
              <div className="text-6xl font-bold text-gradient">{patch}</div>
              <div className="text-sm text-muted-foreground mt-2">Patch</div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 pt-4">
            <Button
              onClick={() => setVersionDialog("minor")}
              className="gap-2 bg-gradient-primary"
              size="lg"
            >
              <RefreshCw className="h-4 w-4" />
              Versionamento (Minor)
            </Button>
            <Button
              onClick={() => setVersionDialog("major")}
              variant="destructive"
              className="gap-2"
              size="lg"
            >
              <Rocket className="h-4 w-4" />
              Produção (Major)
            </Button>
          </div>
        </div>
      </Card>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 border-secondary/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary/20 rounded-lg">
              <GitBranch className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <div className="text-2xl font-bold">{patch}</div>
              <div className="text-sm text-muted-foreground">Patches Automáticos</div>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-primary/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <RefreshCw className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">{minor}</div>
              <div className="text-sm text-muted-foreground">Releases Minor</div>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-destructive/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive/20 rounded-lg">
              <Rocket className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <div className="text-2xl font-bold">{major}</div>
              <div className="text-sm text-muted-foreground">Versões de Produção</div>
            </div>
          </div>
        </Card>
      </div>

      {/* History Table */}
      <Card className="p-6 border-primary/20">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Histórico de Alterações
        </h3>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Versão</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Mensagem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhum histórico disponível
                  </TableCell>
                </TableRow>
              ) : (
                history.map((record: any) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-mono text-sm">
                      {new Date(record.timestamp).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="font-bold">{record.current_version}</TableCell>
                    <TableCell>{getTriggerTypeBadge(record.trigger_type)}</TableCell>
                    <TableCell className="max-w-md truncate">
                      {record.log_message}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
          <p className="flex items-center gap-2">
            <Badge variant="secondary">Patch</Badge>
            <span className="text-muted-foreground">
              Automático após upload RAG (Z+1)
            </span>
          </p>
          <p className="flex items-center gap-2">
            <Badge variant="default">Minor</Badge>
            <span className="text-muted-foreground">
              Manual - agrupa patches em release (Y+1, Z=0)
            </span>
          </p>
          <p className="flex items-center gap-2">
            <Badge variant="destructive">Major</Badge>
            <span className="text-muted-foreground">
              Manual - versão de produção estável (X+1, Y=0, Z=0)
            </span>
          </p>
        </div>
      </Card>

      {/* Version Update Dialog */}
      <Dialog
        open={versionDialog !== null}
        onOpenChange={(open) => !open && setVersionDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {versionDialog === "minor" ? "Atualização Minor" : "Lançamento Major"}
            </DialogTitle>
            <DialogDescription>
              {versionDialog === "minor"
                ? "Agrupe as mudanças recentes em uma nova release. Isso incrementará o segundo número da versão."
                : "Lance uma nova versão de produção estável. Isso incrementará o primeiro número da versão."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="log-message">Descreva as mudanças</Label>
              <Input
                id="log-message"
                placeholder={
                  versionDialog === "minor"
                    ? "ex: Melhorias no sistema RAG e interface admin"
                    : "ex: Lançamento oficial da plataforma KnowYOU v1.0"
                }
                value={logMessage}
                onChange={(e) => setLogMessage(e.target.value)}
                className="mt-2"
              />
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-1">Versão atual:</p>
              <p className="text-2xl font-bold text-gradient">{currentVersion}</p>
              <p className="text-sm font-medium mt-3 mb-1">Nova versão:</p>
              <p className="text-2xl font-bold text-gradient">
                {versionDialog === "minor"
                  ? `${major}.${parseInt(minor) + 1}.0`
                  : `${parseInt(major) + 1}.0.0`}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setVersionDialog(null);
                setLogMessage("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => handleVersionUpdate(versionDialog!)}
              disabled={!logMessage.trim() || incrementVersion.isPending}
              className="bg-gradient-primary"
            >
              {incrementVersion.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Atualizando...
                </>
              ) : (
                `Confirmar ${versionDialog === "minor" ? "Minor" : "Major"}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
