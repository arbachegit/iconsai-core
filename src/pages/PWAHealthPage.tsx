/**
 * ============================================================
 * PWAHealthPage.tsx - Página principal do PWA Health
 * ============================================================
 * Versão: 1.0.0
 * Data: 2026-01-17
 *
 * Descrição: Página principal do PWA Health (microserviço).
 * Integra autenticação, device gate e container principal.
 * Focado exclusivamente em triagem médica por voz.
 * ============================================================
 */

import React from "react";
import PWAHealthDeviceGate from "@/components/gates/PWAHealthDeviceGate";
import { PWAHealthAuthGate } from "@/components/gates/PWAHealthAuthGate";
import { PWAHealthContainer } from "@/components/pwahealth/PWAHealthContainer";

const PWAHealthPage: React.FC = () => {
  return (
    <PWAHealthDeviceGate>
      <PWAHealthAuthGate>
        {({ userName, userPhone, sessionId, logout }) => (
          <PWAHealthContainer
            userName={userName}
            userPhone={userPhone}
            sessionId={sessionId}
            onLogout={logout}
          />
        )}
      </PWAHealthAuthGate>
    </PWAHealthDeviceGate>
  );
};

export default PWAHealthPage;
