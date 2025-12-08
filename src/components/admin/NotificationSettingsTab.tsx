import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
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
  Loader2,
  Settings,
  Cog
} from 'lucide-react';

interface NotificationPreference {
  id: string;
  event_type: string;
  event_label: string;
  email_enabled: boolean;
  whatsapp_enabled: boolean;
}

interface SecurityAlertConfig {
  id: string;
  current_level: 'critical' | 'warning' | 'secure';
  template_critical: string;
  template_warning: string;
  template_secure: string;
}

const EVENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  new_document: FileText,
  document_failed: AlertTriangle,
  new_contact_message: MessageCircle,
  security_alert: Shield,
  ml_accuracy_drop: TrendingDown,
  new_conversation: MessageSquare,
};

// Format phone number for display with auto-masking
const formatPhoneNumber = (value: string): string => {
  // Remove all non-digit characters except +
  const cleaned = value.replace(/[^\d+]/g, '');
  
  // Ensure it starts with +
  if (!cleaned.startsWith('+') && cleaned.length > 0) {
    return '+' + cleaned;
  }
  
  // Extract country code and rest
  if (cleaned.length <= 1) return cleaned;
  
  const withoutPlus = cleaned.slice(1);
  
  // Format based on country code
  if (withoutPlus.startsWith('55')) {
    // Brazil: +55 11 99999-9999
    const countryCode = withoutPlus.slice(0, 2);
    const areaCode = withoutPlus.slice(2, 4);
    const firstPart = withoutPlus.slice(4, 9);
    const secondPart = withoutPlus.slice(9, 13);
    
    let formatted = `+${countryCode}`;
    if (areaCode) formatted += ` ${areaCode}`;
    if (firstPart) formatted += ` ${firstPart}`;
    if (secondPart) formatted += `-${secondPart}`;
    return formatted;
  } else if (withoutPlus.startsWith('1')) {
    // US/Canada: +1 (617) 599-2049
    const countryCode = withoutPlus.slice(0, 1);
    const areaCode = withoutPlus.slice(1, 4);
    const firstPart = withoutPlus.slice(4, 7);
    const secondPart = withoutPlus.slice(7, 11);
    
    let formatted = `+${countryCode}`;
    if (areaCode) formatted += ` (${areaCode})`;
    if (firstPart) formatted += ` ${firstPart}`;
    if (secondPart) formatted += `-${secondPart}`;
    return formatted;
  } else {
    // Generic international: +XX XXX XXX XXXX
    const parts = [];
    let remaining = withoutPlus;
    
    // Country code (2-3 digits)
    const countryCodeLen = remaining.length >= 2 && remaining[0] !== '1' ? 2 : 1;
    parts.push(remaining.slice(0, countryCodeLen));
    remaining = remaining.slice(countryCodeLen);
    
    // Split rest into groups of 3-4
    while (remaining.length > 0) {
      const chunkSize = remaining.length > 4 ? 3 : remaining.length;
      parts.push(remaining.slice(0, chunkSize));
      remaining = remaining.slice(chunkSize);
    }
    
    return '+' + parts.join(' ');
  }
};

