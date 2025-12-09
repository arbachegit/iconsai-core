import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AdminTitleWithInfo } from "./AdminTitleWithInfo";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Search, 
  Download, 
  Upload,
  Check,
  X,
  Edit2,
  Trash2,
  Users,
  Clock,
  FileSpreadsheet,
  Loader2,
  UserPlus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Mail,
  Phone,
  Building2,
  GraduationCap,
  Globe
} from "lucide-react";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";

type RegistrationStatus = "pending" | "approved" | "rejected";
type AppRole = "user" | "admin" | "superadmin";

interface UserRegistration {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  dns_origin: string | null;
  institution_work: string | null;
  institution_study: string | null;
  role: AppRole;
  status: RegistrationStatus;
  requested_at: string;
  approved_at: string | null;
  mass_import_at: string | null;
  approved_by: string | null;
  rejection_reason: string | null;
}

interface CSVRow {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  institution_work?: string;
  institution_study?: string;
  role?: string;
  [key: string]: string | undefined;
}

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50];

const STATUS_CONFIG: Record<RegistrationStatus, { color: string; label: string }> = {
  pending: { color: "bg-amber-500", label: "Pendente" },
  approved: { color: "bg-emerald-500", label: "Aprovado" },
  rejected: { color: "bg-red-500", label: "Reprovado" },
};

const ROLE_CONFIG: Record<AppRole, { color: string; label: string }> = {
  user: { color: "bg-blue-500", label: "Usuário" },
  admin: { color: "bg-purple-500", label: "Admin" },
  superadmin: { color: "bg-rose-500", label: "Super Admin" },
};

