import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Webhook, CheckCircle, XCircle, RefreshCw, ExternalLink } from 'lucide-react';

interface ApiRegistry {
  id: string;
  name: string;
  provider: string;
  base_url: string;
  method: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const PROVIDERS = ['BCB', 'IBGE', 'Internal', 'Scraper'] as const;

export default function ApiManagementTab() {
  const { t } = useTranslation();
  const [apis, setApis] = useState<ApiRegistry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingApi, setEditingApi] = useState<ApiRegistry | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    provider: 'BCB' as string,
    base_url: '',
    method: 'GET',
    description: '',
    status: 'active'
  });

  useEffect(() => {
    fetchApis();
  }, []);

  const fetchApis = async () => {
    try {
      const { data, error } = await supabase
        .from('system_api_registry')
        .select('*')
        .order('provider', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setApis(data || []);
    } catch (error) {
      console.error('Error fetching APIs:', error);
      toast.error('Erro ao carregar APIs');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (api?: ApiRegistry) => {
    if (api) {
      setEditingApi(api);
      setFormData({
        name: api.name,
        provider: api.provider,
        base_url: api.base_url,
        method: api.method,
        description: api.description || '',
        status: api.status
      });
    } else {
      setEditingApi(null);
      setFormData({
        name: '',
        provider: 'BCB',
        base_url: '',
        method: 'GET',
        description: '',
        status: 'active'
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.base_url) {
      toast.error('Nome e URL são obrigatórios');
      return;
    }

    try {
      if (editingApi) {
        const { error } = await supabase
          .from('system_api_registry')
          .update({
            name: formData.name,
            provider: formData.provider,
            base_url: formData.base_url,
            method: formData.method,
            description: formData.description || null,
            status: formData.status
          })
          .eq('id', editingApi.id);

        if (error) throw error;
        toast.success('API atualizada com sucesso');
      } else {
        const { error } = await supabase
          .from('system_api_registry')
          .insert({
            name: formData.name,
            provider: formData.provider,
            base_url: formData.base_url,
            method: formData.method,
            description: formData.description || null,
            status: formData.status
          });

        if (error) throw error;
        toast.success('API criada com sucesso');
      }

      setIsDialogOpen(false);
      fetchApis();
    } catch (error) {
      console.error('Error saving API:', error);
      toast.error('Erro ao salvar API');
    }
  };

  const handleDelete = async (api: ApiRegistry) => {
    if (!confirm(`Tem certeza que deseja excluir "${api.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('system_api_registry')
        .delete()
        .eq('id', api.id);

      if (error) throw error;
      toast.success('API excluída com sucesso');
      fetchApis();
    } catch (error) {
      console.error('Error deleting API:', error);
      toast.error('Erro ao excluir API');
    }
  };

  const handleToggleStatus = async (api: ApiRegistry) => {
    try {
      const newStatus = api.status === 'active' ? 'inactive' : 'active';
      const { error } = await supabase
        .from('system_api_registry')
        .update({ status: newStatus })
        .eq('id', api.id);

      if (error) throw error;
      toast.success(`API ${newStatus === 'active' ? 'ativada' : 'desativada'}`);
      fetchApis();
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'BCB': return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      case 'IBGE': return 'bg-green-500/20 text-green-400 border-green-500/40';
      case 'Internal': return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
      case 'Scraper': return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/40 bg-card/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <Webhook className="h-6 w-6 text-primary" />
            <CardTitle>Gestão de APIs Externas</CardTitle>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="gap-2">
                <Plus className="h-4 w-4" />
                Nova API
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>
                  {editingApi ? 'Editar API' : 'Cadastrar Nova API'}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Taxa Selic"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <Select
                      value={formData.provider}
                      onValueChange={(v) => setFormData({ ...formData, provider: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVIDERS.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>URL do Endpoint *</Label>
                  <Input
                    value={formData.base_url}
                    onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
                    placeholder="https://api.bcb.gov.br/dados/serie/..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Método HTTP</Label>
                    <Select
                      value={formData.method}
                      onValueChange={(v) => setFormData({ ...formData, method: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(v) => setFormData({ ...formData, status: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="inactive">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição da API e seus dados..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave}>
                  {editingApi ? 'Salvar Alterações' : 'Cadastrar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead className="hidden md:table-cell">URL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apis.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhuma API cadastrada
                  </TableCell>
                </TableRow>
              ) : (
                apis.map((api) => (
                  <TableRow key={api.id}>
                    <TableCell className="font-medium">
                      <div>
                        {api.name}
                        {api.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 max-w-[200px] truncate">
                            {api.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getProviderColor(api.provider)}>
                        {api.provider}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-1 max-w-[300px]">
                        <span className="text-xs text-muted-foreground truncate">
                          {api.base_url}
                        </span>
                        <a
                          href={api.base_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleToggleStatus(api)}
                        className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                      >
                        {api.status === 'active' ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-xs text-green-500">Ativo</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-red-500" />
                            <span className="text-xs text-red-500">Inativo</span>
                          </>
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(api)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(api)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
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
    </div>
  );
}
