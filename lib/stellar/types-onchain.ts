export interface AgentData {
  owner: string;
  metadata: string;
}

export interface ReputationData {
  jobsCompleted: number;
  successfulPayments: number;
  successRateBps: number;
}

export interface Allowance {
  dailyLimit: bigint;
  spentToday: bigint;
  expiresAt: number;
  active: boolean;
}
