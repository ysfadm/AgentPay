import type { Agent, Delegation, Service, Job, ActivityEvent } from "./types";
import { loadStore, scheduleSave } from "./server/persistence";
import {
  CATALOG_PROVIDERS,
  CATALOG_SERVICES,
  mergeMarketplaceCatalog,
} from "./marketplace-catalog";

/**
 * In-memory application store (agents, services, jobs, events, delegations).
 * The Soroban contracts are the source of truth for money + reputation; this
 * mirrors that state for fast reads and a smooth UI.
 *
 * Persisted on globalThis for hot-reloads, and to .data/store.json (secrets
 * encrypted at rest) so it survives full server restarts.
 */

export interface Store {
  agents: Agent[];
  delegations: Record<string, Delegation>;
  services: Service[];
  jobs: Job[];
  events: ActivityEvent[];
  /** Server-held secret keys for user-created agents (autonomous signing). Never sent to the client. */
  agentSecrets: Record<string, string>;
  /** Owner (Freighter) address per agent, when created live. */
  agentOwners: Record<string, string>;
}

const PROVIDER_AGENTS = CATALOG_PROVIDERS;
const SERVICES = CATALOG_SERVICES;

function seed(): Store {
  return {
    agents: [...PROVIDER_AGENTS],
    delegations: {},
    services: [...SERVICES],
    jobs: [],
    agentSecrets: {},
    agentOwners: {},
    events: [
      {
        id: "evt-seed",
        type: "rep_updated",
        message: `Marketplace seeded with ${PROVIDER_AGENTS.length} provider agents.`,
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

function createStore(): Store {
  const s = seed();
  loadStore(s);
  mergeMarketplaceCatalog(s);
  return s;
}

const g = globalThis as unknown as { __agentpay?: Store };
export const store: Store = g.__agentpay ?? (g.__agentpay = createStore());
mergeMarketplaceCatalog(store);

/** Persist the current store (debounced). Call after mutations without events. */
export function persist(): void {
  scheduleSave(store);
}

export function addEvent(e: Omit<ActivityEvent, "id" | "createdAt">): ActivityEvent {
  const event: ActivityEvent = {
    ...e,
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  store.events.unshift(event);
  if (store.events.length > 200) store.events.length = 200;
  scheduleSave(store);
  return event;
}

export function fakeTxHash(): string {
  return Array.from({ length: 64 }, () =>
    "0123456789abcdef"[Math.floor(Math.random() * 16)]
  ).join("");
}
