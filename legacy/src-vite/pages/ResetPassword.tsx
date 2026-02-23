/**
 * ============================================
 * ResetPassword.tsx - v1.0.0
 * ============================================
 * Fluxo de reset de senha customizado:
 * 1. Usuário chega com token na URL
 * 2. Insere nova senha duas vezes
 * 3. Recebe código de 6 dígitos por email
 * 4. Insere código para confirmar
 * ============================================
 */

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Lock,
  KeyRound,
  Loader2,
  Eye,
  EyeOff,
  Check,
  X,
  AlertCircle,
  Mail,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type Step = "password" | "code" | "success";

interface PasswordStrength {
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
}

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [step, setStep] = useState<Step>("password");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState("");

  // Password fields
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    hasMinLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
  });
  const [passwordsMatch, setPasswordsMatch] = useState<boolean | null>(null);

  // Verification code
  const [code, setCode] = useState(["", "", "", "", "", ""]);

  // Validate token on load
  useEffect(() => {
    if (!token) {
      toast({
        title: "Link inválido",
        description: "Por favor, solicite um novo link de recuperação.",
        variant: "destructive",
      });
      navigate("/admin/login");
    }
  }, [token, navigate, toast]);

  // Password strength validation
  useEffect(() => {
    setPasswordStrength({
      hasMinLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
    });
  }, [password]);

  // Password match validation
  useEffect(() => {
    if (confirmPassword.length === 0) {
      setPasswordsMatch(null);
    } else {
      setPasswordsMatch(password === confirmPassword);
    }
  }, [password, confirmPassword]);

  const isPasswordValid =
    passwordStrength.hasMinLength &&
    passwordStrength.hasUppercase &&
    passwordStrength.hasLowercase &&
    passwordStrength.hasNumber;

  const canSubmitPassword = isPasswordValid && passwordsMatch === true;

  // Handle password submission
  const handleSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSubmitPassword || !token) return;

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("set-new-password", {
        body: {
          token,
          newPassword: password,
          confirmPassword,
        },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || "Erro ao processar senha");
      }

      setMaskedEmail(data.email || "");
      setStep("code");
      toast({
        title: "Código enviado!",
        description: "Verifique seu email para obter o código de verificação.",
      });
    } catch (err: any) {
      console.error("Error setting password:", err);
      toast({
        title: "Erro",
        description: err.message || "Erro ao processar senha",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle code input
  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newCode = [...code];
    pastedData.split("").forEach((char, i) => {
      if (i < 6) newCode[i] = char;
    });
    setCode(newCode);

    // Focus last filled input or last input
    const lastIndex = Math.min(pastedData.length - 1, 5);
    document.getElementById(`code-${lastIndex}`)?.focus();
  };

  // Handle code verification
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();

    const fullCode = code.join("");
    if (fullCode.length !== 6 || !token) return;

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("verify-reset-code", {
        body: {
          token,
          code: fullCode,
        },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || "Código inválido");
      }

      setStep("success");
      toast({
        title: "Senha alterada!",
        description: "Sua senha foi alterada com sucesso.",
      });
    } catch (err: any) {
      console.error("Error verifying code:", err);
      toast({
        title: "Erro",
        description: err.message || "Código inválido",
        variant: "destructive",
      });
      // Clear code on error
      setCode(["", "", "", "", "", ""]);
      document.getElementById("code-0")?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  // Render password strength indicator
  const renderStrengthItem = (label: string, isValid: boolean) => (
    <div className="flex items-center gap-2 text-xs">
      {isValid ? (
        <Check className="w-3 h-3 text-green-500" />
      ) : (
        <X className="w-3 h-3 text-muted-foreground" />
      )}
      <span className={isValid ? "text-green-500" : "text-muted-foreground"}>
        {label}
      </span>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8 bg-card/50 backdrop-blur-sm border-primary/20">
        <div className="flex flex-col items-center space-y-6">
          {/* Icon */}
          <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center">
            {step === "password" && <Lock className="w-8 h-8 text-white" />}
            {step === "code" && <Mail className="w-8 h-8 text-white" />}
            {step === "success" && <ShieldCheck className="w-8 h-8 text-white" />}
          </div>

          {/* Step: Password */}
          {step === "password" && (
            <>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-foreground">Nova Senha</h1>
                <p className="text-muted-foreground mt-2">
                  Digite sua nova senha
                </p>
              </div>

              <form onSubmit={handleSubmitPassword} className="w-full space-y-4">
                {/* Password */}
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
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {/* Password strength */}
                  {password.length > 0 && (
                    <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                      {renderStrengthItem("Mínimo 8 caracteres", passwordStrength.hasMinLength)}
                      {renderStrengthItem("Letra maiúscula", passwordStrength.hasUppercase)}
                      {renderStrengthItem("Letra minúscula", passwordStrength.hasLowercase)}
                      {renderStrengthItem("Número", passwordStrength.hasNumber)}
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
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
                      className={`bg-background/50 pr-10 ${
                        passwordsMatch === false
                          ? "border-red-500 focus:border-red-500"
                          : passwordsMatch === true
                          ? "border-green-500 focus:border-green-500"
                          : ""
                      }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {passwordsMatch === false && (
                    <div className="flex items-center gap-1 text-xs text-red-500">
                      <AlertCircle className="h-3 w-3" />
                      As senhas não coincidem
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-primary"
                  disabled={isLoading || !canSubmitPassword}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    "Continuar"
                  )}
                </Button>
              </form>
            </>
          )}

          {/* Step: Code Verification */}
          {step === "code" && (
            <>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-foreground">
                  Código de Verificação
                </h1>
                <p className="text-muted-foreground mt-2">
                  Digite o código de 6 dígitos enviado para
                </p>
                <p className="text-primary font-medium">{maskedEmail}</p>
              </div>

              <form onSubmit={handleVerifyCode} className="w-full space-y-6">
                {/* Code inputs */}
                <div className="flex justify-center gap-2" onPaste={handleCodePaste}>
                  {code.map((digit, index) => (
                    <Input
                      key={index}
                      id={`code-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(index, e)}
                      className="w-12 h-14 text-center text-2xl font-mono bg-background/50 border-2 focus:border-primary"
                      autoFocus={index === 0}
                    />
                  ))}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-primary"
                  disabled={isLoading || code.join("").length !== 6}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    "Verificar Código"
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  O código expira em 10 minutos
                </p>
              </form>
            </>
          )}

          {/* Step: Success */}
          {step === "success" && (
            <>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-green-500">
                  Senha Alterada!
                </h1>
                <p className="text-muted-foreground mt-2">
                  Sua senha foi alterada com sucesso.
                  <br />
                  Você já pode fazer login com sua nova senha.
                </p>
              </div>

              <Link to="/admin/login" className="w-full">
                <Button className="w-full bg-gradient-primary">
                  Ir para Login
                </Button>
              </Link>
            </>
          )}

          {/* Back to login link */}
          {step !== "success" && (
            <Link
              to="/admin/login"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao login
            </Link>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ResetPassword;
