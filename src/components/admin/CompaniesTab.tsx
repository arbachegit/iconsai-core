/**
 * CompaniesTab - Gerenciamento de Empresas
 * Permite criar e gerenciar empresas/clientes
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Briefcase, Plus, Pencil, Trash2, Loader2, Building, Users, Power, PowerOff, Link, Copy, Check, ExternalLink, Globe } from "lucide-react";

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
  updated_at: string;
  user_count?: number;
}

const APP_URL = import.meta.env.VITE_COMPANY_APP_URL || "https://core.iconsai.ai";

// Formatar CNPJ
const formatCNPJ = (value: string) => {
  const numbers = value.replace(/\D/g, "").slice(0, 14);
  return numbers
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
};

// Formatar telefone
const formatPhone = (value: string) => {
  const numbers = value.replace(/\D/g, "").slice(0, 11);
  if (numbers.length <= 10) {
    return numbers
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return numbers
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
};

export default function CompaniesTab() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    cnpj: "",
    email: "",
    phone: "",
    address: "",
    primary_color: "#6366f1",
  });

  // Gerar slug a partir do nome
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  // Copiar link
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

  useEffect(() => {
    loadCompanies();
  }, []);

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      cnpj: "",
      email: "",
      phone: "",
      address: "",
      primary_color: "#6366f1",
    });
    setEditingCompany(null);
  };

  // Open dialog for editing
  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      slug: company.slug || "",
      cnpj: company.cnpj || "",
      email: company.email || "",
      phone: company.phone || "",
      address: company.address || "",
      primary_color: company.primary_color || "#6366f1",
    });
    setIsDialogOpen(true);
  };

  // Submit form
  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Nome da empresa e obrigatorio");
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanCNPJ = formData.cnpj.replace(/\D/g, "") || null;
      const cleanPhone = formData.phone.replace(/\D/g, "") || null;
      const slug = formData.slug.trim() || generateSlug(formData.name);

      if (editingCompany) {
        // Update
        const { error } = await supabase
          .from("companies")
          .update({
            name: formData.name.trim(),
            slug: slug || null,
            cnpj: cleanCNPJ,
            email: formData.email.trim() || null,
            phone: cleanPhone,
            address: formData.address.trim() || null,
            primary_color: formData.primary_color,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingCompany.id);

        if (error) throw error;
        toast.success("Empresa atualizada com sucesso");
      } else {
        // Create
        const { error } = await supabase.from("companies").insert({
          name: formData.name.trim(),
          slug: slug || null,
          cnpj: cleanCNPJ,
          email: formData.email.trim() || null,
          phone: cleanPhone,
          address: formData.address.trim() || null,
          primary_color: formData.primary_color,
          is_active: true,
        });

        if (error) throw error;
        toast.success("Empresa criada com sucesso");
      }

      setIsDialogOpen(false);
      resetForm();
      loadCompanies();
    } catch (error: any) {
      console.error("Erro ao salvar empresa:", error);
      if (error.code === "23505") {
        if (error.message?.includes("slug")) {
          toast.error("Slug ja cadastrado para outra empresa");
        } else {
          toast.error("CNPJ ja cadastrado");
        }
      } else {
        toast.error(error.message || "Erro ao salvar empresa");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle active status
  const handleToggleActive = async (company: Company) => {
    try {
      const { error } = await supabase
        .from("companies")
        .update({ is_active: !company.is_active })
        .eq("id", company.id);

      if (error) throw error;
      toast.success(company.is_active ? "Empresa desativada" : "Empresa ativada");
      loadCompanies();
    } catch (error: any) {
      toast.error("Erro ao alterar status");
    }
  };

  // Delete company
  const handleDelete = async (company: Company) => {
    if (!confirm(`Deseja realmente excluir a empresa "${company.name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("companies")
        .delete()
        .eq("id", company.id);

      if (error) throw error;
      toast.success("Empresa excluida com sucesso");
      loadCompanies();
    } catch (error: any) {
      if (error.code === "23503") {
        toast.error("Empresa possui usuarios vinculados");
      } else {
        toast.error("Erro ao excluir empresa");
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Empresas</h2>
          <p className="text-muted-foreground">
            Gerencie empresas e clientes da plataforma
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Empresa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingCompany ? "Editar Empresa" : "Nova Empresa"}
              </DialogTitle>
              <DialogDescription>
                Preencha os dados da empresa
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Empresa *</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Empresa XYZ Ltda"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        name: e.target.value,
                        slug: formData.slug || generateSlug(e.target.value),
                      });
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Slug (URL)</Label>
                  <Input
                    id="slug"
                    placeholder="empresa-xyz"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    URL: {APP_URL}/{formData.slug || "empresa"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    placeholder="00.000.000/0000-00"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="primary_color">Cor Principal</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primary_color"
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={formData.primary_color}
                      onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                      placeholder="#6366f1"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="contato@empresa.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    placeholder="(11) 99999-9999"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Endereco</Label>
                <Input
                  id="address"
                  placeholder="Rua, numero, cidade - UF"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingCompany ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Lista de Empresas
          </CardTitle>
          <CardDescription>
            {companies.length} empresa(s) cadastrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma empresa cadastrada</p>
              <p className="text-sm">Clique em "Nova Empresa" para criar</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>URL / Slug</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: `${company.primary_color}20` }}
                        >
                          <Building className="w-4 h-4" style={{ color: company.primary_color }} />
                        </div>
                        <div>
                          <p className="font-medium">{company.name}</p>
                          {company.address && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {company.address}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {company.slug ? (
                        <div className="flex items-center gap-1">
                          <Globe className="w-4 h-4 text-muted-foreground" />
                          <span className="font-mono text-sm">/{company.slug}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleCopyLink(company)}
                          >
                            {copiedId === company.id ? (
                              <Check className="w-3 h-3 text-green-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => window.open(`${APP_URL}/${company.slug}`, "_blank")}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {company.cnpj ? formatCNPJ(company.cnpj) : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {company.email && <p>{company.email}</p>}
                        {company.phone && (
                          <p className="text-muted-foreground">{formatPhone(company.phone)}</p>
                        )}
                        {!company.email && !company.phone && "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={company.is_active ? "default" : "secondary"}>
                        {company.is_active ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleActive(company)}
                          title={company.is_active ? "Desativar" : "Ativar"}
                        >
                          {company.is_active ? (
                            <PowerOff className="w-4 h-4 text-orange-500" />
                          ) : (
                            <Power className="w-4 h-4 text-green-500" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(company)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(company)}
                        >
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
