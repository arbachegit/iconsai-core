"use client";

import { Suspense, lazy } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const Admin = lazy(() => import("@/components/pages/Admin"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function AdminPage() {
  return (
    <ProtectedRoute requiredRole="superadmin">
      <Suspense fallback={<PageLoader />}>
        <Admin />
      </Suspense>
    </ProtectedRoute>
  );
}
