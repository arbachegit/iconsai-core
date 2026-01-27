/**
 * InstitutionUsersTab - Manage Institution Users
 * @version 1.0.0
 * @date 2026-01-28
 *
 * Admin component for managing:
 * - List users of the institution
 * - Invite new users
 * - Validate email domain
 * - Manage user status (suspend/reactivate)
 */

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Users, UserPlus, Loader2, Send, Search, MoreVertical,
  Mail, Phone, Shield, Calendar, Clock, CheckCircle, XCircle,
  Pause, Play, RefreshCw, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface User {
  id: string;
  auth_user_id: string | null;
  first_name: string;
  last_name: string | null;
  full_name: string;
  email: string;
  phone: string;
  role: "user" | "admin" | "superadmin";
  status: "pending" | "active" | "suspended" | "inactive";
  email_verified: boolean;
  phone_verified: boolean;
  last_login_at: string | null;
  login_count: number;
  created_at: string;
  department?: { name: string } | null;
}

interface Invite {
  id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string | null;
  role: string;
  status: string;
  email_sent_at: string | null;
  whatsapp_sent_at: string | null;
  link_opened_at: string | null;
  expires_at: string;
  created_at: string;
}

interface Department {
  id: string;
  name: string;
  slug: string;
}

interface InviteFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: "user" | "admin";
  department_id: string;
}

const initialInviteForm: InviteFormData = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  role: "user",
  department_id: "",
};

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  active: "Ativo",
  suspended: "Suspenso",
  inactive: "Inativo",
  sent: "Enviado",
  opened: "Aberto",
  verified: "Verificado",
  completed: "Completo",
  expired: "Expirado",
  cancelled: "Cancelado",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-500",
  active: "bg-green-500/10 text-green-500",
  suspended: "bg-red-500/10 text-red-500",
  inactive: "bg-gray-500/10 text-gray-500",
  sent: "bg-blue-500/10 text-blue-500",
  opened: "bg-purple-500/10 text-purple-500",
  verified: "bg-cyan-500/10 text-cyan-500",
  completed: "bg-green-500/10 text-green-500",
  expired: "bg-orange-500/10 text-orange-500",
  cancelled: "bg-gray-500/10 text-gray-500",
};

