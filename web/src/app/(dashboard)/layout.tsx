"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { trpc } from "@/lib/trpc-client";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: status } = trpc.user.getOnboardingStatus.useQuery(undefined, {
    staleTime: 30 * 1000,
  });

  // Hard guard: if onboarding is not complete, send back to finish it
  useEffect(() => {
    if (status && !status.onboardingComplete) {
      router.replace("/onboarding");
    }
  }, [status, router]);

  // Don't render dashboard until we've confirmed onboarding is done
  if (status && !status.onboardingComplete) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 pb-24 lg:pb-6">
          {children}
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
