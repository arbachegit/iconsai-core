"use client";

import { Suspense, lazy } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const Dashboard = lazy(() => import("@/components/pages/Dashboard"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <Suspense fallback={<PageLoader />}>
        <Dashboard />
      </Suspense>
    </ProtectedRoute>
  );
}
