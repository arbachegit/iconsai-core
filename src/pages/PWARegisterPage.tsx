import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle, Phone, KeyRound, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { getDeviceFingerprint, getDeviceInfo } from "@/lib/device-fingerprint";

type PageState = "loading" | "invalid" | "confirm" | "verify" | "success" | "error";

interface InvitationData {
  id: string;
  name: string;
  phone: string;
  email?: string;
  invited_by?: string;
}

const PWA_BG_COLOR = "#0A0E1A";

export default function PWARegisterPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [pageState, setPageState] = useState<PageState>("loading");
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Force PWA background colors
  useEffect(() => {
    document.body.style.backgroundColor = PWA_BG_COLOR;
    document.documentElement.style.backgroundColor = PWA_BG_COLOR;
    
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", PWA_BG_COLOR);
    }
    
    return () => {
      document.body.style.backgroundColor = "";
      document.documentElement.style.backgroundColor = "";
    };
  }, []);

  // Validate token on load
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setPageState("invalid");
        return;
      }

      try {
        // Find invitation by token
        const { data, error: queryError } = await supabase
          .from("user_invitations")
          .select("id, name, phone, email, invited_by")
          .eq("token", token)
          .eq("has_app_access", true)
          .gt("expires_at", new Date().toISOString())
          .in("status", ["pending", "form_submitted"])
          .single();

        if (queryError || !data) {
          console.error("Invalid token:", queryError);
          setPageState("invalid");
          return;
        }

        // Get inviter name if invited_by is set
        let inviterName: string | undefined;
        if (data.invited_by) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("first_name")
            .eq("id", data.invited_by)
            .single();
          inviterName = profile?.first_name || undefined;
        }

        setInvitation({
          id: data.id,
          name: data.name,
          phone: data.phone || "",
          email: data.email || undefined,
          invited_by: inviterName,
        });
        setPhone(data.phone || "");
        setPageState("confirm");
      } catch (err) {
        console.error("Error validating token:", err);
        setPageState("invalid");
      }
    };

    validateToken();
  }, [token]);

  // Confirm data and send OTP
  const handleConfirm = async () => {
    if (!phone.trim()) {
      setError("Informe seu telefone");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const deviceInfo = getDeviceInfo();
      
      const { data, error: rpcError } = await supabase.rpc("login_pwa_by_phone", {
        p_phone: phone,
        p_fingerprint: deviceInfo.fingerprint,
        p_device_info: {
          os_name: deviceInfo.osName,
          os_version: deviceInfo.osVersion,
          browser_name: deviceInfo.browserName,
          browser_version: deviceInfo.browserVersion,
          device_vendor: deviceInfo.deviceVendor,
          device_model: deviceInfo.deviceModel,
          screen_width: deviceInfo.screenWidth,
          screen_height: deviceInfo.screenHeight,
          pixel_ratio: deviceInfo.pixelRatio,
          has_touch: deviceInfo.hasTouch,
          has_microphone: deviceInfo.hasMicrophone,
          user_agent: deviceInfo.userAgent,
        },
      });

      if (rpcError) {
        setError(rpcError.message);
        setIsSubmitting(false);
        return;
      }

      const result = data as { success: boolean; verification_code?: string; error?: string; message?: string };

      if (!result.success) {
        setError(result.message || result.error || "Erro ao processar");
        setIsSubmitting(false);
        return;
      }

      // Send OTP via SMS
      if (result.verification_code) {
        await supabase.functions.invoke("send-pwa-notification", {
          body: {
            to: phone,
            template: "otp",
            variables: { "1": result.verification_code },
            channel: "sms",
          },
        });
      }

      setPageState("verify");
    } catch (err) {
      console.error("Error:", err);
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Verify OTP code
  const handleVerify = async () => {
    if (code.length !== 6) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const fingerprint = getDeviceFingerprint();
      
      const { data, error: rpcError } = await supabase.rpc("verify_pwa_device_code", {
        p_fingerprint: fingerprint,
        p_code: code,
      });

      if (rpcError) {
        setError(rpcError.message);
        setIsSubmitting(false);
        return;
      }

      const result = data as { success: boolean; error?: string; message?: string };

      if (!result.success) {
        setError(result.message || result.error || "Código inválido");
        setIsSubmitting(false);
        return;
      }

      // Success!
      setPageState("success");
      
      // Redirect to /pwa after 2 seconds
      setTimeout(() => {
        navigate("/pwa");
      }, 2000);
    } catch (err) {
      console.error("Error:", err);
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading
  if (pageState === "loading") {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Validando convite...</p>
          </div>
        </div>
      </div>
    );
  }

  // Invalid token
  if (pageState === "invalid") {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-background p-4">
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-card rounded-2xl p-8 shadow-xl max-w-sm w-full text-center border border-border">
            <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">Convite Inválido</h1>
            <p className="text-muted-foreground text-sm mb-6">
              Este link de convite é inválido ou expirou.
            </p>
            <Button onClick={() => navigate("/")} variant="outline" className="w-full">
              Voltar ao Início
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Success
  if (pageState === "success") {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-background p-4">
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-card rounded-2xl p-8 shadow-xl max-w-sm w-full text-center border border-border">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">Cadastro Concluído!</h1>
            <p className="text-muted-foreground text-sm mb-4">
              Bem-vindo ao KnowYOU, {invitation?.name}!
            </p>
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Redirecionando...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Confirm data
  if (pageState === "confirm") {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-background p-4">
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-card rounded-2xl p-8 shadow-xl max-w-sm w-full border border-border">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <Phone className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground">
              Olá, {invitation?.name}!
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {invitation?.invited_by 
                ? `${invitation.invited_by} te convidou para o KnowYOU.`
                : "Você foi convidado para o KnowYOU."}
            </p>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mb-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                Confirme seu telefone
              </label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                disabled={isSubmitting}
                className="h-12"
              />
            </div>
            <Button 
              onClick={handleConfirm} 
              disabled={isSubmitting || !phone.trim()} 
              className="w-full h-12"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando código...
                </>
              ) : (
                "Continuar"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
    );
  }

  // Verify code
  if (pageState === "verify") {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-background p-4">
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-card rounded-2xl p-8 shadow-xl max-w-sm w-full border border-border">
          <button
            onClick={() => setPageState("confirm")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>

          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <KeyRound className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Verificar Código</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Digite o código enviado para {phone}
            </p>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mb-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="flex justify-center mb-6">
            <InputOTP maxLength={6} value={code} onChange={setCode}>
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

            <Button 
              onClick={handleVerify} 
              disabled={isSubmitting || code.length !== 6} 
              className="w-full h-12"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                "Verificar"
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
