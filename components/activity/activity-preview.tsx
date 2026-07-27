"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Coins, Search, Send, CheckCircle2, TrendingUp, ShieldAlert } from "lucide-react";
import type { ActivityEvent, EventType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ExplorerTxLink } from "@/components/stellar/explorer-tx-link";

const ICONS: Record<EventType, typeof Coins> = {
  discovered: Search,
  requested: Send,
  paid: Coins,
  delivered: CheckCircle2,
  rep_updated: TrendingUp,
  blocked: ShieldAlert,
};

const COLORS: Record<EventType, string> = {
  discovered: "text-sky-400",
  requested: "text-violet-400",
  paid: "text-primary",
  delivered: "text-emerald-400",
  rep_updated: "text-amber-400",
  blocked: "text-destructive",
};

export function ActivityPreview({ limit = 5 }: { limit?: number }) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch("/api/events", { cache: "no-store" });
        const data = await res.json();
        if (active) setEvents((data.events ?? []).slice(0, limit));
      } catch {
        /* ignore */
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    const timer = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [limit]);

  return (
    <div className="rounded-2xl border border-border/80 bg-card/60 p-6 backdrop-blur-sm sm:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold sm:text-3xl">Live on Stellar Testnet</h2>
          <p className="mt-1 text-base text-muted-foreground sm:text-lg">
            Recent agent payments and reputation updates
          </p>
        </div>
        <Link href="/activity">
          <Button variant="outline" size="lg" className="text-base">
            View all <ArrowRight className="size-5" />
          </Button>
        </Link>
      </div>

      {loading ? (
        <p className="text-base text-muted-foreground">Loading activity…</p>
      ) : events.length === 0 ? (
        <p className="text-base text-muted-foreground">
          No activity yet. Launch the demo to see autonomous payments stream in.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {events.map((e) => {
            const Icon = ICONS[e.type];
            return (
              <li
                key={e.id}
                className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/50 p-4"
              >
                <Icon className={`mt-0.5 size-5 shrink-0 ${COLORS[e.type]}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-base sm:text-lg">{e.message}</p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">
                      {new Date(e.createdAt).toLocaleString()}
                    </span>
                    <ExplorerTxLink hash={e.txHash} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
