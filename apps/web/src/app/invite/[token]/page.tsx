"use client";

import { Suspense, lazy } from "react";

const InvitePage = lazy(() => import("@/components/pages/InvitePage"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function InviteRoute() {
  return (
    <Suspense fallback={<PageLoader />}>
      <InvitePage />
    </Suspense>
  );
}
