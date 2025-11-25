import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import { useToast } from "@/hooks/use-toast";
import { Mail, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const EmailTab = () => {
  const { settings, updateSettings } = useAdminSettings();
  const { toast } = useToast();
  const [email, setEmail] = useState(settings?.gmail_notification_email || "");
  const [isSending, setIsSending] = useState(false);

  const handleSave = async () => {
    try {
      await updateSettings({
        gmail_notification_email: email,
        gmail_api_configured: !!email,
      });

      toast({
        title: "Configuração salva",
        description: "Email de notificação atualizado.",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível atualizar o email.",
        variant: "destructive",
      });
    }
  };

  const handleTestEmail = async () => {
    if (!email) return;
    
    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: email,
          subject: 'Teste de Email - KnowYOU',
          body: 'Este é um email de teste do sistema KnowYOU. Se você recebeu esta mensagem, a integração está funcionando corretamente!',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #7c3aed;">Teste de Email - KnowYOU</h1>
              <p>Este é um email de teste do sistema KnowYOU.</p>
              <p>Se você recebeu esta mensagem, a integração com Resend está funcionando corretamente!</p>
              <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
              <p style="color: #6b7280; font-size: 14px;">KnowYOU - Tecnologia em Saúde</p>
            </div>
          `
        }
      });

      if (error) throw error;

      toast({
        title: "Email enviado!",
        description: "Verifique sua caixa de entrada.",
      });
    } catch (error: any) {
      console.error('Error sending test email:', error);
      toast({
        title: "Erro ao enviar email",
        description: error.message || "Não foi possível enviar o email de teste.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Configuração de Email</h1>
        <p className="text-muted-foreground mt-2">
          Configure as notificações por email usando Resend
        </p>
      </div>

      <Card className="p-6 bg-card/50 backdrop-blur-sm border-primary/20">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Mail className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-foreground mb-2">
              Email de Notificações
            </h2>
            <p className="text-muted-foreground text-sm">
              Receba alertas quando houver novas conversas no chat KnowYOU.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Email
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="bg-background/50"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} className="gap-2">
              <Mail className="w-4 h-4" />
              Salvar
            </Button>
            <Button
              variant="outline"
              onClick={handleTestEmail}
              className="gap-2"
              disabled={!email || isSending}
            >
              <Send className="w-4 h-4" />
              {isSending ? "Enviando..." : "Enviar Teste"}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-card/50 backdrop-blur-sm border-primary/20">
        <h2 className="text-xl font-bold text-foreground mb-4">
          Instruções de Configuração Resend
        </h2>

        <ol className="space-y-3 text-muted-foreground">
          <li className="flex gap-3">
            <span className="font-bold text-primary">1.</span>
            <span>
              Crie uma conta em{" "}
              <a
                href="https://resend.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                resend.com
              </a>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-primary">2.</span>
            <span>
              Valide seu domínio em{" "}
              <a
                href="https://resend.com/domains"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                resend.com/domains
              </a>{" "}
              (opcional para testes)
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-primary">3.</span>
            <span>
              Crie uma API key em{" "}
              <a
                href="https://resend.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                resend.com/api-keys
              </a>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-primary">4.</span>
            <span>Configure a API key RESEND_API_KEY nos secrets (já configurado)</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-primary">5.</span>
            <span>Digite o email que receberá as notificações acima</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-primary">6.</span>
            <span>Clique em "Enviar Teste" para verificar se está funcionando</span>
          </li>
        </ol>

        <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/10">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Nota:</strong> Para uso em produção,
            configure um domínio verificado no Resend e atualize o campo "from" no edge
            function send-email para usar seu domínio (ex: suporte@knowrisk.io)
          </p>
        </div>
      </Card>
    </div>
  );
};
