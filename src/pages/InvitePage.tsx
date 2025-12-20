import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CircularTimer } from "@/components/ui/circular-timer";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { 
  Loader2, 
  Mail, 
  Phone, 
  MapPin, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  XCircle,
  RefreshCw,
  ArrowRight,
  ArrowLeft
} from "lucide-react";
import knowYouLogo from "@/assets/knowyou-admin-logo.png";

// Form schemas for each step
const addressSchema = z.object({
  phone: z.string().min(14, "Telefone inválido"),
  addressCep: z.string().min(8, "CEP inválido"),
  addressStreet: z.string().min(3, "Rua é obrigatória"),
  addressNumber: z.string().min(1, "Número é obrigatório"),
  addressComplement: z.string().optional(),
  addressNeighborhood: z.string().min(2, "Bairro é obrigatório"),
  addressCity: z.string().min(2, "Cidade é obrigatória"),
  addressState: z.string().length(2, "Estado inválido"),
});

const passwordSchema = z.object({
  password: z.string()
    .min(8, "Mínimo 8 caracteres")
    .regex(/[A-Z]/, "Deve ter uma letra maiúscula")
    .regex(/[a-z]/, "Deve ter uma letra minúscula")
    .regex(/[0-9]/, "Deve ter um número"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type AddressFormData = z.infer<typeof addressSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

interface Invitation {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
}

const TIMER_DURATION = 120; // 2 minutes in seconds

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  // State
  const [step, setStep] = useState<"loading" | "form" | "verification" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState<"email" | "whatsapp">("email");
  const [maskedDestination, setMaskedDestination] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [canResend, setCanResend] = useState(false);
  const [formData, setFormData] = useState<AddressFormData & PasswordFormData | null>(null);
  const [cepLoading, setCepLoading] = useState(false);

  // Form hooks
  const addressForm = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      phone: "",
      addressCep: "",
      addressStreet: "",
      addressNumber: "",
      addressComplement: "",
      addressNeighborhood: "",
      addressCity: "",
      addressState: "",
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setStep("error");
        setErrorMessage("Token inválido");
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_invitations")
          .select("*")
          .eq("token", token)
          .single();

        if (error || !data) {
          setStep("error");
          setErrorMessage("Convite não encontrado");
          return;
        }

        // Check if expired
        if (new Date(data.expires_at) < new Date()) {
          setStep("error");
          setErrorMessage("Este convite expirou");
          return;
        }

        // Check if already completed
        if (data.status === "completed") {
          setStep("error");
          setErrorMessage("Este convite já foi utilizado");
          return;
        }

        setInvitation(data as Invitation);
        setStep("form");
        
        // Track link opened
        await supabase
          .from("user_invitations")
          .update({ link_opened_at: new Date().toISOString() })
          .eq("token", token);
      } catch (err) {
        setStep("error");
        setErrorMessage("Erro ao validar convite");
      }
    };

    validateToken();
  }, [token]);

  // Timer countdown
  useEffect(() => {
    if (step !== "verification" || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [step, timeLeft]);

  // Fetch address from CEP
  const fetchAddressFromCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;

    setCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast.error("CEP não encontrado");
        return;
      }

      addressForm.setValue("addressStreet", data.logradouro || "");
      addressForm.setValue("addressNeighborhood", data.bairro || "");
      addressForm.setValue("addressCity", data.localidade || "");
      addressForm.setValue("addressState", data.uf || "");
    } catch {
      toast.error("Erro ao buscar CEP");
    } finally {
      setCepLoading(false);
    }
  };

  // Format phone
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  // Format CEP
  const formatCep = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 5) return numbers;
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  // Submit form and request verification code
  const handleFormSubmit = async () => {
    // Validate both forms
    const addressValid = await addressForm.trigger();
    const passwordValid = await passwordForm.trigger();

    if (!addressValid || !passwordValid) return;

    const addressData = addressForm.getValues();
    const passwordData = passwordForm.getValues();

    setFormData({ ...addressData, ...passwordData });
    setIsLoading(true);

    try {
      // Convert phone to international format
      const phoneNumbers = addressData.phone.replace(/\D/g, "");
      const internationalPhone = `+55${phoneNumbers}`;

      const { data, error } = await supabase.functions.invoke("send-invitation-verification", {
        body: {
          token,
          phone: internationalPhone,
          addressCep: addressData.addressCep,
          addressStreet: addressData.addressStreet,
          addressNumber: addressData.addressNumber,
          addressComplement: addressData.addressComplement,
          addressNeighborhood: addressData.addressNeighborhood,
          addressCity: addressData.addressCity,
          addressState: addressData.addressState,
          password: passwordData.password,
          verificationMethod,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setMaskedDestination(data.maskedDestination);
      setTimeLeft(TIMER_DURATION);
      setCanResend(false);
      setStep("verification");
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar código");
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP code
  const handleVerifyCode = async () => {
    if (otpValue.length !== 6 || !formData) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-invitation-code", {
        body: {
          token,
          code: otpValue,
          password: formData.password,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setStep("success");
      toast.success("Cadastro concluído!");
    } catch (err: any) {
      toast.error(err.message || "Código inválido");
      setOtpValue("");
    } finally {
      setIsLoading(false);
    }
  };

  // Resend code
  const handleResendCode = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("resend-invitation-code", {
        body: { token },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setMaskedDestination(data.maskedDestination);
      setTimeLeft(TIMER_DURATION);
      setCanResend(false);
      setOtpValue("");
      toast.success("Código reenviado!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao reenviar código");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-verify when OTP is complete
  useEffect(() => {
    if (otpValue.length === 6 && step === "verification") {
      handleVerifyCode();
    }
  }, [otpValue]);

  // Password strength indicator
  const password = passwordForm.watch("password");
  const passwordStrength = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };
  const strengthCount = Object.values(passwordStrength).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center pb-2">
          <img src={knowYouLogo} alt="KnowYOU" className="h-12 mx-auto mb-4" />
          <CardTitle className="text-2xl">
            {step === "loading" && "Carregando..."}
            {step === "form" && "Complete seu cadastro"}
            {step === "verification" && "Verificação"}
            {step === "success" && "Cadastro Concluído!"}
            {step === "error" && "Ops!"}
          </CardTitle>
          <CardDescription>
            {step === "form" && invitation && (
              <>Olá <strong>{invitation.name}</strong>, preencha os dados abaixo</>
            )}
            {step === "verification" && (
              <>Digite o código enviado para <strong>{maskedDestination}</strong></>
            )}
            {step === "success" && "Você já pode fazer login"}
            {step === "error" && errorMessage}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Loading */}
          {step === "loading" && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* Form Step */}
          {step === "form" && invitation && (
            <div className="space-y-6">
              {/* Email (readonly) */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input value={invitation.email} disabled className="bg-muted" />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Telefone *
                </Label>
                <Input
                  placeholder="(11) 99999-9999"
                  {...addressForm.register("phone", {
                    onChange: (e) => {
                      e.target.value = formatPhone(e.target.value);
                    },
                  })}
                />
                {addressForm.formState.errors.phone && (
                  <p className="text-sm text-destructive">
                    {addressForm.formState.errors.phone.message}
                  </p>
                )}
              </div>

              {/* Address */}
              <div className="space-y-4">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Endereço *
                </Label>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <Input
                      placeholder="CEP"
                      {...addressForm.register("addressCep", {
                        onChange: (e) => {
                          e.target.value = formatCep(e.target.value);
                          if (e.target.value.replace(/\D/g, "").length === 8) {
                            fetchAddressFromCep(e.target.value);
                          }
                        },
                      })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      placeholder="Rua"
                      disabled={cepLoading}
                      {...addressForm.register("addressStreet")}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <Input
                    placeholder="Número"
                    {...addressForm.register("addressNumber")}
                  />
                  <div className="col-span-2">
                    <Input
                      placeholder="Complemento (opcional)"
                      {...addressForm.register("addressComplement")}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <Input
                    placeholder="Bairro"
                    disabled={cepLoading}
                    {...addressForm.register("addressNeighborhood")}
                  />
                  <Input
                    placeholder="Cidade"
                    disabled={cepLoading}
                    {...addressForm.register("addressCity")}
                  />
                  <Input
                    placeholder="UF"
                    maxLength={2}
                    className="uppercase"
                    disabled={cepLoading}
                    {...addressForm.register("addressState")}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-4">
                <Label className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Senha *
                </Label>

                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Crie uma senha forte"
                    {...passwordForm.register("password")}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>

                {/* Password strength */}
                <div className="space-y-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          i <= strengthCount
                            ? strengthCount <= 1
                              ? "bg-red-500"
                              : strengthCount <= 2
                              ? "bg-orange-500"
                              : strengthCount <= 3
                              ? "bg-yellow-500"
                              : "bg-emerald-500"
                            : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className={`flex items-center gap-1 ${passwordStrength.length ? "text-emerald-500" : "text-muted-foreground"}`}>
                      {passwordStrength.length ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      Mínimo 8 caracteres
                    </div>
                    <div className={`flex items-center gap-1 ${passwordStrength.upper ? "text-emerald-500" : "text-muted-foreground"}`}>
                      {passwordStrength.upper ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      Uma letra maiúscula
                    </div>
                    <div className={`flex items-center gap-1 ${passwordStrength.lower ? "text-emerald-500" : "text-muted-foreground"}`}>
                      {passwordStrength.lower ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      Uma letra minúscula
                    </div>
                    <div className={`flex items-center gap-1 ${passwordStrength.number ? "text-emerald-500" : "text-muted-foreground"}`}>
                      {passwordStrength.number ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      Um número
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirme a senha"
                    {...passwordForm.register("confirmPassword")}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">
                    {passwordForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Verification method */}
              <div className="space-y-3">
                <Label>Receber código de verificação via:</Label>
                <RadioGroup
                  value={verificationMethod}
                  onValueChange={(v) => setVerificationMethod(v as "email" | "whatsapp")}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="email" id="email" />
                    <Label htmlFor="email" className="flex items-center gap-1 cursor-pointer">
                      <Mail className="h-4 w-4" />
                      Email
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="whatsapp" id="whatsapp" />
                    <Label htmlFor="whatsapp" className="flex items-center gap-1 cursor-pointer">
                      <Phone className="h-4 w-4" />
                      WhatsApp
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleFormSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    Continuar
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Verification Step */}
          {step === "verification" && (
            <div className="space-y-6 text-center">
              <div className="flex justify-center">
                <CircularTimer timeLeft={timeLeft} totalTime={TIMER_DURATION} />
              </div>

              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otpValue}
                  onChange={setOtpValue}
                  disabled={isLoading}
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

              {isLoading && (
                <div className="flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}

              {canResend && (
                <Button
                  variant="outline"
                  onClick={handleResendCode}
                  disabled={isLoading}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reenviar código
                </Button>
              )}

              <Button
                variant="ghost"
                onClick={() => {
                  setStep("form");
                  setOtpValue("");
                }}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            </div>
          )}

          {/* Success Step */}
          {step === "success" && (
            <div className="space-y-6 text-center">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              </div>

              <div className="space-y-2">
                <p className="text-muted-foreground">
                  Sua conta foi criada com sucesso. Use o email e senha que você cadastrou para acessar a plataforma.
                </p>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={() => navigate("/admin/login")}
              >
                Ir para Login
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Error Step */}
          {step === "error" && (
            <div className="space-y-6 text-center">
              <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
                <XCircle className="h-10 w-10 text-destructive" />
              </div>

              <Button
                variant="outline"
                onClick={() => navigate("/")}
              >
                Voltar para o início
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
