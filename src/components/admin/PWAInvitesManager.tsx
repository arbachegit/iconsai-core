import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  UserPlus,
  Mail,
  MessageSquare,
  Smartphone,
  Copy,
  CheckCircle,
  XCircle,
  Loader2,
  Send,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PWAUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
}

interface PWAInvite {
  id: string;
  user_id: string;
  access_code: string;
  channel: "email" | "whatsapp" | "sms";
  is_used: boolean;
  used_at: string | null;
  created_at: string;
  pwa_users?: PWAUser;
}

type InviteChannel = "email" | "whatsapp" | "sms";

const generateAccessCode = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export default function PWAInvitesManager() {
  const [invites, setInvites] = useState<PWAInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  // Form state
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<InviteChannel>("whatsapp");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("pwa_invites")
        .select("*, pwa_users(*)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setInvites(data as PWAInvite[]);
    } catch (err) {
      console.error("Erro ao carregar convites:", err);
      toast.error("Erro ao carregar convites");
    } finally {
      setLoading(false);
    }
  };

  const createInvite = async () => {
    if (!newUserName.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (selectedChannel === "email" && !newUserEmail.trim()) {
      toast.error("Email é obrigatório para envio por email");
      return;
    }

    if ((selectedChannel === "whatsapp" || selectedChannel === "sms") && !newUserPhone.trim()) {
      toast.error("Telefone é obrigatório para envio por WhatsApp/SMS");
      return;
    }

    setCreating(true);
    try {
      // 1. Criar usuário
      const { data: user, error: userError } = await supabase
        .from("pwa_users")
        .insert({
          name: newUserName.trim(),
          email: newUserEmail.trim() || null,
          phone: newUserPhone.trim() || null,
        })
        .select()
        .single();

      if (userError) throw userError;

      // 2. Gerar código único
      const accessCode = generateAccessCode();

      // 3. Criar convite
      const { error: inviteError } = await supabase
        .from("pwa_invites")
        .insert({
          user_id: user.id,
          access_code: accessCode,
          channel: selectedChannel,
          is_used: false,
        });

      if (inviteError) throw inviteError;

      toast.success(`Convite criado! Código: ${accessCode}`);
      
      // Reset form
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPhone("");
      setDialogOpen(false);
      
      // Refresh data
      fetchData();

    } catch (err) {
      console.error("Erro ao criar convite:", err);
      toast.error("Erro ao criar convite");
    } finally {
      setCreating(false);
    }
  };

  const sendInvite = async (invite: PWAInvite) => {
    setSending(invite.id);
    try {
      const user = invite.pwa_users;
      if (!user) throw new Error("Usuário não encontrado");

      const pwaUrl = `${window.location.origin}/pwa`;
      const message = `Olá ${user.name}!\n\nVocê foi convidado para usar o KnowYOU Voice Assistant.\n\nSeu código de acesso: ${invite.access_code}\n\nAcesse: ${pwaUrl}`;

      if (invite.channel === "whatsapp" && user.phone) {
        // Abrir WhatsApp
        const phone = user.phone.replace(/\D/g, "");
        const encoded = encodeURIComponent(message);
        window.open(`https://wa.me/${phone}?text=${encoded}`, "_blank");
        toast.success("WhatsApp aberto com a mensagem");
      } else if (invite.channel === "email" && user.email) {
        // Abrir cliente de email
        const subject = encodeURIComponent("Seu acesso ao KnowYOU Voice Assistant");
        const body = encodeURIComponent(message);
        window.open(`mailto:${user.email}?subject=${subject}&body=${body}`, "_blank");
        toast.success("Email aberto com a mensagem");
      } else if (invite.channel === "sms" && user.phone) {
        // Copiar para clipboard e notificar
        await navigator.clipboard.writeText(message);
        toast.success("Mensagem copiada! Cole no seu app de SMS");
      }

    } catch (err) {
      console.error("Erro ao enviar convite:", err);
      toast.error("Erro ao enviar convite");
    } finally {
      setSending(null);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Código copiado!");
  };

  const deleteInvite = async (id: string) => {
    try {
      await supabase.from("pwa_invites").delete().eq("id", id);
      toast.success("Convite removido");
      fetchData();
    } catch (err) {
      toast.error("Erro ao remover convite");
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "email": return <Mail className="w-4 h-4" />;
      case "whatsapp": return <MessageSquare className="w-4 h-4" />;
      case "sms": return <Smartphone className="w-4 h-4" />;
      default: return null;
    }
  };

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case "email": return "border-blue-500 text-blue-500";
      case "whatsapp": return "border-green-500 text-green-500";
      case "sms": return "border-purple-500 text-purple-500";
      default: return "";
    }
  };

  return (
    <div className="space-y-4">
      {/* Header com ações */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <UserPlus className="w-4 h-4 mr-2" />
              Novo Convite
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Convite</DialogTitle>
              <DialogDescription>
                Preencha os dados do usuário e escolha o canal de envio
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Nome do usuário"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone (com DDD)</Label>
                  <Input
                    id="phone"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    placeholder="+5511999999999"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Canal de Envio</Label>
                <Select value={selectedChannel} onValueChange={(v) => setSelectedChannel(v as InviteChannel)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-green-500" />
                        WhatsApp
                      </div>
                    </SelectItem>
                    <SelectItem value="email">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-blue-500" />
                        Email
                      </div>
                    </SelectItem>
                    <SelectItem value="sms">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-purple-500" />
                        SMS (Fallback)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={createInvite} disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Criar Convite
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-3">
          <p className="text-2xl font-bold">{invites.length}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </Card>
        <Card className="p-3">
          <p className="text-2xl font-bold text-green-500">
            {invites.filter(i => i.is_used).length}
          </p>
          <p className="text-xs text-muted-foreground">Usados</p>
        </Card>
        <Card className="p-3">
          <p className="text-2xl font-bold text-amber-500">
            {invites.filter(i => !i.is_used).length}
          </p>
          <p className="text-xs text-muted-foreground">Pendentes</p>
        </Card>
      </div>

      {/* Tabela de Convites */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : invites.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum convite criado ainda
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invites.map((invite) => (
                <TableRow key={invite.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{invite.pwa_users?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {invite.pwa_users?.email || invite.pwa_users?.phone}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                        {invite.access_code}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => copyCode(invite.access_code)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getChannelColor(invite.channel)}>
                      <span className="flex items-center gap-1">
                        {getChannelIcon(invite.channel)}
                        {invite.channel}
                      </span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {invite.is_used ? (
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Usado
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <XCircle className="w-3 h-3 mr-1" />
                        Pendente
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(invite.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {!invite.is_used && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => sendInvite(invite)}
                          disabled={sending === invite.id}
                        >
                          {sending === invite.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteInvite(invite.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
