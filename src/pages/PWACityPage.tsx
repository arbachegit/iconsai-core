/**
 * ============================================================
 * PWACityPage.tsx - Página principal do PWA City
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-17
 *
 * Descrição: Página principal do PWA City (microserviço).
 * Integra autenticação, device gate e container principal.
 * ============================================================
 */

import React from "react";
import PWACityDeviceGate from "@/components/gates/PWACityDeviceGate";
import { PWACityAuthGate } from "@/components/gates/PWACityAuthGate";
import { PWACityContainer } from "@/components/pwacity/PWACityContainer";

const PWACityPage: React.FC = () => {
  return (
    <PWACityDeviceGate>
      <PWACityAuthGate>
        {({ userName, userPhone, sessionId, logout }) => (
          <PWACityContainer
            userName={userName}
            userPhone={userPhone}
            sessionId={sessionId}
            onLogout={logout}
          />
        )}
      </PWACityAuthGate>
    </PWACityDeviceGate>
  );
};

export default PWACityPage;
