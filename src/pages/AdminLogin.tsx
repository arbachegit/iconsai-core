import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Lock, ArrowLeft, Zap, KeyRound, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const logPasswordRecoveryAttempt = async (email: string, action: string, success: boolean) => {
  try {
    await supabase.from("user_activity_logs").insert({
      user_email: email,
      action,
      action_category: "PASSWORD_RECOVERY",
      details: { success, timestamp: new Date().toISOString() },
      user_agent: navigator.userAgent,
    });
  } catch (error) {
    console.error("Failed to log password recovery attempt:", error);
  }
};

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if user has admin role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleData) {
        await supabase.auth.signOut();
        throw new Error("Acesso negado. Você não tem permissões de administrador.");
      }

      toast({
        title: "Login realizado",
        description: "Bem-vindo ao painel administrativo.",
      });
      navigate("/admin");
    } catch (error: any) {
      toast({
        title: "Erro ao fazer login",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResetting(true);

    try {
      const response = await supabase.functions.invoke('send-recovery-code', {
        body: { email: resetEmail }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao enviar código');
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

      await logPasswordRecoveryAttempt(resetEmail, 'Código de recuperação solicitado', true);

      toast({
        title: "Código enviado",
        description: "Verifique seu email para o código de recuperação",
      });

      // Navigate to reset page with email
      navigate(`/admin/reset-password?email=${encodeURIComponent(resetEmail)}`);

    } catch (err: any) {
      console.error("Error requesting recovery code:", err);
      await logPasswordRecoveryAttempt(resetEmail, 'Falha ao solicitar código', false);
      toast({
        title: "Erro",
        description: err.message || "Erro ao solicitar código de recuperação",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8 bg-card/50 backdrop-blur-sm border-primary/20">
        <div className="flex flex-col items-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center">
            {showForgotPassword ? (
              <KeyRound className="w-8 h-8 text-white" />
            ) : (
              <Lock className="w-8 h-8 text-white" />
            )}
          </div>

          {!showForgotPassword ? (
            <>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
                <p className="text-muted-foreground mt-2">
                  Entre com suas credenciais
                </p>
              </div>

              <form onSubmit={handleLogin} className="w-full space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu-email@exemplo.com"
                    className="bg-background/50"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Senha
                  </label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    className="bg-background/50"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-primary"
                  disabled={isLoading}
                >
                  {isLoading ? "Entrando..." : "Entrar"}
                </Button>
              </form>

              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors"
              >
                Esqueceu sua senha?
              </button>
            </>
          ) : (
            <>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-foreground">Recuperar Senha</h1>
                <p className="text-muted-foreground mt-2">
                  Digite seu email para receber um código de recuperação
                </p>
              </div>

              <form onSubmit={handleRequestCode} className="w-full space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="seu-email@exemplo.com"
                    className="bg-background/50"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-primary"
                  disabled={isResetting}
                >
                  {isResetting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando código...
                    </>
                  ) : (
                    "Enviar Código"
                  )}
                </Button>
              </form>

              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetEmail("");
                }}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao login
              </button>
            </>
          )}

          {/* Botão retornar ao App */}
          <div className="w-full pt-0.5 border-t border-primary/10">
            <Link to="/">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground hover:text-foreground text-xs"
              >
                <Zap className="w-3 h-3 mr-1" />
                Retornar ao App
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AdminLogin;
