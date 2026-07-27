"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bot, KeyRound, ShieldCheck, Wallet, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LaunchDemoButton } from "@/components/landing/launch-demo-button";

function LoginContent() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") ?? "/dashboard";
  const [username, setUsername] = useState("demo");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refreshPinStatus = useCallback(async (name: string) => {
    try {
      const res = await fetch(`/api/auth/pin?username=${encodeURIComponent(name)}`, { cache: "no-store" });
      const data = await res.json();
      setNeedsSetup(!data.hasPin);
    } catch {
      setNeedsSetup(null);
    }
  }, []);

  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((s) => {
        if (s.authenticated) router.replace(next);
      })
      .catch(() => {});
  }, [router, next]);

  useEffect(() => {
    void refreshPinStatus(username);
  }, [username, refreshPinStatus]);

  const unlockWithPin = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const body: { username: string; pin: string; confirmPin?: string } = { username, pin };
      if (needsSetup) body.confirmPin = confirmPin;

      const res = await fetch("/api/auth/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.needsSetup) setNeedsSetup(true);
        throw new Error(data.error ?? "PIN login failed");
      }
      router.replace(next);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "PIN login failed");
    } finally {
      setBusy(false);
    }
  };

  const continueDemo = async () => {
    setBusy(true);
    await fetch("/api/auth/demo", { method: "POST" });
    router.replace("/dashboard?tour=start");
  };

  const setup = needsSetup !== false;

  return (
    <div className="landing-bg min-h-screen">
      <header className="border-b border-border/60 bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 lg:px-8">
          <Link href="/" className="flex items-center gap-3 text-xl font-semibold lg:text-2xl">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15">
              <Bot className="size-6 text-primary" />
            </div>
            AgentPay
          </Link>
          <Link href="/">
            <Button variant="ghost" size="lg" className="text-base">
              Back to home
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-lg flex-col justify-center px-6 py-12">
        <Card className="border-border/80 bg-card/80 shadow-2xl shadow-black/20 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/15">
              <KeyRound className="size-7 text-primary" />
            </div>
            <CardTitle className="text-3xl sm:text-4xl">Unlock AgentPay</CardTitle>
            <CardDescription className="text-base leading-relaxed sm:text-lg">
              {setup
                ? "Create a console PIN for this profile (stored locally). Freighter still signs on-chain spending."
                : "Enter your console PIN. On-chain spending still requires Freighter-signed delegation."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground sm:text-base">
                Profile name
              </label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="demo"
                className="h-12 text-base"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground sm:text-base">
                Console PIN
              </label>
              <Input
                type="password"
                inputMode="numeric"
                autoComplete={setup ? "new-password" : "current-password"}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder={setup ? "At least 4 digits" : "Your PIN"}
                className="h-12 text-base"
                onKeyDown={(e) => e.key === "Enter" && unlockWithPin()}
              />
            </div>

            {setup && (
              <div>
                <label className="mb-2 block text-sm font-medium text-muted-foreground sm:text-base">
                  Confirm PIN
                </label>
                <Input
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  placeholder="Repeat PIN"
                  className="h-12 text-base"
                  onKeyDown={(e) => e.key === "Enter" && unlockWithPin()}
                />
              </div>
            )}

            <Button
              onClick={unlockWithPin}
              disabled={busy || !pin || (setup && !confirmPin)}
              size="lg"
              className="h-12 text-base"
            >
              <KeyRound className="size-5" />
              {busy ? "Unlocking…" : setup ? "Create PIN & unlock" : "Unlock with PIN"}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm uppercase">
                <span className="bg-card px-3 text-muted-foreground">or</span>
              </div>
            </div>

            <LaunchDemoButton className="w-full" />

            <Button variant="outline" onClick={continueDemo} disabled={busy} size="lg" className="h-12 text-base">
              Continue Demo <ArrowRight className="size-5" />
            </Button>

            <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground sm:text-base">
              <span className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" /> Console PIN
              </span>
              <span className="flex items-center gap-2">
                <Wallet className="size-4 text-accent" /> Freighter pays
              </span>
            </div>

            {message && <p className="text-base text-destructive">{message}</p>}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="landing-bg flex min-h-screen items-center justify-center p-6 text-lg">
          Loading…
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
