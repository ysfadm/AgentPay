# AgentPay — Payments for Autonomous Agents on Stellar

> Give an AI agent its own wallet and a **capped, expiring, on-chain spending limit**.
> It then discovers services and pays for them **autonomously** in USDC — while a human
> stays in control via a single Freighter signature. Every payment, limit check, and
> reputation update is enforced by Soroban smart contracts on Stellar.

AgentPay turns AI agents into real economic actors: they can _earn_ and _spend_ on-chain,
with guardrails that a human grants once and can revoke at any time.

### Testnet deployments (Stellar Expert)

| Contract           | Testnet ID                                                 |
| ------------------ | ---------------------------------------------------------- |
| Agent Registry     | `CBNPT7XGHQD75U7B2O6OSVYS4DNTUR3NJSWCEKPNOH5HDMER3DW4KBYI` |
| Delegation Manager | `CDFYTLZQ54OWK3CZT4SWCRCZXPZ7VHUY5V2DISRCQYZBXV5MZQCU2WST` |
| Marketplace        | `CBKJXR23EMLGCONODKG4W3GHVLMZ2UN3V5WTJ2SHA6LYY5F7T2LQTJEF` |
| USDC (demo SAC)    | `CALFVMEZVOTFQEVDMHI23ZHT5JNR3SF4BR5RMRBN6M4JT2SXEVIBMMKL` |

### Live demo

- **Live app (Vercel):** https://agent-pay-lilac.vercel.app

### Pitch deck & demo

- **Pitch deck (Canva):** https://canva.link/l4tg3jexhaur90b
- **Markdown slides (backup / copy-paste):** [`docs/pitch-deck-slides.md`](docs/pitch-deck-slides.md)
- **Demo video (Google Drive):** https://drive.google.com/file/d/1t727Kby7cnj1AqYNch3ZH16nKbohN0wu/view?usp=sharing

---

## Why this matters

- **Agentic commerce is here, but agents can't safely hold money.** Giving an agent your
  card or seed phrase is reckless. AgentPay gives it a _scoped_ wallet: spend up to N USDC
  per day, expiring at time T — enforced by a contract, not by trust.
- **Stellar is the right rail:** sub-cent fees, ~5s finality, native USDC, and Soroban smart
  contracts for the delegation + marketplace logic.
- **Human-in-the-loop autonomy:** the user signs _one_ delegation with Freighter. After that
  the agent transacts on its own, within the limit, until the human revokes it.

---

## How it works (live, on-chain)

```
 Human (console PIN + Freighter)   Agent (own keypair)             Soroban (Testnet)
 ──────────────────────────────── ───────────────────             ─────────────────
 login ──console PIN──▶ AgentPay console
 grant(limit, expiry) ──Freighter sign──────────────────────────▶ DelegationManager.grant
                                  run(goal)
                                  pick a service (AI/heuristic)
                                  purchase(listing) ──sign────▶  ▶ Marketplace.purchase
                                                                    ├─ check_and_spend  (limit enforced)
                                                                    ├─ USDC transfer    (buyer → provider)
                                                                    └─ record_job       (reputation++)
 revoke() ───────────sign──────▶                                ▶ DelegationManager.revoke
```

The `purchase` call is **atomic**: if the spend would exceed the daily limit or the delegation
is expired, the whole transaction reverts — no payment, no partial state.

### Verified on Testnet

A real autonomous purchase moved **2 USDC** from a buyer agent to a provider agent
(buyer balance 100 → 98), settled by `Marketplace.purchase`, with reputation recorded on-chain.

- **Transaction hash:** `b5395435a81e047e9f3f5be91e52cc8af596f3604bb52ad9b5032cd88e3d4721`
- **Explorer link:** https://stellar.expert/explorer/testnet/tx/b5395435a81e047e9f3f5be91e52cc8af596f3604bb52ad9b5032cd88e3d4721

---

## Smart contracts (`contracts/`)

| Contract                 | Responsibility                                                                                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`agent-registry`**     | Registers agents and stores reputation. `record_job` is callable **only** by the Marketplace, so reputation can't be faked.                                   |
| **`delegation-manager`** | `grant` / `revoke` a capped, expiring allowance (owner-authorized). `check_and_spend` enforces the rolling 24h limit and is callable only by the Marketplace. |
| **`marketplace`**        | `list_service`, `get_listing`, and the money-shot `purchase`: atomic `check_and_spend → USDC transfer → record_job → receipt`.                                |

Each contract has Rust unit tests (`npm run contracts:test`).

---

## App architecture

- **Next.js 15 (App Router) + TypeScript + Tailwind** — landing page, dashboard, marketplace, activity feed.
- **Console PIN login** — local PIN stored hashed in `.data/auth.json`, plus a demo fallback for stage reliability.
- **Freighter** (`@stellar/freighter-api`) — wallet connection + signing of `grant`/`revoke`.
- **`@stellar/stellar-sdk` v15** (protocol-23 compatible) — builds/simulates/submits Soroban txs.
- **Server keypairs** — each agent gets its own Stellar keypair so it can sign its _own_
  autonomous `purchase` transactions (no human in the loop after the grant).
- **Store** (`lib/demo-store.ts`) mirrors on-chain state for fast reads. The chain is the source
  of truth. It persists to `.data/store.json` across restarts, with **agent secret keys encrypted
  at rest (AES-256-GCM)** via `STORE_ENC_KEY`.

### Key modules

