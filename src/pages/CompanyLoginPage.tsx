/**
 * CompanyLoginPage - Login por Empresa
 * @version 1.0.0
 *
 * Rota: /:empresa (ex: core.iconsai.ai/acme)
 *
 * Fluxo:
 * 1. Carrega dados da empresa pelo slug
 * 2. Exibe formulário de login com branding da empresa
 * 3. Após login, redireciona para PWA com assistentes configurados
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Eye,
  EyeOff,
  Building,
  AlertCircle,
  ArrowLeft,
  KeyRound,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import iconsaiLogo from "@/assets/iconsai-logo.png";

interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  settings: Record<string, any>;
}

interface CompanyAssistant {
  id: string;
  assistant_id: string;
  is_default: boolean;
  assistant: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    voice_id: string | null;
  };
}

export default function CompanyLoginPage() {
  const { empresa } = useParams<{ empresa: string }>();
  const navigate = useNavigate();

  // Company data
  const [company, setCompany] = useState<Company | null>(null);
  const [assistants, setAssistants] = useState<CompanyAssistant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Login form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password reset
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  // Load company data
  useEffect(() => {
    const loadCompany = async () => {
      if (!empresa) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      try {
        // Get company by slug
        const { data: companyData, error: companyError } = await supabase
          .from("companies")
          .select("id, name, slug, logo_url, primary_color, settings")
          .eq("slug", empresa.toLowerCase())
          .eq("is_active", true)
          .maybeSingle();

        if (companyError) throw companyError;

        if (!companyData) {
          setNotFound(true);
          setIsLoading(false);
          return;
        }

        setCompany(companyData);

        // Get company assistants
        const { data: assistantsData, error: assistantsError } = await supabase
          .from("company_assistants")
          .select(`
            id,
            assistant_id,
            is_default,
            assistant:assistants(id, name, slug, description, voice_id)
          `)
          .eq("company_id", companyData.id)
          .eq("is_active", true)
          .order("position");

        if (assistantsError) throw assistantsError;
        setAssistants(assistantsData || []);
      } catch (error: any) {
        console.error("Error loading company:", error);
        toast.error("Erro ao carregar dados da empresa");
      } finally {
        setIsLoading(false);
      }
    };

    loadCompany();
  }, [empresa]);

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;

    setIsSubmitting(true);

    try {
      // Sign in
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // Verify user belongs to this company
      const { data: companyUser, error: userError } = await supabase
        .from("company_users")
        .select("id, name, role, is_active")
        .eq("company_id", company.id)
        .eq("email", email.toLowerCase())
        .maybeSingle();

      if (userError) throw userError;

      if (!companyUser) {
        // User not registered in this company
        await supabase.auth.signOut();
        toast.error("Você não tem acesso a esta empresa");
        return;
      }

      if (!companyUser.is_active) {
        await supabase.auth.signOut();
        toast.error("Sua conta está desativada. Contate o administrador.");
        return;
      }

      // Update auth_user_id if not set
      if (!companyUser) {
        await supabase
          .from("company_users")
          .update({
            auth_user_id: authData.user.id,
            last_login_at: new Date().toISOString(),
            login_count: 1,
          })
          .eq("id", companyUser);
      } else {
        // Update login stats
        await supabase
          .from("company_users")
          .update({
            last_login_at: new Date().toISOString(),
          })
          .eq("id", companyUser.id);
      }

      // Store company context
      localStorage.setItem("company_id", company.id);
      localStorage.setItem("company_slug", company.slug);
      localStorage.setItem("company_name", company.name);
      if (company.primary_color) {
        localStorage.setItem("company_color", company.primary_color);
      }

      // Get default assistant
      const defaultAssistant = assistants.find((a) => a.is_default) || assistants[0];
      if (defaultAssistant?.assistant?.voice_id) {
        localStorage.setItem("elevenlabs_voice_id", defaultAssistant.assistant.voice_id);
      }

      toast.success(`Bem-vindo, ${companyUser.name}!`);

      // Redirect to PWA with company context
      const agentSlug = defaultAssistant?.assistant?.slug || "";
      navigate(`/pwa?company=${company.slug}&agent=${agentSlug}`);
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.message?.includes("Invalid login credentials")) {
        toast.error("Email ou senha incorretos");
      } else {
        toast.error(error.message || "Erro ao fazer login");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle password reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResetting(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast.success("Email de recuperação enviado!");
      setShowResetPassword(false);
      setResetEmail("");
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar email");
    } finally {
      setIsResetting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </motion.div>
      </div>
    );
  }

  // Company not found
  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Empresa não encontrada
          </h1>
          <p className="text-muted-foreground mb-6">
            A empresa "{empresa}" não existe ou não está ativa.
          </p>
          <Button onClick={() => navigate("/admin/login")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Ir para Login Admin
          </Button>
        </motion.div>
      </div>
    );
  }

  const primaryColor = company?.primary_color || "#6366f1";

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: `linear-gradient(135deg, ${primaryColor}10 0%, #0a0e1a 50%, ${primaryColor}05 100%)`,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card
          className="p-8 bg-card/80 backdrop-blur-lg border-2"
          style={{ borderColor: `${primaryColor}40` }}
        >
          {/* Logo */}
          <div className="text-center mb-8">
            {company?.logo_url ? (
              <img
                src={company.logo_url}
                alt={company.name}
                className="h-16 mx-auto mb-4 object-contain"
              />
            ) : (
              <div
                className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ backgroundColor: `${primaryColor}20` }}
              >
                <Building
                  className="w-8 h-8"
                  style={{ color: primaryColor }}
                />
              </div>
            )}
            <h1 className="text-2xl font-bold text-foreground">
              {company?.name}
            </h1>
            <p className="text-muted-foreground mt-2">
              {showResetPassword
                ? "Recuperar senha"
                : "Entre com suas credenciais"}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {!showResetPassword ? (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleLogin}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu-email@exemplo.com"
                    required
                    className="bg-background/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Digite sua senha"
                      required
                      className="bg-background/50 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                  style={{
                    backgroundColor: primaryColor,
                    color: "#fff",
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => setShowResetPassword(true)}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Esqueceu sua senha?
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="reset"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleResetPassword}
                className="space-y-4"
              >
                <div className="flex justify-center mb-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${primaryColor}20` }}
                  >
                    <KeyRound
                      className="w-6 h-6"
                      style={{ color: primaryColor }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="seu-email@exemplo.com"
                    required
                    className="bg-background/50"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isResetting}
                  style={{
                    backgroundColor: primaryColor,
                    color: "#fff",
                  }}
                >
                  {isResetting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar Email de Recuperação"
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => setShowResetPassword(false)}
                  className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar ao login
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Powered by IconsAI */}
          <div className="mt-8 pt-4 border-t border-border/50 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span>Powered by</span>
              <img src={iconsaiLogo} alt="IconsAI" className="h-4" />
            </div>
          </div>
        </Card>

        {/* Assistants Preview */}
        {assistants.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-4 text-center"
          >
            <p className="text-xs text-muted-foreground mb-2">
              Assistentes disponíveis:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {assistants.map((ca) => (
                <span
                  key={ca.id}
                  className="text-xs px-2 py-1 rounded-full bg-background/50 border"
                  style={{ borderColor: `${primaryColor}40` }}
                >
                  {ca.assistant.name}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
