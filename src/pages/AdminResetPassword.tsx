import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, Eye, EyeOff, Clock, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const logPasswordRecoveryEvent = async (email: string, action: string, success: boolean, details?: Record<string, any>) => {
  try {
    await supabase.from("user_activity_logs").insert({
      user_email: email,
      action,
      action_category: "PASSWORD_RECOVERY",
      details: { success, timestamp: new Date().toISOString(), ...details },
      user_agent: navigator.userAgent,
    });
  } catch (error) {
    console.error("Failed to log password recovery event:", error);
  }
};

const AdminResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkSession = async () => {
      // Check URL for error parameters (expired/invalid token)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const errorDescription = hashParams.get("error_description");
      
      if (errorDescription) {
        const isExpiredError = errorDescription.toLowerCase().includes("expired") ||
                               errorDescription.toLowerCase().includes("invalid");
        setIsExpired(isExpiredError);
        setIsValidSession(false);
        return;
      }

      // Check for valid session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setIsExpired(true);
        setIsValidSession(false);
      } else {
        setIsValidSession(true);
      }
    };

    checkSession();

    // Listen for auth state changes (recovery token processed)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsValidSession(true);
        setIsExpired(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const validatePassword = (pwd: string): { valid: boolean; message: string } => {
    if (pwd.length < 8) {
      return { valid: false, message: "A senha deve ter pelo menos 8 caracteres." };
    }
    if (!/[0-9]/.test(pwd)) {
      return { valid: false, message: "A senha deve conter pelo menos um número." };
    }
    if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~]/.test(pwd)) {
      return { valid: false, message: "A senha deve conter pelo menos um caractere especial (!@#$%...)." };
    }
    if (!/[A-Z]/.test(pwd)) {
      return { valid: false, message: "A senha deve conter pelo menos uma letra maiúscula." };
    }
    if (!/[a-z]/.test(pwd)) {
      return { valid: false, message: "A senha deve conter pelo menos uma letra minúscula." };
    }
    return { valid: true, message: "" };
  };

  const getPasswordStrength = (pwd: string): { level: number; label: string; color: string } => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~]/.test(pwd)) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;

    if (score <= 2) return { level: score, label: "Fraca", color: "bg-red-500" };
    if (score <= 3) return { level: score, label: "Média", color: "bg-amber-500" };
    if (score <= 4) return { level: score, label: "Forte", color: "bg-lime-500" };
    return { level: score, label: "Muito Forte", color: "bg-green-500" };
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "Por favor, verifique se as senhas são iguais.",
        variant: "destructive",
      });
      return;
    }

    const validation = validatePassword(password);
    if (!validation.valid) {
      toast({
        title: "Senha inválida",
        description: validation.message,
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userEmail = session?.user?.email || "unknown";

      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      await logPasswordRecoveryEvent(userEmail, "Senha redefinida com sucesso", true);

      toast({
        title: "Senha atualizada",
        description: "Sua senha foi redefinida com sucesso.",
      });
      
      await supabase.auth.signOut();
      navigate("/admin/login");
    } catch (error: any) {
      const { data: { session } } = await supabase.auth.getSession();
      await logPasswordRecoveryEvent(session?.user?.email || "unknown", "Falha ao redefinir senha", false, { error: error.message });
      toast({
        title: "Erro ao redefinir senha",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resendEmail) {
      toast({
        title: "Email obrigatório",
        description: "Por favor, digite seu email.",
        variant: "destructive",
      });
      return;
    }

    setIsResending(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resendEmail, {
        redirectTo: `${window.location.origin}/admin/reset-password`,
      });

      if (error) throw error;

      await logPasswordRecoveryEvent(resendEmail, "Novo link de recuperação solicitado (link expirado)", true);

      toast({
        title: "Novo link enviado",
        description: "Verifique sua caixa de entrada. O link expira em 1 hora.",
      });
      setResendEmail("");
    } catch (error: any) {
      await logPasswordRecoveryEvent(resendEmail, "Falha ao solicitar novo link", false, { error: error.message });
      toast({
        title: "Erro ao enviar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  // Loading state
  if (isValidSession === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-8 bg-card/50 backdrop-blur-sm border-primary/20">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground">Verificando link...</p>
          </div>
        </Card>
      </div>
    );
  }

  // Expired/Invalid link state
  if (isExpired || !isValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-8 bg-card/50 backdrop-blur-sm border-primary/20">
          <div className="flex flex-col items-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Clock className="w-8 h-8 text-amber-500" />
            </div>

            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground">Link Expirado</h1>
              <p className="text-muted-foreground mt-2">
                O link de recuperação expirou ou é inválido.
                <br />
                <span className="text-sm">Os links de recuperação são válidos por 1 hora.</span>
              </p>
            </div>

            <form onSubmit={handleResendLink} className="w-full space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Digite seu email para receber um novo link
                </label>
                <Input
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="seu-email@exemplo.com"
                  className="bg-background/50"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-primary"
                disabled={isResending}
              >
                {isResending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Enviar Novo Link
                  </>
                )}
              </Button>
            </form>

            <button
              type="button"
              onClick={() => navigate("/admin/login")}
              className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors"
            >
              Voltar ao login
            </button>
          </div>
        </Card>
      </div>
    );
  }

  // Valid session - show password reset form
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8 bg-card/50 backdrop-blur-sm border-primary/20">
        <div className="flex flex-col items-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center">
            <KeyRound className="w-8 h-8 text-white" />
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Redefinir Senha</h1>
            <p className="text-muted-foreground mt-2">
              Digite sua nova senha abaixo
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="w-full space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Nova Senha
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua nova senha"
                  className="bg-background/50 pr-10"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${getPasswordStrength(password).color}`} 
                        style={{ width: `${(getPasswordStrength(password).level / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{getPasswordStrength(password).label}</span>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    <li className={password.length >= 8 ? "text-green-500" : ""}>• Mínimo 8 caracteres</li>
                    <li className={/[A-Z]/.test(password) ? "text-green-500" : ""}>• Uma letra maiúscula</li>
                    <li className={/[a-z]/.test(password) ? "text-green-500" : ""}>• Uma letra minúscula</li>
                    <li className={/[0-9]/.test(password) ? "text-green-500" : ""}>• Um número</li>
                    <li className={/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\\/`~]/.test(password) ? "text-green-500" : ""}>• Um caractere especial</li>
                  </ul>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Confirmar Senha
              </label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirme sua nova senha"
                  className="bg-background/50 pr-10"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-primary"
              disabled={isLoading}
            >
              {isLoading ? "Atualizando..." : "Redefinir Senha"}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default AdminResetPassword;
