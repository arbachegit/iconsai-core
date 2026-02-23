"use client";

import { Suspense, lazy } from "react";

const InviteAcceptPage = lazy(() => import("@/components/pages/InviteAcceptPage"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function AcceptInviteRoute() {
  return (
    <Suspense fallback={<PageLoader />}>
      <InviteAcceptPage />
    </Suspense>
  );
}
