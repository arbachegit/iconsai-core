import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Send, Loader2, User, MessageSquare, CheckCircle2, XCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ContactModalProps {
  children: React.ReactNode;
}

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const ContactModal = ({ children }: ContactModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  const isEmailValid = useMemo(() => validateEmail(email), [email]);
  const showEmailError = emailTouched && email.length > 0 && !isEmailValid;
  const showEmailSuccess = emailTouched && email.length > 0 && isEmailValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isEmailValid) {
      toast({
        title: "Email inválido",
        description: "Por favor, insira um endereço de email válido.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSending(true);

    try {
      const { data: settings } = await supabase
        .from('admin_settings')
        .select('gmail_notification_email')
        .single();

      const recipientEmail = settings?.gmail_notification_email || 'suporte@knowyou.app';

      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to: recipientEmail,
          subject: `[Contato KnowYOU] ${subject}`,
          html: `
            <h2>Nova mensagem de contato</h2>
            <p><strong>De:</strong> ${email}</p>
            <p><strong>Assunto:</strong> ${subject}</p>
            <hr />
            <p>${message.replace(/\n/g, '<br />')}</p>
          `,
          replyTo: email,
        },
      });

      if (error) throw error;

      toast({
        title: "Mensagem enviada!",
        description: "Entraremos em contato em breve.",
      });

      setEmail("");
      setSubject("");
      setMessage("");
      setEmailTouched(false);
      setIsOpen(false);
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: "Erro ao enviar",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const isFormValid = isEmailValid && subject.trim() && message.trim();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
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
            <div className="relative">
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmailTouched(true)}
                className={`bg-background/50 pr-10 transition-colors ${
                  showEmailError 
                    ? 'border-destructive focus:border-destructive' 
                    : showEmailSuccess 
                      ? 'border-green-500 focus:border-green-500' 
                      : 'border-primary/20 focus:border-primary/50'
                }`}
                disabled={isSending}
              />
              {showEmailSuccess && (
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
              )}
              {showEmailError && (
                <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
              )}
            </div>
            {showEmailError && (
              <p className="text-xs text-destructive mt-1">
                Por favor, insira um email válido (ex: nome@dominio.com)
              </p>
            )}
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
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="bg-background/50 border-primary/20 focus:border-primary/50"
              disabled={isSending}
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
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-background/50 border-primary/20 focus:border-primary/50 min-h-[120px] resize-none"
              disabled={isSending}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsOpen(false)}
              disabled={isSending}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSending || !isFormValid}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              {isSending ? (
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
