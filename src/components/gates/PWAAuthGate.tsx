// Build: 2025-01-11-v2.0.1 - Force redeploy
// ============================================
// PWA Auth Gate v2.0
// Login por telefone com verificação de convite
// ============================================

import { ReactNode, useState } from "react";
import { Loader2, RefreshCw, Shield, Phone, KeyRound, ArrowLeft, MessageCircle, MessageSquare, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { usePWAAuth, CodeSentChannel } from "@/hooks/usePWAAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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

// Tela de Login (substitui RegisterScreen)
function LoginScreen({
  fingerprint,
  onLogin,
  isSubmitting,
  previousPhone,
}: {
  fingerprint: string;
  onLogin: (params: { phone: string }) => Promise<{ success: boolean; error?: string }>;
  isSubmitting: boolean;
  previousPhone?: string | null;
}) {
  const [phone, setPhone] = useState(previousPhone || "");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (phone.trim()) {
      const result = await onLogin({ phone: phone.trim() });
      if (!result.success && result.error) {
        setError(result.error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-2xl p-8 shadow-xl border border-border">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Phone className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Entrar no KnowYOU</h1>
          <p className="text-muted-foreground text-sm">
            Digite seu telefone para acessar
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Telefone</label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-9999"
              disabled={isSubmitting}
              className="w-full"
              autoFocus
            />
          </div>
          <Button
            type="submit"
            disabled={isSubmitting || !phone.trim()}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Verificando...
              </>
            ) : (
              "Entrar"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Não tem acesso? O KnowYOU funciona apenas por convite.
          </p>
        </div>

        <div className="mt-4 flex flex-col items-center gap-1">
          <p className="text-xs text-muted-foreground text-center font-mono whitespace-nowrap overflow-x-auto max-w-full">
            Device ID: {fingerprint.substring(0, 16)}...
          </p>
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1 text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors">
                <Info className="h-3 w-3" />
                <span>O que é isso?</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 text-sm" side="top">
              <p className="font-medium mb-2">Impressão digital do dispositivo</p>
              <p className="text-muted-foreground text-xs mb-2">
                Identificador único gerado combinando características do navegador/dispositivo:
              </p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• User-Agent (navegador, versão, SO)</li>
                <li>• Resolução de tela e pixel ratio</li>
                <li>• Fuso horário e idioma</li>
                <li>• Canvas fingerprint</li>
              </ul>
            </PopoverContent>
          </Popover>
        </div>
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
          <MessageSquare className="h-10 w-10 text-primary animate-pulse" />
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

// Tela de Verificação de Código
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
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (code.length === 6) {
      setError(null);
      const result = await onVerify({ code });
      if (!result.success && result.error) {
        setError(result.error);
      }
    }
  };

  const handleResend = async () => {
    setError(null);
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

        {/* Erro de verificação */}
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

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

// Tela de Bloqueio
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
          {reason || "Este dispositivo foi bloqueado por motivos de segurança."}
        </p>
        <p className="text-xs text-muted-foreground break-all">
          Device ID: {fingerprint}
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
    login,
    verify,
    resendCode,
    backToLogin,
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

  // Login state (novo - substitui needs_registration)
  if (status === "needs_login") {
    return (
      <LoginScreen
        fingerprint={fingerprint || ""}
        onLogin={login}
        isSubmitting={isSubmitting}
        previousPhone={userPhone}
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
        onBack={backToLogin}
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
          <h1 className="text-2xl font-bold text-foreground mb-2">Erro de Conexão</h1>
          <p className="text-muted-foreground mb-6">
            {errorMessage || "Não foi possível verificar seu acesso. Verifique sua conexão e tente novamente."}
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
