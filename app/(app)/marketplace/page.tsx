"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ShoppingCart, Search, SlidersHorizontal } from "lucide-react";
import type { Agent, Delegation, Service } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/app/page-header";
import { AgentAvatar } from "@/components/agent/agent-avatar";
import { ReputationBadge } from "@/components/agent/reputation-badge";
import { useWallet } from "@/components/wallet/wallet-provider";
import { formatUsdc } from "@/lib/utils";
import { showToast } from "@/components/ui/toast";

type ProviderGroup = {
  providerAgentId: string;
  providerName: string;
  providerRole: string;
  avatarSeed: string;
  providerReputation: number;
  services: Service[];
  minPrice: number;
};

type SortOption = "reputation" | "price-asc" | "price-desc" | "name";

export default function MarketplacePage() {
  const wallet = useWallet();
  const [services, setServices] = useState<Service[]>([]);
  const [providers, setProviders] = useState<Agent[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [delegation, setDelegation] = useState<Delegation | null>(null);
  const [buyerId, setBuyerId] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("reputation");

  const load = useCallback(async () => {
    const params = wallet.address
      ? `?owner=${encodeURIComponent(wallet.address)}`
      : "";
    const [s, a] = await Promise.all([
      fetch("/api/marketplace/services", { cache: "no-store" }).then((r) =>
        r.json(),
      ),
      fetch(`/api/agents${params}`, { cache: "no-store" }).then((r) => r.json()),
    ]);
    setServices(s.services ?? []);
    setProviders((s.providers ?? []).filter((p: Agent) => p.isProvider));
    const buyers: Agent[] = a.agents ?? [];
    setAgents(buyers);
    const nextBuyer = buyerId || buyers[0]?.id || "";
    if (!buyerId && buyers[0]) setBuyerId(buyers[0].id);
    if (nextBuyer) {
      const detail = await fetch(`/api/agents/${nextBuyer}`, {
        cache: "no-store",
      }).then((r) => r.json());
      setDelegation(detail.delegation ?? null);
    } else {
      setDelegation(null);
    }
  }, [wallet.address]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!buyerId) return;
    fetch(`/api/agents/${buyerId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setDelegation(d.delegation ?? null))
      .catch(() => setDelegation(null));
  }, [buyerId]);

  const categories = useMemo(() => {
    const set = new Set(services.map((s) => s.category));
    return ["all", ...Array.from(set).sort()];
  }, [services]);

  const buy = async (serviceId: string) => {
    if (!buyerId) {
      showToast(
        "error",
        "No agent selected",
        "Create an agent first, then grant it a delegation.",
      );
      return;
    }
    if (!delegation || delegation.status !== "active") {
      showToast(
        "error",
        "No active delegation",
        "Open the agent page and Approve with Freighter.",
      );
      return;
    }
    if (!delegation.onchainLive) {
      showToast(
        "error",
        "Delegation not on-chain",
        "Open the agent page and Approve with Freighter.",
      );
      return;
    }
    setBusy(serviceId);
    showToast(
      "info",
      "Processing...",
      "Setting up wallet and preparing payment (~30s for first buy)",
    );
    const res = await fetch("/api/jobs/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buyerAgentId: buyerId, serviceId }),
    });
    const data = await res.json();
    setBusy(null);

    if (res.ok) {
      const service = services.find((s) => s.id === serviceId);
      showToast(
        "success",
        "✅ Purchase complete!",
        `Paid ${formatUsdc(service?.price ?? 0)} for "${service?.title ?? "service"}" on Stellar`,
      );
    } else {
      showToast("error", "Purchase failed", data.error);
    }
    load();
  };

  const canBuy = delegation?.status === "active" && delegation.onchainLive;

  const providerGroups = useMemo((): ProviderGroup[] => {
    const q = search.trim().toLowerCase();
    const filtered = services.filter((service) => {
      if (category !== "all" && service.category !== category) return false;
      if (!q) return true;
      return (
        service.title.toLowerCase().includes(q) ||
        service.description.toLowerCase().includes(q) ||
        service.providerName.toLowerCase().includes(q) ||
        service.category.toLowerCase().includes(q)
      );
    });

    const byId = new Map(providers.map((p) => [p.id, p]));
    const groups = new Map<string, Service[]>();

    for (const service of filtered) {
      const list = groups.get(service.providerAgentId) ?? [];
      list.push(service);
      groups.set(service.providerAgentId, list);
    }

    const built = Array.from(groups.entries()).map(([providerAgentId, svcList]) => {
      const agent = byId.get(providerAgentId);
      const sortedServices = [...svcList].sort((a, b) => a.price - b.price);
      return {
        providerAgentId,
        providerName: agent?.name ?? svcList[0]?.providerName ?? "Agent",
        providerRole: agent?.role ?? "",
        avatarSeed: agent?.avatarSeed ?? providerAgentId,
        providerReputation:
          agent?.reputationScore ?? svcList[0]?.providerReputation ?? 0,
        services: sortedServices,
        minPrice: sortedServices[0]?.price ?? 0,
      };
    });

    return built.sort((a, b) => {
      if (sortBy === "price-asc") return a.minPrice - b.minPrice;
      if (sortBy === "price-desc") return b.minPrice - a.minPrice;
      if (sortBy === "name") return a.providerName.localeCompare(b.providerName);
      return b.providerReputation - a.providerReputation;
    });
  }, [providers, services, search, category, sortBy]);

  const visibleServiceCount = providerGroups.reduce((n, g) => n + g.services.length, 0);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Agent Marketplace"
        description={`${providerGroups.length} providers · ${visibleServiceCount} services matching your filters`}
      >
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <span className="text-base text-muted-foreground">Buy as:</span>
            <select
              value={buyerId}
              onChange={(e) => setBuyerId(e.target.value)}
              className="h-11 rounded-lg border border-border bg-background px-3 text-base"
            >
              {agents.length === 0 && <option value="">No agents yet</option>}
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          {buyerId && (
            <span className="text-sm text-muted-foreground sm:text-base">
              {canBuy
                ? `On-chain delegation · ${formatUsdc(delegation!.dailyLimit - delegation!.spentToday)} left today`
                : delegation?.status === "active"
                  ? "Delegation not on-chain — Approve with Freighter on the agent page"
                  : "No delegation — grant one on the agent page first"}
            </span>
          )}
        </div>
      </PageHeader>

      <div className="mb-8 flex flex-col gap-3 rounded-2xl border border-border/80 bg-card/40 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search services, providers, categories…"
            className="h-11 pl-10 text-base"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-11 rounded-lg border border-border bg-background px-3 text-base"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "All categories" : c}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-muted-foreground" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="h-11 rounded-lg border border-border bg-background px-3 text-base"
            >
              <option value="reputation">Sort: reputation</option>
              <option value="price-asc">Sort: price low → high</option>
              <option value="price-desc">Sort: price high → low</option>
              <option value="name">Sort: provider name</option>
            </select>
          </div>
        </div>
      </div>

      {providerGroups.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-lg text-muted-foreground">
            No services match your search. Try clearing filters.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {providerGroups.map((group) => (
            <Card key={group.providerAgentId}>
              <CardHeader className="flex-row items-start gap-4 space-y-0">
                <Link href={`/agents/${group.providerAgentId}`}>
                  <AgentAvatar
                    seed={group.avatarSeed}
                    name={group.providerName}
                    className="size-14"
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-xl sm:text-2xl">{group.providerName}</CardTitle>
                    <ReputationBadge score={group.providerReputation} />
                  </div>
                  <CardDescription className="text-base">{group.providerRole}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.services.map((s) => (
                    <Card key={s.id} className="flex flex-col border-dashed">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="muted" className="text-sm">
                            {s.category}
                          </Badge>
                          <span className="text-base font-semibold text-primary sm:text-lg">
                            {formatUsdc(s.price)}
                          </span>
                        </div>
                        <CardTitle className="text-lg sm:text-xl">{s.title}</CardTitle>
                        <CardDescription className="line-clamp-2 text-sm sm:text-base">
                          {s.description}
                        </CardDescription>
                      </CardHeader>
                      <CardFooter className="mt-auto pt-0">
                        <Button
                          size="lg"
                          className="w-full text-base"
                          onClick={() => buy(s.id)}
                          disabled={busy === s.id || !canBuy}
                        >
                          <ShoppingCart className="size-5" />{" "}
                          {busy === s.id ? "Paying…" : "Buy"}
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
