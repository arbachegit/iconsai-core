import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Smartphone, CheckCircle, AlertCircle, User, Mail, Phone, ArrowLeft, RefreshCw } from "lucide-react";
import knowriskLogo from "@/assets/knowrisk-pwa-logo.png";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";


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

type Step = "confirm" | "verify";

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

  // 2-step flow
  const [step, setStep] = useState<Step>("confirm");
  const [verificationCode, setVerificationCode] = useState("");
  const [codeExpiresAt, setCodeExpiresAt] = useState<Date | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [sendChannel, setSendChannel] = useState<string>("whatsapp");

  // Gerar ou recuperar device ID
  useEffect(() => {
    let id = localStorage.getItem("pwa-device-id");
    if (!id) {
      id = `device-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      localStorage.setItem("pwa-device-id", id);
    }
    setDeviceId(id);
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

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
          
          // Track invitation open (notifies admin on first open)
          try {
            await supabase.functions.invoke("track-invitation-open", {
              body: { token, source: "app" },
            });
          } catch (trackError) {
            console.log("Track open error (non-blocking):", trackError);
          }
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

  // ETAPA 1: Confirmar e enviar código
  const handleConfirm = async () => {
    if (!token || !invitation?.valid) {
      toast.error("Convite inválido");
      return;
    }

    const phoneToUse = phone.trim() || invitation.phone;
    if (!phoneToUse || phoneToUse.replace(/\D/g, "").length < 10) {
      toast.error("Telefone é obrigatório para verificação");
      return;
    }

    setSubmitting(true);

    try {
      console.log("[PWA-REGISTER] Sending verification code...");
      
      const { data, error } = await supabase.functions.invoke("send-pwa-verification", {
        body: { 
          token,
          phone: phoneToUse.replace(/\D/g, "") // Clean phone number
        }
      });

      if (error) {
        console.error("[PWA-REGISTER] Error sending code:", error);
        throw new Error(error.message || "Erro ao enviar código");
      }

      if (!data?.success) {
        throw new Error(data?.error || "Erro ao enviar código de verificação");
      }

      toast.success(data.message || `Código enviado via ${data.channel === "whatsapp" ? "WhatsApp" : "SMS"}!`);
      setSendChannel(data.channel || "whatsapp");
      setCodeExpiresAt(new Date(Date.now() + (data.expires_in || 600) * 1000));
      setResendCooldown(60); // 60 second cooldown
      setStep("verify");
    } catch (err: any) {
      console.error("[PWA-REGISTER] Confirm error:", err);
      toast.error(err.message || "Erro ao enviar código");
    } finally {
      setSubmitting(false);
    }
  };

  // Reenviar código
  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    await handleConfirm();
  };

  // ETAPA 2: Verificar código
  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      toast.error("Digite o código de 6 dígitos");
      return;
    }

    setSubmitting(true);

    try {
      console.log("[PWA-REGISTER] Verifying code...");

      const { data, error } = await supabase.rpc("complete_pwa_registration_with_code", {
        p_invitation_token: token,
        p_device_id: deviceId,
        p_verification_code: verificationCode,
        p_user_agent: navigator.userAgent,
      });

      if (error) {
        console.error("[PWA-REGISTER] RPC Error:", error);
        throw new Error(error.message || "Erro ao verificar código");
      }

      const result = data as any;
      console.log("[PWA-REGISTER] Verification result:", result);

      if (!result.success) {
        throw new Error(result.error || "Código inválido");
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
    } catch (err: any) {
      console.error("[PWA-REGISTER] Verify error:", err);
      toast.error(err.message || "Código inválido ou expirado");
    } finally {
      setSubmitting(false);
    }
  };

  // Voltar para etapa de confirmação
  const handleBack = () => {
    setStep("confirm");
    setVerificationCode("");
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

  // STEP 2: Verification code screen
  if (step === "verify") {
    const timeRemaining = codeExpiresAt ? Math.max(0, Math.floor((codeExpiresAt.getTime() - Date.now()) / 1000)) : 0;
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;

    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <img src={knowriskLogo} alt="KnowYOU" className="h-16 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground">Verificação</h1>
            <p className="text-muted-foreground mt-2">
              Digite o código de 6 dígitos enviado via {sendChannel === "whatsapp" ? "WhatsApp" : "SMS"}
            </p>
          </div>

          <div className="bg-card rounded-2xl p-6 shadow-xl border border-border space-y-6">
            {/* Phone info */}
            <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
              <Phone className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-foreground">Código enviado para</p>
                <p className="text-muted-foreground">{phone || invitation.phone}</p>
              </div>
            </div>

            {/* Code input */}
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={verificationCode}
                onChange={(value) => setVerificationCode(value)}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            {/* Timer */}
            {timeRemaining > 0 && (
              <p className="text-center text-sm text-muted-foreground">
                Código expira em <span className="font-medium text-foreground">{minutes}:{seconds.toString().padStart(2, "0")}</span>
              </p>
            )}
            {timeRemaining === 0 && codeExpiresAt && (
              <p className="text-center text-sm text-destructive">
                Código expirado. Solicite um novo.
              </p>
            )}

            {/* Resend button */}
            <div className="text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResendCode}
                disabled={resendCooldown > 0 || submitting}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : "Reenviar código"}
              </Button>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleBack} disabled={submitting} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <Button 
                onClick={handleVerify} 
                disabled={submitting || verificationCode.length !== 6}
                className="flex-1"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Verificar
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STEP 1: Confirmation screen
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <img src={knowriskLogo} alt="KnowYOU" className="h-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">Bem-vindo ao KnowYOU!</h1>
          <p className="text-muted-foreground mt-2">Confirme seus dados para continuar</p>
        </div>

        {/* Confirmation Form */}
        <div className="bg-card rounded-2xl p-6 shadow-xl border border-border space-y-5">
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
              Telefone *
            </Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="(11) 99999-9999"
              required
            />
            <p className="text-xs text-muted-foreground">
              Você receberá um código de verificação neste número
            </p>
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

          <Button 
            onClick={handleConfirm} 
            className="w-full" 
            size="lg" 
            disabled={submitting || !phone.trim()}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando código...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Confirmar e Receber Código
              </>
            )}
          </Button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Ao confirmar, você concorda com nossos termos de uso e política de privacidade.
        </p>
      </div>
    </div>
  );
}
