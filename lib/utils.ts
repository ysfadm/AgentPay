import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatUsdc(amount: number | string): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  return `${n.toFixed(2)} USDC`;
}

export function shortAddr(addr: string | null | undefined, chars = 4): string {
  if (!addr) return "—";
  if (addr.length <= chars * 2 + 2) return addr;
  return `${addr.slice(0, chars + 1)}…${addr.slice(-chars)}`;
}

export function explorerTxUrl(hash: string): string {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}

export function explorerContractUrl(contractId: string): string {
  return `https://stellar.expert/explorer/testnet/contract/${contractId}`;
}
