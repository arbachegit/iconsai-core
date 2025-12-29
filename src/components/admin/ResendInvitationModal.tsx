import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Monitor, Smartphone, Mail, MessageSquare, Send, Loader2 } from "lucide-react";

interface Invitation {
  id: string;
  token: string;
  name: string;
  email: string;
  phone?: string | null;
  has_platform_access: boolean | null;
  has_app_access: boolean | null;
  status: string;
}

interface ResendInvitationModalProps {
  open: boolean;
  onClose: () => void;
  invitation: Invitation | null;
  onSuccess?: () => void;
}

export function ResendInvitationModal({ open, onClose, invitation, onSuccess }: ResendInvitationModalProps) {
  const [product, setProduct] = useState<"platform" | "app" | "both">("both");
  const [channel, setChannel] = useState<"email" | "whatsapp" | "both">("both");
  const [loading, setLoading] = useState(false);

  if (!invitation) return null;

  const hasBothAccess = invitation.has_platform_access && invitation.has_app_access;
  const hasPhone = !!invitation.phone;

  const handleResend = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("resend-invitation-code", {
        body: {
          token: invitation.token,
          product,
          channel
        }
      });

      if (error) throw error;

      toast.success("Convite reenviado!", {
        description: data.results?.join("\n") || "Enviado com sucesso"
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error("Erro ao reenviar", {
        description: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Send className="w-5 h-5" />
            Reenviar Convite
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Info do usuário */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-1">
            <p className="font-medium text-foreground">{invitation.name}</p>
            <p className="text-sm text-muted-foreground">{invitation.email}</p>
            {invitation.phone && (
              <p className="text-sm text-muted-foreground">{invitation.phone}</p>
            )}
          </div>

          {/* Seleção de Produto */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Produto</Label>
            <RadioGroup
              value={product}
              onValueChange={(v) => setProduct(v as "platform" | "app" | "both")}
              className="grid grid-cols-3 gap-2"
            >
              {invitation.has_platform_access && (
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="platform" id="platform" className="sr-only" />
                  <Label
                    htmlFor="platform"
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all w-full ${
                      product === "platform"
                        ? "border-violet-500 bg-violet-500/10 text-violet-600"
                        : "border-border hover:border-violet-300"
                    }`}
                  >
                    <Monitor className="w-5 h-5" />
                    <span className="text-xs">Plataforma</span>
                  </Label>
                </div>
              )}

              {invitation.has_app_access && (
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="app" id="app" className="sr-only" />
                  <Label
                    htmlFor="app"
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all w-full ${
                      product === "app"
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-600"
                        : "border-border hover:border-emerald-300"
                    }`}
                  >
                    <Smartphone className="w-5 h-5" />
                    <span className="text-xs">APP</span>
                  </Label>
                </div>
              )}

              {hasBothAccess && (
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="both" id="both-product" className="sr-only" />
                  <Label
                    htmlFor="both-product"
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all w-full ${
                      product === "both"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex -space-x-1">
                      <Monitor className="w-4 h-4 text-violet-500" />
                      <Smartphone className="w-4 h-4 text-emerald-500" />
                    </div>
                    <span className="text-xs">Ambos</span>
                  </Label>
                </div>
              )}
            </RadioGroup>
          </div>

          {/* Seleção de Canal */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Canal de Envio</Label>
            <RadioGroup
              value={channel}
              onValueChange={(v) => setChannel(v as "email" | "whatsapp" | "both")}
              className="grid grid-cols-3 gap-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="email" id="email" className="sr-only" />
                <Label
                  htmlFor="email"
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all w-full ${
                    channel === "email"
                      ? "border-blue-500 bg-blue-500/10 text-blue-600"
                      : "border-border hover:border-blue-300"
                  }`}
                >
                  <Mail className="w-5 h-5" />
                  <span className="text-xs">Email</span>
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <RadioGroupItem value="whatsapp" id="whatsapp" className="sr-only" disabled={!hasPhone} />
                <Label
                  htmlFor="whatsapp"
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all w-full ${
                    !hasPhone
                      ? "opacity-50 cursor-not-allowed"
                      : channel === "whatsapp"
                      ? "border-green-500 bg-green-500/10 text-green-600"
                      : "border-border hover:border-green-300"
                  }`}
                >
                  <MessageSquare className="w-5 h-5" />
                  <span className="text-xs">WhatsApp</span>
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <RadioGroupItem value="both" id="both-channel" className="sr-only" />
                <Label
                  htmlFor="both-channel"
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all w-full ${
                    channel === "both"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex -space-x-1">
                    <Mail className="w-4 h-4 text-blue-500" />
                    <MessageSquare className="w-4 h-4 text-green-500" />
                  </div>
                  <span className="text-xs">Ambos</span>
                </Label>
              </div>
            </RadioGroup>
            {!hasPhone && (
              <p className="text-xs text-amber-500 flex items-center gap-1">
                ⚠️ WhatsApp indisponível (telefone não cadastrado)
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleResend} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Reenviar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
