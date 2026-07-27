/**
 * Pre-provisions the marketplace providers + on-chain listings so the live demo
 * is instant on stage (no ~55s wait on the first agent run).
 *
 * Usage:  npm run demo:warmup
 * Env:    BASE_URL (default http://localhost:3000), ADMIN_TOKEN (if set on server)
 */
const base = process.env.BASE_URL ?? "http://localhost:3000";
const token = process.env.ADMIN_TOKEN;

const headers = { "Content-Type": "application/json" };
if (token) headers["x-admin-token"] = token;

console.log(`→ Warming up providers at ${base} …`);

try {
  const res = await fetch(`${base}/api/admin/provision`, { method: "POST", headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`✗ Warmup failed (${res.status}):`, data.error ?? data);
    process.exit(1);
  }
  console.log(`✓ Providers provisioned on-chain:`, data.provisioned);
  console.log(`  The marketplace is ready. Create an agent → Activate → Approve → Run.`);
} catch (e) {
  console.error("✗ Could not reach the server. Is `npm run dev` running?", e.message);
  process.exit(1);
}
