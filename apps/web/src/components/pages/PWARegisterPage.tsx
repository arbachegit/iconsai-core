/**
 * PWARegisterPage - Página de registro PWA via token
 *
 * v2.0.0 - Simplificado para nova arquitetura
 */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const PWARegisterPage = () => {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Validando convite...");

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setStatus("error");
        setMessage("Token inválido");
        return;
      }

      try {
        // Buscar convite pelo token
        const { data: invite, error } = await supabase
          .from("user_invites")
          .select("*")
          .eq("token", token)
          .single();

        if (error || !invite) {
          setStatus("error");
          setMessage("Convite não encontrado ou expirado");
          return;
        }

        // Verificar se já foi completado
        if (invite.status === "completed") {
          setStatus("success");
          setMessage("Convite já utilizado. Redirecionando...");
          setTimeout(() => router.push("/pwa"), 2000);
          return;
        }

        // Verificar se expirou
        if (new Date(invite.expires_at) < new Date()) {
          setStatus("error");
          setMessage("Convite expirado");
          return;
        }

        // Atualizar status do convite
        await supabase
          .from("user_invites")
          .update({
            status: "opened",
            link_opened_at: new Date().toISOString(),
          })
          .eq("id", invite.id);

        // Salvar dados no localStorage para uso posterior
        localStorage.setItem("pwa_invite_token", token);
        localStorage.setItem("pwa_user_phone", invite.phone || "");
        localStorage.setItem("pwa_user_name", invite.name || "");

        setStatus("success");
        setMessage("Convite validado! Redirecionando...");

        // Redirecionar para o PWA
        setTimeout(() => router.push("/pwa"), 1500);
      } catch (err) {
        console.error("Erro ao validar token:", err);
        setStatus("error");
        setMessage("Erro ao processar convite");
      }
    };

    validateToken();
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {status === "loading" && (
          <>
            <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">{message}</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <p className="text-lg text-foreground">{message}</p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <p className="text-lg text-foreground mb-4">{message}</p>
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Voltar ao início
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PWARegisterPage;
