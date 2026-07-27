"use client";

/**
 * Thin wrapper around @stellar/freighter-api (v6). All calls are dynamic-imported
 * so the package (which touches `window`) never runs during SSR.
 */

export const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ?? "Test SDF Network ; September 2015";

async function api() {
  return import("@stellar/freighter-api");
}

function errMessage(error: unknown, fallback: string): string {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message: unknown }).message) || fallback;
  }
  return fallback;
}

/** True if the Freighter extension is present and reachable. */
export async function isFreighterInstalled(): Promise<boolean> {
  try {
    const { isConnected } = await api();
    const res = await isConnected();
    return Boolean(res.isConnected);
  } catch {
    return false;
  }
}

/** Prompt Freighter for access and return the user's public key (G... address). */
export async function connectFreighter(): Promise<string> {
  const { requestAccess } = await api();
  const res = await requestAccess();
  if (res.error || !res.address) {
    throw new Error(errMessage(res.error, "Freighter access was denied"));
  }
  return res.address;
}

/** Return the already-authorized address, or null if not connected/allowed. */
export async function getFreighterAddress(): Promise<string | null> {
  try {
    const { getAddress } = await api();
    const res = await getAddress();
    if (res.error || !res.address) return null;
    return res.address;
  } catch {
    return null;
  }
}

export async function getFreighterNetwork(): Promise<{ network: string; networkPassphrase: string } | null> {
  try {
    const { getNetwork } = await api();
    const res = await getNetwork();
    if (res.error) return null;
    return { network: res.network, networkPassphrase: res.networkPassphrase };
  } catch {
    return null;
  }
}

/** Sign a transaction XDR with Freighter; returns the signed XDR. */
export async function signXdrWithFreighter(xdr: string, address: string): Promise<string> {
  const { signTransaction } = await api();
  const res = await signTransaction(xdr, { networkPassphrase: NETWORK_PASSPHRASE, address });
  if (res.error || !res.signedTxXdr) {
    throw new Error(errMessage(res.error, "Transaction signing was rejected"));
  }
  return res.signedTxXdr;
}
