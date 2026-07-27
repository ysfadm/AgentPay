"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Fingerprint, LogOut, Play } from "lucide-react";
import { ConnectWallet } from "@/components/wallet/connect-wallet";
import { Button } from "@/components/ui/button";
import { showToast } from "@/components/ui/toast";

/** Sidebar auth badge + Freighter wallet controls (single client boundary). */
export function SidebarControls() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [runningDemo, setRunningDemo] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((s) => {
        setUsername(s.username ?? null);
        setIsAdmin(s.isAdmin ?? false);
      })
      .catch(() => {});
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const runDemoFlow = async () => {
    setRunningDemo(true);
    showToast(
      "info",
      "Starting demo...",
      "Running E2E flow with 3 autonomous purchases",
    );

    try {
      const res = await fetch("/api/admin/demo-flow", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        showToast("error", "Demo failed", data.error ?? "Unknown error");
        setRunningDemo(false);
        return;
      }

      const purchases = data.purchases ?? [];
      const successful = purchases.filter(
        (p: { status?: string }) => p.status === "success",
      ).length;
      showToast(
        "success",
        "Demo complete! 🎉",
        `${successful}/${Math.max(purchases.length, 3)} purchases executed. Check Activity →`,
      );

      // Redirect to activity after 2s
      setTimeout(() => {
        router.push("/activity");
      }, 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      showToast("error", "Demo error", msg);
    } finally {
      setRunningDemo(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {username && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            <Fingerprint className="size-3" /> {username}
          </span>
          <Button variant="ghost" size="icon" onClick={logout} title="Logout">
            <LogOut className="size-4" />
          </Button>
        </div>
      )}
      {isAdmin && (
        <Button
          onClick={runDemoFlow}
          disabled={runningDemo}
          variant="outline"
          size="sm"
          className="w-full gap-2"
        >
          <Play className="size-4" />
          {runningDemo ? "Running..." : "Run Demo"}
        </Button>
      )}
      <ConnectWallet />
    </div>
  );
}
