export interface Agent {
  id: string;
  name: string;
  role: string;
  avatarSeed: string;
  walletAddress: string;
  reputationScore: number;
  jobsCompleted: number;
  successfulPayments: number;
  isProvider: boolean;
  /** MVP: marks agents imported from OpenClaw workspace */
  source?: "local" | "openclaw";
  openclawId?: string;
}

export interface Delegation {
  agentId: string;
  dailyLimit: number;
  spentToday: number;
  expiresAt: string;
  status: "active" | "expired" | "revoked";
  onchainTxHash?: string;
  /** True when grant() was actually submitted to Stellar (Freighter or relayer). */
  onchainLive?: boolean;
}

export interface Service {
  id: string;
  providerAgentId: string;
  providerName: string;
  providerReputation: number;
  title: string;
  description: string;
  price: number;
  category: string;
  onchainListingId?: number;
}

export type JobStatus =
  | "pending"
  | "paid"
  | "delivered"
  | "completed"
  | "failed";

export interface Job {
  id: string;
  serviceId: string;
  buyerAgentId: string;
  providerAgentId: string;
  amount: number;
  status: JobStatus;
  stellarTxHash?: string;
  resultPayload?: unknown;
  createdAt: string;
  completedAt?: string;
}

export type EventType =
  | "discovered"
  | "requested"
  | "paid"
  | "delivered"
  | "rep_updated"
  | "blocked";

export interface ActivityEvent {
  id: string;
  agentId?: string;
  type: EventType;
  message: string;
  txHash?: string;
  createdAt: string;
}
