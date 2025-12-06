import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, Eye, EyeOff, RefreshCw, Loader2, Check, X, ArrowLeft, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const CODE_EXPIRY_MINUTES = 15;

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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const email = searchParams.get('email') || '';
  
  const [code, setCode] = useState("");
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [codeValidated, setCodeValidated] = useState(false);
  const [validationToken, setValidationToken] = useState("");
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  const [isResendingCode, setIsResendingCode] = useState(false);
  
  // Timer state
  const [timeRemaining, setTimeRemaining] = useState(CODE_EXPIRY_MINUTES * 60);
  const [timerActive, setTimerActive] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const getTimerColor = useCallback(() => {
    if (timeRemaining <= 60) return "text-red-500";
    if (timeRemaining <= 180) return "text-amber-500";
    return "text-emerald-500";
  }, [timeRemaining]);

  // Timer effect
  useEffect(() => {
    if (!timerActive || codeValidated) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerActive, codeValidated]);

  // Reset timer when code is resent
  const resetTimer = useCallback(() => {
    setTimeRemaining(CODE_EXPIRY_MINUTES * 60);
    setTimerActive(true);
  }, []);

  useEffect(() => {
    if (!email) {
      toast({
        title: "Email não informado",
        description: "Por favor, solicite a recuperação de senha novamente.",
        variant: "destructive",
      });
      navigate('/admin/login');
    }
  }, [email, navigate, toast]);

  const validatePassword = (pwd: string) => {
    const hasLength = pwd.length >= 8;
    const hasNumber = /\d/.test(pwd);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
    const hasUppercase = /[A-Z]/.test(pwd);
    const hasLowercase = /[a-z]/.test(pwd);
    
    return { hasLength, hasNumber, hasSpecial, hasUppercase, hasLowercase };
  };

  const getPasswordStrength = (pwd: string) => {
    const checks = validatePassword(pwd);
    const passed = Object.values(checks).filter(Boolean).length;
    
    if (passed <= 2) return { level: 1, label: "Fraca", color: "bg-red-500" };
    if (passed <= 3) return { level: 2, label: "Média", color: "bg-amber-500" };
    if (passed <= 4) return { level: 3, label: "Boa", color: "bg-blue-500" };
    return { level: 4, label: "Forte", color: "bg-green-500" };
  };

  const handleValidateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsValidatingCode(true);

    try {
      const response = await supabase.functions.invoke('verify-recovery-code', {
        body: { email, code }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;

      if (!data.valid) {
        toast({
          title: "Código inválido",
          description: data.error || "O código informado é inválido ou expirou.",
          variant: "destructive",
        });
        return;
      }

      setValidationToken(data.token);
      setCodeValidated(true);
      
      toast({
        title: "Código validado",
        description: "Agora você pode definir sua nova senha.",
      });

    } catch (err: any) {
      console.error("Error validating code:", err);
      toast({
        title: "Erro",
        description: err.message || "Erro ao validar código",
        variant: "destructive",
      });
    } finally {
      setIsValidatingCode(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Senhas não conferem",
        description: "A senha e a confirmação devem ser iguais.",
        variant: "destructive",
      });
      return;
    }

    const checks = validatePassword(password);
    if (!checks.hasLength || !checks.hasNumber || !checks.hasSpecial || !checks.hasUppercase || !checks.hasLowercase) {
      toast({
        title: "Senha fraca",
        description: "A senha deve ter pelo menos 8 caracteres, incluindo maiúscula, minúscula, número e caractere especial.",
        variant: "destructive",
      });
      return;
    }

    setIsResetting(true);

    try {
      const response = await supabase.functions.invoke('reset-password-with-token', {
        body: { email, token: validationToken, newPassword: password }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;

      if (!data.success) {
        toast({
          title: "Erro",
          description: data.error || "Erro ao redefinir senha",
          variant: "destructive",
        });
        return;
      }

      await logPasswordRecoveryEvent(email, 'Senha redefinida com sucesso', true);

      toast({
        title: "Senha redefinida",
        description: "Sua senha foi alterada com sucesso. Faça login com a nova senha.",
      });

      navigate('/admin/login');

    } catch (err: any) {
      console.error("Error resetting password:", err);
      await logPasswordRecoveryEvent(email, 'Falha ao redefinir senha', false, { error: err.message });
      toast({
        title: "Erro",
        description: err.message || "Erro ao redefinir senha",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleResendCode = async () => {
    setIsResendingCode(true);

    try {
      const response = await supabase.functions.invoke('send-recovery-code', {
        body: { email }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;

      if (data.error) {
        toast({
          title: "Erro",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Código reenviado",
        description: "Verifique seu email para o novo código.",
      });

      // Reset state and timer
      setCode("");
      setCodeValidated(false);
      setValidationToken("");
      resetTimer();

    } catch (err: any) {
      console.error("Error resending code:", err);
      toast({
        title: "Erro",
        description: err.message || "Erro ao reenviar código",
        variant: "destructive",
      });
    } finally {
      setIsResendingCode(false);
    }
  };

  const passwordChecks = validatePassword(password);
  const passwordStrength = getPasswordStrength(password);

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
              {codeValidated 
                ? "Digite sua nova senha abaixo" 
                : `Insira o código enviado para ${email}`
              }
            </p>
          </div>

          {/* Timer display */}
          {!codeValidated && timerActive && (
            <div className={`flex items-center gap-2 text-sm ${getTimerColor()}`}>
              <Clock className="w-4 h-4" />
              <span>Código expira em: <span className="font-mono font-bold">{formatTime(timeRemaining)}</span></span>
            </div>
          )}

          {!codeValidated && !timerActive && timeRemaining === 0 && (
            <div className="flex items-center gap-2 text-sm text-red-500">
              <Clock className="w-4 h-4" />
              <span>Código expirado. Solicite um novo código.</span>
            </div>
          )}

          {/* Code validation form */}
          <form onSubmit={handleValidateCode} className="w-full space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Código de Recuperação
              </label>
              <Input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                required
                disabled={codeValidated || timeRemaining === 0}
                className="text-center text-2xl tracking-widest font-mono bg-background/50"
                maxLength={6}
              />
            </div>

            {!codeValidated && (
              <Button 
                type="submit" 
                className="w-full bg-gradient-primary" 
                disabled={isValidatingCode || code.length !== 6 || timeRemaining === 0}
              >
                {isValidatingCode ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validando...
                  </>
                ) : (
                  "Validar Código"
                )}
              </Button>
            )}
          </form>

          {/* Password reset form */}
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
                  placeholder="••••••••"
                  required
                  disabled={!codeValidated}
                  className="bg-background/50 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  disabled={!codeValidated}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {password && codeValidated && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${passwordStrength.color}`}
                      style={{ width: `${passwordStrength.level * 25}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{passwordStrength.label}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div className={`flex items-center gap-1 ${passwordChecks.hasLength ? 'text-green-500' : 'text-muted-foreground'}`}>
                    {passwordChecks.hasLength ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    8+ caracteres
                  </div>
                  <div className={`flex items-center gap-1 ${passwordChecks.hasUppercase ? 'text-green-500' : 'text-muted-foreground'}`}>
                    {passwordChecks.hasUppercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    Maiúscula
                  </div>
                  <div className={`flex items-center gap-1 ${passwordChecks.hasLowercase ? 'text-green-500' : 'text-muted-foreground'}`}>
                    {passwordChecks.hasLowercase ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    Minúscula
                  </div>
                  <div className={`flex items-center gap-1 ${passwordChecks.hasNumber ? 'text-green-500' : 'text-muted-foreground'}`}>
                    {passwordChecks.hasNumber ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    Número
                  </div>
                  <div className={`flex items-center gap-1 ${passwordChecks.hasSpecial ? 'text-green-500' : 'text-muted-foreground'}`}>
                    {passwordChecks.hasSpecial ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    Caractere especial
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Confirmar Senha
              </label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={!codeValidated}
                  className="bg-background/50 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  disabled={!codeValidated}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-destructive">As senhas não conferem</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full bg-gradient-primary" 
              disabled={!codeValidated || isResetting || password !== confirmPassword}
            >
              {isResetting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redefinindo...
                </>
              ) : (
                "Redefinir Senha"
              )}
            </Button>
          </form>

          {/* Resend code option */}
          <div className="w-full text-center space-y-2">
            <p className="text-sm text-muted-foreground">Não recebeu o código?</p>
            <Button
              type="button"
              variant="outline"
              onClick={handleResendCode}
              disabled={isResendingCode}
              className="w-full"
            >
              {isResendingCode ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reenviando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reenviar Código
                </>
              )}
            </Button>
          </div>

          <button
            type="button"
            onClick={() => navigate("/admin/login")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao login
          </button>
        </div>
      </Card>
    </div>
  );
};

export default AdminResetPassword;
