/**
 * InviteAcceptPage - Accept Invitation and Complete Registration
 * @version 1.0.0
 * @date 2026-01-28
 *
 * Handles the invitation flow:
 * 1. Validate token
 * 2. Show invitation details
 * 3. Send verification code
 * 4. Verify code
 * 5. Set password
 * 6. Complete registration
 */

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  Loader2, CheckCircle, XCircle, Mail, Phone, Building2,
  Lock, Eye, EyeOff, ArrowRight, RefreshCw, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Step = "loading" | "invalid" | "welcome" | "verify" | "password" | "success" | "error";

interface InviteData {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string | null;
  role: string;
  institutionId: string | null;
  institutionName: string | null;
  departmentId: string | null;
  status: string;
}

export default function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [step, setStep] = useState<Step>("loading");
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verification
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationChannel, setVerificationChannel] = useState<"whatsapp" | "sms" | "email">("whatsapp");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Password
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  // Validate invite token on load
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setStep("invalid");
        return;
      }

      try {
        // Fetch invite by token
        const { data: inviteData, error: fetchError } = await supabase
          .from("user_invites")
          .select("*, institutions(name)")
          .eq("token", token)
          .single();

        if (fetchError || !inviteData) {
          setStep("invalid");
          setError("Convite não encontrado ou expirado.");
          return;
        }

        // Check status
        if (inviteData.status === "completed") {
          setStep("invalid");
          setError("Este convite já foi utilizado.");
          return;
        }

        if (inviteData.status === "cancelled") {
          setStep("invalid");
          setError("Este convite foi cancelado.");
          return;
        }

        if (new Date(inviteData.expires_at) < new Date()) {
          setStep("invalid");
          setError("Este convite expirou.");
          return;
        }

        // Mark as opened
        await supabase.rpc("mark_invite_opened", {
          p_invite_id: inviteData.id,
          p_ip: null,
          p_user_agent: navigator.userAgent,
        });

        setInvite({
          id: inviteData.id,
          email: inviteData.email,
          phone: inviteData.phone,
          firstName: inviteData.first_name,
          lastName: inviteData.last_name,
          role: inviteData.role,
          institutionId: inviteData.institution_id,
          institutionName: inviteData.institutions?.name || null,
          departmentId: inviteData.department_id,
          status: inviteData.status,
        });

        // Determine initial step based on status
        if (inviteData.status === "verified") {
          setStep("password");
        } else {
          setStep("welcome");
        }
      } catch (err) {
        console.error("[InviteAcceptPage] Error:", err);
        setStep("error");
        setError("Erro ao carregar convite.");
      }
    };

    validateToken();
  }, [token]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Send verification code
  const sendVerificationCode = async () => {
    if (!invite) return;

    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke("verify-invite-code", {
        body: { inviteId: invite.id, channel: verificationChannel },
        headers: { "Content-Type": "application/json" },
      });

      // Handle the response - parse if needed
      const data = typeof response.data === "string" ? JSON.parse(response.data) : response.data;

      if (!data?.success) {
        throw new Error(data?.error || "Erro ao enviar código");
      }

      toast.success(`Código enviado por ${verificationChannel === "whatsapp" ? "WhatsApp" : verificationChannel.toUpperCase()}`);
      setStep("verify");
      setResendCooldown(60);
    } catch (err: any) {
      console.error("[InviteAcceptPage] Send code error:", err);
      toast.error(err.message || "Erro ao enviar código");
    } finally {
      setIsLoading(false);
    }
  };

  // Verify code
  const verifyCode = async () => {
    if (!invite || verificationCode.length !== 6) return;

    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke("verify-invite-code", {
        body: {
          inviteId: invite.id,
          code: verificationCode,
          channel: verificationChannel,
        },
        headers: { "Content-Type": "application/json" },
      });

      const data = typeof response.data === "string" ? JSON.parse(response.data) : response.data;

      if (!data?.success) {
        throw new Error(data?.error || "Código inválido");
      }

      toast.success("Código verificado!");
      setStep("password");
    } catch (err: any) {
      console.error("[InviteAcceptPage] Verify error:", err);
      toast.error(err.message || "Código inválido");
      setVerificationCode("");
    } finally {
      setIsLoading(false);
    }
  };

  // Validate password
  const validatePassword = (pwd: string): string[] => {
    const errors: string[] = [];
    if (pwd.length < 8) errors.push("Mínimo 8 caracteres");
    if (!/[A-Z]/.test(pwd)) errors.push("Uma letra maiúscula");
    if (!/[a-z]/.test(pwd)) errors.push("Uma letra minúscula");
    if (!/[0-9]/.test(pwd)) errors.push("Um número");
    return errors;
  };

  // Handle password change
  const handlePasswordChange = (pwd: string) => {
    setPassword(pwd);
    setPasswordErrors(validatePassword(pwd));
  };

  // Complete registration
  const completeRegistration = async () => {
    if (!invite) return;

    if (passwordErrors.length > 0) {
      toast.error("Senha não atende aos requisitos");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas não conferem");
      return;
    }

    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke("complete-registration", {
        body: {
          inviteId: invite.id,
          password,
          confirmPassword,
        },
        headers: { "Content-Type": "application/json" },
      });

      const data = typeof response.data === "string" ? JSON.parse(response.data) : response.data;

      if (!data?.success) {
        throw new Error(data?.error || "Erro ao criar conta");
      }

      toast.success("Conta criada com sucesso!");
      setStep("success");

      // Redirect after delay
      setTimeout(() => {
        if (data.loginLink) {
          window.location.href = data.loginLink;
        } else {
          navigate(data.redirectUrl || "/login");
        }
      }, 2000);
    } catch (err: any) {
      console.error("[InviteAcceptPage] Registration error:", err);
      toast.error(err.message || "Erro ao criar conta");
    } finally {
      setIsLoading(false);
    }
  };

  // Render loading state
  if (step === "loading") {
    return (
      <div className="min-h-screen bg-[#0A0E1A] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-[#1A1F2E] border-[#2A2F3E]">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-[#00D4FF]" />
            <p className="mt-4 text-gray-400">Carregando convite...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render invalid state
  if (step === "invalid" || step === "error") {
    return (
      <div className="min-h-screen bg-[#0A0E1A] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-[#1A1F2E] border-[#2A2F3E]">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <XCircle className="h-6 w-6 text-red-500" />
            </div>
            <CardTitle className="text-white">Convite Inválido</CardTitle>
            <CardDescription className="text-gray-400">
              {error || "Este link de convite não é válido."}
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button variant="outline" onClick={() => router.push("/")}>
              Voltar ao início
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Render success state
  if (step === "success") {
    return (
      <div className="min-h-screen bg-[#0A0E1A] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-[#1A1F2E] border-[#2A2F3E]">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <CardTitle className="text-white">Conta Criada!</CardTitle>
            <CardDescription className="text-gray-400">
              Sua conta foi criada com sucesso. Você será redirecionado...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#00D4FF]" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0E1A] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-[#1A1F2E] border-[#2A2F3E]">
        {/* Welcome Step */}
        {step === "welcome" && invite && (
          <>
            <CardHeader className="text-center">
              <div className="text-3xl font-bold text-[#00D4FF] mb-2">IconsAI</div>
              <CardTitle className="text-white">Bem-vindo(a), {invite.firstName}!</CardTitle>
              <CardDescription className="text-gray-400">
                Você foi convidado para usar a plataforma IconsAI.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {invite.institutionName && (
                <div className="flex items-center gap-3 p-3 bg-[#0A0E1A] rounded-lg">
                  <Building2 className="h-5 w-5 text-[#00D4FF]" />
                  <div>
                    <p className="text-sm text-gray-400">Instituição</p>
                    <p className="text-white font-medium">{invite.institutionName}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 p-3 bg-[#0A0E1A] rounded-lg">
                <Mail className="h-5 w-5 text-[#00D4FF]" />
                <div>
                  <p className="text-sm text-gray-400">Email</p>
                  <p className="text-white">{invite.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-[#0A0E1A] rounded-lg">
                <Phone className="h-5 w-5 text-[#00D4FF]" />
                <div>
                  <p className="text-sm text-gray-400">Telefone</p>
                  <p className="text-white">{invite.phone}</p>
                </div>
              </div>

              <Separator className="bg-[#2A2F3E]" />

              <div className="space-y-3">
                <p className="text-sm text-gray-400 text-center">
                  Como você deseja receber o código de verificação?
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={verificationChannel === "whatsapp" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setVerificationChannel("whatsapp")}
                    className={verificationChannel === "whatsapp" ? "bg-[#00D4FF] text-black" : ""}
                  >
                    WhatsApp
                  </Button>
                  <Button
                    variant={verificationChannel === "sms" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setVerificationChannel("sms")}
                    className={verificationChannel === "sms" ? "bg-[#00D4FF] text-black" : ""}
                  >
                    SMS
                  </Button>
                  <Button
                    variant={verificationChannel === "email" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setVerificationChannel("email")}
                    className={verificationChannel === "email" ? "bg-[#00D4FF] text-black" : ""}
                  >
                    Email
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full bg-[#00D4FF] text-black hover:bg-[#00B8DB]"
                onClick={sendVerificationCode}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                Continuar
              </Button>
            </CardFooter>
          </>
        )}

        {/* Verify Step */}
        {step === "verify" && invite && (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-white">Verificar Código</CardTitle>
              <CardDescription className="text-gray-400">
                Digite o código de 6 dígitos enviado para{" "}
                {verificationChannel === "email" ? invite.email : invite.phone}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={verificationCode}
                  onChange={setVerificationCode}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="bg-[#0A0E1A] border-[#2A2F3E] text-white" />
                    <InputOTPSlot index={1} className="bg-[#0A0E1A] border-[#2A2F3E] text-white" />
                    <InputOTPSlot index={2} className="bg-[#0A0E1A] border-[#2A2F3E] text-white" />
                    <InputOTPSlot index={3} className="bg-[#0A0E1A] border-[#2A2F3E] text-white" />
                    <InputOTPSlot index={4} className="bg-[#0A0E1A] border-[#2A2F3E] text-white" />
                    <InputOTPSlot index={5} className="bg-[#0A0E1A] border-[#2A2F3E] text-white" />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <div className="text-center">
                <Button
                  variant="link"
                  className="text-[#00D4FF]"
                  onClick={sendVerificationCode}
                  disabled={resendCooldown > 0 || isLoading}
                >
                  {resendCooldown > 0 ? (
                    `Reenviar em ${resendCooldown}s`
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Reenviar código
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-2">
              <Button
                className="w-full bg-[#00D4FF] text-black hover:bg-[#00B8DB]"
                onClick={verifyCode}
                disabled={verificationCode.length !== 6 || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Verificar
              </Button>
              <Button
                variant="ghost"
                className="w-full text-gray-400"
                onClick={() => setStep("welcome")}
              >
                Voltar
              </Button>
            </CardFooter>
          </>
        )}

        {/* Password Step */}
        {step === "password" && invite && (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-white">Criar Senha</CardTitle>
              <CardDescription className="text-gray-400">
                Defina uma senha segura para sua conta.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    className="pl-10 pr-10 bg-[#0A0E1A] border-[#2A2F3E] text-white"
                    placeholder="Digite sua senha"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Password requirements */}
                <div className="grid grid-cols-2 gap-1 mt-2">
                  {[
                    { text: "8+ caracteres", valid: password.length >= 8 },
                    { text: "Maiúscula", valid: /[A-Z]/.test(password) },
                    { text: "Minúscula", valid: /[a-z]/.test(password) },
                    { text: "Número", valid: /[0-9]/.test(password) },
                  ].map((req) => (
                    <div
                      key={req.text}
                      className={`flex items-center gap-1 text-xs ${
                        req.valid ? "text-green-500" : "text-gray-500"
                      }`}
                    >
                      {req.valid ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <AlertCircle className="h-3 w-3" />
                      )}
                      {req.text}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-300">Confirmar Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 bg-[#0A0E1A] border-[#2A2F3E] text-white"
                    placeholder="Confirme sua senha"
                  />
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    As senhas não conferem
                  </p>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full bg-[#00D4FF] text-black hover:bg-[#00B8DB]"
                onClick={completeRegistration}
                disabled={
                  isLoading ||
                  passwordErrors.length > 0 ||
                  password !== confirmPassword ||
                  !password
                }
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Criar Conta
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}
