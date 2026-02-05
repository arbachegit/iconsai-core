/**
 * CompaniesTab - Cadastro Simplificado de Empresas
 * @version 3.0.0
 *
 * Campos:
 * - Nome da empresa
 * - Apelido (slug)
 * - Gestor (nome, email, telefone, senha aleatoria)
 * - Slugs RAG (checkboxes)
 * - Slugs Scraping (checkboxes)
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  Building,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Copy,
  Check,
  ExternalLink,
  Database,
  Globe,
  User,
  Mail,
  Phone,
  Key,
  RefreshCw,
} from "lucide-react";

const APP_URL = "https://core.iconsai.ai";

// Temas disponiveis para RAG
const RAG_THEMES = [
  { id: "produtos", label: "Produtos" },
  { id: "servicos", label: "Servicos" },
  { id: "faq", label: "FAQ" },
  { id: "politicas", label: "Politicas" },
  { id: "suporte", label: "Suporte" },
  { id: "vendas", label: "Vendas" },
  { id: "rh", label: "RH" },
  { id: "financeiro", label: "Financeiro" },
];

// Temas disponiveis para Scraping
const SCRAPING_THEMES = [
  { id: "website", label: "Website" },
  { id: "blog", label: "Blog" },
  { id: "noticias", label: "Noticias" },
  { id: "catalogo", label: "Catalogo" },
  { id: "precos", label: "Precos" },
  { id: "avaliacoes", label: "Avaliacoes" },
];

interface Company {
  id: string;
  name: string;
  slug: string;
  manager_name: string;
  manager_email: string;
  manager_phone: string;
  rag_slugs: string[];
  scraping_slugs: string[];
  is_active: boolean;
  created_at: string;
}

interface CompanyForm {
  name: string;
  slug: string;
  manager_name: string;
  manager_email: string;
  manager_phone: string;
  manager_password: string;
  rag_slugs: string[];
  scraping_slugs: string[];
}

const generatePassword = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const generateSlug = (name: string) => {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
};

export default function CompaniesTab() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [form, setForm] = useState<CompanyForm>({
    name: "",
    slug: "",
    manager_name: "",
    manager_email: "",
    manager_phone: "",
    manager_password: generatePassword(),
    rag_slugs: [],
    scraping_slugs: [],
  });

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

  const resetForm = () => {
    setForm({
      name: "",
      slug: "",
      manager_name: "",
      manager_email: "",
      manager_phone: "",
      manager_password: generatePassword(),
      rag_slugs: [],
      scraping_slugs: [],
    });
    setEditingCompany(null);
  };

  const handleOpenNew = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setForm({
      name: company.name,
      slug: company.slug,
      manager_name: company.manager_name || "",
      manager_email: company.manager_email || "",
      manager_phone: company.manager_phone || "",
      manager_password: "",
      rag_slugs: company.rag_slugs || [],
      scraping_slugs: company.scraping_slugs || [],
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Nome da empresa e obrigatorio");
      return;
    }
    if (!form.slug.trim()) {
      toast.error("Apelido (slug) e obrigatorio");
      return;
    }
    if (!editingCompany && !form.manager_email.trim()) {
      toast.error("Email do gestor e obrigatorio");
      return;
    }

    setIsSaving(true);
    try {
      if (editingCompany) {
        // Update
        const { error } = await supabase
          .from("companies")
          .update({
            name: form.name.trim(),
            slug: form.slug.trim(),
            manager_name: form.manager_name.trim(),
            manager_email: form.manager_email.trim(),
            manager_phone: form.manager_phone.trim(),
            rag_slugs: form.rag_slugs,
            scraping_slugs: form.scraping_slugs,
          })
          .eq("id", editingCompany.id);

        if (error) throw error;
        toast.success("Empresa atualizada!");
      } else {
        // Create company
        const { data: company, error: companyError } = await supabase
          .from("companies")
          .insert({
            name: form.name.trim(),
            slug: form.slug.trim(),
            manager_name: form.manager_name.trim(),
            manager_email: form.manager_email.trim(),
            manager_phone: form.manager_phone.trim(),
            rag_slugs: form.rag_slugs,
            scraping_slugs: form.scraping_slugs,
            is_active: true,
          })
          .select()
          .single();

        if (companyError) throw companyError;

        // Create manager user via auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: form.manager_email.trim(),
          password: form.manager_password,
          options: {
            data: {
              full_name: form.manager_name.trim(),
              phone: form.manager_phone.trim(),
              company_id: company.id,
              role: "manager",
            },
          },
        });

        if (authError) {
          console.error("Erro ao criar usuario:", authError);
          // Delete company if user creation failed
          await supabase.from("companies").delete().eq("id", company.id);
          throw authError;
        }

        toast.success(
          `Empresa criada! Senha do gestor: ${form.manager_password}`,
          { duration: 10000 }
        );
      }

      setDialogOpen(false);
      resetForm();
      loadCompanies();
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      if (error.code === "23505") {
        toast.error("Ja existe uma empresa com esse slug");
      } else {
        toast.error(error.message || "Erro ao salvar empresa");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (company: Company) => {
    if (!confirm(`Excluir empresa "${company.name}"?`)) return;

    try {
      const { error } = await supabase
        .from("companies")
        .delete()
        .eq("id", company.id);

      if (error) throw error;
      toast.success("Empresa excluida");
      loadCompanies();
    } catch (error: any) {
      toast.error("Erro ao excluir empresa");
    }
  };

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

  const handleCopyLink = async (company: Company) => {
    const link = `${APP_URL}/${company.slug}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(company.id);
      toast.success("Link copiado!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  const toggleRagSlug = (slug: string) => {
    setForm(prev => ({
      ...prev,
      rag_slugs: prev.rag_slugs.includes(slug)
        ? prev.rag_slugs.filter(s => s !== slug)
        : [...prev.rag_slugs, slug],
    }));
  };

  const toggleScrapingSlug = (slug: string) => {
    setForm(prev => ({
      ...prev,
      scraping_slugs: prev.scraping_slugs.includes(slug)
        ? prev.scraping_slugs.filter(s => s !== slug)
        : [...prev.scraping_slugs, slug],
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Empresas</h2>
          <p className="text-muted-foreground">Cadastro de empresas e gestores</p>
        </div>
        <Button onClick={handleOpenNew}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Empresa
        </Button>
      </div>

      {/* Companies Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Gestor</TableHead>
                <TableHead>RAG</TableHead>
                <TableHead>Scraping</TableHead>
                <TableHead>Link</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhuma empresa cadastrada
                  </TableCell>
                </TableRow>
              ) : (
                companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{company.name}</p>
                        <p className="text-xs text-muted-foreground">/{company.slug}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{company.manager_name || "-"}</p>
                        <p className="text-xs text-muted-foreground">{company.manager_email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(company.rag_slugs || []).map(slug => (
                          <Badge key={slug} variant="outline" className="text-xs">
                            <Database className="w-3 h-3 mr-1" />
                            {slug}
                          </Badge>
                        ))}
                        {(!company.rag_slugs || company.rag_slugs.length === 0) && (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(company.scraping_slugs || []).map(slug => (
                          <Badge key={slug} variant="outline" className="text-xs">
                            <Globe className="w-3 h-3 mr-1" />
                            {slug}
                          </Badge>
                        ))}
                        {(!company.scraping_slugs || company.scraping_slugs.length === 0) && (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          /{company.slug}
                        </code>
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
                    </TableCell>
                    <TableCell>
                      <Badge variant={company.is_active ? "default" : "secondary"}>
                        {company.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
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
                          onClick={() => handleToggleActive(company)}
                        >
                          {company.is_active ? (
                            <Loader2 className="w-4 h-4 text-orange-500" />
                          ) : (
                            <Check className="w-4 h-4 text-green-500" />
                          )}
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
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              {editingCompany ? "Editar Empresa" : "Nova Empresa"}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados da empresa e do gestor
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Dados da Empresa */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Building className="w-4 h-4" />
                Dados da Empresa
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Empresa *</Label>
                  <Input
                    id="name"
                    placeholder="Empresa ABC"
                    value={form.name}
                    onChange={(e) => {
                      setForm({
                        ...form,
                        name: e.target.value,
                        slug: form.slug || generateSlug(e.target.value),
                      });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Apelido (URL) *</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">core.iconsai.ai/</span>
                    <Input
                      id="slug"
                      placeholder="empresa-abc"
                      value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Dados do Gestor */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <User className="w-4 h-4" />
                Dados do Gestor
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="manager_name">Nome</Label>
                  <Input
                    id="manager_name"
                    placeholder="Joao Silva"
                    value={form.manager_name}
                    onChange={(e) => setForm({ ...form, manager_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manager_email">Email *</Label>
                  <Input
                    id="manager_email"
                    type="email"
                    placeholder="joao@empresa.com"
                    value={form.manager_email}
                    onChange={(e) => setForm({ ...form, manager_email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manager_phone">Telefone</Label>
                  <Input
                    id="manager_phone"
                    placeholder="(11) 99999-9999"
                    value={form.manager_phone}
                    onChange={(e) => setForm({ ...form, manager_phone: e.target.value })}
                  />
                </div>
                {!editingCompany && (
                  <div className="space-y-2">
                    <Label htmlFor="manager_password">Senha</Label>
                    <div className="flex gap-2">
                      <Input
                        id="manager_password"
                        value={form.manager_password}
                        onChange={(e) => setForm({ ...form, manager_password: e.target.value })}
                        className="font-mono"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setForm({ ...form, manager_password: generatePassword() })}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RAG Slugs */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Database className="w-4 h-4" />
                Temas RAG (Base de Conhecimento)
              </h3>
              <div className="grid grid-cols-4 gap-3">
                {RAG_THEMES.map((theme) => (
                  <div key={theme.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`rag-${theme.id}`}
                      checked={form.rag_slugs.includes(theme.id)}
                      onCheckedChange={() => toggleRagSlug(theme.id)}
                    />
                    <Label htmlFor={`rag-${theme.id}`} className="text-sm cursor-pointer">
                      {theme.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Scraping Slugs */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Temas Scraping (Coleta Web)
              </h3>
              <div className="grid grid-cols-4 gap-3">
                {SCRAPING_THEMES.map((theme) => (
                  <div key={theme.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`scraping-${theme.id}`}
                      checked={form.scraping_slugs.includes(theme.id)}
                      onCheckedChange={() => toggleScrapingSlug(theme.id)}
                    />
                    <Label htmlFor={`scraping-${theme.id}`} className="text-sm cursor-pointer">
                      {theme.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Salvar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
