import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { 
  Shield, 
  Plus, 
  Trash2, 
  RefreshCw,
  Globe,
  User,
  Calendar,
  Info
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface WhitelistEntry {
  id: string;
  ip_address: string;
  user_email: string | null;
  user_name: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
}

export function SecurityWhitelist() {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    ip_address: "",
    user_name: "",
    user_email: "",
    description: "",
    expires_at: "",
  });

  // Fetch whitelist entries
  const { data: entries, isLoading, refetch } = useQuery({
    queryKey: ["security-whitelist"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("security_whitelist")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as WhitelistEntry[];
    },
  });

  // Add mutation
  const addMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from("security_whitelist")
        .insert({
          ip_address: data.ip_address,
          user_name: data.user_name || null,
          user_email: data.user_email || null,
          description: data.description || null,
          expires_at: data.expires_at || null,
          is_active: true,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["security-whitelist"] });
      toast.success("IP adicionado à whitelist");
      setIsAddDialogOpen(false);
      setFormData({
        ip_address: "",
        user_name: "",
        user_email: "",
        description: "",
        expires_at: "",
      });
    },
    onError: (error) => {
      toast.error(`Erro ao adicionar: ${error.message}`);
    },
  });

  // Toggle active mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("security_whitelist")
        .update({ is_active })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["security-whitelist"] });
      toast.success("Status atualizado");
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("security_whitelist")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["security-whitelist"] });
      toast.success("Entrada removida");
    },
    onError: (error) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });

  const handleAdd = () => {
    if (!formData.ip_address) {
      toast.error("Endereço IP é obrigatório");
      return;
    }
    addMutation.mutate(formData);
  };

  // Fetch current IP
  const [currentIP, setCurrentIP] = useState<string | null>(null);
  
  const fetchCurrentIP = async () => {
    try {
      const response = await fetch("https://api.ipify.org?format=json");
      const data = await response.json();
      setCurrentIP(data.ip);
    } catch {
      console.error("Could not fetch current IP");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Whitelist de IPs</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar IP
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar IP à Whitelist</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="ip_address">Endereço IP *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="ip_address"
                      placeholder="Ex: 192.168.1.1"
                      value={formData.ip_address}
                      onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={async () => {
                        await fetchCurrentIP();
                        if (currentIP) {
                          setFormData({ ...formData, ip_address: currentIP });
                        }
                      }}
                    >
                      Meu IP
                    </Button>
                  </div>
                  {currentIP && (
                    <p className="text-xs text-muted-foreground">
                      Seu IP atual: {currentIP}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="user_name">Nome do Usuário</Label>
                  <Input
                    id="user_name"
                    placeholder="Ex: Fernando (Admin)"
                    value={formData.user_name}
                    onChange={(e) => setFormData({ ...formData, user_name: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="user_email">Email</Label>
                  <Input
                    id="user_email"
                    type="email"
                    placeholder="Ex: admin@knowyou.app"
                    value={formData.user_email}
                    onChange={(e) => setFormData({ ...formData, user_email: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    placeholder="Ex: Super Admin - Acesso para desenvolvimento"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="expires_at">Expiração (opcional)</Label>
                  <Input
                    id="expires_at"
                    type="datetime-local"
                    value={formData.expires_at}
                    onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Deixe em branco para whitelist permanente
                  </p>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancelar</Button>
                </DialogClose>
                <Button onClick={handleAdd} disabled={addMutation.isPending}>
                  {addMutation.isPending ? "Adicionando..." : "Adicionar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Info Card */}
      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-500">O que é a Whitelist?</p>
              <p className="text-sm text-muted-foreground mt-1">
                IPs na whitelist podem usar DevTools e outras ferramentas de desenvolvimento 
                <strong className="text-foreground"> sem serem banidos</strong>. 
                As ações ainda são registradas na auditoria (com flag "whitelisted"), 
                mas nenhuma ação punitiva é tomada.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">IPs Cadastrados</CardTitle>
          <CardDescription>
            {entries?.length || 0} entrada(s) na whitelist
          </CardDescription>
        </CardHeader>
        <CardContent>
          {entries && entries.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IP</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expiração</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => {
                  const isExpired = entry.expires_at && new Date(entry.expires_at) < new Date();
                  
                  return (
                    <TableRow key={entry.id} className={isExpired ? "opacity-50" : ""}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <code className="text-sm">{entry.ip_address}</code>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {entry.user_name && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{entry.user_name}</span>
                            </div>
                          )}
                          {entry.user_email && (
                            <span className="text-xs text-muted-foreground">{entry.user_email}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {entry.description || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={entry.is_active}
                            onCheckedChange={(checked) => 
                              toggleMutation.mutate({ id: entry.id, is_active: checked })
                            }
                            disabled={toggleMutation.isPending}
                          />
                          {isExpired ? (
                            <Badge variant="outline" className="text-red-500">Expirado</Badge>
                          ) : entry.is_active ? (
                            <Badge className="bg-green-500">Ativo</Badge>
                          ) : (
                            <Badge variant="outline">Inativo</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {entry.expires_at ? (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(entry.expires_at).toLocaleDateString("pt-BR")}
                          </div>
                        ) : (
                          <Badge variant="secondary">Permanente</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          onClick={() => {
                            if (confirm("Remover esta entrada da whitelist?")) {
                              deleteMutation.mutate(entry.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Nenhum IP na whitelist</p>
              <p className="text-sm mt-1">Adicione IPs de administradores para permitir uso de DevTools</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
