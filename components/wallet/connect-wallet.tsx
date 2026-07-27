"use client";

import { Wallet, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "./wallet-provider";
import { shortAddr } from "@/lib/utils";

export function ConnectWallet() {
  const { address, network, installed, connecting, error, connect, disconnect } = useWallet();

  if (address) {
    const wrongNetwork = network && !/test/i.test(network);
    return (
      <div className="flex items-center gap-2">
        {wrongNetwork && <Badge variant="destructive">Switch to Testnet</Badge>}
        <Badge variant="muted" className="gap-1">
          <Wallet className="size-3" /> {shortAddr(address, 4)}
        </Badge>
        <Button variant="ghost" size="icon" onClick={disconnect} title="Disconnect">
          <LogOut className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" onClick={connect} disabled={connecting}>
        <Wallet className="size-4" />
        {connecting ? "Connecting…" : "Connect Freighter"}
      </Button>
      {installed === false && (
        <a
          href="https://www.freighter.app/"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-accent hover:underline"
        >
          Freighter not detected — install it ↗
        </a>
      )}
      {error && <span className="max-w-48 text-right text-xs text-destructive">{error}</span>}
    </div>
  );
}
