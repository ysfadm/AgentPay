/**
 * On-chain provisioning helpers for the live demo: fund accounts, set USDC
 * trustlines, mint USDC, register agents, list services, and execute purchases.
 * USDC is a classic asset (USDC:relayer) whose SAC the contracts transfer.
 */
import crypto from "crypto";
import {
  TransactionBuilder,
  BASE_FEE,
  Operation,
  Asset,
  Keypair,
  Address,
  nativeToScVal,
  xdr,
} from "@stellar/stellar-sdk";
import { getHorizon, getRelayer, NETWORK_PASSPHRASE, CONTRACT_IDS } from "./client";
import { invokeWithKeypair, simulateRead, toStroops } from "./soroban-server";

export interface OnChainReputation {
  jobsCompleted: number;
  successfulPayments: number;
  successRateBps: number;
}

/** Read an agent's reputation directly from the AgentRegistry contract (read-only). */
export async function readOnChainReputation(agentId: string): Promise<OnChainReputation | null> {
  try {
    const r = (await simulateRead(
      CONTRACT_IDS.agentRegistry,
      "get_reputation",
      agentIdScVal(agentId)
    )) as Record<string, unknown> | undefined;
    if (!r || typeof r !== "object") return null;
    return {
      jobsCompleted: Number(r.jobs_completed ?? 0),
      successfulPayments: Number(r.successful_payments ?? 0),
      successRateBps: Number(r.success_rate_bps ?? 0),
    };
  } catch {
    return null;
  }
}

export function usdcAsset(): Asset {
  return new Asset("USDC", getRelayer().publicKey());
}

/** Deterministic 32-byte agent id (BytesN<32>) derived from the app's string id. */
export function agentIdScVal(id: string): xdr.ScVal {
  const buf = crypto.createHash("sha256").update(id).digest();
  return nativeToScVal(buf, { type: "bytes" });
}

export async function fundWithFriendbot(publicKey: string): Promise<void> {
  const res = await fetch(`https://friendbot.stellar.org/?addr=${encodeURIComponent(publicKey)}`);
  if (!res.ok && res.status !== 400) {
    throw new Error(`Friendbot funding failed (${res.status})`);
  }
}

async function classicTx(
  sourceSecret: string,
  addOps: (b: TransactionBuilder) => void
): Promise<string> {
  const hz = getHorizon();
  const kp = Keypair.fromSecret(sourceSecret);
  const account = await hz.loadAccount(kp.publicKey());
  const builder = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  });
  addOps(builder);
  const tx = builder.setTimeout(60).build();
  tx.sign(kp);
  const res = await hz.submitTransaction(tx);
  return res.hash;
}

export async function ensureTrustline(accountSecret: string): Promise<void> {
  const kp = Keypair.fromSecret(accountSecret);
  const hz = getHorizon();
  const acc = await hz.loadAccount(kp.publicKey());
  const asset = usdcAsset();
  const has = acc.balances.some(
    (b) =>
      b.asset_type !== "native" &&
      "asset_code" in b &&
      b.asset_code === asset.code &&
      "asset_issuer" in b &&
      b.asset_issuer === asset.issuer
  );
  if (has) return;
  await classicTx(accountSecret, (b) => b.addOperation(Operation.changeTrust({ asset })));
}

export async function mintUsdc(to: string, amount: number): Promise<string> {
  const issuer = getRelayer();
  return classicTx(issuer.secret(), (b) =>
    b.addOperation(Operation.payment({ destination: to, asset: usdcAsset(), amount: amount.toFixed(7) }))
  );
}

export async function getUsdcBalance(publicKey: string): Promise<number> {
  const hz = getHorizon();
  const acc = await hz.loadAccount(publicKey);
  const asset = usdcAsset();
  const bal = acc.balances.find(
    (b) =>
      b.asset_type !== "native" &&
      "asset_code" in b &&
      b.asset_code === asset.code &&
      "asset_issuer" in b &&
      b.asset_issuer === asset.issuer
  );
  return bal ? Number(bal.balance) : 0;
}

export async function registerAgentOnChain(
  ownerSecret: string,
  agentId: string,
  metadata: string
): Promise<string> {
  const owner = Keypair.fromSecret(ownerSecret).publicKey();
  const { hash } = await invokeWithKeypair(
    ownerSecret,
    CONTRACT_IDS.agentRegistry,
    "register",
    Address.fromString(owner).toScVal(),
    agentIdScVal(agentId),
    nativeToScVal(metadata, { type: "string" })
  );
  return hash;
}

export async function listServiceOnChain(
  providerSecret: string,
  providerAgentId: string,
  priceUsdc: number,
  metadata: string
): Promise<number> {
  const provider = Keypair.fromSecret(providerSecret).publicKey();
  const { returnValue } = await invokeWithKeypair(
    providerSecret,
    CONTRACT_IDS.marketplace,
    "list_service",
    Address.fromString(provider).toScVal(),
    agentIdScVal(providerAgentId),
    nativeToScVal(toStroops(priceUsdc), { type: "i128" }),
    nativeToScVal(metadata, { type: "string" })
  );
  return Number(returnValue);
}

export async function purchaseOnChain(
  buyerSecret: string,
  buyerAgentId: string,
  listingId: number
): Promise<string> {
  const buyer = Keypair.fromSecret(buyerSecret).publicKey();
  const { hash } = await invokeWithKeypair(
    buyerSecret,
    CONTRACT_IDS.marketplace,
    "purchase",
    Address.fromString(buyer).toScVal(),
    agentIdScVal(buyerAgentId),
    nativeToScVal(BigInt(listingId), { type: "u64" })
  );
  return hash;
}

/** Grant a delegation on-chain signed by a server-held owner key (used for testing
 * the autonomous path without Freighter). In production grant() is signed by Freighter. */
export async function grantWithKeypair(
  ownerSecret: string,
  agentAddress: string,
  dailyLimit: number,
  expiresAt: number
): Promise<string> {
  const owner = Keypair.fromSecret(ownerSecret).publicKey();
  const { hash } = await invokeWithKeypair(
    ownerSecret,
    CONTRACT_IDS.delegationManager,
    "grant",
    Address.fromString(owner).toScVal(),
    Address.fromString(agentAddress).toScVal(),
    Address.fromString(CONTRACT_IDS.usdc).toScVal(),
    nativeToScVal(toStroops(dailyLimit), { type: "i128" }),
    nativeToScVal(BigInt(expiresAt), { type: "u64" })
  );
  return hash;
}
