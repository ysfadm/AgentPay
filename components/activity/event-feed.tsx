"use client";

import { useEffect, useRef, useState } from "react";
import { Coins, Search, Send, CheckCircle2, TrendingUp, ShieldAlert } from "lucide-react";
import type { ActivityEvent, EventType } from "@/lib/types";
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

export function EventFeed({ pollMs = 1500, limit = 50 }: { pollMs?: number; limit?: number }) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [live, setLive] = useState(false);
  const seenIds = useRef<Set<string>>(new Set());
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());

  const markFresh = (id: string) => {
    setFreshIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setFreshIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 1500);
  };

  useEffect(() => {
    let es: EventSource | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let active = true;

    const applySnapshot = (list: ActivityEvent[]) => {
      seenIds.current = new Set(list.map((e) => e.id));
      setEvents(list.slice(0, limit));
    };

    const addEvent = (e: ActivityEvent) => {
      if (seenIds.current.has(e.id)) return;
      seenIds.current.add(e.id);
      markFresh(e.id);
      setEvents((prev) => [e, ...prev].slice(0, limit));
    };

    // Polling fallback (used if SSE is unavailable or errors out).
    const startPolling = () => {
      if (pollTimer) return;
      setLive(false);
      const load = async () => {
        try {
          const res = await fetch("/api/events", { cache: "no-store" });
          const data = await res.json();
          if (active) applySnapshot(data.events ?? []);
        } catch {
          /* ignore transient errors */
        }
      };
      load();
      pollTimer = setInterval(load, pollMs);
    };

    try {
      es = new EventSource("/api/events/stream");
      es.onopen = () => active && setLive(true);
      es.onmessage = (msg) => {
        if (!active) return;
        try {
          const payload = JSON.parse(msg.data);
          if (payload.type === "snapshot") applySnapshot(payload.events ?? []);
          else if (payload.type === "event" && payload.event) addEvent(payload.event);
        } catch {
          /* ignore malformed frame */
        }
      };
      es.onerror = () => {
        // Drop SSE and fall back to polling.
        es?.close();
        es = null;
        if (active) startPolling();
      };
    } catch {
      startPolling();
    }

    return () => {
      active = false;
      es?.close();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [pollMs, limit]);

  return (
    <div className="flex flex-col gap-3" data-tour="activity-feed">
      <div className="flex items-center gap-2 text-xs">
        <span className={`size-2 rounded-full ${live ? "bg-primary animate-live-pulse" : "bg-muted-foreground"}`} />
        <span className="text-muted-foreground">{live ? "Live" : "Polling"}</span>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity yet. Run an agent to see payments stream in.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {events.map((e) => {
            const Icon = ICONS[e.type];
            return (
              <li
                key={e.id}
                className={`glass flex items-start gap-3 rounded-lg p-3 ${freshIds.has(e.id) ? "animate-event-in" : ""}`}
              >
                <Icon className={`mt-0.5 size-4 shrink-0 ${COLORS[e.type]}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-base sm:text-lg">{e.message}</p>
                  <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">
                      {new Date(e.createdAt).toLocaleTimeString()}
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