const SEVERITY_LEVELS = [
  { value: 'critical' as const, label: 'Crítico', color: 'bg-red-500/20 text-red-500 border-red-500/50 hover:bg-red-500/30' },
  { value: 'warning' as const, label: 'Atenção', color: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50 hover:bg-yellow-500/30' },
  { value: 'secure' as const, label: 'Seguro', color: 'bg-green-500/20 text-green-500 border-green-500/50 hover:bg-green-500/30' },
];

export default function NotificationSettingsTab() {
  const { t } = useTranslation();
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [targetPhone, setTargetPhone] = useState('');
  const [whatsappGlobalEnabled, setWhatsappGlobalEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingWhatsapp, setTestingWhatsapp] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Security Alert Config State
  const [securityConfig, setSecurityConfig] = useState<SecurityAlertConfig | null>(null);
  const [securityModalOpen, setSecurityModalOpen] = useState(false);
  const [editingSecurityConfig, setEditingSecurityConfig] = useState<SecurityAlertConfig | null>(null);
  const [savingSecurityConfig, setSavingSecurityConfig] = useState(false);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setTargetPhone(formatted);
  };

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

      // Load security alert config
      const { data: securityData, error: securityError } = await supabase
        .from('security_alert_config')
        .select('*')
        .single();

      if (securityError && securityError.code !== 'PGRST116') throw securityError;
      if (securityData) {
        setSecurityConfig(securityData as SecurityAlertConfig);
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
      setIsEditMode(false);
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

  const openSecurityModal = () => {
    setEditingSecurityConfig(securityConfig ? { ...securityConfig } : null);
    setSecurityModalOpen(true);
  };

  const saveSecurityConfig = async () => {
    if (!editingSecurityConfig) return;
    
    setSavingSecurityConfig(true);
    try {
      const { error } = await supabase
        .from('security_alert_config')
        .update({
          current_level: editingSecurityConfig.current_level,
          template_critical: editingSecurityConfig.template_critical,
          template_warning: editingSecurityConfig.template_warning,
          template_secure: editingSecurityConfig.template_secure,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingSecurityConfig.id);

      if (error) throw error;
      
      setSecurityConfig(editingSecurityConfig);
      setSecurityModalOpen(false);
      toast.success('Configuração de alerta de segurança salva');
    } catch (error: any) {
      console.error('Error saving security config:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setSavingSecurityConfig(false);
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

  const getCurrentSeverityBadge = () => {
    if (!securityConfig) return null;
    const level = SEVERITY_LEVELS.find(l => l.value === securityConfig.current_level);
    if (!level) return null;
    
    const icons = {
      critical: '🔴',
      warning: '🟡',
      secure: '🟢'
    };
    
    return (
      <Badge className={`${level.color} cursor-default`}>
        {icons[level.value]} {level.label}
      </Badge>
    );
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
                placeholder="+55 11 99999-9999"
                value={targetPhone}
                onChange={handlePhoneChange}
                className="border-blue-400/60 focus:border-blue-500"
                disabled={!isEditMode}
              />
              <p className="text-xs text-muted-foreground">
                Auto-formatado: BR (+55), US (+1), ou internacional
              </p>
            </div>
            <div className="flex items-end gap-2">
              {isEditMode ? (
                <Button 
                  onClick={savePhoneSettings} 
                  disabled={saving}
                  className="gap-2"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              ) : (
                <Button 
                  variant="outline"
                  onClick={() => setIsEditMode(true)}
                  className="gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Configurar
                </Button>
              )}
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

      {/* Event Types List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tipos de Evento</CardTitle>
          <CardDescription>
            Configure notificações individuais para cada tipo de evento do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {preferences.map((pref) => {
              const IconComponent = EVENT_ICONS[pref.event_type] || Bell;
              const isSecurityAlert = pref.event_type === 'security_alert';
              
              return (
                <div 
                  key={pref.id} 
                  className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors"
                >
                  {/* Left: Icon and Label */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <IconComponent className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-medium text-sm truncate">{pref.event_label}</span>
                      {isSecurityAlert && getCurrentSeverityBadge()}
                    </div>
                  </div>

                  {/* Right: Controls */}
                  <div className="flex items-center gap-6 shrink-0">
                    {/* Security Alert Config Button */}
                    {isSecurityAlert && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={openSecurityModal}
                        className="gap-1.5 text-muted-foreground hover:text-foreground"
                      >
                        <Cog className="h-4 w-4" />
                        <span className="hidden sm:inline">Severidade</span>
                      </Button>
                    )}
                    
                    {/* Email Toggle */}
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-blue-500" />
                      <Switch
                        checked={pref.email_enabled}
                        onCheckedChange={(checked) => 
                          togglePreference(pref.id, 'email_enabled', checked)
                        }
                      />
                    </div>

                    {/* WhatsApp Toggle */}
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-green-500" />
                      <Switch
                        checked={pref.whatsapp_enabled}
                        onCheckedChange={(checked) => 
                          togglePreference(pref.id, 'whatsapp_enabled', checked)
                        }
                        disabled={!whatsappGlobalEnabled}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Security Severity Configuration Modal */}
      <Dialog open={securityModalOpen} onOpenChange={setSecurityModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Configuração de Alerta de Segurança
            </DialogTitle>
          </DialogHeader>
          
          {editingSecurityConfig && (
            <div className="space-y-6">
              {/* Severity Level Selector */}
              <div className="space-y-3">
                <Label>Nível de Alerta Atual</Label>
                <div className="flex flex-wrap gap-2">
                  {SEVERITY_LEVELS.map((level) => {
                    const icons = { critical: '🔴', warning: '🟡', secure: '🟢' };
                    const isSelected = editingSecurityConfig.current_level === level.value;
                    
                    return (
                      <Badge
                        key={level.value}
                        className={`cursor-pointer transition-all ${level.color} ${
                          isSelected ? 'ring-2 ring-offset-2 ring-offset-background ring-primary' : 'opacity-60 hover:opacity-100'
                        }`}
                        onClick={() => setEditingSecurityConfig({
                          ...editingSecurityConfig,
                          current_level: level.value
                        })}
                      >
                        {icons[level.value]} {level.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Message Templates */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-red-500">
                    🔴 Mensagem Crítica
                  </Label>
                  <Textarea
                    value={editingSecurityConfig.template_critical}
                    onChange={(e) => setEditingSecurityConfig({
                      ...editingSecurityConfig,
                      template_critical: e.target.value
                    })}
                    placeholder="Template para alertas críticos..."
                    className="min-h-[80px] border-red-500/30 focus:border-red-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-yellow-500">
                    🟡 Mensagem de Atenção
                  </Label>
                  <Textarea
                    value={editingSecurityConfig.template_warning}
                    onChange={(e) => setEditingSecurityConfig({
                      ...editingSecurityConfig,
                      template_warning: e.target.value
                    })}
                    placeholder="Template para alertas de atenção..."
                    className="min-h-[80px] border-yellow-500/30 focus:border-yellow-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-green-500">
                    🟢 Mensagem de Segurança
                  </Label>
                  <Textarea
                    value={editingSecurityConfig.template_secure}
                    onChange={(e) => setEditingSecurityConfig({
                      ...editingSecurityConfig,
                      template_secure: e.target.value
                    })}
                    placeholder="Template para status seguro..."
                    className="min-h-[80px] border-green-500/30 focus:border-green-500"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSecurityModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveSecurityConfig} disabled={savingSecurityConfig}>
              {savingSecurityConfig ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