```
lib/stellar/client.ts          RPC + Horizon clients, network + relayer config
lib/stellar/soroban-server.ts  build / simulate / submit txs; read-only simulateRead
lib/stellar/provision.ts       fund, USDC trustline, mint, register, list, purchase, revoke, read reputation
lib/stellar/freighter.ts       client-side Freighter wrapper
lib/server/auth-store.ts       persisted console PIN hashes in .data/auth.json
lib/server/payments.ts         executePurchase: enforce delegation → settle → reputation
lib/server/provision-demo.ts   one-shot provider + buyer provisioning
lib/ai/orchestrator.ts         the single agent decision (LLM or deterministic fallback)
```

---

## Setup

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env.local
# Fill NEXT_PUBLIC_*_ID contract IDs, NEXT_PUBLIC_USDC_CONTRACT_ID, and STELLAR_RELAYER_SECRET.

# 3. (Optional) Build/test/deploy contracts — needs the Stellar CLI + Rust
npm run contracts:test
npm run deploy:contracts        # deploys to Testnet and prints the IDs

# 4. Run
npm run dev                     # http://localhost:3000

# 5. (Optional) Run the test suite
npm test                        # delegation/purchase logic, decisions, crypto
```

### Demo modes

- `NEXT_PUBLIC_DEMO_MODE=true` — instant, deterministic, simulated tx hashes. Smoothest UI demo.
- `NEXT_PUBLIC_DEMO_MODE=false` — **live**: real Soroban txs, real USDC movement, real Explorer links.

---

## Running the live demo

```bash
# Pre-provision providers + listings so the first run is instant (recommended before a stage demo)
npm run demo:warmup

# Full demo video setup: 3 named agents, funded, delegated, sample payment (~2 min)
npm run demo:seed
```

Then in the browser (`http://localhost:3000`):

1. **Unlock AgentPay** with your console PIN (first visit: create PIN) or **Continue Demo**.
2. **Connect Freighter** (Testnet, funded account).
3. Open **Dashboard** — three **Demo** agents are pre-configured (`npm run demo:seed`):
   - **Research Agent** — hero demo, already has 100 USDC + 10/day delegation + one sample payment in Activity
   - **Budget Scout** — 6 USDC/day limit for “Run until budget runs out”
   - **Market Analyst** — ready for marketplace purchases
4. **Research Agent** → **Run once** (or **Run until budget runs out** on Budget Scout).
5. Show **Activity** feed with live SSE + Stellar Expert tx links.
6. Optional beat: create a new agent live and **Approve with Freighter** to show human-in-the-loop delegation.
7. **Revoke** any time to cut off spending on-chain.

> The agent's reputation shown on its page is read directly from `AgentRegistry` on-chain.

---

## Security notes (hackathon scope → production)

- Console PIN hashes are stored locally in `.data/auth.json`; this protects access to the AgentPay
  console, while Freighter remains the authority for on-chain spending.
- Agent secret keys live in server memory and are **encrypted at rest (AES-256-GCM)** in
  `.data/store.json`. For production, use a KMS / secret manager (or smart-wallet auth) and set a
  strong `STORE_ENC_KEY`.
- The bulk `/api/admin/provision` endpoint is guarded by `ADMIN_TOKEN` when set. The per-agent
  "Activate" endpoint mints demo USDC and is open for the demo — gate or remove it in production.
- Everything runs on **Stellar Testnet**; USDC here has no real value.

---

## Why Stellar?

AgentPay was built specifically for Stellar — not because Stellar is a blockchain, but because
it solves three hard problems for autonomous agent commerce:

### 1. **Fast finality (≈5 seconds)**

- Agents need to settle _fast_. A 12+ block confirmation time (Ethereum, etc.) makes
  agent-to-service payments feel broken: buyer doesn't know if it's confirmed; service won't
  deliver until it sees finality.
- Stellar's ~5 second finality lets agents settle in real-time. Agents can chain purchases:
  `purchase A → wait 5s → check reputation → purchase B`, all in one beat.

### 2. **Micro-transaction fees (≈$0.00001 per tx)**

- Traditional payment rails (ACH, card networks) charge percentage-based fees that make
  micropayments uneconomical. Blockchain fees are flat.
- Stellar's sub-cent fee means agents can pay for tiny services profitably: a $0.01 API call,
  a $0.001 data query, or a $0.50 computation. Without Stellar's low fees, these use cases
  don't exist.
- At scale (millions of agent transactions), the fee difference vs. other chains adds up to
  billions in economic efficiency.

### 3. **Native delegation model (Soroban smart contracts)**

- Stellar's Soroban smart contracts are built for _permission-scoped transactions_.
  Unlike Ethereum's `approve → transfer` pattern, Soroban lets a human grant an agent
  a **capped, expiring, revocable** allowance in a _single atomic transaction_.
- The delegation is stored on-chain (not in a separate contract state), meaning it's
  atomic, auditable, and revocable by the contract owner _any time_ — even if the agent's
  keypair is compromised.
- This is why AgentPay can safely give an agent autonomous signing power with bulletproof
  guardrails.

### 4. **Native USDC on Stellar (Circle)**

- USDC is live on Stellar as a native asset. No bridge, no wrapped token.
- Agents don't need to pay gas to swap or bridge; they spend USDC directly.
- This simplicity is crucial for agent economics.

---

## Tech stack

Next.js 15 · TypeScript · TailwindCSS · `@stellar/stellar-sdk` 15 · `@stellar/freighter-api` ·
Soroban (Rust) · OpenAI-compatible LLM (optional).
