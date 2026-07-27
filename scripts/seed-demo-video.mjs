/**
 * Prepare named demo agents for a screen recording (funding + delegation + sample tx).
 *
 * Usage:  npm run demo:seed
 * Env:    BASE_URL (default http://localhost:3000), ADMIN_TOKEN (optional)
 */
const base = process.env.BASE_URL ?? "http://localhost:3000";
const token = process.env.ADMIN_TOKEN;
const headers = { "Content-Type": "application/json" };
if (token) headers["x-admin-token"] = token;

console.log(`→ Seeding demo video agents at ${base} …`);
console.log("  (This takes ~1–2 minutes: fund wallets, grant delegations, sample payment)\n");

try {
  const res = await fetch(`${base}/api/admin/demo-seed`, { method: "POST", headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`✗ Demo seed failed (${res.status}):`, data.error ?? data);
    process.exit(1);
  }

  console.log("✓ Demo agents ready:\n");
  for (const a of data.agents ?? []) {
    console.log(`  • ${a.name}`);
    console.log(`    wallet: ${a.walletAddress.slice(0, 8)}…  balance: ${a.balance} USDC  limit: ${a.dailyLimit}/day\n`);
  }
  if (data.sampleJob?.txHash) {
    console.log(`  Sample payment tx: ${data.sampleJob.txHash.slice(0, 16)}…\n`);
  }
  console.log("Open http://localhost:3000/dashboard — start with Research Agent → Run once.");
} catch (e) {
  console.error("✗ Could not reach the server. Is `npm run dev` running?", e.message);
  process.exit(1);
}
