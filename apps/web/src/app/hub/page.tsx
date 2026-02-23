"use client";

import { Suspense, lazy } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const Hub = lazy(() => import("@/components/pages/Hub"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function HubPage() {
  return (
    <ProtectedRoute requiredRole="superadmin">
      <Suspense fallback={<PageLoader />}>
        <Hub />
      </Suspense>
    </ProtectedRoute>
  );
}
