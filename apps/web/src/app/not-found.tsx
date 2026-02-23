"use client";

import { Suspense, lazy } from "react";

const NotFound = lazy(() => import("@/components/pages/NotFound"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function NotFoundPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <NotFound />
    </Suspense>
  );
}