export default function InstitutionUsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [currentInstitution, setCurrentInstitution] = useState<{ id: string; name: string; email_domains: string[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteFormData>(initialInviteForm);
  const [domainError, setDomainError] = useState<string | null>(null);

  // Get current user's institution
  const fetchCurrentUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: platformUser } = await supabase
      .from("platform_users")
      .select("institution_id, role")
      .eq("auth_user_id", user.id)
      .single();

    if (platformUser?.institution_id) {
      const { data: institution } = await supabase
        .from("institutions")
        .select("id, name, email_domains")
        .eq("id", platformUser.institution_id)
        .single();

      if (institution) {
        setCurrentInstitution(institution);
        return institution.id;
      }
    }
    return null;
  }, []);

  // Fetch users
  const fetchUsers = useCallback(async (institutionId: string) => {
    const { data, error } = await supabase
      .from("platform_users")
      .select(`
        *,
        department:departments(name)
      `)
      .eq("institution_id", institutionId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    setUsers(data || []);
  }, []);

  // Fetch invites
  const fetchInvites = useCallback(async (institutionId: string) => {
    const { data, error } = await supabase
      .from("user_invites")
      .select("*")
      .eq("institution_id", institutionId)
      .in("status", ["pending", "sent", "opened", "verified"])
      .order("created_at", { ascending: false });

    if (error) throw error;
    setInvites(data || []);
  }, []);

  // Fetch departments
  const fetchDepartments = useCallback(async (institutionId: string) => {
    const { data, error } = await supabase
      .from("departments")
      .select("id, name, slug")
      .eq("institution_id", institutionId)
      .eq("is_active", true)
      .order("name");

    if (error) throw error;
    setDepartments(data || []);
  }, []);

  // Initial load
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const institutionId = await fetchCurrentUser();
        if (institutionId) {
          await Promise.all([
            fetchUsers(institutionId),
            fetchInvites(institutionId),
            fetchDepartments(institutionId),
          ]);
        }
      } catch (err) {
        console.error("[InstitutionUsersTab] Error:", err);
        toast.error("Erro ao carregar dados");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [fetchCurrentUser, fetchUsers, fetchInvites, fetchDepartments]);

  // Validate email domain
  const validateEmailDomain = (email: string): boolean => {
    if (!currentInstitution?.email_domains.length) return true;

    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain) return false;

    return currentInstitution.email_domains.some(
      (d) => d.toLowerCase() === domain
    );
  };

  // Handle email change with domain validation
  const handleEmailChange = (email: string) => {
    setInviteForm((prev) => ({ ...prev, email }));

    if (email && email.includes("@")) {
      if (!validateEmailDomain(email)) {
        setDomainError(
          `Domínio não permitido. Use: ${currentInstitution?.email_domains.join(", ")}`
        );
      } else {
        setDomainError(null);
      }
    } else {
      setDomainError(null);
    }
  };

  // Send invite
  const sendInvite = async () => {
    if (!inviteForm.first_name || !inviteForm.email || !inviteForm.phone) {
      toast.error("Preencha nome, email e telefone");
      return;
    }

    if (domainError) {
      toast.error("Email com domínio inválido");
      return;
    }

    if (!currentInstitution) {
      toast.error("Instituição não encontrada");
      return;
    }

    setIsSending(true);
    try {
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      const { data: platformUser } = await supabase
        .from("platform_users")
        .select("id")
        .eq("auth_user_id", user?.id)
        .single();

      const response = await supabase.functions.invoke("send-invite", {
        body: {
          email: inviteForm.email,
          phone: inviteForm.phone,
          firstName: inviteForm.first_name,
          lastName: inviteForm.last_name || null,
          institutionId: currentInstitution.id,
          departmentId: inviteForm.department_id || null,
          role: inviteForm.role,
          invitedBy: platformUser?.id,
        },
      });

      if (response.error) throw response.error;
      if (!response.data?.success) throw new Error(response.data?.error || "Erro ao enviar convite");

      toast.success("Convite enviado com sucesso!");
      setInviteDialogOpen(false);
      setInviteForm(initialInviteForm);
      await fetchInvites(currentInstitution.id);
    } catch (err: any) {
      console.error("[InstitutionUsersTab] Invite error:", err);
      toast.error(`Erro: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  // Resend invite
  const resendInvite = async (invite: Invite) => {
    if (!currentInstitution) return;

    try {
      // First resend via RPC
      const { error: resendError } = await supabase.rpc("resend_invite", {
        p_invite_id: invite.id,
      });

      if (resendError) throw resendError;

      // Then send notifications again
      await supabase.functions.invoke("send-invite", {
        body: {
          email: invite.email,
          phone: invite.phone,
          firstName: invite.first_name,
          lastName: invite.last_name,
          institutionId: currentInstitution.id,
          role: invite.role,
        },
      });

      toast.success("Convite reenviado");
      await fetchInvites(currentInstitution.id);
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  // Cancel invite
  const cancelInvite = async (invite: Invite) => {
    if (!currentInstitution) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: platformUser } = await supabase
        .from("platform_users")
        .select("id")
        .eq("auth_user_id", user?.id)
        .single();

      await supabase.rpc("cancel_invite", {
        p_invite_id: invite.id,
        p_cancelled_by: platformUser?.id,
        p_reason: "Cancelado pelo administrador",
      });

      toast.success("Convite cancelado");
      await fetchInvites(currentInstitution.id);
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  // Suspend user
  const suspendUser = async (user: User) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const { data: currentPlatformUser } = await supabase
        .from("platform_users")
        .select("id")
        .eq("auth_user_id", authUser?.id)
        .single();

      const { error } = await supabase
        .from("platform_users")
        .update({
          status: "suspended",
          suspended_at: new Date().toISOString(),
          suspended_by: currentPlatformUser?.id,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success(`${user.full_name} foi suspenso`);
      if (currentInstitution) await fetchUsers(currentInstitution.id);
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  // Reactivate user
  const reactivateUser = async (user: User) => {
    try {
      const { error } = await supabase
        .from("platform_users")
        .update({
          status: "active",
          suspended_at: null,
          suspended_by: null,
          suspension_reason: null,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success(`${user.full_name} foi reativado`);
      if (currentInstitution) await fetchUsers(currentInstitution.id);
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  // Filter users
  const filteredUsers = users.filter(
    (user) =>
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter invites
  const filteredInvites = invites.filter(
    (invite) =>
      invite.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invite.email.toLowerCase().includes(searchTerm.toLowerCase())
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

  if (!currentInstitution) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Você não está vinculado a nenhuma instituição.
          </p>
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
              <CardTitle>Usuários - {currentInstitution.name}</CardTitle>
            </div>
            <Button onClick={() => setInviteDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Convidar Usuário
            </Button>
          </div>
          <CardDescription>
            Gerencie os usuários da sua instituição.
            {currentInstitution.email_domains.length > 0 && (
              <span className="block mt-1">
                Domínios permitidos: {currentInstitution.email_domains.map((d) => `@${d}`).join(", ")}
              </span>
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar usuários..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="outline">
          {users.length} usuários
        </Badge>
        <Badge variant="outline">
          {invites.length} convites pendentes
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Usuários ({filteredUsers.length})</TabsTrigger>
          <TabsTrigger value="invites">Convites Pendentes ({filteredInvites.length})</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Último Acesso</TableHead>
                    <TableHead className="w-16">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.full_name}</div>
                          {user.department && (
                            <div className="text-xs text-muted-foreground">
                              {user.department.name}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3" />
                            {user.email}
                            {user.email_verified && (
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {user.phone}
                            {user.phone_verified && (
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                          <Shield className="h-3 w-3" />
                          {user.role === "admin" ? "Admin" : "Usuário"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[user.status]}>
                          {statusLabels[user.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.last_login_at ? (
                          <div className="text-sm">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(user.last_login_at), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {user.login_count} acessos
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Nunca</span>
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
                              <DropdownMenuItem onClick={() => suspendUser(user)}>
                                <Pause className="h-4 w-4 mr-2" />
                                Suspender
                              </DropdownMenuItem>
                            ) : user.status === "suspended" ? (
                              <DropdownMenuItem onClick={() => reactivateUser(user)}>
                                <Play className="h-4 w-4 mr-2" />
                                Reativar
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhum usuário encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invites Tab */}
        <TabsContent value="invites">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Convidado</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Enviado</TableHead>
                    <TableHead className="w-16">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvites.map((invite) => (
                    <TableRow key={invite.id}>
                      <TableCell>
                        <div className="font-medium">
                          {invite.first_name} {invite.last_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3" />
                            {invite.email}
                            {invite.email_sent_at && (
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {invite.phone}
                            {invite.whatsapp_sent_at && (
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {invite.role === "admin" ? "Admin" : "Usuário"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[invite.status]}>
                          {statusLabels[invite.status]}
                        </Badge>
                        {invite.link_opened_at && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Link aberto
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDistanceToNow(new Date(invite.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Expira {formatDistanceToNow(new Date(invite.expires_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => resendInvite(invite)}>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Reenviar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => cancelInvite(invite)}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancelar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredInvites.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhum convite pendente
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Convidar Usuário
            </DialogTitle>
            <DialogDescription>
              Envie um convite para um novo usuário da sua instituição.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Nome *</Label>
                <Input
                  id="first_name"
                  value={inviteForm.first_name}
                  onChange={(e) =>
                    setInviteForm((prev) => ({ ...prev, first_name: e.target.value }))
                  }
                  placeholder="Nome"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Sobrenome</Label>
                <Input
                  id="last_name"
                  value={inviteForm.last_name}
                  onChange={(e) =>
                    setInviteForm((prev) => ({ ...prev, last_name: e.target.value }))
                  }
                  placeholder="Sobrenome"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={inviteForm.email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="usuario@empresa.com"
                className={domainError ? "border-destructive" : ""}
              />
              {domainError && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {domainError}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone (WhatsApp) *</Label>
              <Input
                id="phone"
                value={inviteForm.phone}
                onChange={(e) =>
                  setInviteForm((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="(11) 99999-9999"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Papel</Label>
                <Select
                  value={inviteForm.role}
                  onValueChange={(value: "user" | "admin") =>
                    setInviteForm((prev) => ({ ...prev, role: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {departments.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="department">Departamento</Label>
                  <Select
                    value={inviteForm.department_id}
                    onValueChange={(value) =>
                      setInviteForm((prev) => ({ ...prev, department_id: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={sendInvite} disabled={isSending || !!domainError}>
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Convite
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
