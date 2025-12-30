import { ReactNode, useState } from "react";
import { Loader2, RefreshCw, Shield, Phone, KeyRound, ArrowLeft } from "lucide-react";
import { usePWAAuth } from "@/hooks/usePWAAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

interface PWAAuthGateProps {
  children: ReactNode | ((data: { fingerprint: string; pwaAccess: string[] }) => ReactNode);
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
                Enviando...
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

// Inline Verification Screen
function VerifyScreen({
  phone,
  verificationCode,
  onVerify,
  onResendCode,
  onBack,
  isSubmitting,
}: {
  phone: string;
  verificationCode: string;
  onVerify: (params: { code: string }) => Promise<{ success: boolean; error?: string }>;
  onResendCode: () => Promise<{ success: boolean; code?: string; error?: string }>;
  onBack: () => void;
  isSubmitting: boolean;
}) {
  const [code, setCode] = useState("");

  const handleVerify = async () => {
    if (code.length === 6) {
      await onVerify({ code });
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

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <KeyRound className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Verificar Telefone</h1>
          <p className="text-muted-foreground text-sm">
            Digite o codigo enviado para {phone}
          </p>
        </div>

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
          onClick={onResendCode}
          disabled={isSubmitting}
          className="w-full text-sm text-primary hover:underline disabled:opacity-50"
        >
          Reenviar codigo
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
        phone={userPhone}
        verificationCode={verificationCode}
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
