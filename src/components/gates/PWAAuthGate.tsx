import { ReactNode, useState, useEffect } from "react";
import { Loader2, RefreshCw, Shield, Phone, KeyRound, ArrowLeft, MessageCircle, MessageSquare, AlertTriangle, CheckCircle2 } from "lucide-react";
import { usePWAAuth, CodeSentChannel } from "@/hooks/usePWAAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "@/hooks/use-toast";

interface PWAAuthGateProps {
  children: ReactNode | ((data: { fingerprint: string; pwaAccess: string[] }) => ReactNode);
}

// Componente de feedback de envio
function CodeSentFeedback({ 
  channel, 
  error 
}: { 
  channel: CodeSentChannel; 
  error: string | null;
}) {
  if (error) {
    return (
      <div className="flex items-center gap-2 bg-yellow-500/10 text-yellow-500 p-3 rounded-lg mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
        <AlertTriangle className="h-5 w-5 flex-shrink-0" />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  if (channel === 'whatsapp') {
    return (
      <div className="flex items-center gap-2 bg-green-500/10 text-green-500 p-3 rounded-lg mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
        <MessageCircle className="h-5 w-5 flex-shrink-0" />
        <span className="text-sm">Código enviado via WhatsApp</span>
        <CheckCircle2 className="h-4 w-4 ml-auto" />
      </div>
    );
  }

  if (channel === 'sms') {
    return (
      <div className="flex items-center gap-2 bg-blue-500/10 text-blue-500 p-3 rounded-lg mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
        <MessageSquare className="h-5 w-5 flex-shrink-0" />
        <span className="text-sm">Código enviado via SMS</span>
        <CheckCircle2 className="h-4 w-4 ml-auto" />
      </div>
    );
  }

  return null;
}

// Inline Registration Screen
function RegisterScreen({
  fingerprint,
  onRegister,
  isSubmitting,
}: {
  fingerprint: string;
  onRegister: (params: { phone: string; name?: string }) => Promise<{ success: boolean; error?: string }>;
  isSubmitting: boolean;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && phone.trim()) {
      await onRegister({ phone: phone.trim(), name: name.trim() });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-2xl p-8 shadow-xl border border-border">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Phone className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Cadastre-se</h1>
          <p className="text-muted-foreground text-sm">
            Informe seu nome e telefone para acessar o aplicativo
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Nome</label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              disabled={isSubmitting}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Telefone</label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-9999"
              disabled={isSubmitting}
              className="w-full"
            />
          </div>
          <Button
            type="submit"
            disabled={isSubmitting || !name.trim() || !phone.trim()}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Registrando...
              </>
            ) : (
              "Continuar"
            )}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Device ID: {fingerprint.substring(0, 16)}...
        </p>
      </div>
    </div>
  );
}

// Tela de envio de código (transição)
function SendingCodeScreen({ phone }: { phone: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-2xl p-8 shadow-xl border border-border text-center">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 relative">
          <MessageCircle className="h-10 w-10 text-primary animate-pulse" />
          <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">Enviando código...</h1>
        <p className="text-muted-foreground text-sm mb-4">
          Estamos enviando um código de verificação para
        </p>
        <p className="text-foreground font-medium">{phone}</p>
        <div className="mt-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    </div>
  );
}

