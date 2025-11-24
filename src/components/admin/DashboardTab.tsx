import { Card } from "@/components/ui/card";
import { useChatAnalytics } from "@/hooks/useChatAnalytics";
import { useAdminSettings } from "@/hooks/useAdminSettings";
import { MessageSquare, Volume2, CheckCircle, XCircle, Mail } from "lucide-react";

export const DashboardTab = () => {
  const { analytics } = useChatAnalytics();
  const { settings } = useAdminSettings();

  const today = new Date().toDateString();
  const todayAnalytics = analytics?.filter(
    (a) => new Date(a.started_at).toDateString() === today
  ) || [];

  const totalConversations = todayAnalytics.length;
  const totalMessages = todayAnalytics.reduce((sum, a) => sum + a.message_count, 0);
  const totalAudioPlays = todayAnalytics.reduce((sum, a) => sum + a.audio_plays, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Visão geral do sistema KnowYOU
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-6 bg-card/50 backdrop-blur-sm border-primary/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Conversas Hoje</p>
              <p className="text-2xl font-bold text-foreground">{totalConversations}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card/50 backdrop-blur-sm border-primary/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Mensagens Enviadas</p>
              <p className="text-2xl font-bold text-foreground">{totalMessages}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card/50 backdrop-blur-sm border-primary/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Volume2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Áudios Reproduzidos</p>
              <p className="text-2xl font-bold text-foreground">{totalAudioPlays}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6 bg-card/50 backdrop-blur-sm border-primary/20">
        <h2 className="text-xl font-bold text-foreground mb-4">
          Status das Integrações
        </h2>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
            <div className="flex items-center gap-3">
              <Volume2 className="w-5 h-5 text-primary" />
              <span className="font-medium text-foreground">Áudio do Chat</span>
            </div>
            {settings?.chat_audio_enabled ? (
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Ativo</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-destructive">
                <XCircle className="w-4 h-4" />
                <span className="text-sm">Inativo</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-primary" />
              <span className="font-medium text-foreground">Gmail API</span>
            </div>
            {settings?.gmail_api_configured ? (
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Configurado</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-yellow-500">
                <XCircle className="w-4 h-4" />
                <span className="text-sm">Não Configurado</span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
