# AgentPay — Architecture & Safety Design

## Overview

AgentPay is a **delegated agent wallet** on Stellar. Its core job: let a human grant an AI agent
a capped, expiring, on-chain spending limit — and revoke it at any time.

The architecture is split into four layers:

1. **Human auth** (console PIN + Freighter)
2. **Agent provisioning** (keypair generation + on-chain registration)
3. **Delegation & spending limits** (Soroban smart contracts)
4. **Marketplace & reputation** (agent-to-agent commerce)

---

## Threat Model & Safeguards

### What we protect against

| Threat                  | Attack                                                 | Safeguard                                                                  |
| ----------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------- |
| **Agent keypair theft** | Attacker steals agent private key; tries to drain USDC | Daily spending limit enforced by `DelegationManager.check_and_spend`       |
| **Delegation bypass**   | Agent calls Marketplace directly without authorization | Only `DelegationManager` can invoke `Marketplace.purchase` (contract ACL)  |
| **Reputation fraud**    | Agent inflates its own reputation                      | Only `Marketplace` can call `AgentRegistry.record_job` (contract ACL)      |
| **Expired delegation**  | Agent still transacts after human revokes              | Delegation timestamp checked every purchase; expired txs revert atomically |
| **Over-limit spending** | Agent spends more than daily cap                       | Rolling 24-hour window enforced in `check_and_spend`; exceeding reverts    |
| **Fake receipts**       | Attacker submits off-chain receipt claiming a purchase | All receipts are on-chain txs with Stellar blockchain timestamp            |

### What we do **NOT** protect against (out of scope)

- **Compromised Freighter** — if Freighter is hijacked, the attacker can revoke delegations or set
  bad limits. _Mitigation_: use Freighter on a clean device; use a hardware wallet passphrase.
- **Malicious LLM** — if the AI model is poisoned to always buy from one provider, it will. _Mitigation_:
  set a low daily limit; audit purchasing patterns in the Activity feed.
- **Denial-of-service on Stellar** — if Stellar testnet goes down, no txs confirm. _Mitigation_: this
  is a network-level concern, not an app-level one. Production would use mainnet + redundancy.

---

## Core Components

### 1. Human Auth: Console PIN + Freighter

```
┌─────────────────────────────────────────────────────┐
│ Human (console PIN + Freighter)                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Console PIN (app login)                            │
│  ├─ Unlock AgentPay dashboard                       │
│  ├─ Stored: scrypt hash in .data/auth.json          │
│  └─ Protects: access to the UI console              │
│                                                     │
│  Freighter (Stellar wallet)                         │
│  ├─ Sign: grant(agent, limit, expiry)               │
│  ├─ Sign: revoke(agent)                             │
│  ├─ Holds: real USDC (Testnet)                       │
│  └─ Authority: only this key can delegate/revoke    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Why two systems?**

- The console PIN protects the _application_ (who can access the dashboard).
- Freighter protects the _blockchain_ (who can authorize delegations).

Separating them means an attacker needs to compromise _both_ to drain USDC. If they compromise
just the app, they can see dashboards but can't sign delegations. If they steal Freighter, they
still need the console PIN to access the UI.

### 2. Agent Provisioning

Each agent gets:

```
Agent ID       → 32-byte unique identifier (or agent name)
Agent Keypair  → Ed25519 keypair (Stellar account)
Agent Secret   → Encrypted in .data/store.json at rest (AES-256-GCM)
Agent USDC     → Minted on-chain in AgentRegistry
```

**Key principle:** Agent keypairs are _generated server-side_ (not by the agent). The private key
never leaves the server. This prevents the agent from independently transferring its own USDC
outside the Marketplace.

```javascript
// Agent tries to send USDC:
// → Agent doesn't have the private key.
// → Agent can only sign Marketplace purchases.
// → Marketplace calls check_and_spend before the transfer.
// → Spending limit is enforced.
```

### 3. Delegation Manager: Spending Limits

```
┌──────────────────────────────────────────────────────────┐
│ DelegationManager (Soroban Smart Contract)                │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ grant(owner, agent, limit, expiry)                       │
│ ├─ Caller must be owner (Freighter signature required)   │
│ ├─ Stores: (agent → limit, expiry, spent_today)          │
│ ├─ Emits: event "Delegation granted"                     │
│ └─ Returns: success ✓                                    │
│                                                          │
│ check_and_spend(agent, amount)                           │
│ ├─ Caller must be Marketplace (ACL)                      │
│ ├─ Checks: delegation not expired                        │
│ ├─ Checks: amount + spent_today ≤ limit                  │
│ ├─ If OK: increment spent_today, return OK               │
│ ├─ If FAIL: revert entire tx (atomicity)                 │
│ └─ Rolling window: resets at UTC midnight               │
│                                                          │
│ revoke(owner, agent)                                     │
│ ├─ Caller must be owner (Freighter signature required)   │
│ ├─ Deletes: (agent → limit, expiry)                      │
│ ├─ Future check_and_spend calls revert                   │
│ └─ Emits: event "Delegation revoked"                     │
│                                                          │
│ State:                                                   │
│ ├─ delegations: Map<agent_id, (limit, expiry, spent)>   │
│ ├─ owners: Map<agent_id, owner_account>                 │
│ └─ All changes require owner signature                   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Safety invariant:** If a delegation is revoked, the agent's spending drops to zero _immediately_
on-chain. No grace period, no off-chain state.

