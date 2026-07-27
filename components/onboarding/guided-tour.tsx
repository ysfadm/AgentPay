"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "agentpay-guided-tour-v1";

const STEPS = [
  {
    route: "/dashboard",
    target: '[data-tour="dashboard-agents"]',
    title: "Your agent fleet",
    body: "Demo agents are pre-loaded after seeding. Each agent has its own Stellar wallet and can spend within limits you approve.",
  },
  {
    route: "/dashboard",
    target: '[data-tour="wallet-connect"]',
    title: "Connect Freighter",
    body: "Link your Testnet wallet to approve on-chain delegations. The console PIN unlocks the app; Freighter signs spending.",
  },
  {
    route: "/dashboard",
    target: '[data-tour="agent-demo-research"]',
    title: "Open Research Agent",
    body: "This is the hero demo agent — already funded with USDC and an active delegation. Click the card to open it.",
  },
  {
    route: "/agents/agent-demo-research",
    target: '[data-tour="run-once"]',
    title: "Run autonomously",
    body: "The agent discovers a marketplace service and pays on its own. Try “Run once” to trigger a live purchase.",
  },
  {
    route: "/activity",
    target: '[data-tour="activity-feed"]',
    title: "Watch live activity",
    body: "Every payment, discovery, and reputation update streams here from Stellar Testnet.",
  },
];

type Rect = { top: number; left: number; width: number; height: number };

export function GuidedTour() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const forceStart = search.get("tour") === "start";

  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const step = STEPS[stepIndex];

  const finish = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "done");
    setActive(false);
    if (forceStart) router.replace(pathname);
  }, [forceStart, pathname, router]);

  const updateRect = useCallback(() => {
    if (!step?.target) return;
    const el = document.querySelector(step.target);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({
      top: r.top + window.scrollY,
      left: r.left + window.scrollX,
      width: r.width,
      height: r.height,
    });
  }, [step]);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY) === "done";
    if (!done || forceStart) {
      setActive(true);
      setStepIndex(0);
    }
  }, [forceStart]);

  useEffect(() => {
    if (!active || !step) return;
    if (pathname !== step.route) {
      router.push(step.route);
      return;
    }
    const timer = setTimeout(updateRect, 350);
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [active, step, pathname, router, updateRect, stepIndex]);

  if (!active || !step) return null;

  const isLast = stepIndex === STEPS.length - 1;

  const goNext = () => {
    if (isLast) finish();
    else setStepIndex((i) => i + 1);
  };

  const goPrev = () => setStepIndex((i) => Math.max(0, i - 1));

  const pad = 8;
  const spotlight = rect
    ? {
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/70" onClick={finish} aria-hidden />

      {spotlight && (
        <div
          className="pointer-events-none absolute rounded-xl ring-2 ring-primary ring-offset-2 ring-offset-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
          }}
        />
      )}

      <div className="absolute inset-x-4 bottom-24 mx-auto max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl md:bottom-auto md:top-24 md:right-8 md:left-auto">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-primary">
              Step {stepIndex + 1} of {STEPS.length}
            </p>
            <h3 className="mt-1 text-lg font-semibold sm:text-xl">{step.title}</h3>
          </div>
          <button
            type="button"
            onClick={finish}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Skip tour"
          >
            <X className="size-5" />
          </button>
        </div>
        <p className="text-base leading-relaxed text-muted-foreground">{step.body}</p>
        {!rect && (
          <p className="mt-2 text-sm text-amber-400">Navigate to the highlighted area if it is not visible.</p>
        )}
        <div className="mt-5 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={goPrev} disabled={stepIndex === 0}>
            <ChevronLeft className="size-4" /> Back
          </Button>
          <Button size="sm" onClick={goNext}>
            {isLast ? "Finish tour" : "Next"}
            {!isLast && <ChevronRight className="size-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
