import { useState } from "react";
import { Mail, User, MessageSquare, Send, X, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ContactModalProps {
  trigger: React.ReactNode;
}

export const ContactModal = ({ trigger }: ContactModalProps) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    subject: "",
    message: "",
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.subject || !formData.message) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Get the configured notification email from admin settings
      const { data: settings } = await supabase
        .from("admin_settings")
        .select("gmail_notification_email")
        .single();

      const toEmail = settings?.gmail_notification_email || "suporte@knowyou.app";

      const { error } = await supabase.functions.invoke("send-email", {
        body: {
          to: toEmail,
          subject: `[Contato KnowYOU] ${formData.subject}`,
          body: `
De: ${formData.email}
Assunto: ${formData.subject}

Mensagem:
${formData.message}

---
Enviado via formulário de contato KnowYOU
          `.trim(),
        },
      });

      if (error) throw error;

      toast({
        title: "Mensagem enviada",
        description: "Sua mensagem foi enviada com sucesso. Retornaremos em breve!",
      });

      setFormData({ email: "", subject: "", message: "" });
      setOpen(false);
    } catch (error) {
      console.error("Error sending contact email:", error);
      toast({
        title: "Erro ao enviar",
        description: "Não foi possível enviar sua mensagem. Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-card/95 backdrop-blur-md border-primary/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-gradient">
            <Mail className="h-5 w-5 text-primary" />
            Fale Conosco
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              Seu Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="bg-background/50 border-primary/20 focus:border-primary/50"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject" className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              Assunto
            </Label>
            <Input
              id="subject"
              type="text"
              placeholder="Qual o assunto da sua mensagem?"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="bg-background/50 border-primary/20 focus:border-primary/50"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message" className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              Mensagem
            </Label>
            <Textarea
              id="message"
              placeholder="Escreva sua mensagem aqui..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="bg-background/50 border-primary/20 focus:border-primary/50 min-h-[120px] resize-none"
              disabled={isLoading}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isLoading}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Enviar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
