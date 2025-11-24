import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Lock } from "lucide-react";

const AdminLogin = () => {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simple password check - in production, use proper authentication
    if (password === "admin123") {
      localStorage.setItem("admin_authenticated", "true");
      toast({
        title: "Login realizado",
        description: "Bem-vindo ao painel administrativo.",
      });
      navigate("/admin");
    } else {
      toast({
        title: "Senha incorreta",
        description: "Tente novamente.",
        variant: "destructive",
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8 bg-card/50 backdrop-blur-sm border-primary/20">
        <div className="flex flex-col items-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center">
            <Lock className="w-8 h-8 text-white" />
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
            <p className="text-muted-foreground mt-2">
              Entre com suas credenciais
            </p>
          </div>

          <form onSubmit={handleLogin} className="w-full space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Senha
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a senha de administrador"
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

          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="text-sm"
          >
            Voltar ao site
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default AdminLogin;
