"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Download, Wallet, Trash2, Bot } from "lucide-react";
import type { Agent } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/app/page-header";
import { AgentAvatar } from "@/components/agent/agent-avatar";
import { ReputationBadge } from "@/components/agent/reputation-badge";
import { AgentAddPanel } from "@/components/agent/agent-add-panel";
import { useWallet } from "@/components/wallet/wallet-provider";
import { shortAddr } from "@/lib/utils";
import { showToast } from "@/components/ui/toast";

type PanelTab = "create" | "openclaw";

type OpenClawRow = {
  id: string;
  name: string;
  role: string;
  skills: string[];
  imported: boolean;
};

export default function DashboardPage() {
  const wallet = useWallet();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [listingCounts, setListingCounts] = useState<Record<string, number>>({});
  const [panel, setPanel] = useState<PanelTab | null>(null);
  const [openClawRows, setOpenClawRows] = useState<OpenClawRow[]>([]);
  const [openClawLoading, setOpenClawLoading] = useState(false);

  const load = useCallback(async () => {
    const params = wallet.address
      ? `?owner=${encodeURIComponent(wallet.address)}`
      : "";
    const res = await fetch(`/api/agents${params}`, { cache: "no-store" });
    const data = await res.json();
    setAgents(data.agents ?? []);
    setListingCounts(data.listingCounts ?? {});
  }, [wallet.address]);

  const loadOpenClaw = useCallback(async () => {
    setOpenClawLoading(true);
    const res = await fetch("/api/agents/import/openclaw", { cache: "no-store" });
    const data = await res.json();
    setOpenClawRows(data.agents ?? []);
    setOpenClawLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (panel === "openclaw") loadOpenClaw();
  }, [panel, loadOpenClaw]);

  useEffect(() => {
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  const openPanel = (tab: PanelTab) => {
    setPanel((prev) => (prev === tab ? null : tab));
    if (tab === "openclaw") loadOpenClaw();
  };

  const deleteAgent = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this agent? Its delegation, listings, and jobs will be removed."))
      return;
    const res = await fetch(`/api/agents/${id}`, { method: "DELETE" });
    if (res.ok) showToast("info", "Agent deleted");
    else {
      const data = await res.json().catch(() => ({}));
      showToast("error", "Delete failed", data.error);
    }
    load();
  };

  const canManage = (a: Agent) => !a.id.startsWith("agent-demo-");

  return (
    <div className="mx-auto max-w-6xl" data-tour="dashboard-agents">
      <PageHeader
        title="Agents"
        description={`${agents.length} agent${agents.length !== 1 ? "s" : ""} in your fleet — each with its own Stellar wallet.`}
      >
        <div className="flex gap-2">
          <Button
            variant={panel === "create" ? "default" : "outline"}
            size="lg"
            className="text-base"
            onClick={() => openPanel("create")}
          >
            <Plus className="size-5" />
            Create
          </Button>
          <Button
            variant={panel === "openclaw" ? "default" : "outline"}
            size="lg"
            className="text-base"
            onClick={() => openPanel("openclaw")}
          >
            <Download className="size-5" />
            Import
          </Button>
        </div>
      </PageHeader>

      {panel && (
        <AgentAddPanel
          tab={panel}
          ownerAddress={wallet.address}
          onClose={() => setPanel(null)}
          onTabChange={setPanel}
          onDone={load}
          openClawRows={openClawRows}
          openClawLoading={openClawLoading}
          onRefreshOpenClaw={loadOpenClaw}
        />
      )}

      {agents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <Bot className="size-12 text-muted-foreground/50" />
            <p className="text-lg text-muted-foreground">No agents yet</p>
            <div className="flex gap-2">
              <Button size="lg" className="text-base" onClick={() => openPanel("create")}>
                <Plus className="size-5" /> Create
              </Button>
              <Button size="lg" variant="outline" className="text-base" onClick={() => openPanel("openclaw")}>
                <Download className="size-5" /> Import from OpenClaw
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((a) => {
            const listed = (listingCounts[a.id] ?? 0) > 0;
            return (
              <Link
                key={a.id}
                href={`/agents/${a.id}`}
                data-tour={a.id === "agent-demo-research" ? "agent-demo-research" : undefined}
              >
                <Card className="relative h-full transition-colors hover:border-primary/50">
                  {canManage(a) && (
                    <button
                      onClick={(e) => deleteAgent(e, a.id)}
                      aria-label="Delete agent"
                      className="absolute right-2 top-2 z-10 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                  <CardHeader className="flex-row items-center gap-3 pr-10 pb-2">
                    <AgentAvatar seed={a.avatarSeed} name={a.name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <CardTitle className="truncate text-lg sm:text-xl">{a.name}</CardTitle>
                        {a.id.startsWith("agent-demo-") && (
                          <Badge variant="accent" className="text-xs">
                            Demo
                          </Badge>
                        )}
                        {a.source === "openclaw" && (
                          <Badge variant="outline" className="text-xs">
                            OpenClaw
                          </Badge>
                        )}
                        {listed && (
                          <Badge variant="secondary" className="text-xs">
                            Listed
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="line-clamp-2 text-sm sm:text-base">
                        {a.role}
                      </CardDescription>
                    </div>
                    <ReputationBadge score={a.reputationScore} />
                  </CardHeader>
                  <CardContent className="pt-0">
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground sm:text-base">
                      <Wallet className="size-4" />
                      {shortAddr(a.walletAddress, 6)}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