### 4. Marketplace: Purchase Flow

```
Human                          Agent                    Soroban
────────────────────────────   ──────────────────────   ──────────────────────

                                                        Marketplace.purchase(
                                                          buyer, listing_id,
                                                          listing_price
                                                        )
                               agent.sign(tx) ─────────→
                                                        1. Call DelegationManager.check_and_spend(
                                                           buyer, listing_price
                                                        )
                                                           └─ checks: limit OK?
                                                           └─ checks: not expired?
                                                           └─ reverts if NO

                                                        2. Transfer USDC:
                                                           buyer (agent account) → provider

                                                        3. Call AgentRegistry.record_job(
                                                           buyer, success=true
                                                        )
                                                           └─ buyer reputation += 1
                                                           └─ provider reputation += 1

                                                        4. Emit receipt + log

                                                        Returns: (tx_hash, receipt)
                               ◄─────────────────────── receipt
Show in Activity Feed ◄────────
```

**Atomicity:** If _any_ step fails (limit exceeded, transfer fails, reputation update fails),
the _entire transaction reverts_. No partial states.

**Example failure:**

```
Agent has: 100 USDC, limit 10 USDC/day, spent 8 today
Listing price: 5 USDC

Purchase call:
├─ check_and_spend(agent, 5)
│  └─ 8 + 5 = 13 > 10 ✗ REVERT
├─ (no transfer happens)
├─ (no reputation recorded)
└─ (entire tx fails, block chain unchanged)

Agent still has: 100 USDC, spent still 8 today
```

---

## Recovery & Revocation

### User revokes delegation

```
Human                  Freighter             DelegationManager
──────────────────────────────────────────────────────────────

Click "Revoke" ─────→
Open Freighter ──────→
Sign tx ──────────────────────────────────→ revoke(owner, agent)
                                          │
                                          ├─ Check: caller == owner ✓
                                          ├─ Delete: delegations[agent]
                                          └─ Emit: event "Revoked"
                          ◄────────────── tx_hash
Display success
Toast: "Delegation revoked"
```

**Time to effect:** ≈5 seconds (Stellar block time).

### Agent keypair compromised (future scenario)

```
Attacker has agent's private key. Tries to purchase.

purchase(agent, listing) ─────→ Soroban
                              │
                              ├─ check_and_spend(agent, ...)
                              │  └─ checks limit ✓
                              ├─ Transfer USDC
                              └─ Attacker got X USDC

Problem: Limit doesn't help if attacker waits 24 hours or the human
         didn't revoke yet.

Mitigation (human):
  1. See suspicious purchase in Activity feed
  2. Click "Revoke" on agent
  3. Attacker's next purchase reverts ✓
  4. (Optionally) create new agent, retain USDC with lower limit
```

---

## On-Chain State Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ Initial state: Human owns 1000 USDC (Freighter)                     │
└─────────────────────────────────────────────────────────────────────┘

Step 1: Create agent + mint USDC
┌─────────────────────────────────────────────────────────────────────┐
│ Human calls: Marketplace.list_service + provision agent             │
│                                                                       │
│ On-chain:                                                           │
│   AgentRegistry.register(agent_id, name, role)                      │
│   AgentRegistry.mint_usdc(agent_id, 100)                            │
│                                                                       │
│ State after:                                                        │
│   Human: 900 USDC (transferred 100 to agent)                        │
│   Agent: 100 USDC (new)                                             │
│   Reputation: agent → 0                                             │
└─────────────────────────────────────────────────────────────────────┘

Step 2: Grant delegation
┌─────────────────────────────────────────────────────────────────────┐
│ Human signs (Freighter): grant(agent, limit=10, expiry=24h)         │
│                                                                       │
│ On-chain (DelegationManager):                                       │
│   delegations[agent] = (limit=10, expiry=now+24h, spent=0)          │
│                                                                       │
│ State after:                                                        │
│   Agent can now purchase up to 10 USDC today                        │
│   Human did not send money; only authorized it                      │
└─────────────────────────────────────────────────────────────────────┘

Step 3: Agent purchases listing (5 USDC)
┌─────────────────────────────────────────────────────────────────────┐
│ Agent calls: Marketplace.purchase(listing_id, price=5)              │
│                                                                       │
│ Atomic Soroban transaction:                                         │
│   1. check_and_spend(agent, 5)                                      │
│      ├─ Verify: 0 + 5 ≤ 10 ✓                                        │
│      └─ Update: spent = 5, return OK                                │
│   2. transfer(agent_account, provider_account, 5 USDC)              │
│   3. record_job(agent, provider, success=true)                      │
│      └─ agent.reputation++, provider.reputation++                   │
│   4. Emit receipt                                                   │
│                                                                       │
│ State after:                                                        │
│   Agent USDC: 95 (spent 5)                                          │
│   Provider USDC: +5                                                 │
│   Delegation spent: 5 / 10                                          │
│   Agent reputation: 1                                               │
│   Provider reputation: 1                                            │
└─────────────────────────────────────────────────────────────────────┘

