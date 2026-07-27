/**
 * Lightweight file persistence for the in-memory store so it survives restarts.
 * Agent secret keys are encrypted at rest with AES-256-GCM; the key is derived
 * from STORE_ENC_KEY (or STELLAR_RELAYER_SECRET as a fallback).
 *
 * The plaintext store JSON (.data/store.json) holds only public data; secrets
 * live in an encrypted blob. The file is git-ignored.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { Store } from "../demo-store";

const DATA_DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "store.json");

interface EncBlob {
  iv: string;
  tag: string;
  data: string;
}

function encKey(): Buffer {
  const secret =
    process.env.STORE_ENC_KEY || process.env.STELLAR_RELAYER_SECRET || "agentpay-dev-only-key";
  return crypto.createHash("sha256").update(secret).digest();
}

function encrypt(plain: string): EncBlob {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encKey(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return {
    iv: iv.toString("hex"),
    tag: cipher.getAuthTag().toString("hex"),
    data: data.toString("hex"),
  };
}

function decrypt(blob: EncBlob): string {
  const decipher = crypto.createDecipheriv("aes-256-gcm", encKey(), Buffer.from(blob.iv, "hex"));
  decipher.setAuthTag(Buffer.from(blob.tag, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(blob.data, "hex")), decipher.final()]).toString("utf8");
}

export function encryptSecrets(map: Record<string, string>): EncBlob {
  return encrypt(JSON.stringify(map));
}

export function decryptSecrets(blob: EncBlob): Record<string, string> {
  try {
    return JSON.parse(decrypt(blob));
  } catch {
    return {};
  }
}

/** Overlay persisted state onto a freshly seeded store. Returns true if a file was loaded. */
export function loadStore(store: Store): boolean {
  if (process.env.VITEST) return false; // keep tests hermetic
  try {
    if (!fs.existsSync(FILE)) return false;
    const raw = JSON.parse(fs.readFileSync(FILE, "utf8"));
    if (Array.isArray(raw.agents)) store.agents = raw.agents;
    if (raw.delegations) store.delegations = raw.delegations;
    if (Array.isArray(raw.services)) store.services = raw.services;
    if (Array.isArray(raw.jobs)) store.jobs = raw.jobs;
    if (Array.isArray(raw.events)) store.events = raw.events;
    if (raw.agentOwners) store.agentOwners = raw.agentOwners;
    store.agentSecrets = raw.agentSecretsEnc ? decryptSecrets(raw.agentSecretsEnc) : {};
    return true;
  } catch (e) {
    console.warn("[persistence] load failed:", (e as Error).message);
    return false;
  }
}

let timer: ReturnType<typeof setTimeout> | null = null;

/** Debounced save. Safe to call on every mutation. */
export function scheduleSave(store: Store, delayMs = 400): void {
  if (process.env.VITEST) return; // never write the real store during tests
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    writeNow(store);
  }, delayMs);
}

function writeNow(store: Store): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const out = {
      version: 1,
      agents: store.agents,
      delegations: store.delegations,
      services: store.services,
      jobs: store.jobs,
      events: store.events.slice(0, 200),
      agentOwners: store.agentOwners,
      agentSecretsEnc: encryptSecrets(store.agentSecrets),
    };
    const tmp = `${FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(out));
    fs.renameSync(tmp, FILE);
  } catch (e) {
    console.warn("[persistence] save failed:", (e as Error).message);
  }
}