// Inline Verification Screen
function VerifyScreen({
  phone,
  verificationCode,
  codeSentVia,
  codeSentError,
  resendingCode,
  onVerify,
  onResendCode,
  onBack,
  isSubmitting,
}: {
  phone: string;
  verificationCode: string;
  codeSentVia: CodeSentChannel;
  codeSentError: string | null;
  resendingCode: boolean;
  onVerify: (params: { code: string }) => Promise<{ success: boolean; error?: string }>;
  onResendCode: () => Promise<{ success: boolean; code?: string; channel?: CodeSentChannel; error?: string }>;
  onBack: () => void;
  isSubmitting: boolean;
}) {
  const [code, setCode] = useState("");

  const handleVerify = async () => {
    if (code.length === 6) {
      await onVerify({ code });
    }
  };

  const handleResend = async () => {
    const result = await onResendCode();
    if (result.success && result.channel) {
      toast({
        title: "Código reenviado!",
        description: `Enviamos um novo código via ${result.channel === 'whatsapp' ? 'WhatsApp' : 'SMS'}`,
      });
    } else if (result.error) {
      toast({
        variant: "destructive",
        title: "Erro ao reenviar",
        description: result.error,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-2xl p-8 shadow-xl border border-border">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <KeyRound className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Verificar Telefone</h1>
          <p className="text-muted-foreground text-sm">
            Digite o código enviado para {phone}
          </p>
        </div>

        {/* Feedback de envio de código */}
        <CodeSentFeedback channel={codeSentVia} error={codeSentError} />

        <div className="flex justify-center mb-6">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={setCode}
            disabled={isSubmitting}
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

        <Button
          onClick={handleVerify}
          disabled={isSubmitting || code.length !== 6}
          className="w-full mb-4"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Verificando...
            </>
          ) : (
            "Verificar"
          )}
        </Button>

        <button
          onClick={handleResend}
          disabled={isSubmitting || resendingCode}
          className="w-full text-sm text-primary hover:underline disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {resendingCode ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Reenviando...
            </>
          ) : (
            "Reenviar código"
          )}
        </button>
      </div>
    </div>
  );
}

// Inline Blocked Screen
function BlockedScreen({
  reason,
  fingerprint,
}: {
  reason: string | null;
  fingerprint: string;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-2xl p-8 shadow-xl border border-destructive/30 text-center">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Acesso Bloqueado</h1>
        <p className="text-muted-foreground mb-4">
          {reason || "Este dispositivo foi bloqueado por motivos de seguranca."}
        </p>
        <p className="text-xs text-muted-foreground">
          Device ID: {fingerprint.substring(0, 16)}...
        </p>
      </div>
    </div>
  );
}

export function PWAAuthGate({ children }: PWAAuthGateProps) {
  const {
    status,
    fingerprint,
    pwaAccess,
    userPhone,
    blockReason,
    verificationCode,
    errorMessage,
    isSubmitting,
    codeSentVia,
    codeSentError,
    resendingCode,
    register,
    verify,
    resendCode,
    backToRegister,
    refresh,
  } = usePWAAuth();

  // Loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col items-center justify-center gap-6">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  // Blocked state
  if (status === "blocked") {
    return (
      <BlockedScreen 
        reason={blockReason || null} 
        fingerprint={fingerprint || ""} 
      />
    );
  }

  // Sending code state (transição)
  if (status === "sending_code") {
    return <SendingCodeScreen phone={userPhone || ""} />;
  }

  // Registration state
  if (status === "needs_registration") {
    return (
      <RegisterScreen
        fingerprint={fingerprint || ""}
        onRegister={register}
        isSubmitting={isSubmitting}
      />
    );
  }

  // Verification state
  if (status === "needs_verification") {
    return (
      <VerifyScreen
        phone={userPhone || ""}
        verificationCode={verificationCode || ""}
        codeSentVia={codeSentVia}
        codeSentError={codeSentError}
        resendingCode={resendingCode}
        onVerify={verify}
        onResendCode={resendCode}
        onBack={backToRegister}
        isSubmitting={isSubmitting}
      />
    );
  }

  // Error state
  if (status === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-card rounded-2xl p-8 shadow-xl border border-border text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <RefreshCw className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Erro de Conexao</h1>
          <p className="text-muted-foreground mb-6">
            {errorMessage || "Nao foi possivel verificar seu acesso. Verifique sua conexao e tente novamente."}
          </p>
          <button
            onClick={refresh}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="h-4 w-4" />
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  // Verified state - render children
  if (status === "verified" && fingerprint) {
    const accessList = pwaAccess || [];
    
    if (typeof children === "function") {
      return <>{children({ fingerprint, pwaAccess: accessList })}</>;
    }
    
    return <>{children}</>;
  }

  // Fallback loading
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export default PWAAuthGate;
