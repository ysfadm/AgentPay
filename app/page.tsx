import Link from "next/link";

import { Bot, Fingerprint, ShieldCheck, Store, Zap, Coins, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";

import { ConnectCta } from "@/components/wallet/connect-cta";
import { ActivityPreview } from "@/components/activity/activity-preview";
import { LaunchDemoButton } from "@/components/landing/launch-demo-button";

const features = [
  {
    icon: Fingerprint,
    title: "Wallet identity",

    body: "Connect your Freighter wallet to own agents and approve their spending.",

  },

  {

    icon: ShieldCheck,

    title: "Delegated spending",

    body: "Grant your agent a capped, expiring allowance — enforced on-chain by Soroban.",

  },

  {

    icon: Store,

    title: "Agent marketplace",

    body: "Agents discover and price services from other agents.",

  },

  {

    icon: Coins,

    title: "Agent-to-agent payments",

    body: "Real USDC settles between agents in ~5 seconds for a fraction of a cent.",

  },

];



const whyStellar = [

  { icon: Zap, title: "Sub-cent fees", body: "Agent micro-payments are only viable when fees are ~$0.00001." },

  { icon: Zap, title: "~5s finality", body: "Agents can't wait 12 blocks. Stellar settles before the toast fades." },

  { icon: Fingerprint, title: "Native smart wallets", body: "Stellar accounts can embed passkey-style auth at the protocol level." },

  { icon: Coins, title: "Native USDC", body: "A stable unit of account — a real economy, not a volatile token." },

];



const flowSteps = [

  {

    label: "Human",

    title: "Freighter signs",

    detail: "grant(limit, expiry)",

    accent: "primary",

  },

  {

    label: "Agent",

    title: "Own keypair signs",

    detail: "purchase(service)",

    accent: "neutral",

  },

  {

    label: "Stellar",

    title: "~5s finality",

    detail: "USDC settles on-chain",

    accent: "emerald",

  },

] as const;



export default function LandingPage() {

  return (

    <div className="landing-bg min-h-screen">

      <header className="border-b border-border/60 bg-background/70 backdrop-blur-md">

        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 lg:px-8">

          <div className="flex items-center gap-3 text-xl font-semibold lg:text-2xl">

            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15">

              <Bot className="size-6 text-primary" />

            </div>

            AgentPay

          </div>

          <Link href="/dashboard">

            <Button variant="outline" size="lg">

              Open app

              <ArrowRight className="size-5" />

            </Button>

          </Link>

        </div>

      </header>



      <main>

        {/* Hero — fills the first screen */}

        <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl flex-col justify-center px-6 py-16 lg:px-8 lg:py-20">

          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">

            <div>

              <Badge className="mb-6 px-4 py-1.5 text-sm lg:text-base">Build on Stellar · Agentic Track</Badge>

              <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">

                Payments for{" "}

                <span className="bg-gradient-to-r from-primary to-emerald-300 bg-clip-text text-transparent">

                  Autonomous Agents

                </span>

              </h1>

              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl lg:text-2xl lg:leading-relaxed">

                You grant a spending limit once with Freighter — your agent discovers services and

                pays on Stellar autonomously, within that cap.

              </p>



              <div className="mt-10 flex flex-col gap-4">
                <LaunchDemoButton className="w-full sm:w-auto" />
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <ConnectCta />

                <Link href="/marketplace" className="sm:pt-1">

                  <Button size="lg" variant="outline" className="h-12 w-full px-8 text-base sm:w-auto">

                    Explore marketplace

                  </Button>

                </Link>
                </div>
              </div>

            </div>



            <div className="rounded-2xl border border-border/80 bg-card/60 p-6 shadow-2xl shadow-black/20 backdrop-blur-sm sm:p-8">

              <p className="mb-6 text-center text-base font-medium text-muted-foreground sm:text-lg">

                Human grant → Agent purchase (atomic on Soroban)

              </p>

              <div className="flex flex-col gap-4">

                {flowSteps.map((step, index) => (

                  <div key={step.label}>

                    <div

                      className={[

                        "rounded-xl border px-5 py-4 sm:px-6 sm:py-5",

                        step.accent === "primary" && "border-primary/40 bg-primary/10",

                        step.accent === "neutral" && "border-border bg-muted/40",

                        step.accent === "emerald" && "border-emerald-500/40 bg-emerald-500/10",

                      ]

                        .filter(Boolean)

                        .join(" ")}

                    >

                      <p

                        className={[

                          "text-sm font-semibold uppercase tracking-wider sm:text-base",

                          step.accent === "primary" && "text-primary",

                          step.accent === "neutral" && "text-accent",

                          step.accent === "emerald" && "text-emerald-400",

                        ]

                          .filter(Boolean)

                          .join(" ")}

                      >

                        {step.label}

                      </p>

                      <p className="mt-2 text-lg font-medium sm:text-xl">{step.title}</p>

                      <p className="mt-1 text-base text-muted-foreground sm:text-lg">{step.detail}</p>

                    </div>

                    {index < flowSteps.length - 1 && (

                      <div className="flex justify-center py-1 text-2xl text-muted-foreground/60" aria-hidden>

                        ↓

                      </div>

                    )}

                  </div>

                ))}

              </div>

            </div>

          </div>

        </section>



        {/* Live activity preview */}

        <section className="border-t border-border/60 py-20 lg:py-28">

          <div className="mx-auto max-w-6xl px-6 lg:px-8">

            <ActivityPreview limit={5} />

          </div>

        </section>



        {/* Features */}

        <section className="border-t border-border/60 bg-card/30 py-20 lg:py-28">

          <div className="mx-auto max-w-6xl px-6 lg:px-8">

            <h2 className="text-center text-3xl font-bold sm:text-4xl lg:text-5xl">What AgentPay does</h2>

            <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-muted-foreground sm:text-xl">

              Scoped wallets, on-chain limits, and real USDC — built for agents that spend on their own.

            </p>

            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">

              {features.map((f) => (

                <div key={f.title} className="glass rounded-2xl p-6 sm:p-7">

                  <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/15">

                    <f.icon className="size-6 text-primary" />

                  </div>

                  <h3 className="text-xl font-semibold sm:text-2xl">{f.title}</h3>

                  <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">{f.body}</p>

                </div>

              ))}

            </div>

          </div>

        </section>



        {/* Why Stellar */}

        <section className="py-20 lg:py-28">

          <div className="mx-auto max-w-6xl px-6 lg:px-8">

            <h2 className="text-center text-3xl font-bold sm:text-4xl lg:text-5xl">

              Why Stellar is the ideal platform

            </h2>

            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">

              {whyStellar.map((f) => (

                <div key={f.title} className="rounded-2xl border border-border bg-background/50 p-6 sm:p-7">

                  <f.icon className="mb-4 size-7 text-accent" />

                  <h3 className="text-xl font-semibold sm:text-2xl">{f.title}</h3>

                  <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">{f.body}</p>

                </div>

              ))}

            </div>

          </div>

        </section>



        {/* CTA strip */}

        <section className="border-t border-border/60 bg-gradient-to-r from-primary/10 via-emerald-500/5 to-accent/10 py-16 lg:py-20">

          <div className="mx-auto max-w-3xl px-6 text-center lg:px-8">

            <h2 className="text-3xl font-bold sm:text-4xl">Ready to try it?</h2>

            <p className="mt-4 text-lg text-muted-foreground sm:text-xl">

              Unlock the console with your PIN, connect Freighter, and let your agent pay within limits you set.

            </p>

            <div className="mt-8 flex flex-col items-center gap-4">
              <LaunchDemoButton />
              <ConnectCta />
            </div>

          </div>

        </section>

      </main>



      <footer className="border-t border-border/60 py-10 text-center text-base text-muted-foreground sm:text-lg">

        AgentPay · PIN-secured console, Stellar-settled · Hackathon MVP

      </footer>

    </div>

  );

}

