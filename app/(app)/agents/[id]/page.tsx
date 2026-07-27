"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Fingerprint,
  Play,
  Repeat,
  ShieldCheck,
  ShieldOff,
  Wallet,
  Trash2,
} from "lucide-react";
import type { Agent, Delegation, Job, Service } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AgentAvatar } from "@/components/agent/agent-avatar";
import { ReputationBadge } from "@/components/agent/reputation-badge";
import { EventFeed } from "@/components/activity/event-feed";
import { SellAgentForm } from "@/components/agent/sell-agent-form";
import { useWallet } from "@/components/wallet/wallet-provider";
import { ExplorerTxLink } from "@/components/stellar/explorer-tx-link";
import { formatUsdc, shortAddr } from "@/lib/utils";
import { showToast } from "@/components/ui/toast";

export default function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const wallet = useWallet();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [delegation, setDelegation] = useState<Delegation | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [listings, setListings] = useState<Service[]>([]);
  const [canList, setCanList] = useState(false);
  const [limit, setLimit] = useState("10");
  const [hours, setHours] = useState("24");
  const [goal, setGoal] = useState("find real-time market data");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [onchainRep, setOnchainRep] = useState<{
    jobsCompleted: number;
    successfulPayments: number;
    successRateBps: number;
  } | null>(null);

  const live = process.env.NEXT_PUBLIC_DEMO_MODE === "false";

  const load = async () => {
    const res = await fetch(`/api/agents/${id}`, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setAgent(data.agent);
    setDelegation(data.delegation);
    setJobs(data.jobs ?? []);
    setListings(data.listings ?? []);
    setCanList(Boolean(data.canList));
    setOnchainRep(data.onchainReputation ?? null);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const grant = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const dailyLimit = Number(limit);
      const expiryHours = Number(hours);

      if (wallet.address) {
        // Live: build grant() tx, sign with Freighter, submit on-chain.
        const buildRes = await fetch(`/api/agents/${id}/delegate/build`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ownerAddress: wallet.address,
            dailyLimit,
            expiryHours,
          }),
        });
        const buildData = await buildRes.json();
        if (!buildRes.ok)
          throw new Error(buildData.error ?? "Failed to build transaction");

        const signedXdr = await wallet.sign(buildData.xdr);

        const res = await fetch(`/api/agents/${id}/delegate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dailyLimit, expiryHours, signedXdr }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Submission failed");
        showToast(
          "success",
          "✅ Delegation approved!",
          `${dailyLimit} USDC/day for ${expiryHours}h (signed on-chain)`,
        );
      } else {
        // Demo fallback (no wallet connected).
        await fetch(`/api/agents/${id}/delegate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dailyLimit, expiryHours }),
        });
        showToast(
          "success",
          "✅ Delegation approved!",
          `${dailyLimit} USDC/day for ${expiryHours}h (demo mode)`,
        );
      }
    } catch (e) {
      showToast(
        "error",
        "Delegation failed",
        e instanceof Error ? e.message : "Unknown error",
      );
    } finally {
      setBusy(false);
      load();
    }
  };

  const activate = async () => {
    setBusy(true);
    setMessage("Activating on-chain (funding + USDC)… this takes ~30s.");
    try {
      const res = await fetch(`/api/agents/${id}/provision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mintAmount: 100 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Provisioning failed");
      setBalance(data.balance);
      showToast(
        "success",
        "✅ Agent activated!",
        `Funded with ${data.balance} USDC on Stellar`,
      );
    } catch (e) {
      showToast(
        "error",
        "Activation failed",
        e instanceof Error ? e.message : "Unknown error",
      );
    } finally {
      setBusy(false);
    }
  };

  const revokeDelegation = async () => {
    setBusy(true);
    setMessage(null);
    try {
      if (wallet.address) {
        const buildRes = await fetch(
          `/api/agents/${id}/delegate/revoke/build`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ownerAddress: wallet.address }),
          },
        );
        const buildData = await buildRes.json();
        if (!buildRes.ok)
          throw new Error(buildData.error ?? "Failed to build revoke");

        const signedXdr = await wallet.sign(buildData.xdr);
        const res = await fetch(`/api/agents/${id}/delegate`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ signedXdr }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Revoke failed");
        showToast(
          "info",
          "🚫 Delegation revoked!",
          "Agent can no longer spend",
        );
      } else {
        await fetch(`/api/agents/${id}/delegate`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        showToast("info", "🚫 Delegation revoked (demo)");
      }
    } catch (e) {
      showToast(
        "error",
        "Revoke failed",
        e instanceof Error ? e.message : "Unknown error",
      );
    } finally {
      setBusy(false);
      load();
    }
  };

  const remove = async () => {
    if (!confirm("Delete this agent? Its delegation and jobs will be removed."))
      return;
    setBusy(true);
    const res = await fetch(`/api/agents/${id}`, { method: "DELETE" });
    if (res.ok) {
      showToast("info", "Agent deleted");
      router.push("/dashboard");
    } else {
      const data = await res.json().catch(() => ({}));
      showToast("error", "Delete failed", data.error ?? "Unknown error");
      setBusy(false);
    }
  };

  const run = async () => {
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/agents/${id}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal }),
    });
    const data = await res.json();
    setBusy(false);
    setMessage(
      res.ok
        ? `Agent purchased "${data.service?.title}" autonomously.`
        : `Blocked: ${data.error}`,
    );
    load();
  };

  // Multi-step: keep buying (rotating the goal for variety) until the on-chain
  // spending limit blocks the next purchase or we hit a safety cap.
  const runUntilBlocked = async () => {
    setBusy(true);
    setMessage("Agent is working autonomously…");
    const goals = [
      goal,
      "summarize a document",
      "translate text to another language",
    ];
    const maxSteps = 10;
    let step = 0;
    let spent = 0;
    let blocked = false;
    try {
      for (step = 0; step < maxSteps; step++) {
        setMessage(
          `Step ${step + 1}: agent is discovering and paying… (${spent} USDC spent so far)`,
        );
        const res = await fetch(`/api/agents/${id}/run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ goal: goals[step % goals.length] }),
        });
        const data = await res.json();
        if (res.status === 402 || data.blocked) {
          blocked = true;
          break;
        }
        if (!res.ok) throw new Error(data.error ?? "run failed");
        spent += data.job?.amount ?? 0;
        await load();
        await new Promise((r) => setTimeout(r, 250));
      }
      setMessage(
        blocked
          ? `Budget exhausted: ${step} autonomous payment(s) totalling ${spent} USDC, then the on-chain delegation blocked the next purchase. ✋`
          : `Completed ${step} autonomous payment(s) totalling ${spent} USDC.`,
      );
    } catch (e) {
      setMessage(
        `Error: ${e instanceof Error ? e.message : "multi-step run failed"}`,
      );
    } finally {
      setBusy(false);
      load();
    }
  };

  if (!agent) return <p className="text-muted-foreground">Loading agent…</p>;

  const remaining = delegation
    ? delegation.dailyLimit - delegation.spentToday
    : 0;
  const spentPct =
    delegation && delegation.dailyLimit > 0
      ? Math.min(100, (delegation.spentToday / delegation.dailyLimit) * 100)
      : 0;
  const recentJobs = [...jobs]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="text-2xl sm:text-3xl">Agent overview</CardTitle>
          <CardDescription className="text-base sm:text-lg">
            Spending limits, balance, and recent on-chain activity at a glance.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-background/50 p-5">
            <p className="text-sm font-medium text-muted-foreground sm:text-base">Daily budget</p>
            {delegation && delegation.status === "active" ? (
              <>
                <p className="mt-2 text-2xl font-bold sm:text-3xl">
                  {formatUsdc(remaining)}{" "}
                  <span className="text-base font-normal text-muted-foreground">remaining</span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                  {formatUsdc(delegation.spentToday)} spent of {formatUsdc(delegation.dailyLimit)}
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${spentPct}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Expires {new Date(delegation.expiresAt).toLocaleString()}
                </p>
              </>
            ) : (
              <p className="mt-2 text-lg text-muted-foreground">No active delegation</p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-background/50 p-5">
            <p className="text-sm font-medium text-muted-foreground sm:text-base">Wallet & stats</p>
            <p className="mt-2 flex items-center gap-2 text-base sm:text-lg">
              <Wallet className="size-4" />
              {shortAddr(agent.walletAddress, 8)}
            </p>
            <div className="mt-3 space-y-1 text-sm sm:text-base">
              {balance !== null && (
                <p>
                  Balance: <span className="font-semibold text-accent">{formatUsdc(balance)}</span>
                </p>
              )}
              <p>Jobs completed: {agent.jobsCompleted}</p>
              <p>Successful payments: {agent.successfulPayments}</p>
              <ReputationBadge score={agent.reputationScore} />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background/50 p-5">
            <p className="text-sm font-medium text-muted-foreground sm:text-base">Recent transactions</p>
            {recentJobs.length === 0 ? (
              <p className="mt-2 text-base text-muted-foreground">No jobs yet — run the agent to pay.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {recentJobs.map((j) => (
                  <li
                    key={j.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2 text-sm sm:text-base"
                  >
                    <span>
                      {formatUsdc(j.amount)} · {j.status}
                    </span>
                    <ExplorerTxLink hash={j.stellarTxHash} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
        <Card>
          <CardHeader className="flex-row items-center gap-4">
            <AgentAvatar
              seed={agent.avatarSeed}
              name={agent.name}
              className="size-12"
            />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>{agent.name}</CardTitle>
                {agent.source === "openclaw" && (
                  <Badge variant="outline">OpenClaw</Badge>
                )}
                {delegation?.status === "active" && delegation.onchainLive && (
                  <Badge className="border-primary/30 bg-primary/10 text-primary">
                    On-chain: ✓ delegation live
                  </Badge>
                )}
                {delegation?.status === "active" && !delegation.onchainLive && (
                  <Badge variant="muted">Delegation: local demo</Badge>
                )}
              </div>
              <CardDescription>{agent.role}</CardDescription>
            </div>
            <ReputationBadge score={agent.reputationScore} />
            <Button
              variant="ghost"
              size="icon"
              onClick={remove}
              disabled={busy}
              aria-label="Delete agent"
              title="Delete agent"
            >
              <Trash2 className="size-4 text-muted-foreground" />
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Wallet className="size-4" />
                {shortAddr(agent.walletAddress, 6)}
              </span>
              <span>Jobs: {agent.jobsCompleted}</span>
              <span>Successful payments: {agent.successfulPayments}</span>
              {balance !== null && (
                <span className="text-accent">
                  Balance: {formatUsdc(balance)}
                </span>
              )}
            </div>
            {onchainRep && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
                <ShieldCheck className="size-3.5 text-primary" />
                <span className="font-medium">On-chain reputation</span>
                <span className="text-muted-foreground">
                  {onchainRep.jobsCompleted} jobs
                </span>
                <span className="text-muted-foreground">
                  {onchainRep.successfulPayments} paid
                </span>
                <span className="text-accent">
                  {(onchainRep.successRateBps / 100).toFixed(0)}% success
                </span>
                <span className="text-muted-foreground">
                  (read from AgentRegistry)
                </span>
              </div>
            )}
            {live && !agent.isProvider && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={activate}
                  disabled={busy}
                >
                  Activate on-chain (fund + 100 USDC)
                </Button>
                <span className="text-xs text-muted-foreground">
                  Required once before the agent can pay.
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {canList && (
          <SellAgentForm
            agentId={agent.id}
            agentName={agent.name}
            agentRole={agent.role}
            ownerAddress={wallet.address}
            listings={listings}
            onListed={load}
          />
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="size-5 text-primary" /> Spending
              delegation
            </CardTitle>
            <CardDescription>
              Grant a capped, expiring allowance — enforced on-chain by the
              Delegation Manager.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {delegation && delegation.status === "active" ? (
              <div className="flex flex-wrap items-center gap-3">
                <Badge>Active</Badge>
                <span className="text-sm">
                  Limit {formatUsdc(delegation.dailyLimit)}/day
                </span>
                <span className="text-sm text-muted-foreground">
                  Remaining {formatUsdc(remaining)}
                </span>
                <span className="text-sm text-muted-foreground">
                  Expires {new Date(delegation.expiresAt).toLocaleString()}
                </span>
                {delegation.onchainTxHash && (
                  <ExplorerTxLink hash={delegation.onchainTxHash} className="text-sm" />
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={revokeDelegation}
                  disabled={busy}
                  className="ml-auto"
                >
                  <ShieldOff className="size-4" /> Revoke
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No active delegation.
              </p>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <label className="mb-1 block text-xs text-muted-foreground">
                  Daily limit (USDC)
                </label>
                <Input
                  type="number"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs text-muted-foreground">
                  Expiry (hours)
                </label>
                <Input
                  type="number"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={grant} disabled={busy}>
                  <Fingerprint className="size-4" />{" "}
                  {wallet.address ? "Approve with Freighter" : "Approve (demo)"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Play className="size-5 text-primary" /> Run autonomously
            </CardTitle>
            <CardDescription>
              The agent discovers a service in the marketplace and pays for it
              on its own — within the delegated limit.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Agent goal"
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                onClick={run}
                disabled={busy || !delegation}
                className="flex-1 text-base"
                data-tour="run-once"
              >
                <Play className="size-4" /> Run once
              </Button>
              <Button
                variant="outline"
                onClick={runUntilBlocked}
                disabled={busy || !delegation}
                className="flex-1"
              >
                <Repeat className="size-4" /> Run until budget runs out
              </Button>
            </div>
          </CardContent>
        </Card>

        {message && <p className="text-sm text-accent">{message}</p>}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No jobs yet.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {jobs.map((j) => (
                  <li
                    key={j.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2"
                  >
                    <span>
                      {formatUsdc(j.amount)} · {j.status}
                    </span>
                    <ExplorerTxLink hash={j.stellarTxHash} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
            Live activity
          </h2>
          <EventFeed />
        </div>
      </div>
    </div>
  );
}