export const UserRegistryTab = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [dnsFilter, setDnsFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Modal states
  const [editModal, setEditModal] = useState<{ open: boolean; user: UserRegistration | null }>({ open: false, user: null });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; user: UserRegistration | null }>({ open: false, user: null });
  const [rejectModal, setRejectModal] = useState<{ open: boolean; user: UserRegistration | null; reason: string }>({ open: false, user: null, reason: "" });
  const [roleChangeModal, setRoleChangeModal] = useState<{ open: boolean; user: UserRegistration | null; newRole: AppRole }>({ open: false, user: null, newRole: "user" });
  
  // CSV Import states
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [csvImportStatus, setCsvImportStatus] = useState<"approved" | "pending">("pending");
  const [isImporting, setIsImporting] = useState(false);

  // Fetch all registrations
  const { data: registrations, isLoading, refetch } = useQuery({
    queryKey: ["user-registrations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_registrations")
        .select("*")
        .order("requested_at", { ascending: false });
      
      if (error) throw error;
      return (data || []) as UserRegistration[];
    },
  });

  // Get unique DNS origins for filter
  const dnsOrigins = useMemo(() => {
    if (!registrations) return [];
    const origins = new Set(registrations.map(r => r.dns_origin).filter(Boolean));
    return Array.from(origins) as string[];
  }, [registrations]);

  // Filter registrations based on tab, search, role, and DNS
  const filteredRegistrations = useMemo(() => {
    if (!registrations) return [];
    
    return registrations.filter(reg => {
      // Tab filter
      if (activeTab === "active" && reg.status !== "approved") return false;
      if (activeTab === "pending" && reg.status !== "pending") return false;
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const fullName = `${reg.first_name} ${reg.last_name}`.toLowerCase();
        if (!fullName.includes(query) && !reg.email.toLowerCase().includes(query)) {
          return false;
        }
      }
      
      // Role filter
      if (roleFilter !== "all" && reg.role !== roleFilter) return false;
      
      // DNS filter
      if (dnsFilter !== "all" && reg.dns_origin !== dnsFilter) return false;
      
      return true;
    });
  }, [registrations, activeTab, searchQuery, roleFilter, dnsFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredRegistrations.length / itemsPerPage);
  const paginatedRegistrations = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRegistrations.slice(start, start + itemsPerPage);
  }, [filteredRegistrations, currentPage, itemsPerPage]);

  // Reset page when filters change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  // Approve user mutation
  const approveMutation = useMutation({
    mutationFn: async (registration: UserRegistration) => {
      const { error } = await supabase.functions.invoke("approve-user-registration", {
        body: { registrationId: registration.id }
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Usuário aprovado com sucesso! Email de boas-vindas enviado.");
      queryClient.invalidateQueries({ queryKey: ["user-registrations"] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao aprovar usuário: ${error.message}`);
    }
  });

  // Reject user mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ registration, reason }: { registration: UserRegistration; reason: string }) => {
      const { error } = await supabase.functions.invoke("reject-user-registration", {
        body: { registrationId: registration.id, rejectionReason: reason }
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Usuário reprovado. Notificação enviada.");
      queryClient.invalidateQueries({ queryKey: ["user-registrations"] });
      setRejectModal({ open: false, user: null, reason: "" });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao reprovar usuário: ${error.message}`);
    }
  });

  // Update user mutation
  const updateMutation = useMutation({
    mutationFn: async (user: Partial<UserRegistration> & { id: string }) => {
      const { error } = await supabase
        .from("user_registrations")
        .update({
          first_name: user.first_name,
          last_name: user.last_name,
          phone: user.phone,
          institution_work: user.institution_work,
          institution_study: user.institution_study,
          role: user.role,
        })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Usuário atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["user-registrations"] });
      setEditModal({ open: false, user: null });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar usuário: ${error.message}`);
    }
  });

  // Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("user_registrations")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registro excluído com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["user-registrations"] });
      setDeleteModal({ open: false, user: null });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir registro: ${error.message}`);
    }
  });

  // Change role mutation
  const changeRoleMutation = useMutation({
    mutationFn: async ({ id, newRole }: { id: string; newRole: AppRole }) => {
      const { error } = await supabase
        .from("user_registrations")
        .update({ role: newRole })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role alterada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["user-registrations"] });
      setRoleChangeModal({ open: false, user: null, newRole: "user" });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao alterar role: ${error.message}`);
    }
  });
    }
  });

  // CSV Drop handler
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvData(results.data);
        toast.success(`${results.data.length} registros encontrados no CSV`);
      },
      error: (error) => {
        toast.error(`Erro ao ler CSV: ${error.message}`);
      }
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".csv"],
    },
    maxFiles: 1,
  });

  // Import CSV mutation
  const importCsvMutation = useMutation({
    mutationFn: async () => {
      setIsImporting(true);
      const registrationsToInsert = csvData.map(row => ({
        first_name: row.first_name || row["Nome"] || "",
        last_name: row.last_name || row["Sobrenome"] || "",
        email: row.email || row["Email"] || "",
        phone: row.phone || row["Telefone"] || null,
        institution_work: row.institution_work || row["Instituição Trabalho"] || null,
        institution_study: row.institution_study || row["Instituição Estudo"] || null,
        role: (row.role || "user") as AppRole,
        status: csvImportStatus,
        mass_import_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("user_registrations")
        .insert(registrationsToInsert);
      
      if (error) throw error;
      return registrationsToInsert.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} usuários importados com sucesso!`);
      setCsvData([]);
      queryClient.invalidateQueries({ queryKey: ["user-registrations"] });
      
      // Log audit
      supabase.from("user_activity_logs").insert({
        user_email: "system",
        action_category: "USER_REGISTRATION_CSV_IMPORT",
        action: `Importação em massa de ${count} usuários via CSV`,
        details: { count, status: csvImportStatus }
      });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao importar: ${error.message}`);
    },
    onSettled: () => {
      setIsImporting(false);
    }
  });

  const renderStatusBadge = (status: RegistrationStatus) => {
    const config = STATUS_CONFIG[status];
    return <Badge className={`${config.color} text-white`}>{config.label}</Badge>;
  };

  const renderRoleBadge = (role: AppRole) => {
    const config = ROLE_CONFIG[role];
    return <Badge className={`${config.color} text-white`}>{config.label}</Badge>;
  };

  const pendingCount = registrations?.filter(r => r.status === "pending").length || 0;
  const activeCount = registrations?.filter(r => r.status === "approved").length || 0;

  return (
    <div className="space-y-6">
      <AdminTitleWithInfo
        title="Cadastro de Usuários"
        level="h1"
        tooltipText="Gerenciamento completo de usuários do sistema"
        infoContent={
          <div className="space-y-3">
            <p className="text-sm">Sistema de gestão de usuários com aprovação e importação em massa.</p>
            <ul className="space-y-1 text-sm">
              <li><span className="text-emerald-400 font-semibold">Usuários Ativos:</span> CRUD completo de usuários aprovados</li>
              <li><span className="text-amber-400 font-semibold">Lista de Aprovação:</span> Aprovar ou reprovar solicitações</li>
              <li><span className="text-blue-400 font-semibold">Importação CSV:</span> Upload em massa de usuários</li>
            </ul>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active" className="gap-2">
            <Users className="w-4 h-4" />
            Usuários Ativos
            <Badge variant="secondary" className="ml-1">{activeCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="w-4 h-4" />
            Lista de Aprovação
            {pendingCount > 0 && (
              <Badge className="bg-amber-500 text-white ml-1">{pendingCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="import" className="gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Importação em Massa
          </TabsTrigger>
        </TabsList>

        {/* Tab: Active Users / Pending Approvals */}
        {(activeTab === "active" || activeTab === "pending") && (
          <TabsContent value={activeTab} className="space-y-4">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex flex-wrap items-center gap-4">
                  {/* Search */}
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome ou email..."
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  
                  {/* Role Filter */}
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas Roles</SelectItem>
                      <SelectItem value="user">Usuário</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="superadmin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {/* DNS Filter */}
                  <Select value={dnsFilter} onValueChange={setDnsFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="DNS Origin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos Domínios</SelectItem>
                      {dnsOrigins.map(dns => (
                        <SelectItem key={dns} value={dns}>@{dns}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Items per page */}
                  <Select value={String(itemsPerPage)} onValueChange={(v) => setItemsPerPage(Number(v))}>
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ITEMS_PER_PAGE_OPTIONS.map(n => (
                        <SelectItem key={n} value={String(n)}>{n} / pág</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Refresh */}
                  <Button variant="outline" size="icon" onClick={() => refetch()}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : paginatedRegistrations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Users className="w-12 h-12 mb-4 opacity-50" />
                    <p>Nenhum registro encontrado</p>
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead>DNS</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedRegistrations.map((reg) => (
                          <TableRow key={reg.id}>
                            <TableCell className="font-medium">
                              {reg.first_name} {reg.last_name}
                            </TableCell>
                            <TableCell>{reg.email}</TableCell>
                            <TableCell>{reg.phone || "-"}</TableCell>
                            <TableCell>
                              {reg.dns_origin && (
                                <Badge variant="outline" className="gap-1">
                                  <Globe className="w-3 h-3" />
                                  @{reg.dns_origin}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>{renderRoleBadge(reg.role)}</TableCell>
                            <TableCell>{renderStatusBadge(reg.status)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(reg.requested_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {activeTab === "pending" ? (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                                      onClick={() => approveMutation.mutate(reg)}
                                      disabled={approveMutation.isPending}
                                    >
                                      <Check className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                      onClick={() => setRejectModal({ open: true, user: reg, reason: "" })}
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setEditModal({ open: true, user: reg })}
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => setRoleChangeModal({ open: true, user: reg, newRole: reg.role })}
                                    >
                                      <Users className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                      onClick={() => setDeleteModal({ open: true, user: reg })}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    
                    {/* Pagination */}
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredRegistrations.length)} de {filteredRegistrations.length}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-sm">
                          Página {currentPage} de {totalPages || 1}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage >= totalPages}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Tab: CSV Import */}
        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Importação em Massa via CSV
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                  transition-colors duration-200
                  ${isDragActive 
                    ? "border-primary bg-primary/5" 
                    : "border-muted-foreground/25 hover:border-primary/50"
                  }
                `}
              >
                <input {...getInputProps()} />
                <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                {isDragActive ? (
                  <p className="text-primary font-medium">Solte o arquivo aqui...</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-muted-foreground">
                      Arraste e solte um arquivo CSV aqui, ou clique para selecionar
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Colunas esperadas: first_name, last_name, email, phone, institution_work, institution_study
                    </p>
                  </div>
                )}
              </div>

              {/* CSV Preview */}
              {csvData.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Preview ({csvData.length} registros)</h3>
                    <div className="flex items-center gap-4">
                      <Label>Importar como:</Label>
                      <Select value={csvImportStatus} onValueChange={(v) => setCsvImportStatus(v as "pending" | "approved")}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pendente</SelectItem>
                          <SelectItem value="approved">Aprovado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="max-h-[300px] overflow-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead>Trabalho</TableHead>
                          <TableHead>Estudo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {csvData.slice(0, 10).map((row, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{row.first_name || row["Nome"]} {row.last_name || row["Sobrenome"]}</TableCell>
                            <TableCell>{row.email || row["Email"]}</TableCell>
                            <TableCell>{row.phone || row["Telefone"] || "-"}</TableCell>
                            <TableCell>{row.institution_work || row["Instituição Trabalho"] || "-"}</TableCell>
                            <TableCell>{row.institution_study || row["Instituição Estudo"] || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {csvData.length > 10 && (
                      <p className="text-center py-2 text-sm text-muted-foreground">
                        ... e mais {csvData.length - 10} registros
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Button
                      onClick={() => importCsvMutation.mutate()}
                      disabled={isImporting}
                      className="gap-2"
                    >
                      {isImporting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      Importar {csvData.length} Registros
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setCsvData([])}
                    >
                      Limpar
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Modal */}
      <Dialog open={editModal.open} onOpenChange={(open) => !open && setEditModal({ open: false, user: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          {editModal.user && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={editModal.user.first_name}
                    onChange={(e) => setEditModal(prev => ({
                      ...prev,
                      user: prev.user ? { ...prev.user, first_name: e.target.value } : null
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sobrenome</Label>
                  <Input
                    value={editModal.user.last_name}
                    onChange={(e) => setEditModal(prev => ({
                      ...prev,
                      user: prev.user ? { ...prev.user, last_name: e.target.value } : null
                    }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={editModal.user.phone || ""}
                  onChange={(e) => setEditModal(prev => ({
                    ...prev,
                    user: prev.user ? { ...prev.user, phone: e.target.value } : null
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Instituição de Trabalho</Label>
                <Input
                  value={editModal.user.institution_work || ""}
                  onChange={(e) => setEditModal(prev => ({
                    ...prev,
                    user: prev.user ? { ...prev.user, institution_work: e.target.value } : null
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Instituição de Estudo</Label>
                <Input
                  value={editModal.user.institution_study || ""}
                  onChange={(e) => setEditModal(prev => ({
                    ...prev,
                    user: prev.user ? { ...prev.user, institution_study: e.target.value } : null
                  }))}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModal({ open: false, user: null })}>
              Cancelar
            </Button>
            <Button
              onClick={() => editModal.user && updateMutation.mutate(editModal.user)}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModal.open} onOpenChange={(open) => !open && setDeleteModal({ open: false, user: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <AlertCircle className="w-5 h-5" />
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o registro de {deleteModal.user?.first_name} {deleteModal.user?.last_name}?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModal({ open: false, user: null })}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteModal.user && deleteMutation.mutate(deleteModal.user.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={rejectModal.open} onOpenChange={(open) => !open && setRejectModal({ open: false, user: null, reason: "" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <X className="w-5 h-5" />
              Reprovar Cadastro
            </DialogTitle>
            <DialogDescription>
              Reprovar o cadastro de {rejectModal.user?.first_name} {rejectModal.user?.last_name}?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Motivo da Reprovação (opcional)</Label>
              <Textarea
                placeholder="Informe o motivo da reprovação..."
                value={rejectModal.reason}
                onChange={(e) => setRejectModal(prev => ({ ...prev, reason: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectModal({ open: false, user: null, reason: "" })}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => rejectModal.user && rejectMutation.mutate({ 
                registration: rejectModal.user, 
                reason: rejectModal.reason 
              })}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Reprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Role Modal */}
      <Dialog open={roleChangeModal.open} onOpenChange={(open) => !open && setRoleChangeModal({ open: false, user: null, newRole: "user" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Role</DialogTitle>
            <DialogDescription>
              Alterar a role de {roleChangeModal.user?.first_name} {roleChangeModal.user?.last_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nova Role</Label>
              <Select
                value={roleChangeModal.newRole}
                onValueChange={(v) => setRoleChangeModal(prev => ({ ...prev, newRole: v as AppRole }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="superadmin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleChangeModal({ open: false, user: null, newRole: "user" })}>
              Cancelar
            </Button>
            <Button
              onClick={() => roleChangeModal.user && changeRoleMutation.mutate({
                id: roleChangeModal.user.id,
                newRole: roleChangeModal.newRole
              })}
              disabled={changeRoleMutation.isPending}
            >
              {changeRoleMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserRegistryTab;
