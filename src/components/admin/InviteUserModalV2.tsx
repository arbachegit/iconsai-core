import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Mail, Phone, Copy, Check, UserPlus, Monitor, Smartphone } from "lucide-react";

const inviteSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
  role: z.enum(["user", "admin", "superadmin"]),
  sendViaEmail: z.boolean(),
  sendViaWhatsapp: z.boolean(),
  hasPlatformAccess: z.boolean().default(true),
  hasAppAccess: z.boolean().default(false),
}).refine(
  (data) => data.sendViaEmail || data.sendViaWhatsapp,
  { message: "Selecione pelo menos um método de envio", path: ["sendViaEmail"] }
).refine(
  (data) => !data.sendViaWhatsapp || (data.phone && data.phone.length >= 10),
  { message: "Telefone é obrigatório para envio via WhatsApp", path: ["phone"] }
).refine(
  (data) => data.hasPlatformAccess || data.hasAppAccess,
  { message: "Selecione pelo menos um tipo de acesso", path: ["hasPlatformAccess"] }
);

type InviteFormData = z.infer<typeof inviteSchema>;

interface InviteUserModalV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const InviteUserModalV2 = ({ open, onOpenChange, onSuccess }: InviteUserModalV2Props) => {
  const [isLoading, setIsLoading] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ url: string; token: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      role: "user",
      sendViaEmail: true,
      sendViaWhatsapp: false,
      hasPlatformAccess: true,
      hasAppAccess: false,
    },
  });

  const sendViaWhatsapp = watch("sendViaWhatsapp");
  const hasPlatformAccess = watch("hasPlatformAccess");
  const hasAppAccess = watch("hasAppAccess");

  const onSubmit = async (data: InviteFormData) => {
    setIsLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("create-invitation", {
        body: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          role: data.role,
          sendViaEmail: data.sendViaEmail,
          sendViaWhatsapp: data.sendViaWhatsapp,
          hasPlatformAccess: data.hasPlatformAccess,
          hasAppAccess: data.hasAppAccess,
        },
      });

      if (error) throw error;
      if (result.error) throw new Error(result.error);

      setInviteResult({
        url: result.inviteUrl,
        token: result.invitation.token,
      });

      toast.success("Convite enviado com sucesso!");
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar convite");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (inviteResult?.url) {
      await navigator.clipboard.writeText(inviteResult.url);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    reset();
    setInviteResult(null);
    setCopied(false);
    onOpenChange(false);
  };

  // Format phone as user types
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Convidar Usuário
          </DialogTitle>
          <DialogDescription>
            Envie um convite para um novo usuário se cadastrar na plataforma.
          </DialogDescription>
        </DialogHeader>

        {!inviteResult ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo *</Label>
              <Input
                id="name"
                placeholder="João Silva"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="joao@empresa.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">
                Telefone {sendViaWhatsapp && "*"}
              </Label>
              <Input
                id="phone"
                placeholder="(11) 99999-9999"
                {...register("phone", {
                  onChange: (e) => {
                    e.target.value = formatPhone(e.target.value);
                  },
                })}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>

            {/* Seção de Acesso */}
            <div className="space-y-4 pt-2 border-t">
              <Label className="text-base font-semibold">Tipo de Acesso *</Label>
              
              {errors.hasPlatformAccess && (
                <p className="text-sm text-destructive">{errors.hasPlatformAccess.message}</p>
              )}

              {/* Acesso à Plataforma */}
              <div className={`p-4 rounded-lg border transition-colors ${hasPlatformAccess ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Monitor className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Acesso à Plataforma</p>
                      <p className="text-sm text-muted-foreground">Computador ou Tablet</p>
                    </div>
                  </div>
                  <Switch
                    checked={hasPlatformAccess}
                    onCheckedChange={(checked) => setValue("hasPlatformAccess", checked)}
                  />
                </div>
                
                {hasPlatformAccess && (
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <Label className="text-sm">Tipo de permissão</Label>
                    <Select
                      defaultValue="user"
                      onValueChange={(value) => setValue("role", value as any)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecione o tipo de acesso" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Usuário</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="superadmin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Acesso ao APP */}
              <div className={`p-4 rounded-lg border transition-colors ${hasAppAccess ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-5 w-5 text-emerald-500" />
                    <div>
                      <p className="font-medium">Acesso ao APP</p>
                      <p className="text-sm text-muted-foreground">Apenas Celular via WhatsApp</p>
                    </div>
                  </div>
                  <Switch
                    checked={hasAppAccess}
                    onCheckedChange={(checked) => setValue("hasAppAccess", checked)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <Label>Enviar convite via *</Label>
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={watch("sendViaEmail")}
                    onCheckedChange={(checked) => setValue("sendViaEmail", !!checked)}
                  />
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Email</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={watch("sendViaWhatsapp")}
                    onCheckedChange={(checked) => setValue("sendViaWhatsapp", !!checked)}
                  />
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">WhatsApp</span>
                </label>
              </div>
              {errors.sendViaEmail && (
                <p className="text-sm text-destructive">{errors.sendViaEmail.message}</p>
              )}
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar Convite"
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-center">
              <div className="text-4xl mb-2">✅</div>
              <h3 className="font-semibold text-lg text-emerald-600">
                Convite Enviado!
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                O usuário receberá o convite pelos métodos selecionados.
              </p>
              <div className="flex items-center justify-center gap-3 mt-3">
                {hasPlatformAccess && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Monitor className="h-4 w-4" />
                    <span>Plataforma</span>
                  </div>
                )}
                {hasAppAccess && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Smartphone className="h-4 w-4" />
                    <span>APP</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Link do convite</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={inviteResult.url}
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Este link expira em 7 dias.
              </p>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Fechar</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
