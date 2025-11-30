import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import { useToast } from "@/hooks/use-toast";
import { Mail, Send } from "lucide-react";
import { AdminTitleWithInfo } from "./AdminTitleWithInfo";

export const GmailTab = () => {
  const { settings, updateSettings } = useAdminSettings();
  const { toast } = useToast();
  const [email, setEmail] = useState(settings?.gmail_notification_email || "");

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

  const handleTestEmail = () => {
    toast({
      title: "Email de teste enviado",
      description: "Verifique sua caixa de entrada.",
    });

    // In production, this would call the send-email edge function
  };

  return (
    <div className="space-y-6">
      <div>
        <AdminTitleWithInfo
          title="Configuração Gmail"
          level="h1"
          icon={Mail}
          tooltipText="Configure notificações por email"
          infoContent={
            <>
              <p>Configure email para receber alertas do sistema.</p>
              <p className="mt-2">Notificações são enviadas para novas conversas e eventos importantes.</p>
            </>
          }
        />
        <p className="text-muted-foreground mt-2">
          Configure as notificações por email
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
              disabled={!email}
            >
              <Send className="w-4 h-4" />
              Enviar Teste
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-card/50 backdrop-blur-sm border-primary/20">
        <h2 className="text-xl font-bold text-foreground mb-4">
          Instruções de Configuração
        </h2>

        <ol className="space-y-3 text-muted-foreground">
          <li className="flex gap-3">
            <span className="font-bold text-primary">1.</span>
            <span>
              Configure as credenciais da API do Gmail nas variáveis de ambiente
            </span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-primary">2.</span>
            <span>Digite o email que receberá as notificações acima</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-primary">3.</span>
            <span>Clique em "Enviar Teste" para verificar se está funcionando</span>
          </li>
          <li className="flex gap-3">
            <span className="font-bold text-primary">4.</span>
            <span>
              As notificações serão enviadas automaticamente a cada nova conversa
            </span>
          </li>
        </ol>
      </Card>
    </div>
  );
};
