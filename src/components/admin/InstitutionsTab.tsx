/**
 * InstitutionsTab - Manage Platform Institutions
 * @version 1.0.0
 * @date 2026-01-28
 *
 * Super-admin component for managing:
 * - Create/edit institutions
 * - Configure email domains
 * - Set user limits
 * - Manage branding
 */

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Building2, Plus, Loader2, Save, Search, MoreVertical,
  Users, Mail, Globe, Palette, Edit, Trash2, CheckCircle, XCircle
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Institution {
  id: string;
  name: string;
  slug: string;
  cnpj: string | null;
  email_domains: string[];
  max_users: number;
  is_active: boolean;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  address_city: string | null;
  address_state: string | null;
  created_at: string;
  user_count?: number;
}

interface InstitutionFormData {
  name: string;
  slug: string;
  cnpj: string;
  email_domains: string;
  max_users: number;
  is_active: boolean;
  phone: string;
  email: string;
  website: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  address_street: string;
  address_number: string;
  address_city: string;
  address_state: string;
  address_zip: string;
}

const initialFormData: InstitutionFormData = {
  name: "",
  slug: "",
  cnpj: "",
  email_domains: "",
  max_users: 100,
  is_active: true,
  phone: "",
  email: "",
  website: "",
  logo_url: "",
  primary_color: "#00D4FF",
  secondary_color: "#0A0E1A",
  address_street: "",
  address_number: "",
  address_city: "",
  address_state: "",
  address_zip: "",
};

