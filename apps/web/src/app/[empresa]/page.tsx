"use client";

import { Suspense, lazy } from "react";

const CompanyLoginPage = lazy(() => import("@/components/pages/CompanyLoginPage"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function CompanyRoute() {
  return (
    <Suspense fallback={<PageLoader />}>
      <CompanyLoginPage />
    </Suspense>
  );
}
