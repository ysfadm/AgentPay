# AgentPay — Pitch deck slides (copy into Google Slides template)

Use the official hackathon template, then paste each block as one slide.
Recommended order: after “Solution / Demo” slides, before “Roadmap / Team”.

---

## Slide: Threat model & safeguards

**Title:** Threat model — what we protect against

**Subtitle:** AgentPay · Soroban-enforced guardrails on Stellar Testnet

### Problem
Autonomous agents need to spend money. Giving them your seed phrase or unlimited wallet access is unsafe.

### Safeguards (on-chain)

| Threat | Attack | Safeguard |
|--------|--------|-----------|
| Stolen agent key | Drain USDC | **Daily spending limit** — `DelegationManager.check_and_spend` |
| Bypass delegation | Pay without allowance | Only Marketplace may spend; reverts if over limit or expired |
| Fake reputation | Inflate success rate | **AgentRegistry.record_job** callable only by Marketplace |
| Revoked access | Agent keeps spending | Expiry + **revoke()** checked every purchase |
| Partial failure | Pay but no receipt | **Atomic `purchase`**: limit check → USDC transfer → reputation — all or nothing |

### One-liner for judges
> Human signs **once** (grant). Agent pays **autonomously** within the cap. Human can **revoke anytime**. Every payment is a **Stellar Expert–verifiable tx**.

**Speaker note (30 sec):** Walk through grant → purchase → blocked when limit hit. Mention ARCHITECTURE.md for full threat model.

---

## Slide: Why Stellar?

**Title:** Why Stellar is the right chain for agentic commerce

**Subtitle:** Not “a blockchain app” — a settlement layer built for machine-speed payments

### 1. Fast finality (~5 seconds)
Agents chain decisions: discover → pay → verify → pay again. 12-block chains break the UX.

### 2. Sub-cent fees
Micropayments ($0.50–$2 services in our marketplace) only work when fees are negligible.

### 3. Native USDC
Stable unit of account on Stellar — no bridge, no wrapped token. Agents price and settle in USDC.

### 4. Soroban delegation (scoped permissions)
Single atomic **grant(limit, expiry)** — not approve/transfer patterns. Capped allowance is **contract-enforced**, auditable, revocable.

### Demo proof
- Deployed on **Stellar Testnet**
- Live txs on **stellar.expert** (Activity feed → “View on Stellar Expert”)
- Contracts: AgentRegistry · DelegationManager · Marketplace

**Speaker note (30 sec):** “This use case only feels good on Stellar because finality + USDC + Soroban delegation match how agents actually spend.”

---

## Optional closing slide (if time)

**Title:** AgentPay in one flow

```
Freighter grant → Agent purchase → USDC on-chain → Reputation updated
```

**Tracks:** Main Track + **Hack Agentic**  
**Live demo:** Run Demo → Activity → Stellar Expert

---

## Checklist before presenting

- [ ] `NEXT_PUBLIC_DEMO_MODE=false` for live pitch
- [ ] `npm run demo:seed` before going on stage
- [ ] Freighter on Testnet, funded account connected
- [ ] Submission portal: GitHub + demo URL + this deck linked
