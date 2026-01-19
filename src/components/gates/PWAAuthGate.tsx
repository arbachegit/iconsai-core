// =============================================
// PWA Auth Gate v5.0
// Build: 2026-01-19
// BYPASS: Autenticação removida - acesso livre
// =============================================

import { ReactNode } from "react";

interface PWAAuthGateProps {
  children: ReactNode | ((data: { userPhone: string; pwaAccess: string[] }) => ReactNode);
}

// Usuário padrão para acesso sem autenticação
const DEFAULT_USER = {
  phone: "+5511999999999",
  pwaAccess: ["all"],
};

/**
 * PWAAuthGate - Acesso livre sem autenticação
 * Passa dados de usuário padrão para os children
 */
export function PWAAuthGate({ children }: PWAAuthGateProps) {
  console.log("[PWAAuthGate] Acesso livre - sem autenticação");

  // Renderizar children com dados de usuário padrão
  if (typeof children === "function") {
    return (
      <>
        {children({
          userPhone: DEFAULT_USER.phone,
          pwaAccess: DEFAULT_USER.pwaAccess,
        })}
      </>
    );
  }

  return <>{children}</>;
}

export default PWAAuthGate;
