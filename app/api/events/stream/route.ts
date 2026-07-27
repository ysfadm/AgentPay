import { store } from "@/lib/demo-store";

export const dynamic = "force-dynamic";

/**
 * Server-Sent Events stream of activity. Sends an initial snapshot, then pushes
 * each new event as it appears in the store. Heartbeats keep the connection warm.
 */
export async function GET() {
  const encoder = new TextEncoder();
  let interval: ReturnType<typeof setInterval>;

  const stream = new ReadableStream({
    start(controller) {
      const send = (obj: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        } catch {
          /* controller closed */
        }
      };

      // Initial snapshot (newest first, capped).
      send({ type: "snapshot", events: store.events.slice(0, 50) });
      let lastTopId: string | null = store.events[0]?.id ?? null;

      interval = setInterval(() => {
        const evs = store.events;
        const top = evs[0]?.id ?? null;
        if (top === lastTopId) {
          try {
            controller.enqueue(encoder.encode(`: ping\n\n`));
          } catch {
            /* ignore */
          }
          return;
        }
        const idx = lastTopId ? evs.findIndex((e) => e.id === lastTopId) : -1;
        const fresh = idx === -1 ? evs.slice(0, 50) : evs.slice(0, idx);
        // Emit oldest-first so the client prepends in the right order.
        for (const e of [...fresh].reverse()) send({ type: "event", event: e });
        lastTopId = top;
      }, 1000);
    },
    cancel() {
      clearInterval(interval);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
