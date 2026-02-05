/**
 * CompaniesTab - Gerenciamento Completo de Empresas
 * @version 2.0.0
 *
 * Inclui:
 * - Lista de empresas
 * - Detalhes da empresa selecionada
 * - Gestores da empresa
 * - Usuarios da empresa
 * - Agentes vinculados
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Briefcase,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Building,
  Users,
  Power,
  PowerOff,
  Copy,
  Check,
  ExternalLink,
  Globe,
  ArrowLeft,
  UserCog,
  Bot,
  Link,
  Star,
  Settings,
  Mail,
  Phone,
} from "lucide-react";

interface Company {
  id: string;
  name: string;
  slug: string | null;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  primary_color: string;
  is_active: boolean;
  created_at: string;
}

interface Manager {
  id: string;
  user_id: string;
  company_id: string;
  is_active: boolean;
  created_at: string;
  user?: {
    id: string;
    email: string;
  };
}

interface CompanyUser {
  id: string;
  company_id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  is_active: boolean;
  last_login_at: string | null;
  login_count: number;
  created_at: string;
}

interface Assistant {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
}

interface CompanyAssistant {
  id: string;
  company_id: string;
  assistant_id: string;
  is_active: boolean;
  is_default: boolean;
  position: number;
  custom_system_prompt: string | null;
  assistant?: Assistant;
}

const APP_URL = import.meta.env.VITE_COMPANY_APP_URL || "https://core.iconsai.ai";

const formatCNPJ = (value: string) => {
  const numbers = value.replace(/\D/g, "").slice(0, 14);
  return numbers
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
};

const formatPhone = (value: string) => {
  const numbers = value.replace(/\D/g, "").slice(0, 11);
  if (numbers.length <= 10) {
    return numbers.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }
  return numbers.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
};

export default function CompaniesTab() {
  // State
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [companyAssistants, setCompanyAssistants] = useState<CompanyAssistant[]>([]);
  const [allAssistants, setAllAssistants] = useState<Assistant[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Dialog states
  const [isCompanyDialogOpen, setIsCompanyDialogOpen] = useState(false);
  const [isManagerDialogOpen, setIsManagerDialogOpen] = useState(false);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isAssistantDialogOpen, setIsAssistantDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editingUser, setEditingUser] = useState<CompanyUser | null>(null);

  // Form states
  const [companyForm, setCompanyForm] = useState({
    name: "",
    slug: "",
    cnpj: "",
    email: "",
    phone: "",
    address: "",
    primary_color: "#6366f1",
  });

  const [managerForm, setManagerForm] = useState({ email: "" });
  const [userForm, setUserForm] = useState({ name: "", email: "", phone: "", role: "user" });

  // Generate slug
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  // Load companies
  const loadCompanies = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCompanies(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar empresas:", error);
      toast.error("Erro ao carregar empresas");
    } finally {
      setIsLoading(false);
    }
  };

  // Load company details
  const loadCompanyDetails = async (companyId: string) => {
    try {
      // Load managers
      const { data: managersData } = await supabase
        .from("managers")
        .select("*, user:auth_user_id(id, email)")
        .eq("company_id", companyId)
        .order("created_at");

      // Load users
      const { data: usersData } = await supabase
        .from("company_users")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at");

      // Load company assistants
      const { data: assistantsData } = await supabase
        .from("company_assistants")
        .select("*, assistant:assistants(*)")
        .eq("company_id", companyId)
        .order("position");

      // Load all assistants for linking
      const { data: allAssistantsData } = await supabase
        .from("assistants")
        .select("id, name, slug, description, is_active")
        .eq("is_active", true)
        .order("name");

      setManagers(managersData || []);
      setCompanyUsers(usersData || []);
      setCompanyAssistants(assistantsData || []);
      setAllAssistants(allAssistantsData || []);
    } catch (error: any) {
      console.error("Erro ao carregar detalhes:", error);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      loadCompanyDetails(selectedCompany.id);
    }
  }, [selectedCompany?.id]);

  // Copy link
  const handleCopyLink = async (company: Company) => {
    if (!company.slug) return;
    const link = `${APP_URL}/${company.slug}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(company.id);
      toast.success("Link copiado!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Erro ao copiar link");
    }
  };

  // Reset forms
  const resetCompanyForm = () => {
    setCompanyForm({ name: "", slug: "", cnpj: "", email: "", phone: "", address: "", primary_color: "#6366f1" });
    setEditingCompany(null);
  };

  const resetUserForm = () => {
    setUserForm({ name: "", email: "", phone: "", role: "user" });
    setEditingUser(null);
  };

  // Company CRUD
  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    setCompanyForm({
      name: company.name,
      slug: company.slug || "",
      cnpj: company.cnpj || "",
      email: company.email || "",
      phone: company.phone || "",
      address: company.address || "",
      primary_color: company.primary_color || "#6366f1",
    });
    setIsCompanyDialogOpen(true);
  };

  const handleSubmitCompany = async () => {
    if (!companyForm.name.trim()) {
      toast.error("Nome e obrigatorio");
      return;
    }

    setIsSubmitting(true);
    try {
      const slug = companyForm.slug.trim() || generateSlug(companyForm.name);
      const payload = {
        name: companyForm.name.trim(),
        slug: slug || null,
        cnpj: companyForm.cnpj.replace(/\D/g, "") || null,
        email: companyForm.email.trim() || null,
        phone: companyForm.phone.replace(/\D/g, "") || null,
        address: companyForm.address.trim() || null,
        primary_color: companyForm.primary_color,
      };

      if (editingCompany) {
        const { error } = await supabase.from("companies").update(payload).eq("id", editingCompany.id);
        if (error) throw error;
        toast.success("Empresa atualizada");
        if (selectedCompany?.id === editingCompany.id) {
          setSelectedCompany({ ...selectedCompany, ...payload });
        }
      } else {
        const { error } = await supabase.from("companies").insert({ ...payload, is_active: true });
        if (error) throw error;
        toast.success("Empresa criada");
      }

      setIsCompanyDialogOpen(false);
      resetCompanyForm();
      loadCompanies();
    } catch (error: any) {
      if (error.code === "23505") {
        toast.error(error.message?.includes("slug") ? "Slug ja existe" : "CNPJ ja cadastrado");
      } else {
        toast.error(error.message || "Erro ao salvar");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCompany = async (company: Company) => {
    if (!confirm(`Excluir "${company.name}"?`)) return;
    try {
      const { error } = await supabase.from("companies").delete().eq("id", company.id);
      if (error) throw error;
      toast.success("Empresa excluida");
      if (selectedCompany?.id === company.id) setSelectedCompany(null);
      loadCompanies();
    } catch (error: any) {
      toast.error(error.code === "23503" ? "Empresa tem dados vinculados" : "Erro ao excluir");
    }
  };

  const handleToggleCompanyActive = async (company: Company) => {
    try {
      const { error } = await supabase.from("companies").update({ is_active: !company.is_active }).eq("id", company.id);
      if (error) throw error;
      toast.success(company.is_active ? "Empresa desativada" : "Empresa ativada");
      loadCompanies();
      if (selectedCompany?.id === company.id) {
        setSelectedCompany({ ...company, is_active: !company.is_active });
      }
    } catch {
      toast.error("Erro ao alterar status");
    }
  };

  // Manager CRUD
  const handleAddManager = async () => {
    if (!selectedCompany || !managerForm.email.trim()) return;

    setIsSubmitting(true);
    try {
      // Find user by email
      const { data: userData, error: userError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", managerForm.email.trim())
        .maybeSingle();

      if (!userData) {
        toast.error("Usuario nao encontrado. Cadastre primeiro em Usuarios Sistema.");
        return;
      }

      const { error } = await supabase.from("managers").insert({
        user_id: userData.id,
        company_id: selectedCompany.id,
        is_active: true,
      });

      if (error) throw error;
      toast.success("Gestor adicionado");
      setIsManagerDialogOpen(false);
      setManagerForm({ email: "" });
      loadCompanyDetails(selectedCompany.id);
    } catch (error: any) {
      if (error.code === "23505") {
        toast.error("Gestor ja vinculado");
      } else {
        toast.error(error.message || "Erro ao adicionar gestor");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveManager = async (manager: Manager) => {
    if (!confirm("Remover gestor?")) return;
    try {
      const { error } = await supabase.from("managers").delete().eq("id", manager.id);
      if (error) throw error;
      toast.success("Gestor removido");
      if (selectedCompany) loadCompanyDetails(selectedCompany.id);
    } catch {
      toast.error("Erro ao remover");
    }
  };

  // User CRUD
  const handleEditUser = (user: CompanyUser) => {
    setEditingUser(user);
    setUserForm({ name: user.name, email: user.email, phone: user.phone || "", role: user.role });
    setIsUserDialogOpen(true);
  };

  const handleSubmitUser = async () => {
    if (!selectedCompany || !userForm.name.trim() || !userForm.email.trim()) {
      toast.error("Nome e email sao obrigatorios");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        company_id: selectedCompany.id,
        name: userForm.name.trim(),
        email: userForm.email.trim().toLowerCase(),
        phone: userForm.phone.replace(/\D/g, "") || null,
        role: userForm.role,
      };

      if (editingUser) {
        const { error } = await supabase.from("company_users").update(payload).eq("id", editingUser.id);
        if (error) throw error;
        toast.success("Usuario atualizado");
      } else {
        const { error } = await supabase.from("company_users").insert({ ...payload, is_active: true });
        if (error) throw error;
        toast.success("Usuario criado");
      }

      setIsUserDialogOpen(false);
      resetUserForm();
      loadCompanyDetails(selectedCompany.id);
    } catch (error: any) {
      if (error.code === "23505") {
        toast.error("Email ja cadastrado nesta empresa");
      } else {
        toast.error(error.message || "Erro ao salvar");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (user: CompanyUser) => {
    if (!confirm(`Excluir "${user.name}"?`)) return;
    try {
      const { error } = await supabase.from("company_users").delete().eq("id", user.id);
      if (error) throw error;
      toast.success("Usuario excluido");
      if (selectedCompany) loadCompanyDetails(selectedCompany.id);
    } catch {
      toast.error("Erro ao excluir");
    }
  };

  const handleToggleUserActive = async (user: CompanyUser) => {
    try {
      const { error } = await supabase.from("company_users").update({ is_active: !user.is_active }).eq("id", user.id);
      if (error) throw error;
      toast.success(user.is_active ? "Usuario desativado" : "Usuario ativado");
      if (selectedCompany) loadCompanyDetails(selectedCompany.id);
    } catch {
      toast.error("Erro ao alterar status");
    }
  };

  // Assistant linking
  const handleLinkAssistant = async (assistantId: string) => {
    if (!selectedCompany) return;
    if (companyAssistants.some((ca) => ca.assistant_id === assistantId)) {
      toast.error("Agente ja vinculado");
      return;
    }

    try {
      const { error } = await supabase.from("company_assistants").insert({
        company_id: selectedCompany.id,
        assistant_id: assistantId,
        is_active: true,
        is_default: companyAssistants.length === 0,
        position: companyAssistants.length,
      });

      if (error) throw error;
      toast.success("Agente vinculado");
      setIsAssistantDialogOpen(false);
      loadCompanyDetails(selectedCompany.id);
    } catch (error: any) {
      toast.error(error.message || "Erro ao vincular");
    }
  };

  const handleUnlinkAssistant = async (ca: CompanyAssistant) => {
    if (!confirm("Desvincular agente?")) return;
    try {
      const { error } = await supabase.from("company_assistants").delete().eq("id", ca.id);
      if (error) throw error;
      toast.success("Agente desvinculado");
      if (selectedCompany) loadCompanyDetails(selectedCompany.id);
    } catch {
      toast.error("Erro ao desvincular");
    }
  };

  const handleSetDefaultAssistant = async (ca: CompanyAssistant) => {
    if (!selectedCompany) return;
    try {
      await supabase.from("company_assistants").update({ is_default: false }).eq("company_id", selectedCompany.id);
      const { error } = await supabase.from("company_assistants").update({ is_default: true }).eq("id", ca.id);
      if (error) throw error;
      toast.success("Agente padrao definido");
      loadCompanyDetails(selectedCompany.id);
    } catch {
      toast.error("Erro ao definir padrao");
    }
  };

  // Available assistants for linking
  const availableAssistants = allAssistants.filter((a) => !companyAssistants.some((ca) => ca.assistant_id === a.id));

  // Render company list
  if (!selectedCompany) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Empresas</h2>
            <p className="text-muted-foreground">Gerencie empresas, gestores, usuarios e agentes</p>
          </div>
          <Dialog open={isCompanyDialogOpen} onOpenChange={(open) => { setIsCompanyDialogOpen(open); if (!open) resetCompanyForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Nova Empresa</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingCompany ? "Editar Empresa" : "Nova Empresa"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome *</Label>
                    <Input value={companyForm.name} onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value, slug: companyForm.slug || generateSlug(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Slug (URL)</Label>
                    <Input value={companyForm.slug} onChange={(e) => setCompanyForm({ ...companyForm, slug: e.target.value })} />
                    <p className="text-xs text-muted-foreground">{APP_URL}/{companyForm.slug || "empresa"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>CNPJ</Label>
                    <Input value={companyForm.cnpj} onChange={(e) => setCompanyForm({ ...companyForm, cnpj: formatCNPJ(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Cor</Label>
                    <div className="flex gap-2">
                      <Input type="color" value={companyForm.primary_color} onChange={(e) => setCompanyForm({ ...companyForm, primary_color: e.target.value })} className="w-12 h-10 p-1" />
                      <Input value={companyForm.primary_color} onChange={(e) => setCompanyForm({ ...companyForm, primary_color: e.target.value })} className="flex-1" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={companyForm.email} onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input value={companyForm.phone} onChange={(e) => setCompanyForm({ ...companyForm, phone: formatPhone(e.target.value) })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Endereco</Label>
                  <Input value={companyForm.address} onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCompanyDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSubmitCompany} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingCompany ? "Salvar" : "Criar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building className="w-5 h-5" />Lista de Empresas</CardTitle>
            <CardDescription>{companies.length} empresa(s)</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : companies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma empresa cadastrada</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company) => (
                    <TableRow key={company.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedCompany(company)}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${company.primary_color}20` }}>
                            <Building className="w-4 h-4" style={{ color: company.primary_color }} />
                          </div>
                          <span className="font-medium">{company.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {company.slug ? (
                          <div className="flex items-center gap-1">
                            <Globe className="w-4 h-4 text-muted-foreground" />
                            <span className="font-mono text-sm">/{company.slug}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleCopyLink(company); }}>
                              {copiedId === company.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                            </Button>
                          </div>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={company.is_active ? "default" : "secondary"}>{company.is_active ? "Ativa" : "Inativa"}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleToggleCompanyActive(company); }}>
                            {company.is_active ? <PowerOff className="w-4 h-4 text-orange-500" /> : <Power className="w-4 h-4 text-green-500" />}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEditCompany(company); }}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDeleteCompany(company); }}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render company details
  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setSelectedCompany(null)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${selectedCompany.primary_color}20` }}>
              <Building className="w-5 h-5" style={{ color: selectedCompany.primary_color }} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{selectedCompany.name}</h2>
              {selectedCompany.slug && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Globe className="w-4 h-4" />
                  <span>{APP_URL}/{selectedCompany.slug}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopyLink(selectedCompany)}>
                    {copiedId === selectedCompany.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => window.open(`${APP_URL}/${selectedCompany.slug}`, "_blank")}>
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
        <Badge variant={selectedCompany.is_active ? "default" : "secondary"} className="text-sm">
          {selectedCompany.is_active ? "Ativa" : "Inativa"}
        </Badge>
        <Button variant="outline" onClick={() => handleEditCompany(selectedCompany)}>
          <Settings className="w-4 h-4 mr-2" />Editar
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="agents" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="agents" className="flex items-center gap-2">
            <Bot className="w-4 h-4" />Agentes ({companyAssistants.length})
          </TabsTrigger>
          <TabsTrigger value="managers" className="flex items-center gap-2">
            <UserCog className="w-4 h-4" />Gestores ({managers.length})
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />Usuarios ({companyUsers.length})
          </TabsTrigger>
        </TabsList>

        {/* Agents Tab */}
        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Agentes Vinculados</CardTitle>
                  <CardDescription>Agentes de IA disponiveis para esta empresa</CardDescription>
                </div>
                <Dialog open={isAssistantDialogOpen} onOpenChange={setIsAssistantDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="w-4 h-4 mr-2" />Vincular Agente</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Vincular Agente</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                      {availableAssistants.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">Todos os agentes ja estao vinculados</p>
                      ) : (
                        <div className="space-y-2">
                          {availableAssistants.map((a) => (
                            <div key={a.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                              <div>
                                <p className="font-medium">{a.name}</p>
                                <p className="text-sm text-muted-foreground">{a.description}</p>
                              </div>
                              <Button size="sm" onClick={() => handleLinkAssistant(a.id)}>Vincular</Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {companyAssistants.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum agente vinculado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {companyAssistants.map((ca) => (
                    <div key={ca.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Bot className="w-5 h-5 text-primary" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{ca.assistant?.name}</span>
                            {ca.is_default && <Badge className="bg-yellow-500/10 text-yellow-600"><Star className="w-3 h-3 mr-1" />Padrao</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">{ca.assistant?.description}</p>
                          {selectedCompany.slug && ca.assistant?.slug && (
                            <p className="text-xs text-muted-foreground font-mono mt-1">
                              {APP_URL}/{selectedCompany.slug}?agent={ca.assistant.slug}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!ca.is_default && (
                          <Button variant="outline" size="sm" onClick={() => handleSetDefaultAssistant(ca)}>
                            <Star className="w-4 h-4 mr-1" />Definir Padrao
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleUnlinkAssistant(ca)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Managers Tab */}
        <TabsContent value="managers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Gestores</CardTitle>
                  <CardDescription>Usuarios que podem gerenciar esta empresa</CardDescription>
                </div>
                <Dialog open={isManagerDialogOpen} onOpenChange={setIsManagerDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="w-4 h-4 mr-2" />Adicionar Gestor</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Gestor</DialogTitle>
                      <DialogDescription>Digite o email de um usuario do sistema</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Label>Email do Usuario</Label>
                      <Input value={managerForm.email} onChange={(e) => setManagerForm({ email: e.target.value })} placeholder="usuario@email.com" />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsManagerDialogOpen(false)}>Cancelar</Button>
                      <Button onClick={handleAddManager} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Adicionar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {managers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserCog className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum gestor cadastrado</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Acoes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {managers.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>{m.user?.email || "N/A"}</TableCell>
                        <TableCell>
                          <Badge variant={m.is_active ? "default" : "secondary"}>{m.is_active ? "Ativo" : "Inativo"}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveManager(m)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Usuarios da Empresa</CardTitle>
                  <CardDescription>Usuarios que podem acessar os agentes</CardDescription>
                </div>
                <Dialog open={isUserDialogOpen} onOpenChange={(open) => { setIsUserDialogOpen(open); if (!open) resetUserForm(); }}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="w-4 h-4 mr-2" />Novo Usuario</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingUser ? "Editar Usuario" : "Novo Usuario"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Nome *</Label>
                        <Input value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Email *</Label>
                        <Input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Telefone</Label>
                          <Input value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: formatPhone(e.target.value) })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Papel</Label>
                          <Select value={userForm.role} onValueChange={(v) => setUserForm({ ...userForm, role: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">Usuario</SelectItem>
                              <SelectItem value="viewer">Visualizador</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsUserDialogOpen(false)}>Cancelar</Button>
                      <Button onClick={handleSubmitUser} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {editingUser ? "Salvar" : "Criar"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {companyUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum usuario cadastrado</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Papel</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ultimo Login</TableHead>
                      <TableHead className="text-right">Acoes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companyUsers.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{u.name}</p>
                            <p className="text-sm text-muted-foreground">{u.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{u.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.is_active ? "default" : "secondary"}>{u.is_active ? "Ativo" : "Inativo"}</Badge>
                        </TableCell>
                        <TableCell>
                          {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString("pt-BR") : "Nunca"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleToggleUserActive(u)}>
                              {u.is_active ? <PowerOff className="w-4 h-4 text-orange-500" /> : <Power className="w-4 h-4 text-green-500" />}
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleEditUser(u)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(u)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Company Edit Dialog */}
      <Dialog open={isCompanyDialogOpen} onOpenChange={(open) => { setIsCompanyDialogOpen(open); if (!open) resetCompanyForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Empresa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={companyForm.name} onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Slug (URL)</Label>
                <Input value={companyForm.slug} onChange={(e) => setCompanyForm({ ...companyForm, slug: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input value={companyForm.cnpj} onChange={(e) => setCompanyForm({ ...companyForm, cnpj: formatCNPJ(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex gap-2">
                  <Input type="color" value={companyForm.primary_color} onChange={(e) => setCompanyForm({ ...companyForm, primary_color: e.target.value })} className="w-12 h-10 p-1" />
                  <Input value={companyForm.primary_color} onChange={(e) => setCompanyForm({ ...companyForm, primary_color: e.target.value })} className="flex-1" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={companyForm.email} onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={companyForm.phone} onChange={(e) => setCompanyForm({ ...companyForm, phone: formatPhone(e.target.value) })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Endereco</Label>
              <Input value={companyForm.address} onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCompanyDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmitCompany} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
