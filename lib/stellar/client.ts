/**
 * Soroban RPC + network config. Server-side helper for building and submitting
 * transactions against Stellar Testnet.
 */
import {
  rpc,
  Horizon,
  Networks,
  TransactionBuilder,
  Keypair,
  BASE_FEE,
} from "@stellar/stellar-sdk";

export const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ?? Networks.TESTNET;

export const SOROBAN_RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ?? "https://soroban-testnet.stellar.org";

export const HORIZON_URL =
  process.env.NEXT_PUBLIC_HORIZON_URL ?? "https://horizon-testnet.stellar.org";

export const CONTRACT_IDS = {
  agentRegistry: process.env.NEXT_PUBLIC_AGENT_REGISTRY_ID ?? "",
  marketplace: process.env.NEXT_PUBLIC_MARKETPLACE_ID ?? "",
  delegationManager: process.env.NEXT_PUBLIC_DELEGATION_MANAGER_ID ?? "",
  usdc: process.env.NEXT_PUBLIC_USDC_CONTRACT_ID ?? "",
};

let _server: rpc.Server | null = null;
export function getServer(): rpc.Server {
  if (!_server) {
    _server = new rpc.Server(SOROBAN_RPC_URL, { allowHttp: SOROBAN_RPC_URL.startsWith("http://") });
  }
  return _server;
}

let _horizon: Horizon.Server | null = null;
export function getHorizon(): Horizon.Server {
  if (!_horizon) {
    _horizon = new Horizon.Server(HORIZON_URL, { allowHttp: HORIZON_URL.startsWith("http://") });
  }
  return _horizon;
}

/** The relayer pays fees and submits agent txs on testnet. */
export function getRelayer(): Keypair {
  const secret = process.env.STELLAR_RELAYER_SECRET;
  if (!secret) throw new Error("STELLAR_RELAYER_SECRET is not set");
  return Keypair.fromSecret(secret);
}

export function isStellarConfigured(): boolean {
  return Boolean(
    CONTRACT_IDS.marketplace &&
      CONTRACT_IDS.delegationManager &&
      process.env.STELLAR_RELAYER_SECRET
  );
}

export { TransactionBuilder, BASE_FEE };
