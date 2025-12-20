import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Smartphone, CheckCircle, AlertCircle, User, Mail, Phone } from "lucide-react";
import knowriskLogo from "@/assets/knowrisk-pwa-logo.png";

// Ícones para os agentes PWA
const AGENT_ICONS: Record<string, { icon: string; name: string; color: string }> = {
  economia: { icon: "💹", name: "Economista", color: "text-emerald-500" },
  health: { icon: "🏥", name: "Saúde", color: "text-blue-500" },
  ideias: { icon: "💡", name: "Ideias", color: "text-amber-500" },
};

interface InvitationData {
  valid: boolean;
  error?: string;
  invitation_id?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  pwa_access?: string[];
  expires_at?: string;
}

export default function PWARegister() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [deviceId, setDeviceId] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Gerar ou recuperar device ID
  useEffect(() => {
    let id = localStorage.getItem("pwa-device-id");
    if (!id) {
      id = `device-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      localStorage.setItem("pwa-device-id", id);
    }
    setDeviceId(id);
  }, []);

  // Verificar convite
  useEffect(() => {
    const verifyInvitation = async () => {
      if (!token) {
        setInvitation({ valid: false, error: "Token não fornecido" });
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc("verify_pwa_invitation", {
          p_token: token,
        });

        if (error) throw error;

        const result = data as unknown as InvitationData;
        setInvitation(result);

        if (result.valid) {
          setName(result.name || "");
          setEmail(result.email || "");
          setPhone(result.phone || "");
        }
      } catch (error: any) {
        console.error("Error verifying invitation:", error);
        setInvitation({ valid: false, error: error.message || "Erro ao verificar convite" });
      } finally {
        setLoading(false);
      }
    };

    verifyInvitation();
  }, [token]);

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token || !invitation?.valid) {
      toast.error("Convite inválido");
      return;
    }

    if (!name.trim() || !email.trim()) {
      toast.error("Nome e email são obrigatórios");
      return;
    }

    setSubmitting(true);

    try {
      const { data, error } = await supabase.rpc("register_pwa_user", {
        p_invitation_token: token,
        p_device_id: deviceId,
        p_name: name.trim(),
        p_email: email.trim().toLowerCase(),
        p_phone: phone || null,
        p_user_agent: navigator.userAgent,
      });

      if (error) throw error;

      const result = data as any;

      if (!result.success) {
        throw new Error(result.error || "Erro ao registrar");
      }

      // Salvar token de sessão
      if (result.session_token) {
        localStorage.setItem("pwa-session-token", result.session_token);
      }

      toast.success(result.message || "Cadastro realizado com sucesso!");

      // Redirecionar para o PWA
      setTimeout(() => {
        navigate("/pwa");
      }, 1500);
    } catch (error: any) {
      console.error("Error registering:", error);
      toast.error(error.message || "Erro ao completar cadastro");
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verificando convite...</p>
        </div>
      </div>
    );
  }

  // Invalid invitation
  if (!invitation?.valid) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card rounded-2xl p-8 shadow-xl border border-border">
          <div className="text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Convite Inválido</h1>
            <p className="text-muted-foreground mb-6">
              {invitation?.error || "Este convite não é válido ou já foi utilizado."}
            </p>
            <Button variant="outline" onClick={() => navigate("/")}>
              Voltar ao Início
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Valid invitation - show registration form
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <img src={knowriskLogo} alt="KnowYOU" className="h-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">Bem-vindo ao KnowYOU!</h1>
          <p className="text-muted-foreground mt-2">Complete seu cadastro para acessar os PWAs</p>
        </div>

        {/* PWA Access Badges */}
        {invitation.pwa_access && invitation.pwa_access.length > 0 && (
          <div className="flex justify-center gap-3 mb-6">
            {invitation.pwa_access.map((slug) => {
              const agent = AGENT_ICONS[slug];
              if (!agent) return null;
              return (
                <div
                  key={slug}
                  className="flex items-center gap-2 px-4 py-2 bg-card/50 rounded-full border border-border"
                >
                  <span className="text-2xl">{agent.icon}</span>
                  <span className={`text-sm font-medium ${agent.color}`}>{agent.name}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="bg-card rounded-2xl p-6 shadow-xl border border-border space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Nome completo
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome completo"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Telefone (opcional)
            </Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="(11) 99999-9999"
            />
          </div>

          {/* Device binding notice */}
          <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
            <Smartphone className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-foreground">Dispositivo vinculado</p>
              <p className="text-muted-foreground">
                Este dispositivo será vinculado à sua conta para acesso simplificado aos PWAs.
              </p>
            </div>
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Confirmar Cadastro
              </>
            )}
          </Button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Ao confirmar, você concorda com nossos termos de uso e política de privacidade.
        </p>
      </div>
    </div>
  );
}
