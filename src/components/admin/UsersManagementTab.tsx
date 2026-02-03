/**
 * UsersManagementTab - Gerenciamento de Usuários (tabela profiles)
 * @version 1.0.0
 * @date 2026-01-28
 *
 * Componente para gerenciar usuários diretamente na tabela profiles
 */

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Users,
  UserPlus,
  Loader2,
  Search,
  MoreVertical,
  Mail,
  Phone,
  Shield,
  CheckCircle,
  XCircle,
  Pause,
  Play,
  RefreshCw,
  Briefcase,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CreateUserModal } from "./CreateUserModal";

interface Profile {
  id: string;
  email: string;
  nome: string;
  sobrenome: string | null;
  nome_completo: string;
  avatar_url: string | null;
  telefone: string | null;
  cargo: string | null;
  departamento: string | null;
  instituicao_id: string | null;
  tenant_id: string | null;
  role: "user" | "admin" | "superadmin";
  status: "pending" | "active" | "suspended" | "inactive";
  email_verified: boolean;
  ultimo_acesso: string | null;
  preferencias: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Configurar estas variáveis de ambiente ou passar como props
const SUPABASE_URL = "https://tijadrwimhxlggzxuwna.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpamFkcndpbWh4bGdnenh1d25hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc1Njc4MSwiZXhwIjoyMDg0MzMyNzgxfQ.ustNuvtUB1sYDV8XLKqVU9YlMxtlSPTuLEvmf3DZKPg";

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  active: "Ativo",
  suspended: "Suspenso",
  inactive: "Inativo",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-500",
  active: "bg-green-500/10 text-green-500",
  suspended: "bg-red-500/10 text-red-500",
  inactive: "bg-gray-500/10 text-gray-500",
};

const roleLabels: Record<string, string> = {
  user: "Usuário",
  admin: "Admin",
  superadmin: "Super Admin",
};

export default function UsersManagementTab() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: "suspend" | "activate" | "delete";
    profile: Profile | null;
  }>({ open: false, action: "suspend", profile: null });

  // Fetch profiles
  const fetchProfiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?select=*&order=created_at.desc`,
        {
          headers: {
            apikey: SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          },
        }
      );

      if (!response.ok) throw new Error("Erro ao carregar usuários");

      const data = await response.json();
      setProfiles(data || []);
    } catch (err: any) {
      console.error("[UsersManagementTab] Error:", err);
      toast.error("Erro ao carregar usuários");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // Update profile status
  const updateProfileStatus = async (
    profileId: string,
    newStatus: "active" | "suspended" | "inactive"
  ) => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${profileId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            apikey: SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            status: newStatus,
            updated_at: new Date().toISOString(),
          }),
        }
      );

      if (!response.ok) throw new Error("Erro ao atualizar status");

      toast.success(
        newStatus === "active"
          ? "Usuário ativado com sucesso"
          : newStatus === "suspended"
          ? "Usuário suspenso com sucesso"
          : "Usuário desativado com sucesso"
      );
      await fetchProfiles();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Handle confirm action
  const handleConfirmAction = async () => {
    if (!confirmDialog.profile) return;

    const { action, profile } = confirmDialog;

    if (action === "suspend") {
      await updateProfileStatus(profile.id, "suspended");
    } else if (action === "activate") {
      await updateProfileStatus(profile.id, "active");
    }

    setConfirmDialog({ open: false, action: "suspend", profile: null });
  };

  // Filter profiles
  const filteredProfiles = profiles.filter(
    (profile) =>
      profile.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.cargo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.departamento?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle>Gerenciamento de Usuários</CardTitle>
            </div>
            <Button onClick={() => setCreateModalOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Novo Usuário
            </Button>
          </div>
          <CardDescription>
            Gerencie os usuários do sistema. Crie, edite e controle o acesso dos usuários.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Search and Stats */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email, cargo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="icon" onClick={fetchProfiles}>
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Badge variant="outline">{profiles.length} usuários</Badge>
        <Badge variant="outline" className="bg-green-500/10 text-green-500">
          {profiles.filter((p) => p.status === "active").length} ativos
        </Badge>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Cargo / Depto</TableHead>
                <TableHead>Acesso</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead className="w-16">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProfiles.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{profile.nome_completo || profile.nome}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {profile.id}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3" />
                        <span className="truncate max-w-[180px]">{profile.email}</span>
                        {profile.email_verified && (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        )}
                      </div>
                      {profile.telefone && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {profile.telefone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {profile.cargo && (
                        <div className="flex items-center gap-1 text-sm">
                          <Briefcase className="h-3 w-3" />
                          {profile.cargo}
                        </div>
                      )}
                      {profile.departamento && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Building2 className="h-3 w-3" />
                          {profile.departamento}
                        </div>
                      )}
                      {!profile.cargo && !profile.departamento && (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="flex items-center gap-1 w-fit">
                      <Shield className="h-3 w-3" />
                      {roleLabels[profile.role] || profile.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[profile.status]}>
                      {statusLabels[profile.status] || profile.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatDistanceToNow(new Date(profile.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </div>
                    {profile.ultimo_acesso && (
                      <div className="text-xs text-muted-foreground">
                        Último acesso:{" "}
                        {formatDistanceToNow(new Date(profile.ultimo_acesso), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {profile.status === "active" ? (
                          <DropdownMenuItem
                            onClick={() =>
                              setConfirmDialog({
                                open: true,
                                action: "suspend",
                                profile,
                              })
                            }
                          >
                            <Pause className="h-4 w-4 mr-2" />
                            Suspender
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() =>
                              setConfirmDialog({
                                open: true,
                                action: "activate",
                                profile,
                              })
                            }
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Ativar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filteredProfiles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchTerm
                      ? "Nenhum usuário encontrado com os filtros aplicados"
                      : "Nenhum usuário cadastrado"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create User Modal */}
      <CreateUserModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={fetchProfiles}
        supabaseUrl={SUPABASE_URL}
        serviceRoleKey={SERVICE_ROLE_KEY}
      />

      {/* Confirm Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog((prev) => ({ ...prev, open }))
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === "suspend"
                ? "Suspender Usuário"
                : "Ativar Usuário"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === "suspend"
                ? `Tem certeza que deseja suspender o acesso de ${confirmDialog.profile?.nome_completo}? O usuário não poderá acessar o sistema até ser reativado.`
                : `Tem certeza que deseja ativar o acesso de ${confirmDialog.profile?.nome_completo}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction}>
              {confirmDialog.action === "suspend" ? "Suspender" : "Ativar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
