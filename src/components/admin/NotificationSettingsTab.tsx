import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Phone, 
  Save, 
  Send, 
  FileText, 
  AlertTriangle, 
  Shield, 
  TrendingDown, 
  MessageCircle,
  Loader2
} from 'lucide-react';

interface NotificationPreference {
  id: string;
  event_type: string;
  event_label: string;
  email_enabled: boolean;
  whatsapp_enabled: boolean;
}

const EVENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  new_document: FileText,
  document_failed: AlertTriangle,
  new_contact_message: MessageCircle,
  security_alert: Shield,
  ml_accuracy_drop: TrendingDown,
  new_conversation: MessageSquare,
};

export default function NotificationSettingsTab() {
  const { t } = useTranslation();
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [targetPhone, setTargetPhone] = useState('');
  const [whatsappGlobalEnabled, setWhatsappGlobalEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingWhatsapp, setTestingWhatsapp] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Load notification preferences
      const { data: prefsData, error: prefsError } = await supabase
        .from('notification_preferences')
        .select('*')
        .order('event_type');

      if (prefsError) throw prefsError;
      setPreferences(prefsData || []);

      // Load admin settings for phone and global toggle
      const { data: settingsData, error: settingsError } = await supabase
        .from('admin_settings')
        .select('whatsapp_target_phone, whatsapp_global_enabled')
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;
      
      if (settingsData) {
        setTargetPhone(settingsData.whatsapp_target_phone || '');
        setWhatsappGlobalEnabled(settingsData.whatsapp_global_enabled || false);
      }
    } catch (error: any) {
      console.error('Error loading notification settings:', error);
      toast.error('Erro ao carregar configurações de notificação');
    } finally {
      setLoading(false);
    }
  };

  const savePhoneSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('admin_settings')
        .update({
          whatsapp_target_phone: targetPhone,
          whatsapp_global_enabled: whatsappGlobalEnabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', (await supabase.from('admin_settings').select('id').single()).data?.id);

      if (error) throw error;
      toast.success('Configurações de WhatsApp salvas');
    } catch (error: any) {
      console.error('Error saving phone settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const togglePreference = async (id: string, field: 'email_enabled' | 'whatsapp_enabled', value: boolean) => {
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .update({ [field]: value })
        .eq('id', id);

      if (error) throw error;

      setPreferences(prev => 
        prev.map(p => p.id === id ? { ...p, [field]: value } : p)
      );
      
      toast.success('Preferência atualizada');
    } catch (error: any) {
      console.error('Error updating preference:', error);
      toast.error('Erro ao atualizar preferência');
    }
  };

  const testEmail = async () => {
    setTestingEmail(true);
    try {
      const { data: settings } = await supabase
        .from('admin_settings')
        .select('gmail_notification_email')
        .single();

      if (!settings?.gmail_notification_email) {
        toast.error('Email de notificação não configurado em Configurações');
        return;
      }

      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to: settings.gmail_notification_email,
          subject: '[TESTE] Notificação do Sistema KnowYOU',
          body: 'Esta é uma mensagem de teste do sistema de notificações KnowYOU. Se você recebeu este email, as notificações estão funcionando corretamente.'
        }
      });

      if (error) throw error;
      toast.success('Email de teste enviado com sucesso!');
    } catch (error: any) {
      console.error('Error testing email:', error);
      toast.error(`Erro ao enviar email: ${error.message}`);
    } finally {
      setTestingEmail(false);
    }
  };

  const testWhatsapp = async () => {
    if (!targetPhone) {
      toast.error('Configure um número de telefone primeiro');
      return;
    }

    setTestingWhatsapp(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          phoneNumber: targetPhone,
          message: '✅ Teste de notificação KnowYOU - WhatsApp configurado corretamente!',
          eventType: 'test'
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro desconhecido');
      
      toast.success('WhatsApp de teste enviado com sucesso!');
    } catch (error: any) {
      console.error('Error testing WhatsApp:', error);
      toast.error(`Erro ao enviar WhatsApp: ${error.message}`);
    } finally {
      setTestingWhatsapp(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Bell className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {t('admin.notifications.title', 'Preferências de Notificação')}
          </h2>
          <p className="text-muted-foreground text-sm">
            Configure como você deseja receber alertas do sistema
          </p>
        </div>
      </div>

      {/* WhatsApp Configuration Card */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Phone className="h-5 w-5 text-green-500" />
            Configuração WhatsApp
          </CardTitle>
          <CardDescription>
            Configure o número de telefone para receber notificações via WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="phone">Número de Telefone (com código do país)</Label>
              <Input
                id="phone"
                placeholder="+5511999999999"
                value={targetPhone}
                onChange={(e) => setTargetPhone(e.target.value)}
                className="border-blue-400/60 focus:border-blue-500"
              />
              <p className="text-xs text-muted-foreground">
                Formato: +[código país][DDD][número] - Ex: +5511999999999
              </p>
            </div>
            <div className="flex items-end gap-2">
              <Button 
                onClick={savePhoneSettings} 
                disabled={saving}
                className="gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Habilitar WhatsApp Globalmente</p>
                <p className="text-xs text-muted-foreground">
                  Desative para pausar todas as notificações WhatsApp
                </p>
              </div>
            </div>
            <Switch
              checked={whatsappGlobalEnabled}
              onCheckedChange={(checked) => {
                setWhatsappGlobalEnabled(checked);
                savePhoneSettings();
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Event Types Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tipos de Evento</CardTitle>
          <CardDescription>
            Configure notificações individuais para cada tipo de evento do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {preferences.map((pref) => {
              const IconComponent = EVENT_ICONS[pref.event_type] || Bell;
              
              return (
                <Card key={pref.id} className="border-border/50 hover:border-primary/30 transition-colors">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <IconComponent className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{pref.event_label}</p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {pref.event_type}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {/* Email Toggle */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-blue-500" />
                          <span className="text-sm">Email</span>
                        </div>
                        <Switch
                          checked={pref.email_enabled}
                          onCheckedChange={(checked) => 
                            togglePreference(pref.id, 'email_enabled', checked)
                          }
                        />
                      </div>

                      {/* WhatsApp Toggle */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-green-500" />
                          <span className="text-sm">WhatsApp</span>
                        </div>
                        <Switch
                          checked={pref.whatsapp_enabled}
                          onCheckedChange={(checked) => 
                            togglePreference(pref.id, 'whatsapp_enabled', checked)
                          }
                          disabled={!whatsappGlobalEnabled}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Test Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Testar Notificações</CardTitle>
          <CardDescription>
            Envie mensagens de teste para verificar se as configurações estão corretas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button
              variant="outline"
              onClick={testEmail}
              disabled={testingEmail}
              className="gap-2"
            >
              {testingEmail ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Testar Email
            </Button>

            <Button
              variant="outline"
              onClick={testWhatsapp}
              disabled={testingWhatsapp || !targetPhone || !whatsappGlobalEnabled}
              className="gap-2"
            >
              {testingWhatsapp ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MessageSquare className="h-4 w-4" />
              )}
              Testar WhatsApp
            </Button>
          </div>

          {!whatsappGlobalEnabled && (
            <p className="text-xs text-amber-500 mt-2">
              ⚠️ WhatsApp global está desabilitado. Habilite para testar.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
