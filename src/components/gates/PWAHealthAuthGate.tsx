// =============================================
// PWA Health Auth Gate v2.0
// Build: 2026-01-19
// BYPASS: Autenticação removida - acesso livre
// =============================================

import { ReactNode } from "react";

interface PWAHealthAuthGateProps {
  children: ReactNode | ((data: { userName: string | null; userPhone: string | null; sessionId: string | null; logout: () => void }) => ReactNode);
}

// Usuário padrão para acesso sem autenticação
const DEFAULT_USER = {
  name: "Usuário Saúde",
  phone: "+5511999999999",
  sessionId: "public-health-session",
};

/**
 * PWAHealthAuthGate - Acesso livre sem autenticação
 * Passa dados de usuário padrão para os children
 */
export function PWAHealthAuthGate({ children }: PWAHealthAuthGateProps) {
  console.log("[PWAHealthAuthGate] Acesso livre - sem autenticação");

  // Função de logout vazia (não há sessão para encerrar)
  const logout = () => {
    console.log("[PWAHealthAuthGate] Logout não necessário - acesso público");
  };

  // Renderizar children com dados de usuário padrão
  if (typeof children === "function") {
    return (
      <>
        {children({
          userName: DEFAULT_USER.name,
          userPhone: DEFAULT_USER.phone,
          sessionId: DEFAULT_USER.sessionId,
          logout,
        })}
      </>
    );
  }

  return <>{children}</>;
}

export default PWAHealthAuthGate;
