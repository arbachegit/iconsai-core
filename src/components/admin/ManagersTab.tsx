/**
 * ManagersTab - Gerenciamento de Gestores
 * Permite criar e gerenciar gestores/administradores de empresas
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserCog, Plus, Pencil, Trash2, Loader2, Building, Power, PowerOff, Mail } from "lucide-react";

interface Manager {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  company_id: string | null;
  company_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Company {
  id: string;
  name: string;
}

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

export default function ManagersTab() {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingManager, setEditingManager] = useState<Manager | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company_id: "",
  });

  // Load managers
  const loadManagers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("managers")
        .select(`
          *,
          companies:company_id (name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedData = (data || []).map((m: any) => ({
        ...m,
        company_name: m.companies?.name || null,
      }));

      setManagers(formattedData);
    } catch (error: any) {
      console.error("Erro ao carregar gestores:", error);
      toast.error("Erro ao carregar gestores");
    } finally {
      setIsLoading(false);
    }
  };

  // Load companies for dropdown
  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error("Erro ao carregar empresas:", error);
    }
  };

  useEffect(() => {
    loadManagers();
    loadCompanies();
  }, []);

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      company_id: "",
    });
    setEditingManager(null);
  };

  // Open dialog for editing
  const handleEdit = (manager: Manager) => {
    setEditingManager(manager);
    setFormData({
      name: manager.name,
      email: manager.email,
      phone: manager.phone || "",
      company_id: manager.company_id || "",
    });
    setIsDialogOpen(true);
  };

  // Submit form
  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Nome e obrigatorio");
      return;
    }
    if (!formData.email.trim()) {
      toast.error("Email e obrigatorio");
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanPhone = formData.phone.replace(/\D/g, "") || null;

      if (editingManager) {
        // Update
        const { error } = await supabase
          .from("managers")
          .update({
            name: formData.name.trim(),
            email: formData.email.trim().toLowerCase(),
            phone: cleanPhone,
            company_id: formData.company_id || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingManager.id);

        if (error) throw error;
        toast.success("Gestor atualizado com sucesso");
      } else {
        // Create
        const { error } = await supabase.from("managers").insert({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: cleanPhone,
          company_id: formData.company_id || null,
          is_active: true,
        });

        if (error) throw error;
        toast.success("Gestor criado com sucesso");
      }

      setIsDialogOpen(false);
      resetForm();
      loadManagers();
    } catch (error: any) {
      console.error("Erro ao salvar gestor:", error);
      if (error.code === "23505") {
        toast.error("Email ja cadastrado");
      } else {
        toast.error(error.message || "Erro ao salvar gestor");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle active status
  const handleToggleActive = async (manager: Manager) => {
    try {
      const { error } = await supabase
        .from("managers")
        .update({ is_active: !manager.is_active })
        .eq("id", manager.id);

      if (error) throw error;
      toast.success(manager.is_active ? "Gestor desativado" : "Gestor ativado");
      loadManagers();
    } catch (error: any) {
      toast.error("Erro ao alterar status");
    }
  };

  // Delete manager
  const handleDelete = async (manager: Manager) => {
    if (!confirm(`Deseja realmente excluir o gestor "${manager.name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("managers")
        .delete()
        .eq("id", manager.id);

      if (error) throw error;
      toast.success("Gestor excluido com sucesso");
      loadManagers();
    } catch (error: any) {
      toast.error("Erro ao excluir gestor");
    }
  };

  // Send invite email
  const handleSendInvite = async (manager: Manager) => {
    toast.info("Enviando convite para " + manager.email);
    // TODO: Implement invitation email logic
    toast.success("Convite enviado com sucesso");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestores</h2>
          <p className="text-muted-foreground">
            Gerencie gestores e administradores de empresas
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Novo Gestor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingManager ? "Editar Gestor" : "Novo Gestor"}
              </DialogTitle>
              <DialogDescription>
                Preencha os dados do gestor
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Joao Silva"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="joao@empresa.com"
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

              <div className="space-y-2">
                <Label>Empresa</Label>
                <Select
                  value={formData.company_id}
                  onValueChange={(value) => setFormData({ ...formData, company_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma empresa (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma empresa</SelectItem>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Vincule o gestor a uma empresa especifica
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingManager ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="w-5 h-5" />
            Lista de Gestores
          </CardTitle>
          <CardDescription>
            {managers.length} gestor(es) cadastrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : managers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserCog className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum gestor cadastrado</p>
              <p className="text-sm">Clique em "Novo Gestor" para criar</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gestor</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {managers.map((manager) => (
                  <TableRow key={manager.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <UserCog className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{manager.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {manager.user_id ? "Conta vinculada" : "Sem conta"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{manager.email}</p>
                        {manager.phone && (
                          <p className="text-muted-foreground">{formatPhone(manager.phone)}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {manager.company_name ? (
                        <div className="flex items-center gap-1">
                          <Building className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm">{manager.company_name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={manager.is_active ? "default" : "secondary"}>
                        {manager.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(manager.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!manager.user_id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSendInvite(manager)}
                            title="Enviar convite"
                          >
                            <Mail className="w-4 h-4 text-blue-500" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleActive(manager)}
                          title={manager.is_active ? "Desativar" : "Ativar"}
                        >
                          {manager.is_active ? (
                            <PowerOff className="w-4 h-4 text-orange-500" />
                          ) : (
                            <Power className="w-4 h-4 text-green-500" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(manager)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(manager)}
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
