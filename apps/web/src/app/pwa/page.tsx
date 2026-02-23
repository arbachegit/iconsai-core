"use client";

import { Suspense, lazy } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const VoiceAssistantPage = lazy(() => import("@/components/voice-assistant/VoiceAssistantPage"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function PWAPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<PageLoader />}>
        <VoiceAssistantPage />
      </Suspense>
    </ProtectedRoute>
  );
}
