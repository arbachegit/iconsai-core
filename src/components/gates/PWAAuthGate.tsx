import { ReactNode } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { usePWAAuth } from "@/hooks/usePWAAuth";
import { 
  PWARegisterScreen, 
  PWAVerifyScreen, 
  PWABlockedScreen 
} from "@/components/pwa";
import knowriskLogo from "@/assets/knowrisk-pwa-logo.png";

interface PWAAuthGateProps {
  children: ReactNode | ((data: { fingerprint: string; pwaAccess: string[] }) => ReactNode);
}

export function PWAAuthGate({ children }: PWAAuthGateProps) {
  const {
    status,
    fingerprint,
    pwaAccess,
    userName,
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
        <img src={knowriskLogo} alt="KnowYOU" className="h-16 animate-pulse" />
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
      <PWABlockedScreen 
        reason={blockReason || null} 
        fingerprint={fingerprint || ""} 
      />
    );
  }

  // Registration state
  if (status === "needs_registration") {
    return (
      <PWARegisterScreen
        fingerprint={fingerprint || ""}
        onRegister={register}
        isSubmitting={isSubmitting}
      />
    );
  }

  // Verification state
  if (status === "needs_verification") {
    return (
      <PWAVerifyScreen
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