export default function InstitutionsTab() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingInstitution, setEditingInstitution] = useState<Institution | null>(null);
  const [formData, setFormData] = useState<InstitutionFormData>(initialFormData);

  // Fetch institutions
  const fetchInstitutions = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("institutions")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;

      // Get user counts for each institution
      const institutionsWithCounts = await Promise.all(
        (data || []).map(async (inst) => {
          const { count } = await supabase
            .from("platform_users")
            .select("*", { count: "exact", head: true })
            .eq("institution_id", inst.id)
            .in("status", ["active", "pending"]);

          return { ...inst, user_count: count || 0 };
        })
      );

      setInstitutions(institutionsWithCounts);
    } catch (err) {
      console.error("[InstitutionsTab] Error:", err);
      toast.error("Erro ao carregar instituições");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInstitutions();
  }, [fetchInstitutions]);

  // Generate slug from name
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  // Handle name change and auto-generate slug
  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: prev.slug || generateSlug(name),
    }));
  };

  // Open create/edit dialog
  const openCreateDialog = () => {
    setEditingInstitution(null);
    setFormData(initialFormData);
    setEditDialogOpen(true);
  };

  const openEditDialog = (institution: Institution) => {
    setEditingInstitution(institution);
    setFormData({
      name: institution.name,
      slug: institution.slug,
      cnpj: institution.cnpj || "",
      email_domains: institution.email_domains.join(", "),
      max_users: institution.max_users,
      is_active: institution.is_active,
      phone: institution.phone || "",
      email: institution.email || "",
      website: institution.website || "",
      logo_url: institution.logo_url || "",
      primary_color: institution.primary_color,
      secondary_color: institution.secondary_color,
      address_street: "",
      address_number: "",
      address_city: institution.address_city || "",
      address_state: institution.address_state || "",
      address_zip: "",
    });
    setEditDialogOpen(true);
  };

  // Save institution
  const saveInstitution = async () => {
    if (!formData.name || !formData.slug) {
      toast.error("Nome e slug são obrigatórios");
      return;
    }

    setIsSaving(true);
    try {
      // Parse email domains
      const emailDomains = formData.email_domains
        .split(",")
        .map((d) => d.trim().toLowerCase())
        .filter((d) => d.length > 0);

      const institutionData = {
        name: formData.name.trim(),
        slug: formData.slug.toLowerCase().trim(),
        cnpj: formData.cnpj.trim() || null,
        email_domains: emailDomains,
        max_users: formData.max_users,
        is_active: formData.is_active,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        website: formData.website.trim() || null,
        logo_url: formData.logo_url.trim() || null,
        primary_color: formData.primary_color,
        secondary_color: formData.secondary_color,
        address_street: formData.address_street.trim() || null,
        address_number: formData.address_number.trim() || null,
        address_city: formData.address_city.trim() || null,
        address_state: formData.address_state.trim() || null,
        address_zip: formData.address_zip.trim() || null,
      };

      if (editingInstitution) {
        // Update existing
        const { error } = await supabase
          .from("institutions")
          .update(institutionData)
          .eq("id", editingInstitution.id);

        if (error) throw error;
        toast.success("Instituição atualizada");
      } else {
        // Create new
        const { error } = await supabase
          .from("institutions")
          .insert(institutionData);

        if (error) throw error;
        toast.success("Instituição criada");
      }

      setEditDialogOpen(false);
      await fetchInstitutions();
    } catch (err: any) {
      console.error("[InstitutionsTab] Save error:", err);
      if (err.code === "23505") {
        toast.error("Já existe uma instituição com este slug ou CNPJ");
      } else {
        toast.error(`Erro ao salvar: ${err.message}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Delete institution
  const deleteInstitution = async () => {
    if (!editingInstitution) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("institutions")
        .delete()
        .eq("id", editingInstitution.id);

      if (error) throw error;

      toast.success("Instituição removida");
      setDeleteDialogOpen(false);
      setEditingInstitution(null);
      await fetchInstitutions();
    } catch (err: any) {
      console.error("[InstitutionsTab] Delete error:", err);
      toast.error(`Erro ao remover: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle active status
  const toggleActive = async (institution: Institution) => {
    try {
      const { error } = await supabase
        .from("institutions")
        .update({ is_active: !institution.is_active })
        .eq("id", institution.id);

      if (error) throw error;

      toast.success(institution.is_active ? "Instituição desativada" : "Instituição ativada");
      await fetchInstitutions();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  // Filter institutions
  const filteredInstitutions = institutions.filter(
    (inst) =>
      inst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inst.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inst.email_domains.some((d) => d.includes(searchTerm.toLowerCase()))
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
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle>Instituições</CardTitle>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Instituição
            </Button>
          </div>
          <CardDescription>
            Gerencie as instituições que usam a plataforma IconsAI.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar instituições..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="outline">
          {filteredInstitutions.length} instituições
        </Badge>
      </div>

      {/* Institutions Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Instituição</TableHead>
                <TableHead>Domínios</TableHead>
                <TableHead>Usuários</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInstitutions.map((institution) => (
                <TableRow key={institution.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {institution.logo_url ? (
                        <img
                          src={institution.logo_url}
                          alt={institution.name}
                          className="w-8 h-8 rounded object-cover"
                        />
                      ) : (
                        <div
                          className="w-8 h-8 rounded flex items-center justify-center text-white font-bold text-sm"
                          style={{ backgroundColor: institution.primary_color }}
                        >
                          {institution.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{institution.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {institution.slug}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {institution.email_domains.slice(0, 2).map((domain) => (
                        <Badge key={domain} variant="secondary" className="text-xs">
                          @{domain}
                        </Badge>
                      ))}
                      {institution.email_domains.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{institution.email_domains.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{institution.user_count || 0}</span>
                      <span className="text-muted-foreground">/</span>
                      <span className="text-muted-foreground">{institution.max_users}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {institution.is_active ? (
                      <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Ativa
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <XCircle className="h-3 w-3 mr-1" />
                        Inativa
                      </Badge>
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
                        <DropdownMenuItem onClick={() => openEditDialog(institution)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleActive(institution)}>
                          {institution.is_active ? (
                            <>
                              <XCircle className="h-4 w-4 mr-2" />
                              Desativar
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Ativar
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setEditingInstitution(institution);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remover
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filteredInstitutions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhuma instituição encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {editingInstitution ? "Editar Instituição" : "Nova Instituição"}
            </DialogTitle>
            <DialogDescription>
              {editingInstitution
                ? "Atualize as informações da instituição."
                : "Cadastre uma nova instituição na plataforma."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Informações Básicas
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Nome da instituição"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug *</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                    placeholder="identificador-unico"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    value={formData.cnpj}
                    onChange={(e) => setFormData((prev) => ({ ...prev, cnpj: e.target.value }))}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_users">Limite de Usuários</Label>
                  <Input
                    id="max_users"
                    type="number"
                    value={formData.max_users}
                    onChange={(e) => setFormData((prev) => ({ ...prev, max_users: parseInt(e.target.value) || 100 }))}
                    min={1}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Email Domains */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Domínios de Email
              </h4>
              <div className="space-y-2">
                <Label htmlFor="email_domains">Domínios Permitidos</Label>
                <Input
                  id="email_domains"
                  value={formData.email_domains}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email_domains: e.target.value }))}
                  placeholder="empresa.com.br, empresa.com"
                />
                <p className="text-xs text-muted-foreground">
                  Separados por vírgula. Usuários só podem se cadastrar com estes domínios.
                </p>
              </div>
            </div>

            <Separator />

            {/* Contact */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Contato
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="contato@empresa.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData((prev) => ({ ...prev, website: e.target.value }))}
                  placeholder="https://www.empresa.com"
                />
              </div>
            </div>

            <Separator />

            {/* Branding */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Identidade Visual
              </h4>
              <div className="space-y-2">
                <Label htmlFor="logo_url">URL do Logo</Label>
                <Input
                  id="logo_url"
                  value={formData.logo_url}
                  onChange={(e) => setFormData((prev) => ({ ...prev, logo_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary_color">Cor Primária</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => setFormData((prev) => ({ ...prev, primary_color: e.target.value }))}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <Input
                      id="primary_color"
                      value={formData.primary_color}
                      onChange={(e) => setFormData((prev) => ({ ...prev, primary_color: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondary_color">Cor Secundária</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={formData.secondary_color}
                      onChange={(e) => setFormData((prev) => ({ ...prev, secondary_color: e.target.value }))}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <Input
                      id="secondary_color"
                      value={formData.secondary_color}
                      onChange={(e) => setFormData((prev) => ({ ...prev, secondary_color: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Status */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Status</Label>
                <p className="text-xs text-muted-foreground">
                  Instituições inativas não permitem novos cadastros.
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveInstitution} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover Instituição</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover <strong>{editingInstitution?.name}</strong>?
              Esta ação não pode ser desfeita e todos os usuários vinculados perderão o acesso.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={deleteInstitution} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
