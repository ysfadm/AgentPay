import { NextResponse } from "next/server";
import { store } from "@/lib/demo-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const providers = store.agents.filter((a) => a.isProvider);

  const ranked = providers
    .map((provider) => {
      const providerJobs = store.jobs.filter((j) => j.providerAgentId === provider.id);
      const totalEarned = providerJobs.reduce((sum, j) => sum + j.amount, 0);
      const paidJobs = providerJobs.filter(
        (j) => j.status === "paid" || j.status === "completed" || j.status === "delivered",
      );
      const sortedJobs = [...providerJobs].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      const lastJob = sortedJobs[0];
      const recentEvent = store.events
        .filter((e) => e.agentId === provider.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

      return {
        ...provider,
        totalEarned,
        paidJobCount: paidJobs.length,
        jobCount: providerJobs.length,
        lastActivityAt: lastJob?.createdAt ?? recentEvent?.createdAt ?? null,
        lastActivityMessage:
          recentEvent?.message ??
          (lastJob ? `Earned ${lastJob.amount} USDC from a completed job` : null),
      };
    })
    .sort(
      (a, b) =>
        b.reputationScore - a.reputationScore ||
        b.totalEarned - a.totalEarned ||
        b.jobsCompleted - a.jobsCompleted,
    );

  return NextResponse.json({ providers: ranked });
}
