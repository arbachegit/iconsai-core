/**
 * UsersManagementTab - Gerenciamento de Usuários
 * @version 3.0.0
 * @date 2026-02-04
 *
 * Usa platform_users para gestão unificada de usuários.
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
  Shield,
  CheckCircle,
  Pause,
  Play,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CreateUserModal } from "./CreateUserModal";
import { listUsers, updateUser, type AdminUser } from "@/services/adminApi";

const roleLabels: Record<string, string> = {
  user: "Usuário",
  admin: "Admin",
  superadmin: "Super Admin",
};

const roleColors: Record<string, string> = {
  user: "bg-blue-500/10 text-blue-500",
  admin: "bg-purple-500/10 text-purple-500",
  superadmin: "bg-amber-500/10 text-amber-500",
};

const statusLabels: Record<string, string> = {
  active: "Ativo",
  pending: "Pendente",
  suspended: "Suspenso",
  inactive: "Inativo",
};

const statusColors: Record<string, string> = {
  active: "bg-green-500/10 text-green-500",
  pending: "bg-yellow-500/10 text-yellow-500",
  suspended: "bg-red-500/10 text-red-500",
  inactive: "bg-gray-500/10 text-gray-500",
};

export default function UsersManagementTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: "suspend" | "activate";
    user: AdminUser | null;
  }>({ open: false, action: "suspend", user: null });

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await listUsers();
      setUsers(result.users || []);
    } catch (err: any) {
      console.error("[UsersManagementTab] Error:", err);
      toast.error(err.message || "Erro ao carregar usuários");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Update user status
  const updateUserStatus = async (userId: string, status: string) => {
    try {
      await updateUser(userId, { status });
      toast.success(
        status === "active" ? "Usuário ativado com sucesso" : "Usuário suspenso com sucesso"
      );
      await fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar status");
    }
  };

  // Handle confirm action
  const handleConfirmAction = async () => {
    if (!confirmDialog.user) return;

    const { action, user } = confirmDialog;

    if (action === "suspend") {
      await updateUserStatus(user.id, "suspended");
    } else if (action === "activate") {
      await updateUserStatus(user.id, "active");
    }

    setConfirmDialog({ open: false, action: "suspend", user: null });
  };

  // Get full name
  const getFullName = (user: AdminUser) => {
    return [user.first_name, user.last_name].filter(Boolean).join(" ") || "-";
  };

  // Filter users
  const filteredUsers = users.filter(
    (user) =>
      user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role?.toLowerCase().includes(searchTerm.toLowerCase())
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
            Gerencie os usuários da plataforma. Crie, edite e controle o acesso.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Search and Stats */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email, tipo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="icon" onClick={fetchUsers}>
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Badge variant="outline">{users.length} usuários</Badge>
        <Badge variant="outline" className="bg-green-500/10 text-green-500">
          {users.filter((u) => u.status === "active").length} ativos
        </Badge>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Acesso</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead className="w-16">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{getFullName(user)}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {user.id}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Mail className="h-3 w-3" />
                      <span className="truncate max-w-[200px]">{user.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`flex items-center gap-1 w-fit ${roleColors[user.role] || ""}`}>
                      <Shield className="h-3 w-3" />
                      {roleLabels[user.role] || user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[user.status] || ""}>
                      {user.status === "active" && <CheckCircle className="h-3 w-3 mr-1" />}
                      {user.status === "suspended" && <Pause className="h-3 w-3 mr-1" />}
                      {statusLabels[user.status] || user.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {user.created_at
                        ? formatDistanceToNow(new Date(user.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })
                        : "-"}
                    </div>
                    {user.last_login_at && (
                      <div className="text-xs text-muted-foreground">
                        Último acesso:{" "}
                        {formatDistanceToNow(new Date(user.last_login_at), {
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
                        {user.status === "active" ? (
                          <DropdownMenuItem
                            onClick={() =>
                              setConfirmDialog({
                                open: true,
                                action: "suspend",
                                user,
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
                                user,
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
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
        onSuccess={fetchUsers}
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
                ? `Tem certeza que deseja suspender o acesso de ${confirmDialog.user ? getFullName(confirmDialog.user) : ""}? O usuário não poderá acessar o sistema até ser reativado.`
                : `Tem certeza que deseja ativar o acesso de ${confirmDialog.user ? getFullName(confirmDialog.user) : ""}?`}
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
