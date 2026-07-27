"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  connectFreighter,
  getFreighterAddress,
  getFreighterNetwork,
  isFreighterInstalled,
  signXdrWithFreighter,
} from "@/lib/stellar/freighter";

interface WalletContextValue {
  address: string | null;
  network: string | null;
  installed: boolean | null;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  sign: (xdr: string) => Promise<string>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

const STORAGE_KEY = "agentpay_wallet";

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [network, setNetwork] = useState<string | null>(null);
  const [installed, setInstalled] = useState<boolean | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const present = await isFreighterInstalled();
      if (!mounted) return;
      setInstalled(present);

      const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      if (saved) {
        // Confirm Freighter still grants access to this address.
        const current = await getFreighterAddress();
        if (mounted && current) {
          setAddress(current);
          const net = await getFreighterNetwork();
          if (mounted && net) setNetwork(net.network);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const addr = await connectFreighter();
      setAddress(addr);
      localStorage.setItem(STORAGE_KEY, addr);
      const net = await getFreighterNetwork();
      if (net) setNetwork(net.network);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect Freighter");
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setNetwork(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const sign = useCallback(
    async (xdr: string) => {
      if (!address) throw new Error("Connect your wallet first");
      return signXdrWithFreighter(xdr, address);
    },
    [address]
  );

  return (
    <WalletContext.Provider
      value={{ address, network, installed, connecting, error, connect, disconnect, sign }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within a WalletProvider");
  return ctx;
}
