"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LaunchDemoButton({ className }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const launch = async () => {
    setBusy(true);
    try {
      await fetch("/api/auth/demo", { method: "POST" });
      router.push("/dashboard?tour=start");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      size="lg"
      className={`h-14 px-10 text-lg shadow-lg shadow-primary/25 ${className ?? ""}`}
      onClick={launch}
      disabled={busy}
    >
      <Play className="size-5" />
      {busy ? "Launching demo…" : "Launch demo"}
      <ArrowRight className="size-5" />
    </Button>
  );
}
