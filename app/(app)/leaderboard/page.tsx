"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingUp, DollarSign, Clock, Briefcase } from "lucide-react";
import type { Agent } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/app/page-header";
import { AgentAvatar } from "@/components/agent/agent-avatar";
import { ReputationBadge } from "@/components/agent/reputation-badge";
import { shortAddr, formatUsdc } from "@/lib/utils";

type LeaderboardEntry = Agent & {
  totalEarned: number;
  paidJobCount: number;
  jobCount: number;
  lastActivityAt: string | null;
  lastActivityMessage: string | null;
};

export default function LeaderboardPage() {
  const [providers, setProviders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/leaderboard", { cache: "no-store" });
      const data = await res.json();
      setProviders(data.providers ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Provider Leaderboard"
        description="Ranked by reputation, total earnings, and completed jobs on Stellar Testnet."
      />

      {loading ? (
        <div className="py-16 text-center text-lg text-muted-foreground">Loading…</div>
      ) : providers.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-lg text-muted-foreground">
            No providers yet. Create a provider agent to get started!
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {providers.map((provider, idx) => {
            const rank = idx + 1;
            return (
              <Card
                key={provider.id}
                className="overflow-hidden transition-shadow hover:shadow-md"
              >
                <CardContent className="p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="text-3xl font-bold text-right sm:min-w-14 sm:text-center">
                      {getMedalEmoji(rank)}
                    </div>
                    <Link href={`/agents/${provider.id}`}>
                      <AgentAvatar
                        seed={provider.avatarSeed}
                        name={provider.name}
                        className="size-14 shrink-0"
                      />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <Link
                          href={`/agents/${provider.id}`}
                          className="truncate text-xl font-semibold hover:text-primary sm:text-2xl"
                        >
                          {provider.name}
                        </Link>
                        <Badge variant="secondary" className="text-sm">
                          {provider.role}
                        </Badge>
                        <ReputationBadge score={provider.reputationScore} />
                      </div>
                      <p className="text-sm text-muted-foreground sm:text-base">
                        {shortAddr(provider.walletAddress)}
                      </p>
                      {provider.lastActivityMessage && (
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground sm:text-base">
                          <Clock className="mr-1 inline size-4" />
                          {provider.lastActivityAt &&
                            `${new Date(provider.lastActivityAt).toLocaleString()} · `}
                          {provider.lastActivityMessage}
                        </p>
                      )}
                    </div>
                    <div className="grid shrink-0 grid-cols-3 gap-4 text-right sm:gap-6">
                      <div>
                        <div className="flex items-center justify-end gap-1 text-primary">
                          <TrendingUp className="size-4" />
                          <span className="text-xl font-bold">{provider.reputationScore}</span>
                        </div>
                        <p className="text-xs text-muted-foreground sm:text-sm">Reputation</p>
                      </div>
                      <div>
                        <div className="flex items-center justify-end gap-1">
                          <Briefcase className="size-4 text-muted-foreground" />
                          <span className="text-xl font-bold">{provider.jobsCompleted}</span>
                        </div>
                        <p className="text-xs text-muted-foreground sm:text-sm">
                          {provider.paidJobCount} paid jobs
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center justify-end gap-1 text-emerald-400">
                          <DollarSign className="size-4" />
                          <span className="text-xl font-bold">{formatUsdc(provider.totalEarned)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground sm:text-sm">Total earned</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
