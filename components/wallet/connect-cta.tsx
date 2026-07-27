"use client";

import { useRouter } from "next/navigation";
import { KeyRound, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ConnectCta() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center gap-2">
      <Button size="lg" className="h-12 px-8 text-base" onClick={() => router.push("/login")}>
        <KeyRound className="size-5" />
        Unlock with PIN <ArrowRight className="size-5" />
      </Button>
      <p className="max-w-sm text-center text-sm text-muted-foreground sm:text-base">
        Console PIN unlocks the app. Freighter still signs on-chain spending.
      </p>
    </div>
  );
}
