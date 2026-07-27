import { Suspense } from "react";
import { AppNav } from "@/components/app/app-nav";
import { SidebarControls } from "@/components/app/sidebar-controls";
import { GuidedTour } from "@/components/onboarding/guided-tour";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="landing-bg flex min-h-screen">
      <AppNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex justify-end border-b border-border/60 p-4 md:hidden" data-tour="wallet-connect">
          <SidebarControls />
        </div>
        <main className="flex-1 p-5 pb-24 md:p-10 md:pb-10">{children}</main>
      </div>
      <Suspense fallback={null}>
        <GuidedTour />
      </Suspense>
    </div>
  );
}
