import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/components/wallet/wallet-provider";
import { ToastContainer } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "AgentPay — Payments for Autonomous Agents",
  description:
    "Secure the AgentPay console with a local PIN, then give AI agents a Freighter-signed spending allowance so they can autonomously pay on Stellar.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <WalletProvider>{children}</WalletProvider>
        <ToastContainer />
      </body>
    </html>
  );
}