Step 4: Agent tries to purchase again (6 USDC)
┌─────────────────────────────────────────────────────────────────────┐
│ Agent calls: Marketplace.purchase(listing_id_2, price=6)            │
│                                                                       │
│ Soroban reverts (atomic):                                           │
│   check_and_spend(agent, 6)                                         │
│   └─ Verify: 5 + 6 = 11 > 10 ✗ REVERT                              │
│                                                                       │
│ State after:                                                        │
│   Agent USDC: 95 (unchanged)                                        │
│   Delegation spent: 5 (unchanged)                                   │
│   No transfer, no reputation change                                 │
└─────────────────────────────────────────────────────────────────────┘

Step 5: Human revokes delegation
┌─────────────────────────────────────────────────────────────────────┐
│ Human signs (Freighter): revoke(agent)                              │
│                                                                       │
│ On-chain (DelegationManager):                                       │
│   Delete delegations[agent]                                         │
│                                                                       │
│ State after:                                                        │
│   Agent cannot purchase anymore (check_and_spend will fail)         │
│   Agent USDC: still 95 (unchanged)                                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

### 1. **Server-side agent key storage**

**Decision:** Agent private keys live on the server, encrypted at rest.

**Why:**

- Agents don't have their own secure enclave; they can't protect a keypair.
- If we gave the agent its own key, the agent itself could be hacked → keypair stolen.
- Server-side storage lets us enforce: the agent can _only_ sign Marketplace purchases.

**Trade-off:**

- The server becomes a high-value target (all agent keys).
- _Mitigation_: use a KMS / secret manager in production; rotate encryption keys; audit access logs.

### 2. **Rolling 24-hour spending window**

**Decision:** Limit resets at UTC midnight, not 24h from each purchase.

**Why:**

- Simpler for humans to understand ("agent can spend up to X per day").
- No floating window edge cases (e.g., purchase at 23:59, then 00:01).

**Trade-off:**

- If an attacker compromises the key at 23:50, they have 10 minutes before reset. They could spend
  more in those 10 minutes, then the window resets.
- _Mitigation_: use a floating window in production; consider time-lock escrow for large amounts.

### 3. **No multi-sig, no approval chains**

**Decision:** One signature from the human (Freighter) grants the delegation. Agent spends autonomously.

**Why:**

- Agentic commerce requires _autonomy_. If the agent needs a second human signature for each
  purchase, it's not autonomous.
- The spending _limit_ is the guard rail, not a second approval.

**Trade-off:**

- If the human loses access to Freighter, they can't revoke the delegation.
- _Mitigation_: use a recovery key / social recovery for production; time-lock expirations.

### 4. **Reputation system (simple, on-chain)**

**Decision:** Reputation is recorded on-chain by the Marketplace; it's a simple counter.

**Why:**

- Agents can't fake it (only Marketplace can call `record_job`).
- Leaderboard is trustworthy (all data is on-chain).
- Easy to audit (all changes are in tx history).

**Trade-off:**

- No weighting by amount, time decay, or sentiment.
- Two agents with 1 reputation could be: one spent $1000 on a big service, the other spent $1 on spam.
- _Mitigation_: weight reputation by total USDC moved; add decay functions; require escrow.

---

## Testing & Validation

| Test                            | How                                                             | Status                     |
| ------------------------------- | --------------------------------------------------------------- | -------------------------- |
| **Spending limit enforced**     | Provision agent, grant 10 USDC/day, try to buy 11 USDC → revert | ✅ Soroban unit test       |
| **Expired delegation rejected** | Grant expiry in the past, try to purchase → revert              | ✅ Soroban unit test       |
| **Revocation works**            | Grant → Revoke → Try to purchase → revert                       | ✅ Soroban unit test       |
| **Reputation recorded**         | Purchase → check AgentRegistry.reputation                       | ✅ End-to-end on Testnet   |
| **Atomic failure**              | Limit exceeded → entire tx reverts, no state change             | ✅ Soroban unit test       |
| **Only Marketplace can spend**  | Call check_and_spend from unauthorized contract → revert        | ✅ Soroban unit test (ACL) |

---

## Future Enhancements

- **Smart-wallet auth instead of server keys** — use Freighter or a smart account to sign agent purchases.
- **Multi-sig revocation** — require N-of-M approvals to revoke (delay + recovery).
- **Time-locked spending** — grant expires in 24h, but is revocable immediately.
- **Privacy-preserving reputation** — use ZK proofs to hide agent identities while maintaining reputation.
- **Agent-to-agent delegation** — one agent delegates a fraction of its spending to another agent.
- **Escrow for large purchases** — require human approval if transaction exceeds a threshold.
